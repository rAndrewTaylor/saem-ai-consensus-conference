/**
 * Right column of the command page: live audience signal.
 *
 * Three tabs:
 *   - Chat: real-time message firehose (with admin hide buttons) for
 *           the currently-active panel session.
 *   - Vote: live tally of incoming votes for the active session.
 *   - Notes: breakout note submissions as they arrive.
 *
 * Auto-switches to the most relevant tab based on stage mode so the
 * chair doesn't have to fiddle: panel mode → Chat, table_reactions
 * mode → Notes, cross_wg mode → Vote.
 */

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUp, EyeOff, Eye, MessageSquare, Vote, FileText, Star } from 'lucide-react';

const POLL_MS = 4000;

export function LiveSignal({ mode, bus }) {
  const [tab, setTab] = useState('chat');

  // Auto-switch tab based on stage mode
  useEffect(() => {
    if (/^panel:\d+$/.test(mode || '')) setTab('chat');
    else if (mode === 'table_reactions') setTab('notes');
    else if (mode === 'cross_wg') setTab('vote');
  }, [mode]);

  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-white/[0.06] bg-[#0E1E35] p-3">
      <div className="px-2 pt-1">
        <h2 className="text-sm font-bold text-white">Live audience signal</h2>
      </div>
      <div className="flex gap-1 px-2">
        <TabPill active={tab === 'chat'} onClick={() => setTab('chat')} icon={MessageSquare}>Chat</TabPill>
        <TabPill active={tab === 'vote'} onClick={() => setTab('vote')} icon={Vote}>Votes</TabPill>
        <TabPill active={tab === 'notes'} onClick={() => setTab('notes')} icon={FileText}>Notes</TabPill>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-1">
        {tab === 'chat' && <ChatFirehose mode={mode} bus={bus} />}
        {tab === 'vote' && <VoteTally mode={mode} bus={bus} />}
        {tab === 'notes' && <NotesFirehose bus={bus} />}
      </div>
    </div>
  );
}

function TabPill({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium ${
        active ? 'bg-white/[0.1] text-white' : 'text-white/40 hover:bg-white/[0.05] hover:text-white/80'
      }`}
    >
      <Icon className="h-3 w-3" />
      {children}
    </button>
  );
}

// ---- Chat ---------------------------------------------------------------

function ChatFirehose({ mode, bus }) {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Resolve panel session
  useEffect(() => {
    const m = /^panel:(\d+)$/.exec(mode || '');
    if (!m) { setSessionId(null); setMessages([]); setLoading(false); return; }
    const wgNumber = parseInt(m[1], 10);
    api('/api/conference/sessions').then((sessions) => {
      const match = (sessions || [])
        .filter((s) => s.wg_number === wgNumber && s.session_type === 'wg_presentation')
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];
      setSessionId(match ? match.id : null);
    }).catch(() => setSessionId(null));
  }, [mode]);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await api(`/api/conference/chat/${sessionId}?sort=top&include_hidden=true`);
      setMessages(data?.messages || []);
    } catch {} finally { setLoading(false); }
  }, [sessionId]);

  useEffect(() => { setLoading(true); refresh(); }, [refresh, bus]);
  useEffect(() => {
    if (!sessionId) return;
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [refresh, sessionId]);

  const hide = async (id) => {
    try { await api(`/api/conference/chat/${id}/hide`, { method: 'POST' }); refresh(); } catch {}
  };
  const unhide = async (id) => {
    try { await api(`/api/conference/chat/${id}/unhide`, { method: 'POST' }); refresh(); } catch {}
  };

  if (!sessionId) {
    return <p className="px-1 text-[11px] text-white/40">Chat appears when the stage is in panel mode.</p>;
  }
  if (loading) return <Skeleton className="h-32 w-full rounded-xl" />;
  if (messages.length === 0) return <p className="px-1 text-[11px] text-white/40">No messages yet for this panel.</p>;

  return (
    <ul className="space-y-1.5">
      {messages.map((m, i) => (
        <li
          key={m.id}
          className={`rounded-lg border p-2 ${
            m.hidden
              ? 'border-red-500/20 bg-red-500/[0.04] opacity-60'
              : i < 3 && (m.upvote_count || 0) > 0
              ? 'border-white/[0.12] bg-white/[0.04]'
              : 'border-white/[0.05] bg-white/[0.02]'
          }`}
        >
          <div className="flex items-start gap-2">
            <div className="shrink-0 rounded bg-white/[0.04] px-1 py-0.5 text-center">
              <ArrowUp className="mx-auto h-3 w-3 text-white/40" />
              <p className="font-mono text-[10px] font-semibold text-white/70">{m.upvote_count || 0}</p>
            </div>
            <p className={`min-w-0 flex-1 text-xs leading-snug ${m.hidden ? 'text-white/40 line-through' : 'text-white/85'}`}>
              {m.body}
            </p>
            <button
              onClick={() => (m.hidden ? unhide(m.id) : hide(m.id))}
              className="rounded p-1 text-white/30 hover:bg-white/[0.06] hover:text-white/70"
              title={m.hidden ? 'Unhide' : 'Hide'}
            >
              {m.hidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---- Vote tally ---------------------------------------------------------

function VoteTally({ mode, bus }) {
  const [sessionId, setSessionId] = useState(null);
  const [results, setResults] = useState(null);
  const [featuredIds, setFeaturedIds] = useState(new Set());
  const [busyId, setBusyId] = useState(null);
  const isPanel = /^panel:\d+$/.test(mode || '');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sessions = await api('/api/conference/sessions');
        let sid = null;
        const m = /^panel:(\d+)$/.exec(mode || '');
        if (m) {
          const wg = parseInt(m[1], 10);
          const match = (sessions || []).filter((s) => s.wg_number === wg && s.session_type === 'wg_presentation').sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];
          sid = match ? match.id : null;
        } else if (mode === 'cross_wg') {
          const match = (sessions || []).find((s) => s.session_type === 'cross_wg_prioritization');
          sid = match ? match.id : null;
        }
        if (!cancelled) setSessionId(sid);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [mode]);

  const refreshFeatured = useCallback(async () => {
    if (!isPanel) return;
    try {
      const d = await api('/api/conference/cross-wg/candidates');
      // The endpoint returns { groups: [{ candidates: [...] }] }. Flatten
      // to a single Set of every question_id currently flagged
      // featured_in_cross_wg, so the star-toggle preserves the rest of
      // the slate (the POST below sends `replace: true` with this set).
      const ids = new Set();
      (d?.groups || []).forEach((g) => {
        (g.candidates || []).forEach((c) => {
          if (c?.is_featured) ids.add(c.question_id);
        });
      });
      setFeaturedIds(ids);
    } catch {}
  }, [isPanel]);

  useEffect(() => {
    if (!sessionId) { setResults(null); return; }
    api(`/api/conference/results/${sessionId}`).then(setResults).catch(() => setResults(null));
    refreshFeatured();
  }, [sessionId, bus, refreshFeatured]);

  const toggleFeatured = async (qid) => {
    setBusyId(qid);
    const next = new Set(featuredIds);
    if (next.has(qid)) next.delete(qid); else next.add(qid);
    try {
      await api('/api/conference/cross-wg/feature', {
        method: 'POST',
        body: { question_ids: [...next], replace: true },
      });
      setFeaturedIds(next);
    } catch {} finally { setBusyId(null); }
  };

  if (!sessionId) return <p className="px-1 text-[11px] text-white/40">No active vote.</p>;
  if (!results) return <Skeleton className="h-32 w-full rounded-xl" />;

  const rows = (results?.questions || results?.results || []).slice(0, 10);
  if (rows.length === 0) return <p className="px-1 text-[11px] text-white/40">No votes yet.</p>;

  const max = Math.max(1, ...rows.map((r) => r.points || r.importance_mean || r.avg_rank || 0));
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => {
        const val = r.points || r.importance_mean || r.avg_rank || 0;
        const label = r.points != null ? `${r.points} pts` : r.importance_mean != null ? `${Number(r.importance_mean).toFixed(1)} imp` : `${Number(r.avg_rank || 0).toFixed(2)} rank`;
        const qid = r.question_id || r.id;
        const featured = featuredIds.has(qid);
        return (
          <li key={qid} className={`rounded-lg border p-2 ${featured ? 'border-amber-400/30 bg-amber-400/[0.04]' : 'border-white/[0.05] bg-white/[0.02]'}`}>
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 text-[11px] leading-snug text-white/80 line-clamp-2">{r.text || r.question_text}</p>
              <span className="shrink-0 font-mono text-[10px] text-white/60">{label}</span>
              {isPanel && (
                <button
                  onClick={() => toggleFeatured(qid)}
                  disabled={busyId === qid}
                  title={featured ? 'Remove from closing round' : 'Advance to closing round'}
                  className={`shrink-0 rounded p-1 ${featured ? 'text-amber-300 hover:bg-amber-400/10' : 'text-white/30 hover:bg-white/[0.06] hover:text-amber-300'}`}
                >
                  <Star className={`h-3.5 w-3.5 ${featured ? 'fill-current' : ''}`} />
                </button>
              )}
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.04]">
              <div className={`h-full rounded-full ${featured ? 'bg-amber-400' : 'bg-[#00B4D8]'}`} style={{ width: `${(val / max) * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ---- Notes --------------------------------------------------------------

function NotesFirehose({ bus }) {
  const [sessions, setSessions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await api('/api/conference/sessions');
        if (cancelled) return;
        setSessions(s || []);
        // Aggregate notes across all sessions (chair wants to see them all)
        const allNotes = await Promise.all(
          (s || []).map((sess) =>
            api(`/api/conference/results/${sess.id}`).then((r) => (r?.breakout_notes || []).map((n) => ({ ...n, _session: sess })))
              .catch(() => [])
          )
        );
        if (cancelled) return;
        const flat = allNotes.flat().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        setNotes(flat);
      } catch {} finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [bus]);

  if (loading) return <Skeleton className="h-32 w-full rounded-xl" />;
  if (notes.length === 0) return <p className="px-1 text-[11px] text-white/40">Breakout notes appear here as facilitators submit.</p>;

  return (
    <ul className="space-y-1.5">
      {notes.map((n) => (
        <li key={n.id} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5">
          <div className="flex items-center gap-2">
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">T{n.table_number ?? '?'}</span>
            {n.facilitator_name && <span className="text-[10px] text-white/40">{n.facilitator_name}</span>}
            {n._session?.wg_number && <span className="ml-auto text-[10px] text-white/30">WG{n._session.wg_number}</span>}
          </div>
          {n.themes && <p className="mt-1 text-[11px] text-white/70 line-clamp-2"><b className="text-white/50">Themes:</b> {n.themes}</p>}
          {n.disagreements && <p className="mt-0.5 text-[11px] text-white/70 line-clamp-2"><b className="text-white/50">Disagreement:</b> {n.disagreements}</p>}
          {n.surprises && <p className="mt-0.5 text-[11px] text-white/70 line-clamp-2"><b className="text-white/50">Surprises:</b> {n.surprises}</p>}
        </li>
      ))}
    </ul>
  );
}
