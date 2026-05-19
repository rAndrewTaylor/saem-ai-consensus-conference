# Conference-Day Cutover Runbook

Written 2026-05-18. Conference is Thursday 2026-05-21.

## What changed in code (this branch)

### Frontend (`platform/frontend-react/src/`)

- **`pages/WelcomePage.jsx`** — sign-in block rewritten with three options
  (Email · Paste link · Conference code), inline multi-match chooser when
  one email maps to multiple active rows, "Switch user / sign out" button
  for signed-in users, tile order reshuffled so day-of stuff is row 1.
  The T-20m auto-redirect to `/day` now only fires for signed-in users
  (unauth visitors stay on `/welcome` to see the sign-in options).
- **`pages/HomePage.jsx`** — countdown timezone fixed to `-04:00`
  (was off by an hour). Added an above-fold "Conference is live today —
  sign in" banner that renders within T-24h through T+12h of start.
- **`pages/JoinPage.jsx`** — the existing email-login `SignInCard` now
  renders a chooser when the backend returns `{multiple: true, matches}`.
- **`components/Layout.jsx`** — day-of nav is intentionally minimal:
  Consensus Day, Admin, and Log in. `/day`, `/vote`, `/stage`, `/command`,
  and `/welcome` use no global chrome so audience/chair views stay focused.
- **`lib/api.js`** — new `clearAllParticipantTokens()` helper used by
  Switch User and by the chooser flows to prevent stale localStorage on
  shared/kiosk devices.

### Backend (`platform/backend/`)

- **`routers/participants.py::login_participant`** — when an email
  matches more than one active `Participant`, returns
  `{multiple: true, matches: [...]}` instead of silently picking the
  most-recent. UI handles the chooser. Single-match and not-found
  behavior unchanged.

### Scripts

- **`platform/scripts/generate_table_cards.py`** — generates a print-ready
  PDF (4 cards per US Letter page, default 16 cards = 4 pages) with QR
  pointing to `/welcome?access=ai26`, the URL spelled out, and the code
  in a prominent amber chip. Output should be saved at
  `docs/conference-day/table_cards.pdf`.
  Re-run with `python scripts/generate_table_cards.py --count N` to
  print more.

## What Andrew needs to do manually

### 1. Railway env var (BEFORE Wed EOD)

Set on the deployed Railway service:

```
SHARED_JOIN_TOKEN=ai26
```

This is what the QR cards' `?access=ai26` will validate against on the
backend (`_is_valid_shared_join_token` uses `secrets.compare_digest` —
case-sensitive, so lowercase exactly).

Without this, the conference-code button on `/welcome` will show
"Invalid shared join link" when tapped.

### 2. Print the table cards

Generate `docs/conference-day/table_cards.pdf` before printing. Four cards
per page on US Letter. Standard cardstock recommended. Cut on the page
midlines.

Default is 16 cards (4 pages). If you want more, regenerate with
`python platform/scripts/generate_table_cards.py --count 24` (or any
multiple of 4).

### 3. Captive-portal signage

The Marriott guest wifi has a captive portal that can swallow POST
requests mid-handshake. Post a small sign on each table:

> Connect to **SAEM_AI_GUEST** (or marriott guest wifi).
> Accept the captive portal page.
> Then load **saem-ai-consensus-conference-production.up.railway.app**.

This avoids the failure mode where someone signs in before the portal
intercept clears.

### 4. Help-desk laptop

At the back of the room, signed in as admin at `/dashboard`. Two
backstops for "nothing works" attendees:

- Mint a fresh invite link from the dashboard's participant manager;
  text or AirDrop to the attendee's phone.
- Or: open the link in a private/incognito window on the laptop, claim
  it, hand the phone back.

## Smoke-test plan (run Wed evening on 3 devices)

1. Open `/welcome` on a cold device (clear localStorage / private window).
2. Scan the printed QR → should land on `/welcome?access=ai26`.
3. Tap **Conference code** → registers in `/join?access=ai26` flow,
   then lands on the conference-day experience.
4. Tap **Switch user / sign out** on `/welcome` → token cleared.
5. Tap **Email** → enter a known existing email → should sign in
   (or show chooser if duplicates exist).
6. Tap **Paste link** → paste a full `/invite/<token>` URL → should
   route to claim flow.

Test surfaces: iOS Safari, Android Chrome, iOS Chrome.

## Day-before production setup

- [ ] Create six conference sessions: WG1, WG2, WG3, WG4, WG5, and the
  cross-WG prioritization session. Record their IDs in the chair notes.
- [ ] Confirm each WG has 6-8 `featured_in_panel` questions saved from the
  Lead Dashboard or `/command` panel-pool tool.
- [ ] Confirm the cross-WG auto-feature button advances the documented top
  4 per WG, with WG5 carrying all 5 themed questions.
- [ ] Chair dry-run: `/command` → `panel:1` → start vote → stop vote →
  auto-feature/star questions → `table_reactions` → `cross_wg`.

## Risks parked but not addressed

- The `/api/participants/login` POST isn't in the offline queue. If a
  phone is mid-captive-portal when login fires, the user sees
  "no account found." Mitigated by the table signage above; not worth
  refactoring the offline queue at T-3 days.
- The shared-access token is global, not per-WG. Anyone with `ai26` can
  register as any role in any WG. For a closed academic conference this
  is acceptable; we want them to cast votes.

## Freeze

After Wed 2026-05-20 20:00 ET, no further frontend or backend merges
unless hotfix.
