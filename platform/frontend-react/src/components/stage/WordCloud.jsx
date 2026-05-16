/**
 * Lightweight chat word cloud for the panel stage.
 *
 * Tokenizes the running list of audience chat messages, strips stop
 * words / short tokens, counts frequencies, and renders the top ~25
 * terms as flex-wrapped tags whose font size scales with frequency.
 *
 * Hand-rolled rather than a d3-cloud dep because the panel needs to
 * fit a bounded box at projector scale and a tag-cloud reads better
 * from the back of the ballroom than a fancy positioned cloud.
 */

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

const POLL_MS = 5000;

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being', 'but', 'by',
  'can', 'do', 'does', 'doing', 'for', 'from', 'have', 'has', 'had', 'he',
  'her', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'just',
  'me', 'my', 'no', 'not', 'of', 'on', 'or', 'our', 'out', 'over', 'she',
  'should', 'so', 'some', 'such', 'that', 'the', 'their', 'them', 'then',
  'there', 'these', 'they', 'this', 'those', 'to', 'too', 'up', 'us', 'was',
  'we', 'were', 'what', 'when', 'where', 'which', 'who', 'why', 'will',
  'with', 'would', 'you', 'your', "i'm", "we're", "it's", "don't", "can't",
  "won't", "didn't", "isn't", "aren't", 'about', 'also', 'because', 'could',
  'might', 'much', 'really', 'thing', 'things', 'think', 'kind', 'like',
  'lot', 'maybe', 'might', 'one', 'two', 'three', 'get', 'got', 'going',
  'go', 'now', 'still', 'something', 'someone', 'people', 'time', 'way',
  'make', 'made', 'know', 'see', 'said', 'say', 'than', 'them',
]);

const MIN_LEN = 3;
const TOP_N = 25;

function tokenize(messages) {
  const counts = new Map();
  for (const m of messages) {
    const body = (m?.body || '').toLowerCase();
    // Strip everything that isn't a letter/number/apostrophe, then split
    const tokens = body.replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/);
    for (const t of tokens) {
      if (!t || t.length < MIN_LEN) continue;
      if (STOP_WORDS.has(t)) continue;
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N);
}

export function WordCloud({ sessionId, bus, accent = '#48CAE4', className = '' }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!sessionId) { setMessages([]); return; }
    let cancelled = false;
    const refresh = async () => {
      try {
        const d = await api(`/api/conference/chat/${sessionId}?sort=new`);
        if (cancelled) return;
        setMessages(d?.messages || []);
      } catch {}
    };
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, [sessionId, bus]);

  const top = useMemo(() => tokenize(messages || []), [messages]);

  if (!top.length) {
    return (
      <div className={`flex h-full items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 ${className}`}>
        <p className="text-xs text-white/40">Audience themes will surface here as chat builds.</p>
      </div>
    );
  }

  const maxCount = top[0][1] || 1;
  const minCount = top[top.length - 1][1] || 1;
  const fontFor = (count) => {
    if (maxCount === minCount) return 18;
    const t = (count - minCount) / (maxCount - minCount); // 0..1
    return Math.round(12 + t * 30); // 12px..42px
  };
  const opacityFor = (count) => {
    if (maxCount === minCount) return 0.85;
    const t = (count - minCount) / (maxCount - minCount);
    return 0.45 + t * 0.5;
  };

  return (
    <div className={`flex h-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 ${className}`}>
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
          What the room is talking about
        </p>
        <span className="font-mono text-[10px] text-white/30">{messages.length} msg</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-wrap content-center items-center justify-center gap-x-3 gap-y-1 overflow-hidden">
        {top.map(([word, count]) => (
          <span
            key={word}
            style={{
              fontSize: `${fontFor(count)}px`,
              color: accent,
              opacity: opacityFor(count),
              lineHeight: 1.1,
            }}
            className="font-semibold tracking-tight"
            title={`${count} mention${count === 1 ? '' : 's'}`}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}
