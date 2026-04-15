import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Users, Copy, Check, Trash2, ChevronDown, Mail, Link as LinkIcon,
  CheckCircle2, Clock, Loader2,
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
                    <th className="px-3 py-2 text-right font-medium">Delphi</th>
                    <th className="px-3 py-2 text-right font-medium">Pairwise</th>
                    <th className="px-3 py-2 text-right font-medium"></th>
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
                      <td className="px-3 py-2 text-right font-mono text-xs text-white/70">{p.delphi_response_count}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-white/70">{p.pairwise_vote_count}</td>
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
