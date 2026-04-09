# Conference-Day Electronic Data Collection
## SAEM 2026 AI Consensus Conference
### May 21, 2026 — Atlanta Marriott Marquis

---

## Design Principles

1. **Every audience input captured electronically** — no data lost to illegible handwriting or miscounted stickers
2. **Works without internet** — backup protocol ready to deploy in under 10 minutes
3. **Low friction** — participants vote on their own phones in under 60 seconds per round
4. **Pre/post deliberation comparison** — capture how discussion changes priorities
5. **Cross-WG prioritization** — unified ranking of the full research agenda at end of day

---

## Platform Recommendation: Mentimeter

**Why Mentimeter:**
- Battle-tested at medical conferences (ACEP, AHA, etc.)
- Works on any smartphone browser — no app download
- Offline presentation mode available (results stored locally, synced later)
- Supports ranking, rating, open-ended, and word cloud question types
- Exports to Excel/CSV
- Paid plan (~$12/month) supports unlimited audience size and exports

**Backup platforms:** Slido (similar features), Google Forms (free, universal, less interactive)

---

## Pre-Conference Setup (May 15-20)

### Step 1: Create Mentimeter Presentations

Create one Mentimeter presentation per working group (5 total) plus one for cross-WG prioritization (6 total).

**Per-WG Presentation Structure:**

| Slide | Type | Content |
|---|---|---|
| 1 | Heading | "WG[#]: [Name] — Audience Prioritization" |
| 2 | Instruction | "Go to menti.com and enter code: XXXXXX" |
| 3 | Multiple choice | "What is your primary role?" (EM physician / Researcher / Trainee / Data scientist/engineer / Nurse/APP / Administrator / Other) |
| 4 | Multiple choice | "Career stage?" (Student or resident / Fellow or early career <5yr / Mid-career 5-15yr / Senior >15yr) |
| 5 | Ranking | "Rank these research questions by priority (top 5)" — list all confirmed consensus questions |
| 6 | Open ended | "Are there critical research questions missing from this list?" |
| 7 | Heading | "--- BREAKOUT DISCUSSION ---" (pause for discussion) |
| 8 | Ranking | Same ranking question repeated (post-discussion) |
| 9 | Scales (1-9) | "Rate the importance of each question" — all confirmed questions, 1-9 scale |
| 10 | Open ended | "After the discussion, any final thoughts or suggested modifications?" |

**Cross-WG Presentation Structure:**

| Slide | Type | Content |
|---|---|---|
| 1 | Heading | "Cross-Working-Group Research Agenda Prioritization" |
| 2 | Instruction | "Go to menti.com and enter code: YYYYYY" |
| 3 | 100-point allocation | "Allocate 100 points across these research priorities" — top 3-5 questions per WG (15-25 total) |
| 4 | Ranking | "Overall, rank the top 10 most important questions across all working groups" |
| 5 | Open ended | "What is the single most important thing the field should focus on in the next 10 years?" |
| 6 | Word cloud | "In one word, what is the biggest barrier to AI progress in emergency medicine?" |

### Step 2: Test

- May 15: Planning committee tests all presentations internally
- May 16: Dry run with co-leads (test from their phones)
- Confirm: codes work, slides advance correctly, exports function

### Step 3: Print Backup Materials

Print and bring to Atlanta (even if you expect internet to work):
- 200 paper ballot packets (see Backup Protocol below)
- 20 pens
- Instruction cards for table facilitators

---

## Conference-Day Protocol

### Morning Setup (7:00-8:00 AM)

- [ ] Test venue Wi-Fi with 5+ simultaneous devices
- [ ] Test cellular connectivity (AT&T, Verizon, T-Mobile)
- [ ] Set up Mentimeter presentations, confirm access codes
- [ ] Project access code on screen: "Go to menti.com, enter code: XXXXXX"
- [ ] Place table cards with QR codes linking to Mentimeter
- [ ] Designate a "tech helper" at the registration desk for participants who need help connecting
- [ ] **Decision point:** If Wi-Fi AND cellular are both unreliable, switch to Backup Protocol (announce at opening)

### Per-WG Session Flow (~45 min each)

**0:00-0:10 — Presentation** (co-leads present; no audience voting yet)
- Co-leads present their findings, consensus questions, and key themes
- Audience listens

**0:10-0:12 — Demographics + Initial Vote**
- Facilitator: "Please go to menti.com and enter code XXXXXX"
- Slides 3-4: Quick demographics (role, career stage)
- Slide 5: "Rank the top 5 research questions by priority"
- Give 2-3 minutes for everyone to vote
- **Do NOT show results yet** (to avoid anchoring the discussion)

**0:12-0:15 — Clarification Q&A**
- Brief Q&A on the questions themselves (not the voting)

**0:15-0:30 — Breakout Discussion**
- Audience splits into small groups (6-8 per table)
- Each table has a facilitator (WG member or volunteer) with a note-taking template
- Discussion prompts provided by co-leads (2-3 questions)
- Facilitators capture key points in a shared Google Doc (or on paper if offline)

**0:30-0:35 — Post-Discussion Re-Vote**
- Slide 8: Same ranking question, fresh vote
- Slide 9: Importance ratings (1-9 scale)
- Slide 10: Open-ended final thoughts

**0:35-0:40 — Brief Results Preview**
- NOW show the pre/post comparison if technology allows
- Co-leads briefly comment on what shifted

**0:40-0:45 — Transition**

### Cross-WG Prioritization (End of Day, ~30 min)

**0:00-0:05 — Setup**
- New Mentimeter code displayed
- Brief instructions: "You'll allocate priority across ALL working groups' top questions"

**0:05-0:15 — 100-Point Allocation**
- Slide 3: Participants distribute 100 points across the top questions from all WGs
- This is the single most important data point for the proceedings manuscript

**0:15-0:25 — Top 10 Ranking + Open-Ended**
- Slide 4: Force-rank top 10 across all WGs
- Slide 5: "Single most important thing" open-ended
- Slide 6: Word cloud — "Biggest barrier"

**0:25-0:30 — Live Results**
- Show the unified priority ranking to the full room
- Conference chair provides brief synthesis

---

## Backup Protocol: Offline Data Collection

### When to Activate
Activate if, during morning setup, you cannot reliably get 50+ simultaneous devices connected to the internet (Wi-Fi or cellular).

### Backup Option A: Local Network (Preferred Offline Option)

**Equipment needed:**
- 1 portable Wi-Fi router (e.g., GL.iNet travel router, ~$30)
- 1 laptop running a local survey server

**Setup:**
- Install [LimeSurvey](https://www.limesurvey.org/) or [KoboToolbox](https://www.kobotoolbox.org/) on the laptop
- Pre-load all survey questions (mirror the Mentimeter structure)
- Router creates a local Wi-Fi network (no internet needed)
- Participants connect to the local network and access surveys via browser
- All data stored on the laptop; export after each session

**Pros:** Same electronic data collection, just local. No internet needed.
**Cons:** Requires pre-setup and testing. Participants must switch Wi-Fi networks.

### Backup Option B: Paper Ballots

**Materials (pre-printed, brought to Atlanta):**
- 200 ballot packets, each containing:
  - 5 WG ballot sheets (one per WG)
  - 1 cross-WG ballot sheet
  - Demographics form

**Per-WG Ballot Sheet:**
```
WG[#]: [Name] — Research Priority Ballot
Participant ID: _____ (anonymous, self-assigned number)

INITIAL RANKING (before discussion):
From the questions below, rank your top 5 (1 = highest priority):

[ ] Q1: {question text}  Rank: ___
[ ] Q2: {question text}  Rank: ___
[... all confirmed questions listed]

POST-DISCUSSION RANKING:
After the breakout discussion, re-rank your top 5:

[ ] Q1: {question text}  Rank: ___
[ ] Q2: {question text}  Rank: ___
[... same questions]

New questions or modifications suggested:
_________________________________
_________________________________
```

**Cross-WG Ballot Sheet:**
```
CROSS-WORKING-GROUP PRIORITIZATION
Allocate 100 points across these research priorities.
More points = higher priority. Must total 100.

WG1: [Top question summary]  Points: ___
WG1: [2nd question summary]  Points: ___
WG2: [Top question summary]  Points: ___
[... top 3-5 per WG]

TOTAL: ___ (must equal 100)
```

**Collection and data entry:**
- Collect ballots after each session
- 2-3 volunteers enter data into a spreadsheet during breaks
- Double-entry for cross-WG ballots (most critical data)

### Backup Option C: Hybrid

Use Mentimeter for WG sessions where connectivity works; switch to paper for sessions where it doesn't. Note which sessions used which method in the data.

---

## Data Export and Analysis

### Immediately After Each Session
- Export Mentimeter results (Excel/CSV)
- Download facilitator notes from shared Google Doc
- Save a copy of the Mentimeter presentation with results embedded

### End of Conference Day
- Export all Mentimeter data
- Collect all paper ballots (if used)
- Collect all facilitator note sheets
- Back up everything to Google Drive AND a USB drive

### Data Collected Per Session

| Data Point | Source | Format |
|---|---|---|
| Participant demographics | Mentimeter or paper | Categorical |
| Pre-discussion priority ranking | Mentimeter or paper | Ordinal (top 5) |
| Post-discussion priority ranking | Mentimeter or paper | Ordinal (top 5) |
| Importance ratings (1-9) | Mentimeter or paper | Ordinal |
| Open-ended suggestions | Mentimeter or paper | Free text |
| Breakout discussion notes | Facilitator notes | Free text |
| Cross-WG point allocation | Mentimeter or paper | Ratio (100-point budget) |
| Cross-WG top 10 ranking | Mentimeter or paper | Ordinal |
| Word cloud responses | Mentimeter | Free text |
| Attendance per session | Mentimeter response count or head count | Count |

### Key Analyses

1. **Deliberation shift:** Pre vs. post-discussion rankings (paired analysis). Which questions moved up/down after discussion? This is a novel data point for consensus methodology.

2. **Cross-WG priority ranking:** The 100-point allocation produces a unified, ratio-scale ranking of the full research agenda. This is the headline finding for the proceedings manuscript.

3. **Demographic variation:** Do different stakeholder groups (clinicians vs. researchers vs. trainees) prioritize differently? Analyze by role and career stage.

4. **Concordance chain:** Compare conference-day audience rankings → Delphi importance ratings → pairwise comparison rankings. Three independent prioritization methods on the same questions.

---

## Facilitator Quick Reference Card

Print and distribute to all breakout table facilitators:

```
BREAKOUT FACILITATOR GUIDE — SAEM AI Consensus Conference

YOUR JOB:
1. Keep discussion focused (15 min total)
2. Make sure everyone at your table gets to speak
3. Capture key points (use the template below)

DISCUSSION PROMPTS (provided by the WG co-leads):
1. [Co-leads insert their prompts here]
2.
3.

CAPTURE TEMPLATE:
Table #: ___   Facilitator: _______________

Key themes discussed:
1.
2.
3.

Points of agreement:
-

Points of disagreement:
-

New questions or modifications suggested:
-

Anything surprising?
-

Submit notes to: [Google Doc link or collect paper]
```

---

## Equipment Checklist for Atlanta

- [ ] Mentimeter Pro account (active, tested)
- [ ] Laptop with presentations loaded
- [ ] Portable Wi-Fi router + local survey server (Backup A)
- [ ] 200 printed ballot packets (Backup B)
- [ ] 20 pens
- [ ] 30 facilitator quick reference cards
- [ ] 30 table QR code cards (link to Mentimeter)
- [ ] USB drive for backup
- [ ] Power strips / extension cords
- [ ] Phone hotspot as emergency internet backup
