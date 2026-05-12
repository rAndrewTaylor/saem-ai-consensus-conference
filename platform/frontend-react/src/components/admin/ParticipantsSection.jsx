import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Users, Copy, Check, Trash2, ChevronDown, Mail, Link as LinkIcon,
  CheckCircle2, Clock, Loader2, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';

function inviteUrl(token) {
  return `${window.location.origin}/invite/${token}`;
}

// Parse a bulk textarea into {name, email} pairs.
// Accepts:  "Moira Smith, moira@uva.edu"  or  "Moira Smith <moira@uva.edu>"
// or plain  "Moira Smith"
function parseBulk(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = [];
  const errors = [];
  for (const line of lines) {
    const angle = line.match(/^(.+?)\s*<([^>]+)>\s*$/);
    if (angle) {
      out.push({ name: angle[1].trim(), email: angle[2].trim() });
      continue;
    }
    const comma = line.split(',').map((s) => s.trim());
    if (comma.length >= 2 && comma[1].includes('@')) {
      out.push({ name: comma[0], email: comma[1] });
      continue;
    }
    if (line.includes('@')) {
      // Just an email, no name — skip with error
      errors.push(`"${line}" — needs a name`);
      continue;
    }
    // Name only
    out.push({ name: line, email: null });
  }
  return { invitees: out, errors };
}

function CopyLinkButton({ token, small = false }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const handleCopy = async () => {
    const url = inviteUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast({ message: 'Could not copy. Select and copy the link manually.', type: 'error' });
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-md border border-white/[0.1] px-2 py-1 text-xs font-medium transition ${
        copied ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white/90'
      } ${small ? '' : ''}`}
      title="Copy invite link"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy link
        </>
      )}
    </button>
  );
}

export function ParticipantsSection({ wgs }) {
  const toast = useToast();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterWg, setFilterWg] = useState('all');

  const [mode, setMode] = useState(null); // null | 'single' | 'bulk'
  const [formWg, setFormWg] = useState('1');

  // Single-invite form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState(null);

  // Bulk form
  const [bulkText, setBulkText] = useState('');
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkCreated, setBulkCreated] = useState([]);

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/participants');
      setParticipants(Array.isArray(data) ? data : []);
    } catch (err) {
      toast({ message: 'Failed to load participants: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchParticipants(); }, [fetchParticipants]);

  const filtered = useMemo(() => {
    if (filterWg === 'all') return participants;
    const n = Number(filterWg);
    return participants.filter((p) => p.wg_number === n);
  }, [participants, filterWg]);

  const handleCreateSingle = async () => {
    if (!name.trim()) {
      toast({ message: 'Name is required', type: 'error' });
      return;
    }
    setCreating(true);
    try {
      const p = await api('/api/participants', {
        method: 'POST',
        body: {
          name: name.trim(),
          email: email.trim() || null,
          wg_number: Number(formWg),
        },
      });
      setJustCreated(p);
      setName('');
      setEmail('');
      fetchParticipants();
      toast({ message: `Invite created for ${p.name}`, type: 'success' });
    } catch (err) {
      toast({ message: err.message, type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleCreateBulk = async () => {
    const { invitees, errors } = parseBulk(bulkText);
    if (invitees.length === 0) {
      toast({ message: 'No invitees parsed. Use "Name, email" per line.', type: 'error' });
      return;
    }
    if (errors.length) {
      toast({ message: `Skipping ${errors.length} invalid line(s): ${errors[0]}`, type: 'error', duration: 5000 });
    }
    setBulkCreating(true);
    try {
      const created = await api('/api/participants/bulk', {
        method: 'POST',
        body: { wg_number: Number(formWg), invitees },
      });
      setBulkCreated(created);
      setBulkText('');
      fetchParticipants();
      toast({ message: `Created ${created.length} invite(s)`, type: 'success' });
    } catch (err) {
      toast({ message: err.message, type: 'error' });
    } finally {
      setBulkCreating(false);
    }
  };

  const handleDeactivate = async (p) => {
    if (!confirm(`Deactivate invite for ${p.name}? Their link will stop working. Existing data is preserved.`)) return;
    try {
      await api(`/api/participants/${p.id}`, { method: 'DELETE' });
      toast({ message: 'Deactivated', type: 'success' });
      fetchParticipants();
    } catch (err) {
      toast({ message: err.message, type: 'error' });
    }
  };

  const resetForms = () => {
    setMode(null);
    setJustCreated(null);
    setBulkCreated([]);
  };

  const claimedCount = filtered.filter((p) => p.claimed_at).length;
  const invitedCount = filtered.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="mt-8"
    >
      <Card>
        <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            Participants &amp; Invites
            <Badge variant="default" className="ml-2">{invitedCount}</Badge>
            {claimedCount > 0 && (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {claimedCount} claimed
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={filterWg}
              onChange={(e) => setFilterWg(e.target.value)}
              className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs text-white/80 outline-none focus:border-purple-500"
            >
              <option value="all">All WGs</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>WG {n}</option>
              ))}
            </select>
            {mode === null && (
              <>
                <Button size="sm" variant="secondary" onClick={() => setMode('single')}>
                  <UserPlus className="h-4 w-4" /> Add invite
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setMode('bulk')}>
                  <Mail className="h-4 w-4" /> Bulk add
                </Button>
              </>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* ── Add single ─────────────────────────────────────────── */}
          <AnimatePresence>
            {mode === 'single' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 overflow-hidden"
              >
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto_auto]">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full name (e.g. Moira Smith)"
                      className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-purple-500"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email (optional)"
                      className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-purple-500"
                    />
                    <select
                      value={formWg}
                      onChange={(e) => setFormWg(e.target.value)}
                      className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white/80 outline-none focus:border-purple-500"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>WG {n}</option>
                      ))}
                    </select>
                    <Button size="sm" loading={creating} onClick={handleCreateSingle}>Create</Button>
                    <Button size="sm" variant="ghost" onClick={resetForms}>Done</Button>
                  </div>

                  {justCreated && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span className="text-emerald-200">Invite created for <strong>{justCreated.name}</strong></span>
                      <code className="max-w-md truncate rounded bg-black/30 px-2 py-1 font-mono text-xs text-white/70">
                        {inviteUrl(justCreated.token)}
                      </code>
                      <CopyLinkButton token={justCreated.token} />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Bulk add ───────────────────────────────────────────── */}
          <AnimatePresence>
            {mode === 'bulk' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 overflow-hidden"
              >
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <label className="text-xs font-medium text-white/60">Working Group:</label>
                    <select
                      value={formWg}
                      onChange={(e) => setFormWg(e.target.value)}
                      className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-sm text-white/80 outline-none focus:border-purple-500"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>WG {n}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    rows={6}
                    placeholder={`One per line — any of these formats work:\nMoira Smith, moira@uva.edu\nTehreem Rehman <tehreem@example.edu>\nJust A Name`}
                    className="w-full resize-y rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 font-mono text-xs text-white placeholder-white/25 outline-none focus:border-purple-500"
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-white/40">
                      {bulkText.trim() ? `${parseBulk(bulkText).invitees.length} invitee(s) parsed` : 'Paste or type one invitee per line'}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" loading={bulkCreating} onClick={handleCreateBulk} disabled={!bulkText.trim()}>
                        Create all
                      </Button>
                      <Button size="sm" variant="ghost" onClick={resetForms}>Done</Button>
                    </div>
                  </div>

                  {bulkCreated.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 overflow-hidden rounded-lg bg-emerald-500/10 p-3"
                    >
                      <p className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-200">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        Created {bulkCreated.length} invites &mdash; copy the links below
                      </p>
                      <div className="max-h-56 space-y-1 overflow-y-auto">
                        {bulkCreated.map((p) => (
                          <div key={p.id} className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="min-w-[140px] font-medium text-white/90">{p.name}</span>
                            <code className="max-w-xs truncate rounded bg-black/30 px-2 py-1 font-mono text-white/60">
                              {inviteUrl(p.token)}
                            </code>
                            <CopyLinkButton token={p.token} />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Possible duplicate accounts ────────────────────────── */}
          <DuplicatesPanel onDeactivated={fetchParticipants} />

          {/* ── List ───────────────────────────────────────────────── */}
          {loading ? (
            <p className="py-8 text-center text-sm text-white/40">Loading participants...</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Users className="h-8 w-8 text-white/20" />
              <p className="mt-2 text-sm text-white/50">
                {filterWg === 'all' ? 'No named invitees yet.' : `No invitees for WG ${filterWg} yet.`}
              </p>
              <p className="text-xs text-white/30">Click "Add invite" to create the first one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs uppercase tracking-wider text-white/40">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">WG</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium" colSpan="2">Delphi</th>
                    <th className="px-3 py-2 text-right font-medium" colSpan="2">Pairwise</th>
                    <th className="px-3 py-2 text-right font-medium"></th>
                  </tr>
                  <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-white/30">
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th className="px-3 pb-2 text-right font-medium">R1</th>
                    <th className="px-3 pb-2 text-right font-medium">R2</th>
                    <th className="px-3 pb-2 text-right font-medium">R1</th>
                    <th className="px-3 pb-2 text-right font-medium">R2</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                      <td className="px-3 py-2 font-medium text-white/90">{p.name}</td>
                      <td className="px-3 py-2 text-white/50">{p.email || <span className="text-white/20">—</span>}</td>
                      <td className="px-3 py-2">
                        <Badge variant="default" className="text-[10px]">WG {p.wg_number}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        {!p.is_active ? (
                          <Badge variant="danger" className="gap-1 text-[10px]">Deactivated</Badge>
                        ) : p.claimed_at ? (
                          <Badge variant="success" className="gap-1 text-[10px]">
                            <CheckCircle2 className="h-3 w-3" />
                            Claimed
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="gap-1 text-[10px]">
                            <Clock className="h-3 w-3" />
                            Not yet
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-white/70">{p.r1_response_count ?? 0}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-white/70">{p.r2_response_count ?? 0}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-white/70">{p.r1_pairwise_count ?? 0}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-white/70">{p.r2_pairwise_count ?? 0}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1.5">
                          <CopyLinkButton token={p.token} small />
                          {p.is_active && (
                            <button
                              onClick={() => handleDeactivate(p)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-white/30 transition hover:bg-red-500/10 hover:text-red-400"
                              title="Deactivate invite"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Possible duplicate accounts ───────────────────────────────────────
// Surfaces participants who share a name (or email) within the same WG.
// Multi-WG membership is fine (someone in WG4 and WG5 = two rows, both
// kept); two rows in the *same* WG is the case to triage. Each row shows
// data counts so the admin can deactivate the empty / never-claimed one
// and keep the one with responses.
function DuplicatesPanel({ onDeactivated }) {
  const toast = useToast();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [acting, setActing] = useState(null);

  const fetchDups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/admin/participants/duplicates');
      setGroups(Array.isArray(data?.groups) ? data.groups : []);
    } catch (err) {
      toast({
        message: 'Could not load duplicates: ' + err.message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchDups(); }, [fetchDups]);

  const handleDeactivate = async (member) => {
    const dataNote =
      member.delphi_responses + member.pairwise_votes + member.conference_votes > 0
        ? `\n\nThis copy has data (${member.delphi_responses} Delphi, ${member.pairwise_votes} pairwise, ${member.conference_votes} conference). Deactivating only blocks their token; existing responses stay in the database.`
        : '\n\nThis copy has no data — safe to deactivate.';
    const ok = confirm(
      `Deactivate this copy of "${member.name}" in WG ${member.wg_number}?${dataNote}\n\nThis is reversible — re-activate by clearing is_active in the DB or re-issuing an invite.`
    );
    if (!ok) return;
    setActing(member.id);
    try {
      await api(`/api/participants/${member.id}`, { method: 'DELETE' });
      toast({ message: `Deactivated ${member.name} (#${member.id})`, type: 'success' });
      await fetchDups();
      onDeactivated && onDeactivated();
    } catch (err) {
      toast({ message: err.message, type: 'error' });
    } finally {
      setActing(null);
    }
  };

  const total = groups.length;

  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-amber-400/20 bg-amber-500/[0.03]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.02]"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
        <span className="flex-1 text-sm font-semibold text-white/85">
          Possible duplicate accounts
          {!loading && total > 0 && (
            <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-300">
              {total} group{total === 1 ? '' : 's'}
            </span>
          )}
          {!loading && total === 0 && (
            <span className="ml-2 text-[11px] font-normal text-white/40">
              none detected
            </span>
          )}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); fetchDups(); }}
          className="rounded-md p-1 text-white/40 transition hover:bg-white/[0.06] hover:text-white/80"
          title="Re-scan"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-amber-400/10 px-4 py-3">
              {loading ? (
                <p className="py-4 text-center text-xs text-white/40">Scanning…</p>
              ) : total === 0 ? (
                <p className="py-2 text-xs text-white/40">
                  No participants share a name or email within the same WG.
                  (Multi-WG membership — e.g. one person in WG 4 and WG 5 — is
                  treated as legitimate and not flagged here.)
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-white/50">
                    Each group below has multiple accounts in the <strong>same WG</strong>.
                    The recommendation is to deactivate the copy without data
                    (or the unclaimed copy) and keep the other. Deactivating
                    only invalidates the invite token — existing responses are
                    preserved.
                  </p>
                  {groups.map((g, gi) => (
                    <div
                      key={`${g.reason}-${gi}`}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="warning" className="text-[10px]">
                          WG {g.wg_number ?? '—'}
                        </Badge>
                        <span className="font-mono text-white/50">
                          {g.reason === 'same_email' ? 'same email' : 'same name'}:
                        </span>
                        <span className="font-medium text-white/85">{g.match_value || '(blank)'}</span>
                      </div>
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-wider text-white/35">
                            <th className="px-2 py-1 font-medium">ID</th>
                            <th className="px-2 py-1 font-medium">Email</th>
                            <th className="px-2 py-1 font-medium">Status</th>
                            <th className="px-2 py-1 text-right font-medium">Delphi</th>
                            <th className="px-2 py-1 text-right font-medium">Pairwise</th>
                            <th className="px-2 py-1 text-right font-medium">Conference</th>
                            <th className="px-2 py-1 text-right font-medium"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.members.map((m) => {
                            const hasData =
                              m.delphi_responses + m.pairwise_votes + m.conference_votes > 0;
                            return (
                              <tr key={m.id} className="border-t border-white/[0.04]">
                                <td className="px-2 py-1 font-mono text-white/50">#{m.id}</td>
                                <td className="px-2 py-1 text-white/70">
                                  {m.email || <span className="text-white/25">—</span>}
                                </td>
                                <td className="px-2 py-1">
                                  {!m.is_active ? (
                                    <Badge variant="danger" className="text-[10px]">Deactivated</Badge>
                                  ) : m.claimed_at ? (
                                    <Badge variant="success" className="text-[10px]">Claimed</Badge>
                                  ) : (
                                    <Badge variant="warning" className="text-[10px]">Not yet</Badge>
                                  )}
                                  {hasData && (
                                    <span className="ml-1.5 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">
                                      has data
                                    </span>
                                  )}
                                </td>
                                <td className="px-2 py-1 text-right font-mono text-white/70">{m.delphi_responses}</td>
                                <td className="px-2 py-1 text-right font-mono text-white/70">{m.pairwise_votes}</td>
                                <td className="px-2 py-1 text-right font-mono text-white/70">{m.conference_votes}</td>
                                <td className="px-2 py-1 text-right">
                                  {m.is_active && (
                                    <button
                                      onClick={() => handleDeactivate(m)}
                                      disabled={acting === m.id}
                                      className="inline-flex items-center gap-1 rounded-md border border-white/[0.1] bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-white/70 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                                      title="Deactivate this copy (data is preserved)"
                                    >
                                      {acting === m.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3 w-3" />
                                      )}
                                      Deactivate
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
