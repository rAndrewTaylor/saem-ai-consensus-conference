/**
 * Table reactions mode — projected during the breakout discussion.
 *
 * Shows a themed conversation banner (theme-specific prompts tying the
 * breakout back to the panels just heard) above a grid of cards, one
 * per table, populated as facilitators submit breakout_notes. Refreshes
 * via the SSE bus.
 */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles } from 'lucide-react';

// Theme banners shown on both the projector AND the audience phone form
// (BreakoutNotesPanel reads the same content via REACTION_BLOCKS) so the
// room and the facilitators see the same conversation starters.
export const REACTION_BLOCKS = {
  technology: {
    accent: '#48CAE4',
    label: 'Technology',
    subtitle: 'Reacting to Panel 1 (Clinical Practice) + Panel 2 (Infrastructure & Data)',
    prompts: [
      'From the Clinical Practice + Infrastructure panels: where did the two pull in different directions, and what technology gap most blocks ED-ready AI at your shop?',
      'What capability did the panelists describe that you genuinely can’t deliver today — and what would have to be true for that to change in the next two years?',
    ],
  },
  people: {
    accent: '#A78BFA',
    label: 'People',
    subtitle: 'Reacting to Panel 3 (Education & Training) + Panel 4 (Human-AI Interaction)',
    prompts: [
      'Based on the Education and Human-AI Interaction panels: who actually has to be ready for these tools to land safely, and where is that work missing or under-resourced at your institution?',
      'What behaviour change — clinician, leader, or patient — would matter most for these systems to be safe and trusted, and what currently stops it?',
    ],
  },
};

export function TableReactionsStage({ bus, block }) {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/conference/sessions')
      .then((s) => {
        setSessions(s || []);
        // Default to the most recent currently-active session
        const active = (s || []).find((x) => x.is_active) || (s || [])[0];
        if (active && !activeSessionId) setActiveSessionId(active.id);
      })
      .catch(() => {});
  }, [bus]);

  useEffect(() => {
    if (!activeSessionId) return;
    setLoading(true);
    api(`/api/conference/results/${activeSessionId}`)
      .then((r) => setNotes(r?.breakout_notes || []))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [activeSessionId, bus]);

  const blockMeta = REACTION_BLOCKS[block] || null;

  return (
    // Header is fixed-height; grid scrolls internally when there are
    // many tables (≥ 9 on a 1080p screen).
    <div className="flex h-full flex-col overflow-hidden px-10 py-6">
      <div className="mb-4 flex shrink-0 items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Breakout discussion{blockMeta ? ` · ${blockMeta.label}` : ''}
          </p>
          <h1 className="mt-1 text-3xl font-bold">Table reactions</h1>
          {blockMeta && (
            <p className="mt-1 text-sm text-white/55">{blockMeta.subtitle}</p>
          )}
        </div>
        <select
          value={activeSessionId || ''}
          onChange={(e) => setActiveSessionId(Number(e.target.value) || null)}
          className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white/80"
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              Session {s.id} · {s.session_type} {s.wg_number ? `(WG${s.wg_number})` : ''}
            </option>
          ))}
        </select>
      </div>

      {blockMeta && (
        <div
          className="mb-4 shrink-0 rounded-2xl border p-4"
          style={{
            borderColor: `${blockMeta.accent}40`,
            backgroundColor: `${blockMeta.accent}10`,
          }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: blockMeta.accent }} />
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: blockMeta.accent }}>
              Discuss at your table
            </p>
          </div>
          <ol className="mt-3 space-y-2">
            {blockMeta.prompts.map((p, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold"
                  style={{ backgroundColor: `${blockMeta.accent}30`, color: blockMeta.accent }}
                >
                  {i + 1}
                </span>
                <p className="text-lg leading-snug text-white/95 sm:text-xl">{p}</p>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-white/45">
            Facilitator: capture the table’s thoughts in the notes form on your phone — they appear here as you submit.
          </p>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <p className="text-base text-white/40">
            No table reactions yet. Facilitators submit notes from /day during the breakout.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((n) => (
              <div key={n.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-[#00B4D8]/15 px-2.5 py-0.5 text-xs font-semibold text-[#48CAE4]">
                    Table {n.table_number ?? '—'}
                  </span>
                  {n.facilitator_name && (
                    <span className="text-[11px] text-white/40">{n.facilitator_name}</span>
                  )}
                </div>
                {n.themes && (<NoteSection label="Themes" body={n.themes} />)}
                {n.agreements && (<NoteSection label="Agreements" body={n.agreements} />)}
                {n.disagreements && (<NoteSection label="Disagreements" body={n.disagreements} />)}
                {n.surprises && (<NoteSection label="Surprises" body={n.surprises} />)}
                {n.suggestions && (<NoteSection label="Suggestions" body={n.suggestions} />)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NoteSection({ label, body }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/50">{label}</p>
      <p className="mt-1 whitespace-pre-line text-base text-white/85">{body}</p>
    </div>
  );
}
