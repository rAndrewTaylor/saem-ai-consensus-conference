"""Admin-only report endpoints.

Currently exposes the Round 1 inter-round report as a DOCX download.

Note on timing: a cold run (no AI / embedding cache) takes ~3 minutes
because of ~336 Opus tagging calls. Subsequent runs hit the on-disk
cache and return in ~10 seconds. Front-end shows a "this may take a
few minutes the first time" hint on the button click.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..database import get_db, write_audit_log
from ..services.round1_report.main import generate_report

router = APIRouter()


@router.get("/round1")
def round1_docx(
    skip_ai: bool = False,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Generate and stream the Round 1 inter-round report as a DOCX.

    Query params:
      skip_ai=true — skip Opus tagging passes (faster; F8/F9/D.3 will be
                     empty unless the cache already has tags).
    """
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    try:
        raw = generate_report(db, skip_ai=skip_ai)
    except RuntimeError as exc:
        # Most common: ANTHROPIC_API_KEY missing or invalid
        raise HTTPException(500, f"Report generation failed: {exc}")

    write_audit_log(
        db,
        user_email=admin.get("sub", "unknown"),
        action="report_round1_download",
        detail=f"Generated Round 1 DOCX ({len(raw):,} bytes); skip_ai={skip_ai}",
    )

    return StreamingResponse(
        iter([raw]),
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "wordprocessingml.document"
        ),
        headers={
            "Content-Disposition": (
                f'attachment; filename="Round_1_Report_{timestamp}.docx"'
            ),
        },
    )
