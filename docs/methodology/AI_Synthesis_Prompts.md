# AI Synthesis Prompts
## SAEM 2026 AI Consensus Conference
### Structured Prompts for Inter-Round Analysis

All prompts below are designed for use with Claude or GPT-4 class models. Each prompt includes the purpose, input format, expected output format, and the exact prompt text. Co-leads review all outputs before any action is taken.

**Documentation requirement:** For every prompt execution, log the following:
- Date/time
- Model name and version
- Exact prompt used (including any data pasted in)
- Raw model output (complete)
- Human reviewer name
- Human review decisions (accept/reject/modify per item)

---

## Prompt A: Comment Theme Clustering

### Purpose
Synthesize all free-text comments for a single Delphi question into coherent themes to help co-leads quickly understand the range of feedback.

### Input Format
Prepare a document with:
- The research question text
- All free-text comments (anonymized, numbered)

### Prompt

```
You are assisting with a medical research consensus process (modified Delphi method). Your role is to organize free-text feedback, not to make decisions.

RESEARCH QUESTION:
"{question_text}"

ROUND 1 RESULTS:
- Include: {n}% ({count})
- Include with modifications: {n}% ({count})  
- Exclude: {n}% ({count})
- Mean importance rating: {mean} (median: {median}, IQR: {q1}-{q3})

FREE-TEXT COMMENTS (anonymized):
{numbered list of all comments}

TASK:
1. Identify 3-5 distinct themes across these comments. For each theme:
   - Give it a concise label (3-5 words)
   - Write a 1-2 sentence summary of the theme
   - List which comment numbers fall under this theme (comments may belong to multiple themes)
   - Include 1-2 representative direct quotes

2. Identify any comments that don't fit neatly into the themes above and note them as "outlier perspectives"

3. Note if there are any direct contradictions between commenters (e.g., one says the question is too broad, another says too narrow)

FORMAT your response as:

THEME 1: [Label]
Summary: ...
Comments: #X, #Y, #Z
Representative quotes: "..." "..."

[repeat for each theme]

OUTLIER PERSPECTIVES:
- ...

CONTRADICTIONS:
- ...

Do NOT suggest revisions to the question. Do NOT make recommendations. Simply organize the feedback.
```

---

## Prompt B: Question Revision Suggestions

### Purpose
Generate concrete revision options for questions that received "Include with modifications" votes, based on the feedback provided.

### Input Format
- Original question text
- All "modify" comments
- Voting results

### Prompt

```
You are assisting medical researchers revise a research question for a Delphi consensus process. You are suggesting options, not making final decisions. The working group co-leads will choose the final wording.

ORIGINAL QUESTION:
"{question_text}"

ROUND 1 VOTING:
- Include: {n}%
- Include with modifications: {n}%
- Exclude: {n}%

COMMENTS FROM "INCLUDE WITH MODIFICATIONS" VOTERS:
{numbered list of modification suggestions}

COMMENTS FROM "EXCLUDE" VOTERS (for context):
{numbered list of exclusion rationales}

TASK:
Suggest 1-3 revised versions of this question. For each revision:
1. Provide the revised question text
2. Explain what you changed and why (referencing specific comment numbers)
3. Note which voter concerns this revision addresses and which it does not

CONSTRAINTS:
- Each revised question must be a single, specific, empirically testable research question
- The question must be relevant to emergency medicine
- The question should be answerable through funded research within 10 years
- Preserve the core intent of the original question unless multiple commenters flagged the core intent as the problem
- Do not combine multiple questions into one — if the feedback suggests the question should be split, suggest separate questions

FORMAT:

REVISION 1:
Question: "..."
Changes: ...
Addresses concerns from: Comments #X, #Y
Does not address: Comments #Z (because ...)

[repeat for each revision]

RECOMMENDATION: Which revision best balances the feedback? (Co-leads will make the final decision.)
```

---

## Prompt C: New Question Synthesis

### Purpose
Organize and deduplicate new research questions suggested by participants in the open-ended section of the Delphi survey.

### Input Format
- All suggested new questions from the "additional questions" section
- The existing question list for context

### Prompt

```
You are helping organize new research questions suggested during a Delphi consensus process for an AI in Emergency Medicine conference.

WORKING GROUP: {wg_name}
WORKING GROUP SCOPE: {brief scope description}

EXISTING QUESTIONS (already in the Delphi survey):
{numbered list of all current questions}

NEW QUESTIONS SUGGESTED BY PARTICIPANTS (raw, as submitted):
{numbered list of all suggestions}

TASK:
1. CATEGORIZE each suggested question:
   a. DUPLICATE — Essentially the same as an existing question (specify which one)
   b. REFINEMENT — A more specific or differently angled version of an existing question (specify which one)
   c. GENUINELY NEW — Addresses a topic not covered by existing questions
   d. OUT OF SCOPE — Falls outside this working group's domain (suggest which WG it belongs to, if any)

2. For items categorized as GENUINELY NEW:
   - Suggest polished question wording that meets the standard: specific, empirically testable, relevant to EM, fundable
   - Group related new suggestions together if they address the same underlying topic

3. For items categorized as REFINEMENT:
   - Note whether the refinement adds meaningful specificity that the existing question lacks

FORMAT:

DUPLICATES:
- Suggestion #X → Duplicate of existing Q#Y (explanation)

REFINEMENTS:
- Suggestion #X → Refines existing Q#Y
  Added value: [yes/no] — [explanation]

GENUINELY NEW:
1. Suggested wording: "..."
   Based on: Suggestion(s) #X, #Y
   Rationale: ...

OUT OF SCOPE:
- Suggestion #X → Better fit for WG# (explanation)

SUMMARY: {N} suggestions total → {n} duplicates, {n} refinements, {n} genuinely new, {n} out of scope
```

---

## Prompt D: Cross-WG Overlap Detection

### Purpose
Identify thematic overlaps, tensions, and gaps across all five working groups after Round 1.

### Input Format
- All 5 WGs' question lists with Round 1 voting results
- Working group descriptions (scope)

### Prompt

```
You are analyzing research questions across five working groups for an AI in Emergency Medicine consensus conference. Your goal is to identify overlaps, tensions, and gaps to help the planning committee coordinate across groups.

WORKING GROUP DESCRIPTIONS:
WG1 — Clinical Practice & Operations: {brief scope}
WG2 — Infrastructure & Data: {brief scope}
WG3 — Education & Training: {brief scope}
WG4 — Human-AI Interaction: {brief scope}
WG5 — Ethics, Legal & Societal: {brief scope}

ROUND 1 QUESTIONS AND RESULTS:

WG1:
{numbered list with % include for each}

WG2:
{numbered list with % include for each}

WG3:
{numbered list with % include for each}

WG4:
{numbered list with % include for each}

WG5:
{numbered list with % include for each}

TASK:

1. OVERLAPS: Identify pairs (or groups) of questions across different WGs that address substantially the same topic from different angles. For each overlap:
   - List the specific questions involved (WG# Q#)
   - Describe what they share
   - Suggest whether they should be: (a) kept as complementary perspectives, (b) coordinated to avoid redundancy, or (c) merged

2. TENSIONS: Identify questions across WGs that may pull in opposite directions or reflect competing priorities. For each tension:
   - List the specific questions
   - Describe the tension
   - Frame it as a productive question for conference-day discussion

3. GAPS: Compare the combined question list against the working group descriptions. Identify:
   - Topics from the WG descriptions that no question addresses
   - Cross-cutting themes (especially equity, priority populations) that may be underrepresented
   - Emerging themes visible in free-text comments but not captured in any question

4. CONNECTIONS: Identify questions that would benefit from cross-WG collaboration (e.g., a WG1 clinical question that requires WG2 infrastructure or WG5 governance consideration)

FORMAT:

OVERLAPS:
1. WG{X} Q{N} <-> WG{Y} Q{M}
   Shared theme: ...
   Recommendation: ...

TENSIONS:
1. WG{X} Q{N} vs. WG{Y} Q{M}
   Tension: ...
   Discussion question: "..."

GAPS:
1. Missing topic: ...
   Should be addressed by: WG{X} or cross-cutting

CONNECTIONS:
1. WG{X} Q{N} relates to WG{Y} Q{M}
   Nature of connection: ...
```

---

## Prompt E: Round Summary Report

### Purpose
Generate a structured summary of Round 1 results for each working group, combining quantitative data with thematic analysis of comments.

### Input Format
- Complete Round 1 data export for one WG

### Prompt

```
You are preparing a structured summary of Delphi Round 1 results for a working group co-lead meeting. Present the data clearly and objectively.

WORKING GROUP: {wg_name}
RESPONSE RATE: {n}/{total} ({%})

ROUND 1 RESULTS:
{For each question: text, % include, % modify, % exclude, mean importance, all comments}

TASK:
Produce a structured briefing document with these sections:

1. EXECUTIVE SUMMARY (3-4 sentences)
   - Response rate
   - How many questions confirmed (>=80%), gray zone (21-79%), removed (<=20%)
   - Overall themes from the feedback

2. CONFIRMED QUESTIONS (>=80% include)
   List each with % agreement and mean importance. Flag any with notable comments even though they reached consensus.

3. GRAY ZONE QUESTIONS (21-79% include) — PRIORITY FOR DISCUSSION
   For each, provide:
   - The question text
   - Voting breakdown
   - Key issue: Is it a wording problem, scope problem, or genuine disagreement?
   - Summary of comments (2-3 sentences)
   - Suggested discussion prompt for the co-lead meeting

4. REMOVED QUESTIONS (<=20% include)
   List each with brief note on why participants voted to exclude.

5. NEW QUESTIONS SUGGESTED
   Organized list (see Prompt C output if available)

6. NOTABLE PATTERNS
   - Any cross-cutting feedback themes (e.g., "multiple comments mention equity")
   - Unusual voting patterns (e.g., bimodal importance ratings)
   - Suggestions that affect the overall scope or direction

Keep the tone neutral and factual. Present the data; do not make recommendations about what the group should do.
```

---

## Prompt F: Post-Delphi Cross-WG Research Agenda Analysis

### Purpose
After both Delphi rounds complete, analyze the full research agenda across all 5 WGs for the conference-day synthesis presentation.

### Prompt

```
You are analyzing the complete research agenda produced by five working groups for the SAEM 2026 AI Consensus Conference. This analysis will be presented at the conference to help attendees see the big picture.

FINAL CONSENSUS QUESTIONS (all WGs combined):

WG1 — Clinical Practice & Operations:
{numbered list with R2 % agreement}

WG2 — Infrastructure & Data:
{numbered list with R2 % agreement}

WG3 — Education & Training:
{numbered list with R2 % agreement}

WG4 — Human-AI Interaction:
{numbered list with R2 % agreement}

WG5 — Ethics, Legal & Societal:
{numbered list with R2 % agreement}

TASK:

1. THEMATIC MAP
   Identify 5-8 overarching themes that cut across multiple working groups. For each:
   - Theme name
   - Which WG questions contribute to this theme
   - A 2-3 sentence narrative of what the field is saying about this theme

2. THE "SKELETON" OF THE RESEARCH AGENDA
   If you had to describe the 10-year research agenda for AI in emergency medicine in 5 key pillars, what would they be? Map each consensus question to a pillar.

3. STRONGEST SIGNALS
   Which questions reached the highest consensus (%) and importance ratings across all WGs? What does this tell us about the field's most urgent priorities?

4. PRODUCTIVE TENSIONS
   Identify 2-3 tensions in the agenda where working groups' priorities may compete (e.g., rapid deployment vs. careful governance). Frame these as conference discussion topics.

5. WHAT'S MISSING
   Based on the working group descriptions and the broader landscape of AI in medicine, what important topics did NOT make it through the consensus process? Why might that be?

6. VISUAL CONCEPT
   Suggest a visual metaphor or diagram structure that could represent this research agenda (e.g., a hub-and-spoke model, concentric circles, a roadmap with phases). Describe it in enough detail that a graphic designer could produce it.

FORMAT: Use clear headers and concise language suitable for a conference presentation. This will be reviewed by the planning committee before use.
```

---

## Usage Notes

### Model Selection
- These prompts are designed for Claude (Sonnet or Opus) or GPT-4 class models
- Use the same model consistently within a single WG's analysis for reproducibility
- Document the exact model version used

### Data Privacy
- All participant comments should be anonymized before input (no names, just comment numbers)
- Do not include email addresses or institutional affiliations in prompts
- If using cloud-based AI, confirm the data handling policy is acceptable for research data

### Prompt Versioning
- These prompts are version 1.0 (April 2026)
- Any modifications during the process should be documented with rationale
- Store all prompt versions in the GitHub repository

### Quality Control
- Never use AI output directly without human review
- If AI output seems inaccurate or mischaracterizes comments, re-run with a clarifying instruction rather than accepting
- When in doubt, flag for planning committee review
