"""Question-text embeddings for similarity / clustering.

Uses sentence-transformers/all-MiniLM-L6-v2 (locked decision in
Round_1_Analysis_Plan.md §8b). Vectors are 384-dim, fast to compute
on CPU, and good enough for short academic-style question text.

Cached on disk keyed by (model, normalized text hash) so re-runs are
free unless the question wording changes.
"""

from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
DEFAULT_CACHE_DIR = Path("reports/cache/embeddings")


def _norm_text(t: str) -> str:
    return " ".join((t or "").split())


def _key(text: str, model: str) -> str:
    h = hashlib.sha256(f"{model}::{_norm_text(text)}".encode("utf-8")).hexdigest()[:24]
    return h


_model_singleton = None


def _load_model():
    global _model_singleton
    if _model_singleton is None:
        from sentence_transformers import SentenceTransformer
        logger.info("Loading embedding model %s", EMBEDDING_MODEL)
        _model_singleton = SentenceTransformer(EMBEDDING_MODEL)
    return _model_singleton


def embed_questions(
    questions: pd.DataFrame,
    *,
    cache_dir: Optional[Path] = None,
    refresh: bool = False,
) -> dict[int, np.ndarray]:
    """Return {question_id: vector}. Reads/writes a per-question JSON cache."""
    cache_dir = cache_dir or DEFAULT_CACHE_DIR
    cache_dir.mkdir(parents=True, exist_ok=True)

    out: dict[int, np.ndarray] = {}
    to_compute: list[tuple[int, str, Path]] = []

    for _, q in questions.iterrows():
        qid = int(q["question_id"])
        text = q.get("text", "") or ""
        cache_path = cache_dir / f"{_key(text, EMBEDDING_MODEL)}.json"
        if not refresh and cache_path.exists():
            try:
                with cache_path.open() as f:
                    out[qid] = np.array(json.load(f)["vector"], dtype=np.float32)
                continue
            except Exception:
                logger.exception("Cache read failed for q=%s; recomputing", qid)
        to_compute.append((qid, text, cache_path))

    if to_compute:
        model = _load_model()
        texts = [t for _, t, _ in to_compute]
        logger.info("Embedding %d new texts (cached: %d)", len(texts), len(out))
        vectors = model.encode(
            texts, normalize_embeddings=True, show_progress_bar=False
        )
        for (qid, text, path), vec in zip(to_compute, vectors):
            v = np.asarray(vec, dtype=np.float32)
            out[qid] = v
            try:
                with path.open("w") as f:
                    json.dump({
                        "model": EMBEDDING_MODEL,
                        "text": text,
                        "vector": v.tolist(),
                    }, f)
            except Exception:
                logger.exception("Cache write failed for q=%s", qid)

    return out


def cosine_similarity_matrix(
    embeddings: dict[int, np.ndarray],
) -> tuple[list[int], np.ndarray]:
    """Return (ordered_qids, NxN cosine similarity matrix)."""
    qids = sorted(embeddings.keys())
    if not qids:
        return [], np.zeros((0, 0), dtype=np.float32)
    M = np.stack([embeddings[q] for q in qids], axis=0).astype(np.float32)
    # Already L2-normalized by encoder, so dot product == cosine
    sim = M @ M.T
    np.fill_diagonal(sim, 1.0)
    return qids, sim
