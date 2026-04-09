"""AI synthesis service — Claude API integration for consensus analysis."""

import os
import anthropic
from typing import Optional

# Initialize client — uses ANTHROPIC_API_KEY env var
client = anthropic.Anthropic()

DEFAULT_MODEL = "claude-sonnet-4-20250514"


async def run_synthesis(prompt: str, input_data: dict, model: Optional[str] = None) -> dict:
    """Run a synthesis prompt through Claude and return the result."""
    model = model or DEFAULT_MODEL

    message = client.messages.create(
        model=model,
        max_tokens=8192,
        messages=[
            {"role": "user", "content": prompt}
        ],
        system="You are an expert research methodologist assisting with a medical consensus conference. Your role is to organize and synthesize data, not to make decisions. Be precise, structured, and neutral. Follow the output format specified in the prompt exactly.",
    )

    return {
        "model": model,
        "model_version": message.model,
        "output": message.content[0].text,
        "usage": {
            "input_tokens": message.usage.input_tokens,
            "output_tokens": message.usage.output_tokens,
        },
    }


# --- Prompt Templates ---
# These mirror the prompts from AI_Synthesis_Prompts.md but as Python format strings.
# Variables in {braces} are filled from input_data.

PROMPTS = {
    "theme_clustering": """You are assisting with a medical research consensus process (modified Delphi method). Your role is to organize free-text feedback, not to make decisions.

RESEARCH QUESTION:
"{question_text}"

ROUND 1 RESULTS:
- Include: {include_pct}% ({include_count})
- Include with modifications: {modify_pct}% ({modify_count})
- Exclude: {exclude_pct}% ({exclude_count})
- Mean importance rating: {mean} (median: {median}, IQR: {q1}-{q3})

FREE-TEXT COMMENTS (anonymized):
{comments}

TASK:
1. Identify 3-5 distinct themes across these comments. For each theme:
   - Give it a concise label (3-5 words)
   - Write a 1-2 sentence summary of the theme
   - List which comment numbers fall under this theme
   - Include 1-2 representative direct quotes

2. Identify any comments that don't fit neatly into the themes above and note them as "outlier perspectives"

3. Note if there are any direct contradictions between commenters

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

Do NOT suggest revisions to the question. Do NOT make recommendations. Simply organize the feedback.""",

    "question_revision": """You are assisting medical researchers revise a research question for a Delphi consensus process. You are suggesting options, not making final decisions.

ORIGINAL QUESTION:
"{question_text}"

ROUND 1 VOTING:
- Include: {include_pct}%
- Include with modifications: {modify_pct}%
- Exclude: {exclude_pct}%

COMMENTS FROM "INCLUDE WITH MODIFICATIONS" VOTERS:
{modify_comments}

COMMENTS FROM "EXCLUDE" VOTERS (for context):
{exclude_comments}

TASK:
Suggest 1-3 revised versions of this question. For each revision:
1. Provide the revised question text
2. Explain what you changed and why (referencing specific comment numbers)
3. Note which voter concerns this revision addresses and which it does not

CONSTRAINTS:
- Each revised question must be a single, specific, empirically testable research question
- Relevant to emergency medicine
- Answerable through funded research within 10 years
- Preserve the core intent unless multiple commenters flagged it as the problem

FORMAT:

REVISION 1:
Question: "..."
Changes: ...
Addresses concerns from: Comments #X, #Y
Does not address: Comments #Z (because ...)

[repeat for each revision]

RECOMMENDATION: Which revision best balances the feedback?""",

    "new_question_synthesis": """You are helping organize new research questions suggested during a Delphi consensus process.

WORKING GROUP: {wg_name}
SCOPE: {wg_scope}

EXISTING QUESTIONS:
{existing_questions}

NEW QUESTIONS SUGGESTED BY PARTICIPANTS:
{suggestions}

TASK:
1. CATEGORIZE each suggestion:
   a. DUPLICATE — Same as an existing question (specify which)
   b. REFINEMENT — More specific version of an existing question (specify which)
   c. GENUINELY NEW — Topic not covered by existing questions
   d. OUT OF SCOPE — Outside this working group's domain

2. For GENUINELY NEW items, suggest polished wording that is specific, empirically testable, and relevant to EM.

3. For REFINEMENTS, note whether they add meaningful specificity.

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

SUMMARY: N suggestions → n duplicates, n refinements, n genuinely new, n out of scope""",

    "cross_wg_overlap": """You are analyzing research questions across five working groups for an AI in Emergency Medicine consensus conference.

ALL WORKING GROUP QUESTIONS:
{all_wg_questions}

TASK:

1. OVERLAPS: Identify pairs of questions across different WGs that address the same topic from different angles. For each:
   - List the specific questions (WG# Q#)
   - Describe what they share
   - Recommend: (a) keep as complementary, (b) coordinate, or (c) merge

2. TENSIONS: Identify questions across WGs that pull in opposite directions. For each:
   - List the questions
   - Describe the tension
   - Frame as a discussion question for the conference

3. GAPS: Topics from the WG scopes that no question addresses. Note cross-cutting themes (especially equity) that may be underrepresented.

4. CONNECTIONS: Questions that would benefit from cross-WG collaboration.

FORMAT:

OVERLAPS:
1. WG_X Q_N <-> WG_Y Q_M: [description] → [recommendation]

TENSIONS:
1. WG_X Q_N vs WG_Y Q_M: [tension] → Discussion question: "..."

GAPS:
1. [Missing topic] → Should be addressed by WG_X

CONNECTIONS:
1. WG_X Q_N + WG_Y Q_M: [connection]""",

    "round_summary": """You are preparing a structured summary of Delphi Round results for a working group co-lead meeting.

WORKING GROUP: {wg_name}
RESPONSE RATE: {response_rate}

DATA:
{round_data}

TASK:
Produce a briefing with:

1. EXECUTIVE SUMMARY (3-4 sentences)

2. CONFIRMED QUESTIONS (>=80% include)
List each with % and mean importance.

3. GRAY ZONE QUESTIONS (21-79% include) — PRIORITY FOR DISCUSSION
For each: voting breakdown, key issue (wording vs scope vs disagreement), comment summary, suggested discussion prompt.

4. REMOVED QUESTIONS (<=20% include)
Brief note on why.

5. NOTABLE PATTERNS
Cross-cutting feedback themes, unusual voting patterns, scope suggestions.

Keep the tone neutral and factual.""",

    "agenda_analysis": """You are analyzing the complete research agenda produced by five working groups for the SAEM 2026 AI Consensus Conference.

ALL WORKING GROUP QUESTIONS:
{all_wg_questions}

TASK:

1. THEMATIC MAP: 5-8 overarching themes cutting across multiple WGs. For each: theme name, contributing questions, 2-3 sentence narrative.

2. RESEARCH AGENDA PILLARS: If you had to describe the 10-year research agenda in 5 key pillars, what would they be? Map questions to pillars.

3. STRONGEST SIGNALS: Highest consensus and importance across all WGs. What does this tell us?

4. PRODUCTIVE TENSIONS: 2-3 tensions where WG priorities compete. Frame as conference discussion topics.

5. WHAT'S MISSING: Important topics that didn't make it through consensus. Why might that be?

6. VISUAL CONCEPT: Suggest a diagram structure to represent this research agenda. Describe in enough detail for a graphic designer.

Use clear headers and concise language suitable for a conference presentation.""",
}
