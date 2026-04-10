# Platform Improvement Recommendations

Prioritized technical recommendations from a full code audit of the SAEM AI Consensus Conference platform. Organized by severity — fix critical items before conference day.

---

## CRITICAL — Must Fix Before Conference

### 1. Admin Authentication

**Problem:** Every endpoint is publicly accessible. Anyone who finds the URL can view all data, export participant responses, create/stop voting sessions, and run AI synthesis.

**Fix:** Add simple token-based admin auth. Full OAuth is overkill for a conference-day tool — a shared admin password hashed with bcrypt is sufficient.

```
- Add /api/admin/login endpoint returning a JWT
- Protect all /api/admin/*, /api/analysis/*, session management endpoints
- Store admin password hash in environment variable
- Add Authorization header check via FastAPI Depends()
```

**Files:** `main.py`, `admin.py`, `analysis.py`, `conference.py` (session management routes)

### 2. Switch from SQLite to PostgreSQL

**Problem:** SQLite allows only one writer at a time. With 50+ people voting simultaneously on conference day, you'll get "database is locked" errors and lost votes.

**Fix:** Switch to PostgreSQL (or at minimum SQLite WAL mode).

```
- Update database.py to use DATABASE_URL environment variable
- Use asyncpg + SQLAlchemy async engine for true async DB access
- Add connection pool settings (pool_size=10, max_overflow=20)
- Use Alembic for schema migrations
```

**Files:** `database.py`, `requirements.txt`

### 3. Atomic Vote Submission

**Problem:** Survey responses are submitted one-at-a-time in a loop (`survey.html` lines 189-200). If request #5 of 10 fails, the first 4 are committed and the rest lost — user thinks they submitted everything.

**Fix:** Use the existing batch endpoint (`/api/surveys/respond/{wg}/{round}/batch`) and wrap DB writes in a transaction.

```
- Frontend: collect all responses, submit as single batch POST
- Backend: wrap batch operations in db.begin() transaction
- Add client-side localStorage autosave so responses survive page refresh
```

**Files:** `survey.html`, `surveys.py`, `conference.py`

### 4. Token Security

**Problem:** Participant tokens are passed as query parameters (visible in server logs, browser history, analytics). No expiration. No ownership validation.

**Fix:**
```
- Pass token in Authorization header instead of query string
- Add token expiration (24 hours for survey rounds, 8 hours for conference day)
- Validate token belongs to correct working group
- Rate-limit token generation (max 5 per IP per hour)
```

**Files:** `app.js` (API helper), all router files

### 5. CORS Lockdown

**Problem:** `allow_origins=["*"]` with `allow_credentials=True` lets any website make authenticated requests to the API. This is a known dangerous combination.

**Fix:**
```python
# main.py — replace wildcard with specific origins
allow_origins=[
    "http://localhost:8000",
    "https://your-production-domain.com",
]
```

**Files:** `main.py`

---

## HIGH — Fix Before Delphi Round 1

### 6. Input Validation & XSS Prevention

**Problem:** User-submitted text (comments, suggestions, question text) is rendered directly into HTML via JavaScript template literals without escaping. An attacker could inject `<script>` tags.

**Fix:**
```javascript
// app.js — add HTML escape helper
function esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Use in all templates: ${esc(q.text)} instead of ${q.text}
```

Also add server-side validation:
```
- Importance ratings: validate 1-9 range
- Disposition: validate against enum whitelist
- Comment length: cap at 2000 characters
- Question text: cap at 1000 characters
```

**Files:** `app.js`, all `.html` templates, `surveys.py`, `pairwise.py`

### 7. Error Handling & User Feedback

**Problem:** Network errors show nothing to the user. Partial failures are silent. The API helper swallows error details.

**Fix:**
```javascript
// app.js — improved API helper
async function api(url, options = {}) {
    try {
        const response = await fetch(...);
        if (!response.ok) {
            const err = await response.json().catch(() => ({ detail: 'Server error' }));
            showToast(err.detail || 'Something went wrong. Please try again.');
            throw new Error(err.detail);
        }
        return response.json();
    } catch (e) {
        if (e.name === 'TypeError') {
            showToast('Network error — check your connection.');
        }
        throw e;
    }
}
```

Backend: Add structured error responses, global exception handler in `main.py`.

**Files:** `app.js`, `main.py`

### 8. Autosave & Offline Resilience

**Problem:** If a participant loses connection or accidentally closes the browser tab mid-survey, all responses are lost.

**Fix:**
```
- Save responses to localStorage on every interaction
- On page load, restore from localStorage if token matches
- Show "draft saved locally" indicator
- On submit, clear localStorage
- Add beforeunload warning if unsaved responses exist
```

**Files:** `survey.html`, `conference.html`

### 9. Logging & Audit Trail

**Problem:** No logging anywhere. The `audit_log` table exists in the schema but is never written to. Impossible to debug issues or verify data integrity.

**Fix:**
```python
# main.py — add structured logging
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s: %(message)s'
)

# Add middleware to log requests
@app.middleware("http")
async def log_requests(request, call_next):
    logger.info(f"{request.method} {request.url.path}")
    response = await call_next(request)
    return response
```

Write to `audit_log` table on: vote submissions, session start/stop, results computation, AI synthesis runs, admin actions.

**Files:** `main.py`, all router files

### 10. Duplicate Vote Prevention

**Problem:** Pairwise votes and conference votes have no unique constraints. A participant (or bot) can submit the same vote thousands of times to manipulate rankings.

**Fix:**
```
- PairwiseVote: add UniqueConstraint on (participant_id, question_a_id, question_b_id, wg_id)
  or at minimum rate-limit to 1 vote per pair per participant
- ConferenceVote: add UniqueConstraint on (session_id, participant_id, vote_type)
  to prevent duplicate ranking/importance/allocation submissions
- Add "already voted" check before insert; update existing vote if re-submitted
```

**Files:** `database.py`, `pairwise.py`, `conference.py`

---

## MEDIUM — Improve Quality & UX

### 11. Environment Configuration

**Problem:** Database path hardcoded. No `.env` support. No way to run staging vs production.

**Fix:**
```
- Add python-dotenv; load .env file on startup
- DATABASE_URL, ANTHROPIC_API_KEY, ADMIN_SECRET, ALLOWED_ORIGINS as env vars
- Add .env.example to repo (without secrets)
- Validate required env vars on startup with clear error messages
```

**Files:** `database.py`, `main.py`, `ai_synthesis.py`, new `.env.example`

### 12. Database Performance

**Problem:** N+1 query patterns in admin dashboard and conference results. No indexes on frequently queried columns. Full table scans on every dashboard load.

**Fix:**
```python
# database.py — add indexes
from sqlalchemy import Index

# On DelphiResponse
Index('ix_delphi_response_question_round', DelphiResponse.question_id, DelphiResponse.round)
Index('ix_delphi_response_participant', DelphiResponse.participant_id)

# On PairwiseVote
Index('ix_pairwise_vote_wg', PairwiseVote.wg_id)

# On ConferenceVote
Index('ix_conference_vote_session', ConferenceVote.session_id)
```

Refactor admin dashboard to use GROUP BY queries instead of per-WG loops.

**Files:** `database.py`, `admin.py`, `conference.py`

### 13. Real-Time Results Display

**Problem:** No live updating. Admin must manually refresh dashboard. Conference-day facilitators can't see votes coming in.

**Fix:**
```
- Add WebSocket endpoint for live vote count updates
- Dashboard auto-refreshes key metrics every 10 seconds (simple polling is fine)
- Conference page shows live vote count during active sessions
- Optional: Server-Sent Events (SSE) for one-way push updates (simpler than WebSocket)
```

**Files:** `main.py`, `dashboard.html`, `conference.html`

### 14. CSV Export Safety

**Problem:** Comments written directly to CSV without escaping. Excel interprets cells starting with `=`, `+`, `-`, `@` as formulas — potential CSV injection.

**Fix:**
```python
def safe_csv_value(val):
    """Prefix dangerous characters to prevent CSV formula injection."""
    if isinstance(val, str) and val and val[0] in ('=', '+', '-', '@', '\t', '\r'):
        return "'" + val
    return val
```

**Files:** `admin.py`

### 15. Accessibility (WCAG 2.1 AA)

**Problem:** No ARIA labels, non-semantic HTML (divs with onclick instead of buttons), no keyboard navigation, color-only status indicators.

**Fix:**
```
- Replace <div onclick="..."> with <button> elements
- Add aria-label to all interactive elements
- Add aria-live="polite" to toast notifications
- Add visible focus styles (:focus-visible)
- Ensure color contrast meets WCAG AA (4.5:1 minimum)
- Add role="alert" to error messages
- Make ranking drag-and-drop keyboard accessible (arrow keys to reorder)
```

**Files:** All `.html` templates, `style.css`

### 16. Mobile Touch Improvements

**Problem:** Conference-day drag-and-drop ranking is unreliable on mobile. `elementFromPoint()` returns wrong element when page is scrolled.

**Fix:**
```
- Replace custom touch drag with a library (SortableJS — 10KB, well-tested)
- Or: use up/down buttons as alternative to drag on mobile
- Add touch-action: none CSS to prevent scroll during drag
- Test on actual iOS Safari and Android Chrome
```

**Files:** `conference.html`, `style.css`

---

## NICE TO HAVE — Post-Conference Improvements

### 17. Containerization

```
- Add Dockerfile (Python 3.11-slim base, uvicorn, gunicorn)
- Add docker-compose.yml (app + PostgreSQL + nginx)
- Add nginx.conf for HTTPS termination and static file serving
- Add health check endpoint that verifies DB connectivity
```

### 18. CI/CD Pipeline

```
- GitHub Actions: lint (ruff), type check (mypy), test (pytest)
- Auto-deploy on push to main
- Run database migrations automatically
```

### 19. Testing

```
- Add pytest + httpx for API integration tests
- Test all consensus threshold logic
- Test pairwise scoring computation
- Test concurrent vote submission
- Frontend: add Playwright E2E tests for survey flow
```

### 20. Progressive Web App

```
- Add service worker for offline caching
- Cache survey questions on load; queue responses for upload
- Add manifest.json for "Add to Home Screen" on mobile
- Useful for conference day if Wi-Fi is unreliable
```

### 21. Real-Time Delphi Mode

```
- Show aggregated results in real-time as participants vote (RTD approach)
- Allow participants to revise responses after seeing group consensus
- Accelerates convergence; used by platforms like Calibrum and Welphi
```

### 22. Data Visualization

```
- Add Chart.js or D3 for interactive result charts
- Sankey diagram showing question flow (R1 → R2 → Conference)
- Radar chart comparing WG priorities
- Live bar chart during conference voting
```

---

## Implementation Priority Order

For the May 21 conference, focus on this order:

| Week | Tasks | Why |
|---|---|---|
| **Now** | #5 CORS, #1 Admin auth, #4 Token security | Security basics |
| **Week 1** | #3 Atomic submissions, #10 Duplicate prevention, #6 Input validation | Data integrity |
| **Week 2** | #2 PostgreSQL (or SQLite WAL), #12 Indexes, #9 Logging | Performance under load |
| **Week 3** | #8 Autosave, #7 Error handling, #16 Mobile touch | UX for participants |
| **Week 4** | #13 Live results, #11 Env config, #14 CSV safety | Admin experience |
| **Post-conf** | #17-22 | Polish and publish |

---

## References

- [FastAPI Production Best Practices 2026](https://fastlaunchapi.dev/blog/fastapi-best-practices-production-2026)
- [FastAPI OWASP Top 10 Security](https://oneuptime.com/blog/post/2025-01-06-fastapi-owasp-security/view)
- [FastAPI Authentication Guide](https://betterstack.com/community/guides/scaling-python/authentication-fastapi/)
- [FastAPI Production Deployment](https://render.com/articles/fastapi-production-deployment-best-practices)
- [Welphi — Delphi Survey Platform](https://www.welphi.com/)
- [Calibrum — Real-Time Delphi](https://calibrum.com/)
- [1000minds — Group Decision Making](https://www.1000minds.com/decision-making/delphi-method)
