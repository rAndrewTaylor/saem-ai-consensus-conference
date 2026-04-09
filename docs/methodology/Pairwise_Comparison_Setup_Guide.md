# Pairwise Comparison Survey Setup Guide
## SAEM 2026 AI Consensus Conference

---

## What Is This?

Alongside the traditional Delphi survey, each working group will run a **pairwise comparison survey** using [All Our Ideas](https://allourideas.org). Participants see two research questions at a time and pick the one they think is more important. This runs continuously and produces a rich priority ranking that complements Delphi.

**Why do both?** Delphi tells you *what reaches consensus*. Pairwise comparison tells you *what matters most*. Together they give you a complete picture.

---

## Setup Instructions (Planning Committee)

### Step 1: Create Surveys (Apr 23-25)

1. Go to [allourideas.org](https://allourideas.org)
2. Click "Start Your Own" (or "Create New Survey")
3. Create an account or log in
4. For each working group, create a separate survey:
   - **Title:** `SAEM AI Consensus — WG[#]: [Name] — Research Priority Ranking`
   - **Description:** "Help prioritize research questions for AI in Emergency Medicine. Pick the question you think is more important for the field. There are no wrong answers. Vote as many times as you like."

### Step 2: Add Questions

For each WG survey, add the same candidate research questions that will appear in Delphi Round 1. Enter each question exactly as written in the Delphi survey.

**Tips:**
- Keep question text concise in the pairwise format (participants see two side by side)
- If a Delphi question is very long, create a shortened version but preserve the core meaning
- Aim for all items to be roughly the same length so longer items don't get selected just because they seem more detailed

### Step 3: Configure Settings

- **Allow new ideas:** YES (moderated — co-leads approve before they enter rotation)
- **Active:** Set to active when Delphi Round 1 launches (Apr 25)

### Step 4: Generate Links

Each survey gets a unique URL. Create a short link for each (e.g., via bit.ly):
- `WG1: bit.ly/saem-ai-wg1-rank`
- `WG2: bit.ly/saem-ai-wg2-rank`
- etc.

### Step 5: Test

Have 2-3 planning committee members test each survey before distribution.

---

## Distribution to Participants

### With Delphi Round 1 (Apr 25)

Include in the Round 1 survey email:

> **Quick Prioritization Exercise (3-5 minutes)**
> 
> After completing the Delphi survey above, please also spend a few minutes on this quick ranking exercise:
> 
> [link]
> 
> You'll see two research questions at a time — just pick the one you think is more important for the field. There are no wrong answers. You can vote as many times as you want (the more votes, the better the data). You can also suggest new questions.
> 
> This data helps us understand not just *which* questions to include, but *which ones matter most*.

### Reminder (Apr 28, if participation is low)

> Quick reminder — if you haven't tried the prioritization exercise yet, it only takes 3 minutes: [link]
> Every vote helps us build a better priority ranking.

### With Delphi Round 2 (May 3)

> The priority ranking survey is still open and has been updated with revised questions from Round 2. If you have a few minutes, your continued input is valuable: [link]

---

## Between-Round Updates

After Delphi Round 1 closes and questions are revised for Round 2:

1. **Remove** any questions that were excluded (<=20% include) from the pairwise survey
2. **Update** any questions whose wording was revised
3. **Add** any new questions entering Round 2
4. **Review and approve** any participant-suggested questions (moderate the queue)

---

## How to Read the Results

All Our Ideas produces a **ranking** of all questions based on the pairwise votes. The key outputs:

### Ranking Score
Each question gets a score (0-100) based on its win rate. Higher = more often chosen as the more important question. The scores are relative — what matters is the ordering and the gaps between items.

### Confidence Intervals
Each score has a confidence interval. Items whose confidence intervals overlap are not meaningfully different in priority. Items with wide intervals need more votes.

### Win/Loss Record
For each question, you can see how many times it was shown and how many times it was selected. A question that wins 80% of its matchups is clearly high-priority; one that wins 50% is in the middle.

### User-Suggested Ideas
Review the moderation queue for new suggestions. Good ones get added to the rotation; duplicates or off-topic suggestions get rejected.

---

## Using Pairwise Data at Meeting 2

When reviewing Round 1 Delphi results at Meeting 2, also pull up the pairwise rankings. Key discussion points:

1. **High Delphi consensus + high pairwise ranking** = Strong priority. These are your clear winners.

2. **High Delphi consensus + low pairwise ranking** = Consensus exists but it's not a top priority. Include it, but it may rank lower in the final agenda.

3. **Gray-zone Delphi + high pairwise ranking** = The question is clearly important to participants even though Delphi wording didn't achieve consensus. Focus revision effort here — the concept matters, the wording needs work.

4. **Gray-zone Delphi + low pairwise ranking** = Weak signal. Consider dropping unless there's a compelling reason to keep it.

5. **Excluded by Delphi + high pairwise ranking** = Anomaly worth investigating. Was the Delphi wording problematic? Was there a specific objection?

---

## Data Export

All Our Ideas provides data export (CSV):
- Question text
- Win count
- Loss count
- Score (0-100)
- Confidence interval
- Total appearances

Export this data after:
- Round 1 closes (for Meeting 2 discussion)
- Round 2 closes (for final analysis)
- Conference day (for proceedings manuscript)

---

## For the Methods Paper

The pairwise comparison data enables several analyses:

1. **Concordance:** Spearman rank correlation between pairwise priority ranking and mean Delphi importance rating per question. Report overall and per WG.

2. **Discrimination:** Did pairwise comparison differentiate between questions that Delphi rated similarly? (i.e., does it resolve the ceiling effect?)

3. **Participation:** How many pairwise votes per participant (estimated from session data)? Does more voting change the ranking stability?

4. **Novel priorities:** Did any participant-suggested questions (via the "add new idea" feature) enter the top 25% of the ranking?

---

## Troubleshooting

**Low participation:** The pairwise survey is optional and supplementary. If a WG gets fewer than 50 total votes, the ranking won't be stable enough for formal analysis but can still inform discussion.

**Participant confusion:** Some may not understand why there are two surveys. Key message: "The Delphi survey decides what's *in*. The ranking exercise decides what's *most important*. Both matter."

**Long questions:** If questions are too long for side-by-side comparison, create abbreviated versions. Keep a mapping document showing full text → abbreviated text.
