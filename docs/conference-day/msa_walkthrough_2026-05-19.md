# MSA + Focus-Group Debug Session — Tue May 19, 7:00–9:00 PM ET

**Goal:** Every MSA can navigate the day-of platform end-to-end, plus stress-test the audience flows so we find issues with 48 hours of fix runway.

**Attendees:** 6 MSAs + Andrew (chair) + Melissa
**Format:** Hybrid — Zoom + in-person if any MSAs have Atlanta access. Bring at least one phone each.
**Recording:** Yes; share with MSAs who couldn't make it.

---

## 2-hour run-of-show

### 0:00–0:10 — Welcome, day-of overview (Andrew)
- Conference is Thu May 21, 9 AM–4:30 PM, Atlanta
- 5 working groups, ~30 panel + audience members each
- MSAs are the **eyes and ears at the tables** — they make the breakout phase work
- Each MSA assigned to one WG (assignments distributed before session)

### 0:10–0:30 — Platform onboarding (everyone signs in)
Each MSA in turn:
1. Opens their personal invite link on their phone
2. Claims their account (one tap)
3. Confirms they see the `/day` agenda
4. Confirms the demographics modal — fill it out (single source of truth for us)
5. Toggles dark/light mode just to feel the UI

**Andrew shares screen showing chair `/command` view side-by-side so MSAs see what's happening upstream.**

### 0:30–0:50 — Breakout-notes workflow (the MSAs' main job)
Mock scenario: pretend WG1 just finished its panel discussion, chair is about to switch to `table_reactions` mode.
- Andrew on `/command` → switches stage to `table_reactions`
- Every MSA's `/day` page surfaces a Breakout Notes panel at the bottom
- Each MSA fills out: table number, themes, agreements, disagreements, surprises, suggestions
- Submits — confirms it appears on chair's screen + projector
- Iterate: each MSA submits at least 2 fake notes; one MSA tries to submit a note with no table number (validation should block; we want to confirm)

### 0:50–1:05 — Audience chat stress test
- Andrew switches stage to `panel:1` mode
- All 6 MSAs + Andrew + Melissa = 8 people sending chat messages simultaneously for 5 min
- Goal: confirm chat firehose handles concurrent senders, upvotes work, ordering looks right on the projector
- Andrew confirms admin-hide works on a flagged message

### 1:05–1:20 — Drag-to-rank vote test
- Andrew switches to `panel:1` and starts the vote session
- Every MSA drags-and-drops to reorder on their phone — confirm touch feels good on a real phone
- One MSA on landscape iPad to confirm it works for tablets too
- One MSA submits multiple times (last write wins) to confirm edit-vote flow
- Live tally appears on Andrew's command-center screen

### 1:20–1:30 — Wi-Fi failure simulation
- One MSA turns on airplane mode just before submitting a vote
- Should see "queued (will sync when online)" toast
- Re-enable Wi-Fi → vote auto-submits within seconds
- Repeat for chat message and breakout note

### 1:30–1:40 — Cross-WG closing round preview
- Andrew runs `auto-feature top 4` (cross-WG curator on `/command`)
- Switches stage to `cross_wg` mode
- MSAs see all 21 advancing questions on their phones (4 × 4 WGs + 5 from WG5)
- Each MSA drag-ranks the 21 — submits
- Tally appears live on Andrew's screen

### 1:40–1:55 — MSA-specific responsibilities
- Each MSA reads their **table assignment** + **WG assignment** from the roster
- At their table: introduce yourself; let the table know you'll take notes; submit on the platform when chair calls "submit"
- Backup plan: if you can't submit in time, jot on paper and we'll enter later
- Where to sit: front section of the ballroom, near your assigned WG's panelists

### 1:55–2:00 — Issues parking lot + Q&A
- Andrew captures everything broken or weird in a shared doc
- Anything blocker-class: Andrew commits a fix Wed AM; deploys to Railway; we re-test 48 hours out
- MSAs flag if they want a refresher walk-through Wed evening

---

## MSA day-of cheat sheet (printed handout)

**Your job in one line:** sit at your assigned table, collect breakout notes when chair signals, submit on `/day`.

**Phases that involve you:**
- During panel chat: you can post and upvote like anyone else
- During table reactions: you write the notes that go to the projector — be concise
- During cross-WG vote: you rank like anyone else

**If something breaks:**
1. Try once more
2. Slack the #saem-ai-day channel
3. Wave Melissa down

**Don't worry about:** moderating chat (chair does that), choosing questions (co-lead does that), timing the panel (chair does that). Just collect notes and stay engaged.
