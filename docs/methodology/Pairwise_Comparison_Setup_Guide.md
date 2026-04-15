# Pairwise Comparison Ranking Guide
## SAEM 2026 AI Consensus Conference

---

## What Is This?

Alongside the traditional Delphi survey, each working group runs a **pairwise comparison ranking** through the SAEM AI Consensus Conference platform. Participants see two research questions at a time and pick the one they think is more important. This runs continuously and produces a rich priority ranking that complements Delphi.

**Why do both?** Delphi tells you *what reaches consensus*. Pairwise comparison tells you *what matters most*. Together they give you a complete picture.

---

## How It Works

The pairwise ranking system is **built into the conference platform** — no external tools or accounts needed. The same web application that hosts Delphi surveys also handles pairwise comparisons and conference-day voting.

### For Participants

1. Navigate to the conference platform and select your working group
2. Click "Pairwise" on your working group card
3. Two research questions appear side by side
4. Pick the one you think is more important (or skip if you can't decide)
5. A new pair appears automatically — do as many as you like
6. You can also suggest new questions via the suggestion form

**Keyboard shortcuts:** Press **A** for left, **B** for right, **S** to skip.

### Under the Hood

- **Adaptive pairing algorithm**: The platform avoids showing you the same pair twice and randomizes question order to prevent position bias
- **Bradley-Terry scoring**: Each vote updates a Laplace-smoothed win-rate score: `score = (wins + 1) / (wins + losses + 2) × 100`
- **Incremental updates**: Scores recompute after every vote (no batch processing needed)
- **Live rankings**: The rankings table updates as votes come in, visible to all participants

---

## Setup Instructions (Planning Committee)

### Step 1: Add Questions (Apr 23-25)

Questions are added to the platform through the admin dashboard. The same candidate research questions used in Delphi Round 1 are automatically available for pairwise comparison — no separate setup required.

### Step 2: Verify Availability

1. Log into the admin dashboard
2. Confirm each working group has its questions in "active" status
3. Test the pairwise flow by navigating to `/rank/{wg_number}` for each WG
4. Verify that pairs load correctly and votes submit

### Step 3: Test

Have 2-3 planning committee members test each WG's pairwise ranking before distribution.

---

## Distribution to Participants

### With Delphi Round 1 (Apr 25)

Include in the Round 1 survey email:

> **Quick Prioritization Exercise (3-5 minutes)**
> 
> After completing the Delphi survey above, please also spend a few minutes on this quick ranking exercise. From the home page, click "Pairwise" on your working group card.
> 
> You'll see two research questions at a time — just pick the one you think is more important for the field. There are no wrong answers. You can vote as many times as you want (the more votes, the better the data). You can also suggest new questions.
> 
> This data helps us understand not just *which* questions to include, but *which ones matter most*.

### Reminder (Apr 28, if participation is low)

> Quick reminder — if you haven't tried the prioritization exercise yet, it only takes 3 minutes. Every vote helps us build a better priority ranking.

### With Delphi Round 2 (May 3)

> The priority ranking is still running and has been updated with revised questions from Round 2. If you have a few minutes, your continued input is valuable.

---

## Between-Round Updates

After Delphi Round 1 closes and questions are revised for Round 2:

1. **Remove** any questions that were excluded (<=20% include) — set status to "removed" in admin dashboard
2. **Update** any questions whose wording was revised — edit via admin dashboard
3. **Add** any new questions entering Round 2 — add via admin dashboard
4. **Review and approve** any participant-suggested questions (visible in admin dashboard under suggestions)

All changes take effect immediately in the pairwise ranking. Existing vote data for revised questions is preserved.

---

## How to Read the Results

The platform produces a **ranking** of all questions based on pairwise votes, accessible at `/results/{wg_number}` or via the admin dashboard. The key outputs:

### Ranking Score
Each question gets a score (0-100) based on its Laplace-smoothed win rate. Higher = more often chosen as the more important question. The scores are relative — what matters is the ordering and the gaps between items.

### Win/Loss Record
For each question, you can see how many times it won and lost. A question that wins 80% of its matchups is clearly high-priority; one that wins 50% is in the middle.

### Participation Stats
The platform tracks total votes cast, unique participants, and vote distribution across pairs — accessible via the pairwise stats endpoint.

### User-Suggested Questions
Participant suggestions are visible in the admin dashboard. Co-leads review and approve them before they enter the pairwise rotation.

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

The platform provides data export via the admin dashboard:
- Question text with win/loss/score data (CSV)
- Raw pairwise vote log with timestamps
- Full results JSON via `/api/export/pairwise`

Export this data after:
- Round 1 closes (for Meeting 2 discussion)
- Round 2 closes (for final analysis)
- Conference day (for proceedings manuscript)

---

## For the Methods Paper

The pairwise comparison data enables several analyses:

1. **Concordance:** Spearman rank correlation between pairwise priority ranking and mean Delphi importance rating per question. Report overall and per WG.

2. **Discrimination:** Did pairwise comparison differentiate between questions that Delphi rated similarly? (i.e., does it resolve the ceiling effect?)

3. **Participation:** How many pairwise votes per participant? Does more voting change the ranking stability?

4. **Novel priorities:** Did any participant-suggested questions enter the top 25% of the ranking?

---

## Troubleshooting

**Low participation:** The pairwise ranking is optional and supplementary. If a WG gets fewer than 50 total votes, the ranking won't be stable enough for formal analysis but can still inform discussion.

**Participant confusion:** Some may not understand why there are two exercises. Key message: "The Delphi survey decides what's *in*. The ranking exercise decides what's *most important*. Both matter."

**Long questions:** If questions are too long for side-by-side comparison, create abbreviated versions in the platform. Keep a mapping document showing full text to abbreviated text.
