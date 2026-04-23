import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { motion } from 'framer-motion';
import {
  Crown, Copy, Check, RefreshCw, CheckCircle2, Clock, Edit2, Save, X,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';

function leadUrl(token) {
  return `${window.location.origin}/lead/claim/${token}`;
}

function CopyButton({ token }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(leadUrl(token));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast({ message: 'Could not copy. Select the link manually.', type: 'error' });
    }
  };
  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-md border border-white/[0.1] px-2 py-1 text-xs font-medium transition ${
        copied ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white/90'
      }`}
    >
      {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy link</>}
    </button>
  );
}

function EditCoLeadRow({ coLead, onSaved, onCancel }) {
  const toast = useToast();
  const [email, setEmail] = useState(coLead.email || '');
  const [institution, setInstitution] = useState(coLead.institution || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api(`/api/co-leads/${coLead.id}`, {
        method: 'PATCH',
        body: { email: email.trim(), institution: institution.trim() },
      });
      toast({ message: 'Saved', type: 'success' });
      onSaved();
    } catch (err) {
      toast({ message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="border-b border-white/[0.04] bg-white/[0.03]">
      <td className="px-3 py-2 font-medium text-white">{coLead.name}</td>
      <td className="px-3 py-2" colSpan={2}>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@institution.edu"
            className="w-full rounded border border-white/[0.1] bg-white/[0.04] px-2 py-1 text-xs text-white placeholder-white/30 outline-none focus:border-purple-400/50"
          />
          <input
            type="text"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="Institution"
            className="w-full rounded border border-white/[0.1] bg-white/[0.04] px-2 py-1 text-xs text-white placeholder-white/30 outline-none focus:border-purple-400/50"
          />
        </div>
      </td>
      <td className="px-3 py-2"></td>
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-1">
          <button onClick={save} disabled={saving} className="inline-flex h-6 w-6 items-center justify-center rounded-md text-emerald-400 hover:bg-emerald-500/10" title="Save">
            <Save className="h-3.5 w-3.5" />
          </button>
          <button onClick={onCancel} className="inline-flex h-6 w-6 items-center justify-center rounded-md text-white/40 hover:bg-white/[0.06]" title="Cancel">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function CoLeadsSection() {
  const toast = useToast();
  const [coLeads, setCoLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/co-leads');
      setCoLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      toast({ message: 'Failed to load co-leads: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const rotate = async (cl) => {
    if (!confirm(`Rotate the invite link for ${cl.name}?\n\nThe old link will stop working immediately and you'll need to share the new one.`)) return;
    try {
      await api(`/api/co-leads/${cl.id}/rotate-token`, { method: 'POST' });
      toast({ message: 'New invite link generated', type: 'success' });
      fetchList();
    } catch (err) {
      toast({ message: err.message, type: 'error' });
    }
  };

  const grouped = useMemo(() => {
    const byWg = {};
    for (const cl of coLeads) {
      const n = cl.wg_number || 0;
      (byWg[n] ||= []).push(cl);
    }
    return byWg;
  }, [coLeads]);

  const claimedCount = coLeads.filter((cl) => cl.claimed_at).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.48 }}
      className="mt-8"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-400" />
            Working Group Leads
            <Badge variant="default" className="ml-2">{coLeads.length}</Badge>
            {claimedCount > 0 && (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {claimedCount} signed in
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-white/50">
            Each co-lead has a unique invite link. Share via Slack or email &mdash; they'll land on a personalized welcome and then their Lead Dashboard showing only their WG.
          </p>

          {loading ? (
            <p className="py-6 text-center text-sm text-white/40">Loading co-leads...</p>
          ) : coLeads.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/40">No co-leads configured yet. They should auto-seed on next deploy.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs uppercase tracking-wider text-white/40">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">WG</th>
                    <th className="px-3 py-2 font-medium">Email / Institution</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((wgNum) => {
                    const rows = grouped[wgNum] || [];
                    if (rows.length === 0) return null;
                    return (
                      <Fragment key={wgNum}>
                        {rows.map((cl) => (
                          editingId === cl.id ? (
                            <EditCoLeadRow
                              key={cl.id}
                              coLead={cl}
                              onSaved={() => { setEditingId(null); fetchList(); }}
                              onCancel={() => setEditingId(null)}
                            />
                          ) : (
                            <tr key={cl.id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                              <td className="px-3 py-2 font-medium text-white/90">{cl.name}</td>
                              <td className="px-3 py-2">
                                <Badge variant="primary" className="text-[10px]">WG {cl.wg_number}</Badge>
                                {cl.wg_short_name && <span className="ml-1.5 text-[11px] text-white/40">{cl.wg_short_name}</span>}
                              </td>
                              <td className="px-3 py-2 text-xs">
                                {cl.email || cl.institution ? (
                                  <div>
                                    {cl.email && <p className="text-white/70">{cl.email}</p>}
                                    {cl.institution && <p className="text-white/40">{cl.institution}</p>}
                                  </div>
                                ) : (
                                  <span className="text-white/20">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {!cl.is_active ? (
                                  <Badge variant="danger" className="text-[10px]">Deactivated</Badge>
                                ) : cl.claimed_at ? (
                                  <Badge variant="success" className="gap-1 text-[10px]">
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                    Signed in
                                  </Badge>
                                ) : (
                                  <Badge variant="warning" className="gap-1 text-[10px]">
                                    <Clock className="h-2.5 w-2.5" />
                                    Not yet
                                  </Badge>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <CopyButton token={cl.invite_token} />
                                  <button
                                    onClick={() => setEditingId(cl.id)}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-white/30 transition hover:bg-white/[0.06] hover:text-white/70"
                                    title="Edit email / institution"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => rotate(cl)}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-white/30 transition hover:bg-amber-500/10 hover:text-amber-400"
                                    title="Generate new invite link (old link stops working)"
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

