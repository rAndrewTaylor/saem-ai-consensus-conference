"""Matplotlib styling + palettes for the Round 1 report figures.

Two `style` modes — `screen` (denser, slightly larger fonts, optimised for
on-screen reading inside the React app) and `print` (single-column journal
width, tighter margins, optimised for the Word doc and the eventual
proceedings paper).

All figure functions accept `style="screen"|"print"` and `width=None`,
defaulting to print width when omitted. They return a matplotlib Figure
the caller is responsible for closing.
"""

from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

import matplotlib as mpl
import matplotlib.pyplot as plt


# --- Color palettes -----------------------------------------------------

# Pillar colors mirror the React app for cross-medium consistency.
PILLAR_COLORS = {
    "Technology": "#00B4D8",
    "Training":   "#4F8AB7",
    "Self":       "#10B981",
    "Society":    "#F59E0B",
}

# Disposition (stacked bars in F1)
DISPOSITION_COLORS = {
    "include":                      "#10B981",  # emerald
    "include_with_modifications":   "#F59E0B",  # amber
    "exclude":                      "#EF4444",  # red
}

# Bucket colors used on F4 scatter and elsewhere
BUCKET_COLORS = {
    "confirmed": "#10B981",
    "gray":      "#6B7280",
    "removed":   "#EF4444",
    "open":      "#3B82F6",
}

# Per-WG accent colors for cross-WG figures (F6, F7).
WG_COLORS = {
    1: "#00B4D8",
    2: "#4F8AB7",
    3: "#6366F1",
    4: "#10B981",
    5: "#F59E0B",
}


# --- Style modes --------------------------------------------------------

_BASE_RC = {
    "font.family": "DejaVu Sans",
    "font.size": 9,
    "axes.titlesize": 10,
    "axes.labelsize": 9,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.grid": True,
    "grid.color": "#E5E7EB",
    "grid.linewidth": 0.5,
    "xtick.color": "#374151",
    "ytick.color": "#374151",
    "axes.edgecolor": "#9CA3AF",
    "axes.labelcolor": "#111827",
    "axes.titlecolor": "#111827",
    "legend.frameon": False,
    "legend.fontsize": 8,
    "figure.dpi": 150,
    "savefig.dpi": 200,
    "savefig.bbox": "tight",
    "savefig.facecolor": "white",
    "figure.facecolor": "white",
    "axes.facecolor": "white",
}

_SCREEN_RC = {
    **_BASE_RC,
    "font.size": 10,
    "axes.titlesize": 12,
    "axes.labelsize": 10,
    "savefig.dpi": 144,
}

_PRINT_RC = {
    **_BASE_RC,
    "font.size": 8.5,
    "axes.titlesize": 9.5,
    "savefig.dpi": 300,
}


@contextmanager
def style_context(style: str = "print") -> Iterator[None]:
    """Apply rcParams for the requested style mode for the duration of the
    block, then restore. Use around any figure construction so different
    callers don't fight over global rcParams."""
    rc = _SCREEN_RC if style == "screen" else _PRINT_RC
    with mpl.rc_context(rc):
        yield


# --- Default widths -----------------------------------------------------

# Approx widths in inches.
WIDTH_PRINT_SINGLE = 3.5     # journal single-column
WIDTH_PRINT_DOUBLE = 7.0     # journal double-column / full
WIDTH_SCREEN_DEFAULT = 7.5   # ~768px at 100dpi


def default_width(style: str, kind: str = "double") -> float:
    """Return a sensible default figure width in inches."""
    if style == "screen":
        return WIDTH_SCREEN_DEFAULT
    return WIDTH_PRINT_SINGLE if kind == "single" else WIDTH_PRINT_DOUBLE


def fig_to_png_bytes(fig: "plt.Figure") -> bytes:
    """Render `fig` to PNG bytes (in-memory). Closes the figure."""
    import io
    buf = io.BytesIO()
    fig.savefig(buf, format="png")
    plt.close(fig)
    buf.seek(0)
    return buf.getvalue()


def wrap_label(text: str, *, width: int = 55, max_lines: int = 2) -> str:
    """Wrap a long question label to <=`max_lines` lines of <=`width`
    chars each. Truncates with an ellipsis only when the wrapped form
    still exceeds `max_lines`. Returns a string with embedded newlines
    suitable for matplotlib tick labels.
    """
    import textwrap
    text = " ".join((text or "").split())
    lines = textwrap.wrap(text, width=width, break_long_words=False)
    if not lines:
        return ""
    if len(lines) <= max_lines:
        return "\n".join(lines)
    # Truncate the last allowed line with an ellipsis
    kept = lines[:max_lines]
    last = kept[-1]
    if len(last) > width - 1:
        last = last[: width - 1].rstrip() + "…"
    else:
        last = last.rstrip(",.;:") + "…"
    kept[-1] = last
    return "\n".join(kept)


def question_label(qid: int, text_or_short: str, *, width: int = 55,
                    max_lines: int = 2, prefix_qid: bool = True) -> str:
    """Produce a `Q{id}: wrapped text` label fit for a tick."""
    body = wrap_label(text_or_short, width=width, max_lines=max_lines)
    if prefix_qid:
        return f"Q{qid}: {body}"
    return body
