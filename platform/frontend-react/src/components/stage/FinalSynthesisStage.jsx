/**
 * Final results & synthesis — projected during the 4:05 PM closing
 * agenda step. Pulls the latest Claude-drafted synthesis from
 * /api/conference/synthesis/latest. Admin sees a "Generate" /
 * "Regenerate" button that calls /api/conference/synthesis/generate
 * (gathers cross-WG ranked questions + breakout notes + upvoted chat +
 * comments + preloaded WG context → Claude → markdown).
 *
 * Non-admin viewers (audience phones via /day, or the projector when
 * no admin token is present) just see the rendered markdown.
 */

import { useEffect, useState, useCallback } from 'react';
import { api, getAdminToken } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, RefreshCw, Loader2, FileText, Clock } from 'lucide-react';

export function FinalSynthesisStage({ bus }) {
  const [synth, setSynth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState(null);
  const isAdmin = Boolean(getAdminToken());

  const fetchLatest = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/conference/synthesis/latest');
      setSynth(data?.markdown ? data : null);
    } catch (e) {
      setErr(e?.message || 'Failed to load synthesis');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLatest(); }, [fetchLatest, bus]);

  const generate = async () => {
    setGenerating(true);
    setErr(null);
    try {
      // Claude Opus on a prompt this long takes 30-90s. The default
      // 15s api() timeout would abort before the model finishes, so
      // we explicitly extend to 3 minutes. The backend writes to the
      // ConferenceSynthesis table before returning, so even if the
      // client gives up the row is durable — a refresh would pick
      // it up via /synthesis/latest.
      const res = await api('/api/conference/synthesis/generate', {
        method: 'POST',
        timeoutMs: 180000,
      });
      setSynth(res);
    } catch (e) {
      // If the request times out client-side but the backend kept
      // running, the row may have landed after our abort. Pull
      // /synthesis/latest once before surfacing the error.
      try {
        const latest = await api('/api/conference/synthesis/latest');
        if (latest?.markdown) {
          setSynth(latest);
          return;
        }
      } catch {
        /* fall through to error message */
      }
      setErr(e?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0A1628] text-white">
      <div className="flex shrink-0 items-end justify-between gap-4 px-10 pb-3 pt-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300/85">
            4:05 PM · closing
          </p>
          <h1 className="mt-1 flex items-center gap-3 text-4xl font-bold tracking-tight">
            <Sparkles className="h-7 w-7 text-amber-300" />
            Final results &amp; synthesis
          </h1>
          {synth?.created_at && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-white/45">
              <Clock className="h-3 w-3" />
              Drafted {new Date(synth.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              {synth?.input_summary && (
                <span className="ml-2 text-white/35">
                  · {synth.input_summary.n_questions} questions ·{' '}
                  {synth.input_summary.n_breakout_notes} table notes ·{' '}
                  {synth.input_summary.n_chat_messages} chat ·{' '}
                  {synth.input_summary.n_comments} comments
                </span>
              )}
            </p>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={generate}
            disabled={generating}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/25 disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {generating ? 'Drafting…' : synth?.markdown ? 'Regenerate' : 'Generate synthesis'}
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-10 pb-8">
        {loading && !synth && (
          <Skeleton className="h-[60vh] w-full rounded-2xl" />
        )}

        {!loading && !synth && !generating && (
          <EmptyState isAdmin={isAdmin} err={err} />
        )}

        {generating && !synth?.markdown && (
          <DraftingState />
        )}

        {synth?.markdown && (
          <article
            className="prose prose-invert max-w-none"
            style={{
              // Larger, projector-readable text. Tailwind's typography
              // plugin isn't installed; render with explicit sizing.
              fontSize: '17px',
              lineHeight: 1.55,
            }}
          >
            <SynthesisMarkdown text={synth.markdown} />
          </article>
        )}
      </div>
    </div>
  );
}

function EmptyState({ isAdmin, err }) {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
      <FileText className="mx-auto h-10 w-10 text-amber-300/70" />
      <p className="mt-4 text-lg font-semibold text-white">No synthesis drafted yet</p>
      <p className="mt-2 text-sm text-white/55">
        The closing synthesis gathers the cross-WG ranked questions, breakout notes,
        upvoted audience chat, and written comments from today and asks Claude to draft
        a structured wrap-up.
      </p>
      {isAdmin ? (
        <p className="mt-4 text-sm text-amber-200">
          Tap <span className="font-semibold">Generate synthesis</span> above when the room is ready.
        </p>
      ) : (
        <p className="mt-4 text-sm text-white/45">
          The chair will draft this live in a moment.
        </p>
      )}
      {err && (
        <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">
          {err}
        </p>
      )}
    </div>
  );
}

function DraftingState() {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-amber-400/30 bg-amber-500/[0.06] p-8 text-center">
      <Loader2 className="mx-auto h-10 w-10 animate-spin text-amber-300" />
      <p className="mt-4 text-lg font-semibold text-amber-100">Drafting synthesis…</p>
      <p className="mt-2 text-sm text-white/65">
        Reading the room's votes, breakout notes, and chat — usually 30–60 seconds.
      </p>
    </div>
  );
}

// Lightweight markdown renderer for the synthesis output. The text we
// expect is the H2/H3-structured doc the prompt requests — no need to
// pull in react-markdown for this. Handles: H2, H3, paragraphs, bullet
// lists, and **bold** within text. Code blocks / images / tables not
// expected and would render as plain text.
function SynthesisMarkdown({ text }) {
  const blocks = parseBlocks(text);
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === 'h2') {
          return (
            <h2 key={i} className="mt-8 mb-3 border-b border-amber-400/25 pb-2 text-2xl font-bold text-amber-100">
              {b.content}
            </h2>
          );
        }
        if (b.type === 'h3') {
          return (
            <h3 key={i} className="mt-5 mb-2 text-lg font-semibold text-white">
              {b.content}
            </h3>
          );
        }
        if (b.type === 'ul') {
          return (
            <ul key={i} className="my-3 space-y-2 pl-1">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-2 text-white/90">
                  <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300/80" />
                  <span dangerouslySetInnerHTML={{ __html: inlineBold(item) }} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p
            key={i}
            className="my-3 text-white/85"
            dangerouslySetInnerHTML={{ __html: inlineBold(b.content) }}
          />
        );
      })}
    </>
  );
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function inlineBold(s) {
  // Convert **bold** → <strong>, then escape everything else
  const escaped = escapeHtml(s);
  return escaped.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>');
}

function parseBlocks(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let cur = null;
  const flushPara = () => {
    if (cur && cur.type === 'p' && cur.content.trim()) out.push({ type: 'p', content: cur.content.trim() });
    if (cur && cur.type === 'ul' && cur.items.length) out.push({ type: 'ul', items: cur.items });
    cur = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      continue;
    }
    if (/^##\s+/.test(line)) {
      flushPara();
      out.push({ type: 'h2', content: line.replace(/^##\s+/, '').trim() });
      continue;
    }
    if (/^###\s+/.test(line)) {
      flushPara();
      out.push({ type: 'h3', content: line.replace(/^###\s+/, '').trim() });
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      if (!cur || cur.type !== 'ul') { flushPara(); cur = { type: 'ul', items: [] }; }
      cur.items.push(line.replace(/^\s*[-*]\s+/, ''));
      continue;
    }
    if (!cur || cur.type !== 'p') { flushPara(); cur = { type: 'p', content: '' }; }
    cur.content += (cur.content ? ' ' : '') + line.trim();
  }
  flushPara();
  return out;
}

export default FinalSynthesisStage;
