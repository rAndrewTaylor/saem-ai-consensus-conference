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

## Platform: SAEM AI Consensus Conference Platform

All conference-day voting is conducted through the **same custom-built web platform** used for Delphi surveys and pairwise ranking. This provides a unified data pipeline — all pre-conference and conference-day data in one system.

**Key features for conference day:**
- Real-time live voting with instant results via Server-Sent Events (SSE)
- Three parallel voting methods: priority ranking, importance rating (1-9), and point allocation (100-point budget)
- Admin-controlled session lifecycle (create, start, phase toggle pre/post deliberation, stop)
- Pre- and post-deliberation voting phases with built-in deliberation shift analysis
- Works on any smartphone browser — no app download or account creation needed
- Participants use anonymous tokens (same as Delphi/pairwise)
- All data stored alongside Delphi and pairwise results for integrated analysis
- Data export via admin dashboard (CSV, JSON)

---

## Pre-Conference Setup (May 15-20)

### Step 1: Create Conference Sessions

Using the admin dashboard, create one conference session per working group (5 total) plus one for cross-WG prioritization (6 total).

**Per-WG Session Configuration:**
- Session type: `vote`
- Working group: select the relevant WG
- Phase: starts in `deliberation` (pre-discussion), toggled to `post_discussion` after breakout

**Cross-WG Session Configuration:**
- Session type: `vote`
- Include top 3-5 confirmed questions per WG (15-25 total)

### Step 2: Test

- May 15: Planning committee tests all sessions internally
- May 16: Dry run with co-leads (test from their phones)
- Confirm: sessions create correctly, voting works, results display, exports function

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
- [ ] Verify conference platform sessions are ready (do not activate yet)
- [ ] Project platform URL on screen with instructions for participants
- [ ] Place table cards with QR codes linking to the conference platform
- [ ] Designate a "tech helper" at the registration desk for participants who need help connecting
- [ ] **Decision point:** If Wi-Fi AND cellular are both unreliable, switch to Backup Protocol (announce at opening)

### Per-WG Session Flow (~45 min each)

**0:00-0:10 — Presentation** (co-leads present; no audience voting yet)
- Co-leads present their findings, consensus questions, and key themes
- Audience listens

**0:10-0:12 — Initial Vote**
- Admin activates the session via dashboard
- Facilitator: "Please open the conference platform on your phone and go to the live voting session"
- Participants submit priority rankings
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
- Admin toggles session phase to `post_discussion` via dashboard
- Participants submit new priority rankings + importance ratings
- Open-ended final thoughts via the platform's comment feature

**0:35-0:40 — Brief Results Preview**
- NOW show the pre/post comparison (live on the platform)
- Co-leads briefly comment on what shifted

**0:40-0:45 — Transition**

### Cross-WG Prioritization (End of Day, ~30 min)

**0:00-0:05 — Setup**
- Admin activates the cross-WG session
- Brief instructions: "You'll allocate priority across ALL working groups' top questions"

**0:05-0:15 — 100-Point Allocation**
- Participants distribute 100 points across the top questions from all WGs via the platform
- This is the single most important data point for the proceedings manuscript

**0:15-0:25 — Top Priority Ranking + Open-Ended**
- Participants submit priority ranking of top questions across all WGs
- Open-ended: "Single most important thing the field should focus on in the next 10 years?"

**0:25-0:30 — Live Results**
- Show the unified priority ranking to the full room (live from the platform)
- Conference chair provides brief synthesis

---

## Backup Protocol: Offline Data Collection

### When to Activate
Activate if, during morning setup, you cannot reliably get 50+ simultaneous devices connected to the internet (Wi-Fi or cellular).

### Backup Option A: Local Network (Preferred Offline Option)

**Equipment needed:**
- 1 portable Wi-Fi router (e.g., GL.iNet travel router, ~$30)
- 1 laptop running the conference platform locally

**Setup:**
- Run the conference platform backend locally on the laptop (Python + SQLite)
- Router creates a local Wi-Fi network (no internet needed)
- Participants connect to the local network and access the platform via browser
- All data stored on the laptop; export after each session

**Pros:** Same electronic data collection with the same platform, just local. No internet needed.
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

Use the platform for WG sessions where connectivity works; switch to paper for sessions where it doesn't. Note which sessions used which method in the data.

---

## Data Export and Analysis

### Immediately After Each Session
- Export results from the admin dashboard (CSV/JSON)
- Download facilitator notes from shared Google Doc
- Verify data completeness in the platform

### End of Conference Day
- Export all conference session data via admin dashboard
- Run the full results export: `/api/export/full-results`
- Collect all paper ballots (if used)
- Collect all facilitator note sheets
- Back up everything to Google Drive AND a USB drive

### Data Collected Per Session

| Data Point | Source | Format |
|---|---|---|
| Pre-discussion priority ranking | Conference platform or paper | Ordinal (top 5) |
| Post-discussion priority ranking | Conference platform or paper | Ordinal (top 5) |
| Importance ratings (1-9) | Conference platform or paper | Ordinal |
| Open-ended suggestions | Conference platform or paper | Free text |
| Breakout discussion notes | Facilitator notes | Free text |
| Cross-WG point allocation | Conference platform or paper | Ratio (100-point budget) |
| Cross-WG top 10 ranking | Conference platform or paper | Ordinal |
| Attendance per session | Platform vote count or head count | Count |

### Key Analyses

1. **Deliberation shift:** Pre vs. post-discussion rankings (paired analysis, built into the platform at `/api/conference/deliberation-shift/{wg}`). Which questions moved up/down after discussion? This is a novel data point for consensus methodology.

2. **Cross-WG priority ranking:** The 100-point allocation produces a unified, ratio-scale ranking of the full research agenda. This is the headline finding for the proceedings manuscript.

3. **Demographic variation:** Do different stakeholder groups (clinicians vs. researchers vs. trainees) prioritize differently? Analyze by role and career stage.

4. **Concordance chain:** Compare conference-day audience rankings -> Delphi importance ratings -> pairwise comparison rankings. Three independent prioritization methods on the same questions, all in one database.

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

- [ ] Conference platform deployed and tested (Railway or equivalent)
- [ ] Laptop with platform accessible (admin dashboard open)
- [ ] Portable Wi-Fi router + laptop with local platform instance (Backup A)
- [ ] 200 printed ballot packets (Backup B)
- [ ] 20 pens
- [ ] 30 facilitator quick reference cards
- [ ] 30 table QR code cards (link to conference platform)
- [ ] USB drive for backup
- [ ] Power strips / extension cords
- [ ] Phone hotspot as emergency internet backup
