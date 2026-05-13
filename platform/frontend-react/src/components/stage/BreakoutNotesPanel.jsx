/**
 * Breakout note submission form on /day.
 *
 * Shows only when stage is in 'table_reactions' mode. Facilitators
 * at each table submit structured notes (themes / agreements /
 * disagreements / surprises / suggestions). One submission per token
 * per session — same token can edit by submitting again (last write
 * wins on the table_number key).
 *
 * Notes appear on the stage TableReactionsStage view as soon as
 * submitted.
 */

import { useEffect, useState, useRef } from 'react';
import { api, getToken } from '@/lib/api';
import { ClipboardList, Send, ChevronDown, ChevronUp } from 'lucide-react';

export function BreakoutNotesPanel() {
  const [mode, setMode] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const esRef = useRef(null);
  const [form, setForm] = useState({
    table_number: '',
    facilitator_name: '',
    themes: '',
    agreements: '',
    disagreements: '',
    surprises: '',
    suggestions: '',
  });

  // Listen for display-mode changes
  useEffect(() => {
    let cancelled = false;
    api('/api/conference/display-mode').then((d) => { if (!cancelled) setMode(d?.mode || 'idle'); }).catch(() => {});
    if (typeof EventSource !== 'undefined') {
      const es = new EventSource('/api/events/day');
      esRef.current = es;
      es.addEventListener('message', (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data?.event === 'display_mode_changed') setMode(data.mode);
        } catch {}
      });
    }
    return () => {
      cancelled = true;
      if (esRef.current) { try { esRef.current.close(); } catch {} }
    };
  }, []);

  // Resolve the most recent currently-active session
  useEffect(() => {
    if (mode !== 'table_reactions') return;
    api('/api/conference/sessions').then((sessions) => {
      const active = (sessions || []).find((s) => s.is_active) || (sessions || [])[0];
      setActiveSession(active || null);
    }).catch(() => {});
  }, [mode]);

  const submit = async () => {
    if (!activeSession) return;
    const payload = {
      table_number: parseInt(form.table_number, 10) || 0,
      facilitator_name: form.facilitator_name || '',
      themes: form.themes || null,
      agreements: form.agreements || null,
      disagreements: form.disagreements || null,
      surprises: form.surprises || null,
      suggestions: form.suggestions || null,
    };
    setSubmitting(true);
    try {
      const token = getToken();
      await api(`/api/conference/breakout/${activeSession.id}`, {
        method: 'POST', body: payload, token,
      });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (mode !== 'table_reactions') return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 max-h-[80vh] overflow-y-auto border-t border-white/[0.08] bg-[#0C1A2F]/95 backdrop-blur">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-4 py-2 hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-amber-300" />
          <span className="text-sm font-semibold text-white">Table reactions — facilitator notes</span>
          {submitted && (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              Submitted
            </span>
          )}
        </div>
        {collapsed ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
      </button>

      {!collapsed && (
        <div className="border-t border-white/[0.04] px-4 py-4">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Field
              label="Table #"
              value={form.table_number}
              type="number"
              onChange={(v) => setForm({ ...form, table_number: v })}
            />
            <Field
              label="Facilitator name"
              value={form.facilitator_name}
              onChange={(v) => setForm({ ...form, facilitator_name: v })}
            />
          </div>

          <TextArea label="Themes that emerged" value={form.themes} onChange={(v) => setForm({ ...form, themes: v })} />
          <TextArea label="Where there was agreement" value={form.agreements} onChange={(v) => setForm({ ...form, agreements: v })} />
          <TextArea label="Where there was disagreement" value={form.disagreements} onChange={(v) => setForm({ ...form, disagreements: v })} />
          <TextArea label="Anything that surprised you" value={form.surprises} onChange={(v) => setForm({ ...form, surprises: v })} />
          <TextArea label="New suggestions / questions raised" value={form.suggestions} onChange={(v) => setForm({ ...form, suggestions: v })} />

          <div className="mt-3 flex items-center justify-between">
            <p className="text-[11px] text-white/40">
              {activeSession ? `Session ${activeSession.id}` : 'No active session'} · re-submit anytime to update
            </p>
            <button
              onClick={submit}
              disabled={!activeSession || submitting || !form.table_number}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/30 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              {submitting ? 'Submitting…' : submitted ? 'Submitted' : 'Submit notes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-sm text-white outline-none focus:border-amber-400/40"
      />
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="mt-2 flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="resize-y rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40"
      />
    </label>
  );
}
