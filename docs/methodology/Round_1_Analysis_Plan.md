# Round 1 Analysis & Reporting Plan
## SAEM 2026 AI Consensus Conference — Inter-round briefing for the group

**Status:** Draft for review
**Owner:** R. Andrew Taylor (chair)
**Deliverable:** `Round_1_Report_2026-05-XX.docx` — distributed to co-leads and WG members before Round 2 opens
**Inputs:** Production database (closed Round 1 + ongoing pairwise) — Postgres on Railway
**Companion docs:** `AI_Enhanced_Consensus_Methodology.md`, `Cross_WG_Analysis_Pipeline.md`, `AI_Synthesis_Prompts.md`

---

## 1. Goals of this report

1. **Show the group what came out of Round 1** in enough detail that they can interpret Round 2 against it.
2. **Surface where the group already agrees** (≥80% include + high importance) so co-leads know which questions are essentially locked.
3. **Show where the group is divided** — gray-zone questions are the highest-yield material for Round 2 deliberation and conference-day discussion.
4. **Highlight cross-WG overlap and tensions** — where the same idea shows up in multiple WGs, where there are gaps, where there are productive disagreements.
5. **Demonstrate the AI-augmented synthesis layer** in action — themes, suggested revisions, suggested new questions — with full audit transparency.

This is **not** the manuscript. The manuscript figures (consensus_paper_outline.md) cover the full process post-Round-2. This briefing has a narrower job: feed information back to participants so Round 2 is well-informed.

---

## 2. Document structure (DOCX)

```
Cover page
├── Title, date, distribution list
└── 1-paragraph executive summary

Section A — Process overview                                   (~2 pages)
├── A.1 What happened in Round 1 (timeline + counts)
├── A.2 Methods recap (1/2 page; ref full methodology doc)
└── A.3 How to read this report

Section B — Headline numbers                                   (~3 pages)
├── B.1 Participation table (per WG)
├── B.2 Question-level outcomes (per WG)
├── B.3 Confirmed / gray / removed buckets across all WGs
└── B.4 Top 10 across all WGs by Delphi importance + pairwise

Section C — Per-WG deep-dive                                   (~4–5 pages × 5 WGs)
For each WG (1–5):
├── C.x.1 Participation snapshot
├── C.x.2 Disposition + importance per question (figures)
├── C.x.3 Pairwise ranking (figure + table)
├── C.x.4 Concordance: Delphi importance vs. pairwise score
├── C.x.5 Comment themes (AI synthesis, human-reviewed)
├── C.x.6 New questions suggested
└── C.x.7 Round 2 implications — what changes, what's locked

Section D — Cross-WG analysis                                  (~5 pages)
├── D.1 Question similarity network (figure)
├── D.2 Detected overlap pairs (table — WG vs WG, similarity score)
├── D.3 Theme clusters across the agenda (dendrogram + AI labels)
├── D.4 Pillar coverage matrix (Technology / Training / Self / Society)
├── D.5 Cross-cutting topics (equity, vulnerable populations, deployment-readiness, etc.)
└── D.6 Gaps surfaced by AI

Section E — Round 2 plan                                       (~1 page)
├── E.1 Which questions go forward unchanged
├── E.2 Which questions go forward revised (and how)
├── E.3 Which questions retire
└── E.4 Asks of co-leads and members for Round 2

Appendices
├── Appendix 1 — Full question list per WG with all stats (long-format table)
├── Appendix 2 — All R1 free-text comments by question (anonymous)
└── Appendix 3 — AI synthesis audit log (model, prompt, output, human decisions)
```

Target length: **35–50 pages** depending on WG size. Per-WG sections are the bulk.

---

## 3. Per-question metrics (the atomic unit of the report)

Every question, every WG section, the same six numbers:

| Metric | Source | Calculation |
|---|---|---|
| `r1_include_pct` | `delphi_responses` | (votes where disposition='INCLUDE') ÷ total votes for that question |
| `r1_modify_pct` | same | (votes='INCLUDE_WITH_MODIFICATIONS') ÷ total |
| `r1_exclude_pct` | same | (votes='EXCLUDE') ÷ total |
| `r1_importance_mean` | `importance_rating` | mean (1–9 Likert) |
| `r1_importance_median` (+ IQR) | same | median, p25, p75 |
| `pairwise_score` | `pairwise_votes` | Bradley-Terry: (wins+1)/(wins+losses+2) × 100 |

All six already exist on the `questions` table — `compute-results` recomputes them. The plan **assumes we run `compute-results` for each WG once before generating the report**, so the values are current as of the report's timestamp.

**Consensus buckets** (used throughout):
- **Confirmed:** include% ≥ 80% AND importance mean ≥ 7
- **Near-consensus / gray-zone:** include% 60–79% OR (include% ≥ 80% AND importance mean < 7)
- **Removed:** exclude% ≥ 80% (or include% < 40% AND no path to consensus)
- **Open:** everything else — heads to Round 2 unchanged

These thresholds match the methodology doc; the report uses them but does **not** apply them automatically — co-leads still make the final call per question.

---

## 4. Figures and tables

### 4.1 Per-WG figures

| # | Figure | What it shows | How it's built |
|---|---|---|---|
| **F1** | **Question disposition bar chart** | Stacked horizontal bar, one row per question (sorted by include%): green = include, amber = modify, red = exclude. Length = total respondents. | `matplotlib.barh` w/ stacked colors, n on right axis |
| **F2** | **Importance distribution per question** | Vertical strip/violin per question (sorted by mean importance) showing all 1–9 votes. Highlights consensus tightness. | `seaborn.stripplot` or `violinplot` |
| **F3** | **Pairwise leaderboard** | Horizontal bar of Bradley-Terry score (top to bottom), with wins/losses annotation. 95% Wilson CI as error bar. | `matplotlib.barh` + `statsmodels.stats.proportion.proportion_confint` |
| **F4** | **Concordance scatter** | x = `r1_importance_mean`, y = `pairwise_score`. Points = questions. Color by consensus bucket. Annotated outliers (high Delphi / low pairwise or vice versa — disagreement between methods). | `matplotlib.scatter` + Spearman ρ in title |
| **F5** | **Disposition heatmap** | Rows = questions, columns = each respondent (anonymized as P1, P2…). Cells colored by their disposition vote. Shows individual divergence patterns. | `seaborn.heatmap` |

### 4.2 Cross-WG figures

| # | Figure | What it shows | How it's built |
|---|---|---|---|
| **F6** | **Question similarity network** | Force-directed graph. Nodes = questions (color by WG, size by `r1_importance_mean`). Edges = cosine similarity above threshold (e.g., 0.55). Cross-WG edges drawn thicker / red to highlight overlap. | Embeddings (Anthropic API, `voyage-3` or sentence-transformers MiniLM as fallback) → cosine sim matrix → `networkx` graph → spring layout → matplotlib export |
| **F7** | **Theme dendrogram** | Hierarchical clustering of all confirmed + gray questions across all WGs. Cluster labels generated by AI summarization of leaf questions. | `scipy.cluster.hierarchy.linkage` (Ward, on cosine distance) → AI labels via existing `theme_clustering` prompt |
| **F8** | **Pillar coverage matrix** | 4-pillar (Technology / Training / Self / Society) × 5 WG grid. Cells = count of confirmed/gray questions tagged to that pillar. | AI tags each question with primary + secondary pillar; tally |
| **F9** | **Cross-cutting topic heatmap** | Rows = pre-defined cross-cutting tags (equity, pediatrics, low-resource settings, deployment readiness, model drift, governance, …). Columns = WGs. Cell intensity = # of questions touching that topic. | AI tags each question; counts by WG |
| **F10** | **Process flow Sankey** *(optional)* | Questions entering R1 → confirmed / gray / removed → projected R2 input. Counts as flow widths. | `plotly` Sankey rendered to PNG |

### 4.3 Tables (rendered as Word tables, not images)

- **T1** Participation per WG: members invited, R1 respondents, R1 completion rate, mean responses per member, pairwise voters, total pairwise votes, unique-pair coverage %, free-text comments, suggested questions.
- **T2** Confirmed questions (cross-WG roll-up): question text, WG, include%, importance mean (IQR), pairwise rank within WG.
- **T3** Gray-zone questions (cross-WG roll-up): same columns, sorted by include% ascending so the most contested float to the top.
- **T4** Cross-WG overlap pairs (top 25): WG_A | Question A | WG_B | Question B | similarity | recommended action (complementary / coordinate / merge).
- **T5** Per-WG full results: every question with all six metrics, consensus bucket, and a "co-lead disposition for R2" empty column the co-leads fill in.
- **T6** AI synthesis audit summary: run id, prompt name, model, # items produced, # accepted/modified/rejected by human review.

---

## 5. AI-augmented analyses

These call the **existing** prompts in `AI_Synthesis_Prompts.md`. Nothing new to author — just runs we trigger between R1 close and report generation.

| Component | Prompt | Scope | Human-review gate |
|---|---|---|---|
| Comment theme clustering | A | per WG, gray-zone questions only | co-lead confirms/edits 3–5 themes per question |
| Question revision suggestions | B | per WG, gray-zone questions only | co-lead accepts / modifies / rejects each suggestion |
| New-question synthesis | C | per WG, all suggestions from Delphi free-text | co-lead promotes / merges / drops |
| Cross-WG overlap detection | D | all WGs, confirmed + gray questions | planning committee validates each flagged pair |
| Theme clustering across the agenda | (new) | all WGs, confirmed + gray questions | one-time read by chair before report goes out |
| Cross-cutting topic tagging | (new) | all questions | AI tags, chair spot-checks 10% |
| Pillar tagging | (new) | all questions | AI tags, chair spot-checks 10% |

The "new" rows above are simple zero-shot tagging tasks — not full synthesis. They reuse the existing AISynthesisRun audit infrastructure so everything is logged.

**Embeddings** for similarity (F6, F7): use Voyage AI's `voyage-3` (Anthropic-recommended) or the local `sentence-transformers/all-MiniLM-L6-v2` if we want to keep the pipeline self-contained. Cache to disk per question id so it's free on re-runs.

---

## 6. Statistical methods (concrete)

| Question | Method |
|---|---|
| Is Delphi importance correlated with pairwise priority within a WG? | Spearman ρ + p-value, by WG and overall |
| How aligned are the WGs in their importance ratings of the same shared topics? | Kendall's W on cross-WG paired questions (after similarity-based pairing) |
| Which respondents are systematically more/less inclusive than the group? | Per-respondent include% vs WG mean — flag respondents > 1.5 SD off (anonymized in the report) |
| How tight is consensus on each question? | Importance IQR + bimodality check (Hartigan's dip test) — flag bimodal distributions for special discussion |
| Is the pairwise score stable yet? | Bradley-Terry score 95% Wilson CI; report unstable scores explicitly |
| Are any questions getting 0 pairwise votes? | Frequency table; flag pairs that need showing more |

All of this fits in <150 lines of Python — `pandas` + `scipy.stats` + `statsmodels`. No heavy modeling.

---

## 7. Implementation plan

### 7.1 Script layout

```
platform/scripts/round1_report/
├── __init__.py
├── data.py            # Pulls all rows from prod; caches as parquet
├── stats.py           # Per-question + per-WG aggregations
├── ai_runs.py         # Triggers AI prompts via existing /api/analysis routes
├── embeddings.py      # Question text → vector (Voyage or sentence-transformers)
├── figures/
│   ├── per_wg.py      # F1–F5 (one function per fig, takes a WG id)
│   ├── cross_wg.py    # F6–F10
│   └── style.py       # Matplotlib rcparams, color palette per WG/pillar
├── docx_render.py     # Builds the .docx using python-docx
└── main.py            # Orchestrator: fetch → stats → ai → figs → docx
```

Run as:
```
railway run python3 -m scripts.round1_report.main \
  --output reports/Round_1_Report_2026-05-02.docx
```

### 7.2 Dependencies to add

```
python-docx          # Word output
matplotlib + seaborn # static figures
networkx             # similarity graph
scipy + statsmodels  # stats
sentence-transformers OR voyageai  # embeddings (pick one)
```

All add to `requirements.txt`. Total install size ~150 MB (sentence-transformers brings torch); Voyage API is lighter but external.

### 7.3 Suggested order to build

1. **Data pull + per-question stats DataFrame** (foundation; ~1 hour) — produces a long-format CSV that anything downstream consumes.
2. **DOCX skeleton + Section A/B** (so we have a runnable end-to-end early) — ~2 hours.
3. **Per-WG section + F1–F4** — most of the value; ~3–4 hours.
4. **AI synthesis runs + F5 themes** — ~2 hours; mostly orchestration of existing endpoints.
5. **Cross-WG embeddings + F6 network** — ~2–3 hours.
6. **F7 theme dendrogram + F8/F9 coverage matrices** — ~2 hours.
7. **Section E auto-draft + appendices** — ~1 hour.

Roughly **a single focused day** to get a v1 draft generated end-to-end. After that we iterate on what looks good and refine.

### 7.4 Reproducibility

- Every run writes a `reports/Round_1_Report_<UTC-timestamp>/manifest.json` with: git SHA, DB snapshot timestamp, model versions used, embedding cache hash, AI prompt versions.
- All intermediate parquet files saved alongside.
- AI synthesis runs continue to populate `ai_synthesis_runs` for the platform's audit log.

---

## 8. Open questions for you to weigh in on before I build

1. **Embedding model:** `voyage-3` (API; ~$0.05 for the whole agenda; needs a key) vs. local `sentence-transformers` (free; +150 MB to the deploy; same-ish quality on short academic text). Default to local unless you object.
2. **Pillar tagging:** AI assigns each question a single primary + optional secondary pillar. Want a third "ambiguous" bucket so we don't force false precision?
3. **Cross-cutting tags:** start with the list we already have in WG descriptions (equity, pediatrics, rural/low-resource, drift, governance, deployment readiness, validation, oversight) — add anything you want.
4. **Anonymization in F5 (per-respondent disposition heatmap):** do you want it in the report at all? It's powerful for spotting outliers but participants seeing their own row might affect future-round behavior.
5. **Audience:** is this for **co-leads only** (I can be franker about gray-zone questions and contested votes), or for **all WG members** (I should soften some labels)? The methodology doc implies all members. Confirm.
6. **Conference paper figures:** the manuscript outline already names Figures 1–4 for the proceedings paper. The figures here (F1–F10) are a superset. Do you want me to label them so the proceedings ones are clearly marked / reusable?
7. **Pairwise non-completion impact:** WG2 has only 4 unique pairwise voters / 209 votes. The Bradley-Terry scores there are noisy. Want me to (a) include with a "low confidence" warning, (b) exclude pairwise from WG2's section, or (c) hold the pairwise piece until completion is closer to target?

---

## 8b. Locked decisions (2026-05-02)

1. **Embedding model** — local `sentence-transformers/all-MiniLM-L6-v2`. Cached in DB, 150 MB image growth accepted.
2. **Pillar tagging** — primary pillar required + optional secondary + boolean `cross_cutting` flag for questions touching 3+ pillars. No "ambiguous" bucket.
3. **Cross-cutting tag set (10)** — Equity, Pediatrics, Rural/low-resource, Drift/lifecycle, Governance, Deployment readiness, Validation, Privacy, Bias, Trust/explainability.
4. **F5 per-respondent disposition heatmap** — built; gated to co-lead and admin tiers only. Not in member view, not in DOCX.
5. **Tone** — neutral / factual (option A) across all tiers. Single voice; tier differences are about *what data* is shown, not *how* it's worded. Driven by Claude Opus output.
6. **Figure reuse** — single figure functions parameterized with `style="screen"|"print"` and `width=...`. Round 1 report figures labeled so they trace cleanly to manuscript figures (R1.F6 → Manuscript F2, etc.).
7. **WG2 thin pairwise** — include with low-confidence warning. Auto-flag any WG with <100 unique pairs covered or <8 unique pairwise voters. Threshold configurable; turns off automatically once data fills in. Re-pull pairwise counts immediately before each report generation.
8. **AI model** — `claude-opus-4-7` (default in `ai_synthesis.py`).
9. **Architecture** — built into the platform: shared engine in `backend/services/round1_report/`, admin-only DOCX endpoint, gated in-app views replacing the current admin-only `/results` page.

## 9. What this report does **not** do

- **Does not project Round 2 outcomes** — only describes Round 1.
- **Does not auto-decide** which questions move forward — co-leads still own that call per question.
- **Does not recompute pairwise scores after the report runs** — the platform keeps doing that live; report is a snapshot at timestamp T.
- **Does not include conference-day data** — that's a separate report after May 21.
