/**
 * Table reactions mode — projected during the breakout discussion.
 *
 * Shows a grid of cards, one per table, populated as facilitators
 * submit breakout_notes (themes / agreements / disagreements / surprises
 * / suggestions). Refreshes via the SSE bus.
 */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

export function TableReactionsStage({ bus }) {
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

  return (
    // Header is fixed-height; grid scrolls internally when there are
    // many tables (≥ 9 on a 1080p screen).
    <div className="flex h-full flex-col overflow-hidden px-10 py-6">
      <div className="mb-4 flex shrink-0 items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Breakout discussion</p>
          <h1 className="mt-1 text-3xl font-bold">Table reactions</h1>
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
