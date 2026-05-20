/**
 * Audience-side chat panel for the /day page.
 *
 * Sticky bottom drawer that surfaces only when the projection is in
 * panel:N mode. Lets audience members:
 *   - submit anonymous messages
 *   - upvote others' messages (one toggle per token)
 *   - see the top-3 pinned at the top
 *
 * No author names anywhere — fully anonymous per chair direction.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { api, getAnyParticipantToken } from '@/lib/api';
import { queueSubmit } from '@/lib/offlineQueue';
import { ArrowUp, ChevronDown, ChevronUp, Send, MessageSquare } from 'lucide-react';

const REFRESH_MS = 4_000;

export function AudienceChatPanel({ focused = false }) {
  const [mode, setMode] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [sort, setSort] = useState('top');
  const esRef = useRef(null);

  // Fetch current display mode + SSE subscribe
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const d = await api('/api/conference/display-mode');
        if (cancelled) return;
        setMode(d?.mode || 'idle');
      } catch {
        /* display-mode polling continues below */
      }
    };
    refresh();
    if (typeof EventSource !== 'undefined') {
      const es = new EventSource('/api/events/day');
      esRef.current = es;
      es.addEventListener('message', (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data?.event === 'display_mode_changed') setMode(data.mode);
        } catch {
          /* ignore malformed keepalive/proxy events */
        }
      });
    }
    return () => {
      cancelled = true;
      if (esRef.current) {
        try { esRef.current.close(); } catch {
          /* close is best-effort */
        }
      }
    };
  }, []);

  // Resolve session for current panel
  useEffect(() => {
    const m = /^panel:(\d+)$/.exec(mode || '');
    if (!m) { setSessionId(null); setMessages([]); return; }
    const wgNumber = parseInt(m[1], 10);
    api('/api/conference/sessions')
      .then((sessions) => {
        const match = (sessions || [])
          .filter((s) => s.wg_number === wgNumber && s.session_type === 'wg_presentation')
          .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];
        setSessionId(match ? match.id : null);
      })
      .catch(() => setSessionId(null));
  }, [mode]);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    try {
      const token = getAnyParticipantToken();
      const data = await api(`/api/conference/chat/${sessionId}?sort=${sort}`, { token });
      setMessages(data?.messages || []);
    } catch {
      /* retry on the next display-mode update */
    }
  }, [sessionId, sort]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!sessionId) return;
    const t = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(t);
  }, [refresh, sessionId]);

  const submit = async () => {
    const body = (text || '').trim();
    if (!body || !sessionId) return;
    setSubmitting(true);
    setStatus(null);
    try {
      const token = getAnyParticipantToken();
      const res = await queueSubmit({
        url: `/api/conference/chat/${sessionId}`,
        body: { body },
        token,
        kind: 'chat',
      });
      setText('');
      setStatus(res?.queued ? 'Message queued; it will post when you are back online.' : 'Posted.');
      if (!res?.queued) refresh();
    } catch (e) {
      setStatus(e.message || 'Message failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const upvote = async (msg) => {
    try {
      const token = getAnyParticipantToken();
      await queueSubmit({
        url: `/api/conference/chat/${msg.id}/upvote`,
        token,
        kind: 'chat_upvote',
      });
      // Optimistic
      setMessages((prev) => prev.map((m) =>
        m.id === msg.id
          ? { ...m, has_upvoted: !m.has_upvoted, upvote_count: m.upvote_count + (m.has_upvoted ? -1 : 1) }
          : m
      ));
    } catch {
      setStatus('Upvote failed. Try again.');
    }
  };

  // Hide when not in a panel mode
  if (!/^panel:\d+$/.test(mode || '')) return null;

  const wgNumber = parseInt(mode.split(':')[1], 10);

  // Focused mode: full-content card (used when chat is the ONLY thing the
  // audience phone should show during a panel). Default mode: fixed-bottom
  // drawer that overlays the rest of /day's content.
  const wrapperCls = focused
    ? 'rounded-2xl border border-[#48CAE4]/25 bg-[#00B4D8]/[0.04]'
    : 'fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0A1628]/95 backdrop-blur';
  const collapsibleOpen = focused ? true : !collapsed;
  const innerMaxH = focused ? 'max-h-[60vh]' : 'max-h-72';

  return (
    <div className={wrapperCls}>
      <button
        onClick={() => !focused && setCollapsed(!collapsed)}
        className={`flex w-full items-center justify-between px-4 py-3 text-left ${focused ? 'cursor-default' : 'hover:bg-white/[0.02]'}`}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[#48CAE4]" />
          <span className="text-sm font-semibold text-white">Audience chat · WG{wgNumber}</span>
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/50">
            {messages.length}
          </span>
        </div>
        {!focused && (collapsed ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />)}
      </button>

      {collapsibleOpen && (
        <div className="border-t border-white/[0.04] px-4 py-3">
          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Ask a question or share an observation (anonymous)…"
              maxLength={500}
              className="flex-1 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#00B4D8]/40"
            />
            <button
              onClick={submit}
              disabled={!text.trim() || submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#00B4D8]/20 px-3 py-2 text-sm font-medium text-[#48CAE4] hover:bg-[#00B4D8]/30 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              Post
            </button>
          </div>
          {status && (
            <p className="mt-1 text-[11px] text-white/40">{status}</p>
          )}

          {/* Sort toggle */}
          <div className="mt-2 flex items-center gap-1 text-[10px]">
            <button onClick={() => setSort('top')} className={`rounded px-2 py-0.5 font-medium ${sort === 'top' ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/70'}`}>Top</button>
            <button onClick={() => setSort('new')} className={`rounded px-2 py-0.5 font-medium ${sort === 'new' ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/70'}`}>New</button>
            <span className="ml-auto text-white/30">Anonymous · upvote to surface</span>
          </div>

          {/* Messages */}
          <ul className={`mt-3 ${innerMaxH} space-y-1.5 overflow-y-auto`}>
            {messages.length === 0 && (
              <li className="text-xs text-white/40">No messages yet — be the first.</li>
            )}
            {messages.map((m, i) => (
              <li
                key={m.id}
                className={`flex items-start gap-2 rounded-lg border p-2.5 ${
                  i < 3 && sort === 'top' && (m.upvote_count || 0) > 0
                    ? 'border-white/[0.12] bg-white/[0.04]'
                    : 'border-white/[0.05] bg-white/[0.02]'
                }`}
              >
                <button
                  onClick={() => upvote(m)}
                  className={`flex shrink-0 flex-col items-center rounded px-1 py-0.5 ${
                    m.has_upvoted ? 'bg-[#00B4D8]/20 text-[#48CAE4]' : 'bg-white/[0.04] text-white/40 hover:text-white/80'
                  }`}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  <span className="font-mono text-[10px] font-semibold">{m.upvote_count || 0}</span>
                </button>
                <p className="min-w-0 flex-1 text-sm leading-snug text-white/85">{m.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
