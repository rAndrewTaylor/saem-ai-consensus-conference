# SAEM 2026 — Conference Day Action Plan
## Based on platform dry-run with Yohan & Arwen, 2026-05-15

**Conference day:** Thursday May 21
**Today:** Friday May 15 — 6 days out
**Owner:** R. Andrew Taylor (chair) + Claude

---

## Day-by-day timeline (working backward from May 21)

| Date | What ships / who's involved |
|---|---|
| **Fri 5/15 (today)** | P0 bug fixes (clickable links, admin chat visibility, perms), start voting-UX refactor |
| **Sat 5/16** | P1: drag-to-reorder, hide "modify", question counter, navigation polish |
| **Sun 5/17** | P2: funnel-voting flow, table QR prints, comms to panelists drafted |
| **Mon 5/18** | Comms out to panelists & participants, dry-run rehearsal with chair |
| **Tue 5/19** (eve) | MSA debug session + focus-group walkthrough (the bigger test) |
| **Wed 5/20** (~5 PM ET) | 30–60 min co-lead orientation |
| **Thu 5/21** | Conference day |

---

## P0 — Platform bugs blocking the day (Fri 5/15)

These are the issues that cost time during the dry run; fixing today.

1. **Non-clickable links beneath QR codes** — every QR on the platform pairs with a URL line; that line should be an `<a>` tag, not plain text. Audit `/day`, `/stage`, `WorkingGroupPage`, `StagePreview`.
2. **Admin doesn't see audience chat in real time** — bug. The chair view in `/command` Live Signal should mirror what audience phones see. Currently messages submitted on `/day` may not reach `/command` until a poll/refresh.
3. **Permissions inconsistency between desktop and mobile** — co-leads see different content on phone vs. laptop. Need to identify what's gated by `isAdmin` vs. `isCoLead` vs. participant and unify.
4. **No clickable hyperlink below QR code in StagePreview / panel slides** — same as #1 but specific to the projector view.

## P1 — Voting UX overhaul (Sat 5/16)

Voting on the day must be **simple, touch-friendly, and obvious**. Decisions from the dry run:

### Remove
- ✂️ **100-point allocation** entirely. Confusing, slow on phones, doesn't parallel the Delphi process.
- ✂️ **"Modify" disposition** from day-of voting. Modifications happen post-conference for manuscripts. Day-of is Include or Exclude only.
- ✂️ **Tap-arrow ranking controls** (current up/down buttons). Replaced by drag.

### Keep / build
- ✅ **Drag-to-reorder** (tap-and-drag) for priority ranking. Use `@dnd-kit` (already touch-friendly) — refactor `ConferencePage` ranking tab.
- ✅ **Importance rating 1–9** — keep, optionally collapsed under a "rate" step after ranking.
- ✅ **Live tally + pre/post comparison** — keep, no changes.

### Polish
- **Question counter at top** of the voting page: "Question 3 of 18 · drag to reorder" so participants know how much remains.
- **Back-to-agenda button** persistently visible. Same for back-to-`/day` from any sub-route.
- **One clear "Submit" CTA** per voting phase. Hide other tabs when one is active.

## P2 — Conference structure changes (Sun 5/17)

### Per-WG question funnel

- **Initial vote (per panel)**: every WG presents **4–5 questions** (chair-curated from R2 results).
- **Funnel after each panel breakout**: audience priority-ranks those 4–5 questions, narrowing to **2 questions per WG** for the cross-WG round.
- **Cross-WG final**: ~10 questions total (2 × 5 WGs) for the closing round.

### Working Group 5 exception

- Enters with **5 thematically categorized questions + sub-questions** (Arwen's structure).
- **Skip the WG-level funnel** — those 5 themes go straight to the cross-WG round as a group, evaluated against the 8 from the other WGs (2 per × 4 WGs).
- Cross-WG round therefore: 8 from WG1–4 + 5 themed from WG5 = **13 questions**.

### Panel format (each WG, ~40 min)

1. **0–10 min** — Co-lead presents R2 results + 2–3 starter questions to panel
2. **10–25 min** — Panel discussion driven by audience comments/upvotes (chat firehose on stage)
3. **25–30 min** — Break out to tables, MSAs collect reactions
4. **30–35 min** — Priority-rank the WG's 4–5 questions (drag-to-reorder, ~30 sec per participant)
5. **35–40 min** — Show live tally → top 2 advance to cross-WG round; transition

### Cross-WG final (~30 min)

1. **0–10 min** — Display all 13 advancing questions on the projector for review (idle/results mode)
2. **10–20 min** — Drag-to-reorder all 13 on phones
3. **20–25 min** — Live final tally
4. **25–30 min** — Chair summarizes top consensus + wrap

## P3 — Test runs (Mon–Wed)

### Tue 5/19 evening — MSA + focus-group debug session

- **Time**: 7:00–9:00 PM ET (longer than originally planned — gives buffer for fixes)
- **Attendees**: 6 MSAs + chair + Melissa
- **Format**: Hybrid (Zoom + in-person if Atlanta access)
- **Goals**:
  1. MSAs claim their personal links + practice the breakout-notes form
  2. Walk through each panel mode end-to-end with mock content
  3. Test drag-to-reorder ranking on multiple phones
  4. Stress-test chat with 8–10 simultaneous senders
  5. Test "what happens if Wi-Fi drops mid-vote" (offline queue)
  6. Identify any remaining bugs for overnight Wed fixes

### Wed 5/20 — 30–60 min co-lead orientation

- **Time**: ~5:00 PM ET (after most travel)
- **Attendees**: 11 co-leads + chair
- **Format**: Zoom (most aren't at venue yet)
- **Goals**:
  1. Walk co-leads through their panel's flow (starter questions, audience chat, funnel vote, transition)
  2. Confirm their R2 4–5 questions are loaded correctly
  3. Practice as a "moderator" — running the audience chat queue, calling on upvoted questions
  4. Confirm panel timing
  5. Q&A

## P4 — Communications (rolling, all by Mon 5/18 EOD)

### To send

1. **Panelists** (separate from co-leads) — new email outlining the panel format (starter Qs → audience chat → funnel vote), what's expected of them, and platform login. Personal join links if not already set.
2. **All participants** — preview of how voting works on the day (drag-to-reorder, anonymous chat, what to expect). Sets expectations + reduces day-of confusion.
3. **WG co-leads** — Wed orientation calendar invite + reminder to finalize their 4–5 starter questions by Mon 5/18.
4. **Informal gathering** — separate optional drinks-after note. Andrew chooses venue.

---

## Decisions Andrew needs to make before I keep building

1. **WG5's 5 themed questions** — what are they exactly? Arwen said they're already structured. Need the actual texts to load into the cross-WG round.
2. **Each WG's 4–5 starter questions** — chair-curated from R2 results. I can propose a default (top R2 by pairwise + importance) and chair confirms.
3. **Total final agenda target** — recap is "10 or fewer" but the funnel above yields 10 (from WG1–4) + 5 (from WG5) = 13. Is 13 OK or do we want a hard 10-question cap with WG5 forced to pick 1–2?
4. **Drink-after venue** — for the informal email.
5. **Tue 5/19 MSA session time** — 7–9 PM ET OK? Need to send that update to Melissa + MSAs.
6. **Wed 5/20 co-lead orientation time** — 5 PM ET OK?

---

## Claude's worklist (what I'll execute, in order)

1. Audit every QR-code-paired URL and wrap in `<a>` (P0)
2. Fix admin chat visibility on `/command` (P0)
3. Permissions audit — desktop vs mobile (P0)
4. Drag-to-reorder ranking via `@dnd-kit` (P1)
5. Strip "Modify" from day-of voting (P1)
6. Question counter at top of vote page (P1)
7. Persistent back/home navigation (P1)
8. Funnel-voting backend: new endpoints to advance top-N per WG into cross-WG round (P2)
9. Update conference agenda doc with new panel timing (P2)
10. Draft panelist comms (P4)
11. Draft participant pre-conference comms (P4)

Each gets committed as a small focused change so we can verify in production before moving to the next.
