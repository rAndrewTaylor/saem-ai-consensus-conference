"""AI-augmented tagging for the Round 1 report.

Two passes per question, both via Claude Opus:
  1. Pillar tagging — primary pillar (forced) + optional secondary +
     boolean cross_cutting flag.
  2. Cross-cutting topic tagging — multi-label from a fixed 10-tag set.

Plus a third call per cluster:
  3. Theme labeling — given the texts in a hierarchical cluster,
     produce a short label and 1-2 line description.

Results are cached on disk in reports/cache/ai_tags/. The cache key
is a hash of (prompt_version, model, question_text) so changes to
either invalidate the cache cleanly. Concurrency is bounded so we
don't hammer the rate limit when we kick off ~336 calls for an agenda
of 168 questions.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
from pathlib import Path
from typing import Optional

import pandas as pd

from ..ai_synthesis import DEFAULT_MODEL, run_synthesis

logger = logging.getLogger(__name__)

DEFAULT_CACHE_DIR = Path("reports/cache/ai_tags")
DEFAULT_CONCURRENCY = 6  # tune if we hit Anthropic rate limits

PILLARS = ["Technology", "Training", "Self", "Society"]
PILLAR_PROMPT_VERSION = 1
PILLAR_DEFINITIONS = (
    "Technology — AI capability itself: models, data, infrastructure, algorithms, "
    "interoperability, deployment lifecycle.\n"
    "Training — clinician and trainee education: AI literacy, curriculum, "
    "competency, faculty development, simulation.\n"
    "Self — clinician–AI interaction at the bedside: cognitive effects, "
    "professional identity, trust, autonomy, burnout, patient experience.\n"
    "Society — broader systemic concerns: ethics, equity, governance, "
    "regulation, liability, privacy, public trust."
)

CROSS_CUTTING_TAGS = [
    "Equity",
    "Pediatrics",
    "Rural / low-resource",
    "Drift / lifecycle",
    "Governance",
    "Deployment readiness",
    "Validation",
    "Privacy",
    "Bias",
    "Trust / explainability",
]
CROSS_CUTTING_PROMPT_VERSION = 1


# --- Cache keying -------------------------------------------------------

def _key(*parts: str) -> str:
    h = hashlib.sha256("::".join(parts).encode("utf-8")).hexdigest()[:24]
    return h


def _cache_load(path: Path) -> Optional[dict]:
    if not path.exists():
        return None
    try:
        with path.open() as f:
            return json.load(f)
    except Exception:
        logger.exception("Cache read failed: %s", path)
        return None


def _cache_save(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with path.open("w") as f:
            json.dump(data, f, indent=2)
    except Exception:
        logger.exception("Cache write failed: %s", path)


# --- Prompt builders ----------------------------------------------------

def _pillar_prompt(question_text: str) -> str:
    return f"""Tag the following research question against a 4-pillar framework.

Pillars:
{PILLAR_DEFINITIONS}

Rules:
- Always choose exactly one PRIMARY pillar (the dominant frame).
- Optionally name a SECONDARY pillar if a second pillar is clearly relevant.
- Set cross_cutting=true only if the question meaningfully touches three or
  more pillars — not just two. The cross_cutting flag is for the genuinely
  agenda-spanning questions.
- Keep the rationale to one sentence.

Research question:
{question_text}

Return ONLY a JSON object with this exact shape, no prose:
{{"primary": "<one of: Technology|Training|Self|Society>",
  "secondary": "<one of those four, or null>",
  "cross_cutting": <true|false>,
  "rationale": "<one sentence>"}}"""


def _cross_cutting_prompt(question_text: str) -> str:
    tag_list = "\n".join(f"  - {t}" for t in CROSS_CUTTING_TAGS)
    return f"""Tag the following research question with cross-cutting topics.

Available tags (choose zero or more — only those that meaningfully apply):
{tag_list}

Rules:
- Be conservative. Most questions should get 0–3 tags.
- Tag only if the question is *directly* about the topic, not just adjacent.
- Use the exact tag spelling as listed above.

Research question:
{question_text}

Return ONLY a JSON object with this exact shape, no prose:
{{"tags": ["<tag>", ...],
  "rationale": "<one sentence>"}}"""


def _wg_opener_prompt(
    wg_number: int,
    wg_name: str,
    pillar: str,
    summary: dict,
    top_questions: list[dict],
    top_themes: list[str],
) -> str:
    return f"""You are the chair of a medical consensus conference, drafting a 2-paragraph interpretive opener for the Round 1 results section of Working Group {wg_number} ({wg_name}, pillar: {pillar}).

Headline numbers:
- {summary['n_invited']} members invited; {summary['n_r1_responders']} responded ({summary['response_rate_pct']:.0f}% rate)
- {summary['n_questions']} active questions: {summary['n_confirmed']} confirmed, {summary['n_gray']} gray-zone, {summary['n_removed']} removed, {summary['n_open']} open
- Pairwise: {summary['n_pairwise_voters']} voters, {summary['n_pairwise_votes']} votes
- Delphi importance × pairwise score Spearman ρ = {summary.get('spearman_rho_delphi_pairwise')}
- Free-text comments: {summary['n_comments']}; new questions suggested: {summary['n_suggestions']}

Top 5 questions by Delphi importance (with pairwise score):
{chr(10).join(f"  - Q{q['question_id']}: {q['text'][:140]} — importance {q['importance_mean']:.1f}, pairwise {q['pairwise_score']:.0f}" if q.get('pairwise_score') is not None else f"  - Q{q['question_id']}: {q['text'][:140]} — importance {q['importance_mean']:.1f}, pairwise n/a" for q in top_questions)}

Most-prevalent thematic clusters touching this WG:
{chr(10).join(f"  - {t}" for t in top_themes) if top_themes else "  (none yet)"}

Write 2 short paragraphs (~80-120 words each), in a direct, neutral tone — the chair's voice. The first paragraph should describe what Round 1 surfaced for this WG (use the numbers; pick the 1-2 most striking patterns). The second should highlight what the group should pay attention to going into Round 2 — the gray-zone tension, the high-importance-but-low-pairwise gap, the cross-WG echo, etc. Don't summarize methodology. Don't make recommendations the co-leads should own. Don't be cheerful. Don't open with "In Round 1...".

Return ONLY a JSON object:
{{"opener": "<paragraph 1>\\n\\n<paragraph 2>"}}"""


def _theme_label_prompt(question_texts: list[str]) -> str:
    bullets = "\n".join(f"  - {t}" for t in question_texts)
    return f"""You are labeling a thematic cluster from a research agenda.

The following research questions were grouped together by similarity:
{bullets}

Produce a short label (3-7 words) and a one-sentence description of what
unifies them.

Return ONLY JSON:
{{"label": "<3-7 words>",
  "description": "<one sentence>"}}"""


# --- Output parsing -----------------------------------------------------

def _parse_json(text: str) -> dict:
    """Strict JSON parse with a forgiving fallback for ```json blocks."""
    text = text.strip()
    if text.startswith("```"):
        # Strip code fence
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()
    # Find the first { ... last }
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No JSON object found in: {text[:200]!r}")
    return json.loads(text[start: end + 1])


# --- Tagging passes -----------------------------------------------------

async def tag_pillar_one(
    question_id: int,
    question_text: str,
    *,
    cache_dir: Path,
    model: str,
    refresh: bool,
    semaphore: asyncio.Semaphore,
) -> dict:
    cache_path = cache_dir / "pillar" / f"{_key(str(PILLAR_PROMPT_VERSION), model, question_text)}.json"
    if not refresh:
        hit = _cache_load(cache_path)
        if hit and "primary" in hit:
            return {**hit, "question_id": question_id, "_cached": True}

    async with semaphore:
        prompt = _pillar_prompt(question_text)
        try:
            res = await run_synthesis(prompt, input_data={"question": question_text}, model=model)
            parsed = _parse_json(res["output"])
        except Exception as exc:
            logger.exception("Pillar tagging failed for q=%s: %s", question_id, exc)
            parsed = {"primary": None, "secondary": None, "cross_cutting": False,
                      "rationale": f"failed: {exc!r}"}
        # Validate
        if parsed.get("primary") not in PILLARS:
            parsed["primary"] = None
        if parsed.get("secondary") not in PILLARS:
            parsed["secondary"] = None
        parsed.setdefault("cross_cutting", False)
        # Don't cache failures — they should be retried next run
        if not str(parsed.get("rationale", "")).startswith("failed:"):
            _cache_save(cache_path, parsed)
        return {**parsed, "question_id": question_id, "_cached": False}


async def tag_cross_cutting_one(
    question_id: int,
    question_text: str,
    *,
    cache_dir: Path,
    model: str,
    refresh: bool,
    semaphore: asyncio.Semaphore,
) -> dict:
    cache_path = cache_dir / "cross_cutting" / f"{_key(str(CROSS_CUTTING_PROMPT_VERSION), model, question_text)}.json"
    if not refresh:
        hit = _cache_load(cache_path)
        if hit and "tags" in hit:
            return {**hit, "question_id": question_id, "_cached": True}

    async with semaphore:
        prompt = _cross_cutting_prompt(question_text)
        try:
            res = await run_synthesis(prompt, input_data={"question": question_text}, model=model)
            parsed = _parse_json(res["output"])
        except Exception as exc:
            logger.exception("Cross-cutting tagging failed for q=%s: %s", question_id, exc)
            parsed = {"tags": [], "rationale": f"failed: {exc!r}"}
        # Validate tags against the canonical set
        valid_tags = [t for t in parsed.get("tags", []) if t in CROSS_CUTTING_TAGS]
        parsed["tags"] = valid_tags
        # Don't cache failures — they should be retried next run
        if not str(parsed.get("rationale", "")).startswith("failed:"):
            _cache_save(cache_path, parsed)
        return {**parsed, "question_id": question_id, "_cached": False}


async def label_theme_one(
    cluster_idx: int,
    question_texts: list[str],
    *,
    cache_dir: Path,
    model: str,
    refresh: bool,
    semaphore: asyncio.Semaphore,
) -> dict:
    sig = "::".join(sorted(question_texts))
    cache_path = cache_dir / "theme" / f"{_key('1', model, sig)}.json"
    if not refresh:
        hit = _cache_load(cache_path)
        if hit and "label" in hit:
            return {**hit, "cluster_idx": cluster_idx, "_cached": True}

    async with semaphore:
        prompt = _theme_label_prompt(question_texts)
        try:
            res = await run_synthesis(prompt, input_data={"questions": question_texts}, model=model)
            parsed = _parse_json(res["output"])
        except Exception as exc:
            logger.exception("Theme labeling failed for cluster %s: %s", cluster_idx, exc)
            parsed = {"label": f"Cluster {cluster_idx}", "description": f"failed: {exc!r}"}
        # Don't cache failures — they should be retried next run
        if not str(parsed.get("rationale", "")).startswith("failed:"):
            _cache_save(cache_path, parsed)
        return {**parsed, "cluster_idx": cluster_idx, "_cached": False}


# --- Batch entrypoints --------------------------------------------------

async def tag_all_pillars(
    questions: pd.DataFrame,
    *,
    cache_dir: Optional[Path] = None,
    model: str = DEFAULT_MODEL,
    refresh: bool = False,
    concurrency: int = DEFAULT_CONCURRENCY,
) -> pd.DataFrame:
    cache_dir = cache_dir or DEFAULT_CACHE_DIR
    sem = asyncio.Semaphore(concurrency)
    tasks = [
        tag_pillar_one(int(r["question_id"]), r["text"],
                       cache_dir=cache_dir, model=model, refresh=refresh, semaphore=sem)
        for _, r in questions.iterrows()
    ]
    results = await asyncio.gather(*tasks)
    df = pd.DataFrame(results)
    n_cached = int(df["_cached"].sum()) if "_cached" in df.columns else 0
    logger.info("Pillar tagging done: %d total (%d cached, %d new)",
                len(df), n_cached, len(df) - n_cached)
    return df.drop(columns=["_cached"], errors="ignore")


async def tag_all_cross_cutting(
    questions: pd.DataFrame,
    *,
    cache_dir: Optional[Path] = None,
    model: str = DEFAULT_MODEL,
    refresh: bool = False,
    concurrency: int = DEFAULT_CONCURRENCY,
) -> pd.DataFrame:
    cache_dir = cache_dir or DEFAULT_CACHE_DIR
    sem = asyncio.Semaphore(concurrency)
    tasks = [
        tag_cross_cutting_one(int(r["question_id"]), r["text"],
                              cache_dir=cache_dir, model=model, refresh=refresh, semaphore=sem)
        for _, r in questions.iterrows()
    ]
    results = await asyncio.gather(*tasks)
    df = pd.DataFrame(results)
    n_cached = int(df["_cached"].sum()) if "_cached" in df.columns else 0
    logger.info("Cross-cutting tagging done: %d total (%d cached, %d new)",
                len(df), n_cached, len(df) - n_cached)
    return df.drop(columns=["_cached"], errors="ignore")


async def write_wg_opener(
    wg_number: int,
    wg_name: str,
    pillar: str,
    summary: dict,
    top_questions: list[dict],
    top_themes: list[str],
    *,
    cache_dir: Optional[Path] = None,
    model: str = DEFAULT_MODEL,
    refresh: bool = False,
) -> str:
    cache_dir = cache_dir or DEFAULT_CACHE_DIR
    sig = "::".join([
        str(wg_number),
        str(summary.get('n_r1_responders')),
        str(summary.get('n_confirmed')),
        str(summary.get('n_gray')),
        str(summary.get('n_removed')),
        str(summary.get('n_pairwise_votes')),
        str(round(summary.get('spearman_rho_delphi_pairwise') or 0, 2)),
    ])
    cache_path = cache_dir / "wg_opener" / f"{_key(str(wg_number), '1', model, sig)}.json"
    if not refresh:
        hit = _cache_load(cache_path)
        if hit and "opener" in hit and not str(hit.get("opener", "")).startswith("failed:"):
            return hit["opener"]

    prompt = _wg_opener_prompt(wg_number, wg_name, pillar, summary,
                                top_questions, top_themes)
    try:
        res = await run_synthesis(prompt, input_data={"wg_number": wg_number}, model=model)
        parsed = _parse_json(res["output"])
        opener = parsed.get("opener", "").strip()
    except Exception as exc:
        logger.exception("WG opener generation failed for WG%s: %s", wg_number, exc)
        return ""

    if opener:
        _cache_save(cache_path, {"opener": opener})
    return opener


async def label_themes(
    clusters: list[list[str]],
    *,
    cache_dir: Optional[Path] = None,
    model: str = DEFAULT_MODEL,
    refresh: bool = False,
    concurrency: int = DEFAULT_CONCURRENCY,
) -> list[dict]:
    cache_dir = cache_dir or DEFAULT_CACHE_DIR
    sem = asyncio.Semaphore(concurrency)
    tasks = [
        label_theme_one(i, texts, cache_dir=cache_dir, model=model,
                        refresh=refresh, semaphore=sem)
        for i, texts in enumerate(clusters)
    ]
    results = await asyncio.gather(*tasks)
    return [{k: v for k, v in r.items() if k != "_cached"} for r in results]
