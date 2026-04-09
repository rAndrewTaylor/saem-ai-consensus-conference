# Cross-Working-Group AI Analysis Pipeline
## SAEM 2026 AI Consensus Conference

---

## Purpose

After the Delphi process completes for all five working groups, this pipeline uses AI-assisted analysis to identify thematic connections, overlaps, gaps, and tensions across the full research agenda. The output informs the conference-day synthesis presentation and the proceedings manuscript.

---

## Timeline

| Date | Step |
|---|---|
| May 9 | Delphi Round 2 closes for all WGs |
| May 10 | Planning committee compiles all final data |
| May 10-11 | Cross-WG AI analysis runs |
| May 11 | Planning committee reviews AI output |
| May 12 | Share findings with co-leads; incorporate into 2-page summaries |
| May 13-14 | Refine cross-WG synthesis for conference presentation |
| May 15 | Cross-WG analysis distributed to all registered attendees with summaries |
| May 21 | Presented at conference as a synthesis layer |

---

## Input Data (Compiled by Planning Committee)

For each of the 5 working groups, compile:

### Quantitative
- Final consensus question list with Round 1 and Round 2 % agreement
- Mean and median importance ratings per question (both rounds)
- Pairwise comparison rankings and scores
- Response rates per round
- Number of questions: confirmed, near-consensus, not confirmed

### Qualitative
- Key themes from free-text comments (from AI synthesis reports)
- Co-lead meeting notes (Meetings 1-3)
- Evidence brief key findings and gaps
- New questions suggested by participants

### Contextual
- Working group descriptions (scope boundaries)
- The conference subtitle framework: Technology, Training, Self, Society

---

## Analysis Steps

### Step 1: Overlap Detection (Prompt D from AI_Synthesis_Prompts.md)

Run Cross-WG Overlap Detection prompt with all 5 WGs' final question lists.

**Expected output:**
- Pairs/groups of overlapping questions across WGs
- Recommendation: complementary, coordinate, or merge
- Questions that appear in different forms across multiple WGs

**Human review:**
- Planning committee validates each flagged overlap
- Consult co-leads where overlap suggests scope boundary issues
- Document resolution: questions kept separate (complementary), coordinated (cross-referenced), or merged

### Step 2: Gap Analysis

Using the overlap detection output plus the working group descriptions, identify what's missing.

**Process:**
1. List all suggested topics from WG descriptions that do NOT map to any confirmed consensus question
2. Review all "new question" suggestions from Delphi that were not added — are any of these gaps?
3. Review free-text comments for recurring themes not captured in any question
4. Check cross-cutting themes: equity, priority populations, vulnerable communities — are these adequately represented across WGs?

**Expected output:**
- List of identified gaps with assessment of severity (critical gap vs. minor omission)
- Recommendation: which WG (or cross-WG effort) should address each gap
- Note: gaps may reflect genuine field priorities (some topics aren't ready for a research agenda) — don't treat every gap as a problem

### Step 3: Research Agenda Synthesis (Prompt F from AI_Synthesis_Prompts.md)

Run the Post-Delphi Cross-WG Research Agenda Analysis prompt.

**Expected output:**
- 5-8 overarching themes cutting across WGs
- 5 "pillars" of the 10-year research agenda
- Strongest signals (highest consensus + importance)
- Productive tensions for conference-day discussion
- Visual concept for the research agenda map

**Human review:**
- Planning committee reviews thematic groupings — do they make sense?
- Co-leads validate that their WG's questions are correctly mapped
- Refine the "pillars" and visual concept collaboratively

### Step 4: Tension Mapping

From the overlap and synthesis analyses, identify 3-5 productive tensions:

**Examples of what these might look like:**
- Speed of deployment (WG1) vs. governance safeguards (WG5)
- Technical interoperability (WG2) vs. privacy protection (WG5)
- AI augmenting clinicians (WG4) vs. AI automating tasks (WG1)
- Standardized competencies (WG3) vs. rapidly evolving technology (WG2)

**For each tension:**
- Frame as a discussion question, not a problem to solve
- Identify which WGs are in tension
- Suggest how conference-day breakout discussions might address it

### Step 5: Concordance Analysis

Compare the three prioritization data streams:

| Data Stream | Source | Scale |
|---|---|---|
| Delphi importance | Round 2 mean importance rating | 1-9 ordinal |
| Pairwise ranking | All Our Ideas score | 0-100 ratio |
| (After conference) Audience priority | 100-point allocation | Ratio |

**Analysis:**
- Spearman rank correlation between Delphi importance and pairwise ranking (per WG and overall)
- Identify discordant questions: high in one method, low in another
- After conference day, add the audience allocation data as a third comparator

This three-way concordance is a key finding for the methodology paper.

---

## Outputs

### For Co-Leads (May 12)

A 2-3 page briefing per WG containing:
- How their questions connect to other WGs (overlaps and synergies)
- Any gaps in their domain identified by the cross-WG analysis
- Tensions their WG is part of (for conference-day awareness)
- Suggested talking points for their conference presentation

### For Conference Attendees (May 15, distributed with 2-page summaries)

A 1-page "Research Agenda at a Glance" document:
- Visual map of the research agenda showing all 5 WGs and their interconnections
- Top 3-5 themes cutting across all WGs
- 2-3 key tensions to discuss at the conference
- Total number of consensus questions across all WGs

### For Conference-Day Presentation

A synthesis presentation (10-15 min) by the conference chair, covering:
- How the 5 WGs' agendas interconnect
- The overarching themes and pillars
- Key tensions for audience discussion
- The "big picture" of AI in EM research for the next decade

### For the Proceedings Manuscript

- Cross-WG thematic analysis section
- Concordance data (Delphi vs. pairwise vs. audience)
- Overlap resolution documentation
- Gap analysis findings
- Research agenda visualization

### For the Methods Paper

- Full documentation of the AI analysis pipeline
- Prompts used, outputs generated, human review decisions
- Concordance statistics
- Assessment of AI analysis accuracy and utility

---

## Quality Control

- All AI outputs reviewed by at least 2 planning committee members
- Co-leads review findings relevant to their WG
- Any factual errors in AI output (mischaracterized questions, incorrect groupings) are corrected and documented
- The raw AI outputs are archived alongside the corrected final versions
- Discrepancies between AI analysis and human judgment are noted — these are data points for the methods paper, not failures
