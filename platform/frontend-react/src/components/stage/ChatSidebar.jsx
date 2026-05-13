/**
 * Anonymous chat sidebar for the panel stage view.
 *
 * Audience messages sorted by upvotes (top) by default; admin can flip
 * to "new". Admin sees a Hide button on each message; audience does not.
 *
 * No author names are shown — messages are fully anonymous per chair
 * direction. Upvote count + timestamp only.
 *
 * Input box is rendered ONLY on the audience /day view; this sidebar
 * is the projection-side render and is read-only.
 */

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUp, EyeOff, Eye, MessageSquare } from 'lucide-react';

const REFRESH_MS = 4_000; // safety-net poll in addition to SSE bus

export function ChatSidebar({ sessionId, resolving, bus, accent, isAdmin }) {
  const [messages, setMessages] = useState([]);
  const [sort, setSort] = useState('top');
  const [showHidden, setShowHidden] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    try {
      const params = new URLSearchParams({ sort });
      if (isAdmin && showHidden) params.set('include_hidden', 'true');
      const data = await api(`/api/conference/chat/${sessionId}?${params.toString()}`);
      setMessages(data?.messages || []);
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [sessionId, sort, showHidden, isAdmin]);

  useEffect(() => { refresh(); }, [refresh, bus]);
  useEffect(() => {
    if (!sessionId) return;
    const t = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(t);
  }, [refresh, sessionId]);

  const hide = async (id) => {
    try {
      await api(`/api/conference/chat/${id}/hide`, { method: 'POST' });
      refresh();
    } catch {}
  };
  const unhide = async (id) => {
    try {
      await api(`/api/conference/chat/${id}/unhide`, { method: 'POST' });
      refresh();
    } catch {}
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0A1626] px-5 py-6">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="h-4 w-4" style={{ color: accent }} />
        <h2 className="text-sm font-semibold text-white">Audience</h2>
        <span className="ml-2 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/50">
          {messages.length}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setSort('top')}
            className={`rounded px-2 py-0.5 text-[10px] font-medium ${sort === 'top' ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            Top
          </button>
          <button
            onClick={() => setSort('new')}
            className={`rounded px-2 py-0.5 text-[10px] font-medium ${sort === 'new' ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            New
          </button>
        </div>
      </div>

      {isAdmin && (
        <button
          onClick={() => setShowHidden(!showHidden)}
          className="mb-3 text-[10px] text-white/40 hover:text-white/70"
        >
          {showHidden ? 'Hide hidden messages' : 'Show hidden messages'}
        </button>
      )}

      {(resolving || (loading && messages.length === 0)) && (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      )}

      {!sessionId && !resolving && (
        <p className="text-xs text-white/40">No active session yet. Once created, audience messages appear here.</p>
      )}

      {sessionId && !loading && messages.length === 0 && (
        <p className="text-xs text-white/40">
          No messages yet. Audience members can submit and upvote questions from their phones at /day.
        </p>
      )}

      <ul className="space-y-2">
        {messages.map((m, idx) => (
          <li
            key={m.id}
            className={`rounded-xl border p-3 transition-colors ${
              m.hidden
                ? 'border-red-500/20 bg-red-500/[0.04] opacity-50'
                : idx < 3 && sort === 'top' && (m.upvote_count || 0) > 0
                ? 'border-white/[0.16] bg-white/[0.05]'
                : 'border-white/[0.06] bg-white/[0.02]'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div className="flex shrink-0 flex-col items-center">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded ${
                    m.has_upvoted ? 'bg-[#00B4D8]/20' : 'bg-white/[0.04]'
                  }`}
                >
                  <ArrowUp className={`h-3.5 w-3.5 ${m.has_upvoted ? 'text-[#48CAE4]' : 'text-white/40'}`} />
                </div>
                <span className="mt-0.5 font-mono text-[11px] font-semibold text-white/70">
                  {m.upvote_count || 0}
                </span>
              </div>
              <p className={`min-w-0 flex-1 text-sm leading-snug ${m.hidden ? 'text-white/40 line-through' : 'text-white/85'}`}>
                {m.body}
              </p>
              {isAdmin && (
                <button
                  onClick={() => (m.hidden ? unhide(m.id) : hide(m.id))}
                  className="rounded p-1 text-white/30 hover:bg-white/[0.06] hover:text-white/70"
                  title={m.hidden ? 'Unhide' : 'Hide'}
                >
                  {m.hidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
