"""Generate a printable PDF of conference-day table cards.

Each card has a large QR pointing to the welcome page pre-loaded with
the conference access code, plus the URL and code in human-readable
form so participants who can't scan can still type it.

Layout: 4 cards per US Letter page (2 x 2), each ~5.5 x 4.25 inches.
Cut once horizontally and once vertically to separate. Generates enough
pages for ~12 round tables plus spares (default 16 cards = 4 pages).

Output: docs/conference-day/table_cards.pdf

Usage:
    python scripts/generate_table_cards.py [--count N] [--code CODE]
"""

from __future__ import annotations

import argparse
from io import BytesIO
from pathlib import Path

import qrcode
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


DEFAULT_BASE = "https://saem-ai-consensus-conference-production.up.railway.app"
DEFAULT_PATH = "/welcome"
DEFAULT_CODE = "ai26"
DEFAULT_COUNT = 16

PAGE_W, PAGE_H = letter            # 612 x 792 pt (8.5 x 11 in)
CARD_W = PAGE_W / 2                # 4.25 in
CARD_H = PAGE_H / 2                # 5.5 in

NAVY = HexColor("#0C2340")
TEAL = HexColor("#00B4D8")
AMBER = HexColor("#F5A623")
DARK = HexColor("#1A1A1A")
GREY = HexColor("#666666")
LIGHT_GREY = HexColor("#E5E5E5")


def make_qr_image(url: str) -> BytesIO:
    """Render a QR code for the given URL and return it as an in-memory PNG."""
    qr = qrcode.QRCode(
        version=None,                     # auto-size
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=20,                      # large modules so it prints crisp
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def draw_card(c: canvas.Canvas, x0: float, y0: float, url: str, code: str,
              display_url: str) -> None:
    """Draw one table card starting at (x0, y0) — the lower-left corner."""
    # Hairline cut guides at card corners (so the printer/cutter has marks)
    c.setStrokeColor(LIGHT_GREY)
    c.setLineWidth(0.25)
    c.rect(x0, y0, CARD_W, CARD_H, stroke=1, fill=0)

    # Header strip — navy block top
    strip_h = 0.55 * inch
    c.setFillColor(NAVY)
    c.rect(x0, y0 + CARD_H - strip_h, CARD_W, strip_h, stroke=0, fill=1)

    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 11)
    c.drawString(x0 + 0.25 * inch, y0 + CARD_H - 0.25 * inch,
                 "SAEM 2026 · AI Consensus Conference")
    c.setFillColor(TEAL)
    c.setFont("Helvetica", 8)
    c.drawString(x0 + 0.25 * inch, y0 + CARD_H - 0.42 * inch,
                 "Thursday, May 21, 2026 · Atlanta Marriott Marquis")

    # Main CTA
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(x0 + CARD_W / 2,
                        y0 + CARD_H - strip_h - 0.42 * inch,
                        "Sign in to participate")

    # QR — centered, ~2.4" square
    qr_size = 2.4 * inch
    qr_x = x0 + (CARD_W - qr_size) / 2
    qr_y = y0 + 1.1 * inch
    qr_buf = make_qr_image(url)
    c.drawImage(ImageReader(qr_buf), qr_x, qr_y,
                width=qr_size, height=qr_size,
                preserveAspectRatio=True, mask="auto")

    # URL line (smaller, monospace-ish, for typing fallback)
    c.setFillColor(GREY)
    c.setFont("Helvetica", 7)
    c.drawCentredString(x0 + CARD_W / 2, y0 + 0.92 * inch,
                        f"or visit: {display_url}")

    # Conference code box — amber, prominent
    code_box_w = 2.2 * inch
    code_box_h = 0.55 * inch
    code_box_x = x0 + (CARD_W - code_box_w) / 2
    code_box_y = y0 + 0.30 * inch
    c.setFillColor(AMBER)
    c.roundRect(code_box_x, code_box_y, code_box_w, code_box_h,
                6, stroke=0, fill=1)
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(x0 + CARD_W / 2,
                        code_box_y + code_box_h - 0.18 * inch,
                        "CONFERENCE CODE")
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(x0 + CARD_W / 2,
                        code_box_y + 0.10 * inch,
                        code)

    # Footer help line
    c.setFillColor(GREY)
    c.setFont("Helvetica-Oblique", 7)
    c.drawCentredString(x0 + CARD_W / 2, y0 + 0.13 * inch,
                        "Need help? Help desk at the back of the room.")


def build_pdf(out_path: Path, count: int, base: str, path: str,
              code: str) -> None:
    url = f"{base}{path}?access={code}"
    display_url = f"{base.replace('https://', '')}{path}"

    c = canvas.Canvas(str(out_path), pagesize=letter)
    c.setAuthor("SAEM 2026 AI Consensus Conference")
    c.setTitle("SAEM 2026 — Table Cards")

    # 4 cards per page (2 cols, 2 rows)
    per_page = 4
    pages = (count + per_page - 1) // per_page
    drawn = 0
    for _ in range(pages):
        for row in range(2):
            for col in range(2):
                if drawn >= count:
                    break
                x0 = col * CARD_W
                # Top row is the higher y; PDF origin is bottom-left.
                y0 = (1 - row) * CARD_H if row == 0 else 0
                # Cleaner: row 0 → y = CARD_H ; row 1 → y = 0
                y0 = CARD_H if row == 0 else 0
                draw_card(c, x0, y0, url, code, display_url)
                drawn += 1
        c.showPage()

    c.save()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--count", type=int, default=DEFAULT_COUNT,
                        help=f"How many cards to render (default {DEFAULT_COUNT}, "
                             "4 per page)")
    parser.add_argument("--code", default=DEFAULT_CODE,
                        help=f"Conference access code (default '{DEFAULT_CODE}')")
    parser.add_argument("--base", default=DEFAULT_BASE,
                        help="Base URL of the deployed app")
    parser.add_argument("--path", default=DEFAULT_PATH,
                        help="Path the QR points to (default /welcome)")
    parser.add_argument("--out", default=None,
                        help="Output PDF path (default docs/conference-day/table_cards.pdf)")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    out = (Path(args.out) if args.out
           else repo_root / "docs" / "conference-day" / "table_cards.pdf")
    out.parent.mkdir(parents=True, exist_ok=True)
    build_pdf(out, args.count, args.base, args.path, args.code)
    print(f"Wrote {args.count} cards across {(args.count + 3) // 4} pages to: {out}")


if __name__ == "__main__":
    main()
