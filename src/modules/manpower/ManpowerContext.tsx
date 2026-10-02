import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../walkie/lib/supabaseClient';
import { useWalkie } from '../walkie';
import { DEPT_OPTIONS } from '../accommodation/types';
import type { Arrival, CallLog, CallOutcome, DeviceType, Sewadar } from './types';

const mapSewadar = (r: any): Sewadar => ({
  id: r.id, name: r.name, phone: r.phone || '', department: r.department || '',
  deviceType: r.device_type || 'none', deviceRef: r.device_ref || '',
  arrival: r.arrival || 'pending', arrivedAt: r.arrived_at || null,
  badgeIssued: !!r.badge_issued, badgeAt: r.badge_at || null,
  callCount: r.call_count || 0, lastCallAt: r.last_call_at || null,
  lastCallOutcome: r.last_call_outcome || null, lastCallBy: r.last_call_by || '',
});
const mapCall = (r: any): CallLog => ({ id: r.id, sewadarId: r.sewadar_id, outcome: r.outcome, note: r.note || '', calledBy: r.called_by || '', calledAt: r.called_at });

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const sortSewadars = (a: Sewadar, b: Sewadar) => collator.compare(a.name, b.name);
const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

const friendlyError = (error: any): string => {
  const msg: string = error?.message || 'Unknown error';
  if (/row-level security|permission denied/i.test(msg)) return "You don't have permission to do that.";
  if (error?.code === '23505' || /duplicate key/i.test(msg)) return 'That phone number is already in the list.';
  if (/schema cache|does not exist|could not find/i.test(msg)) return `${msg} — run supabase/migration_v10_manpower.sql in the Supabase SQL Editor, then reload.`;
  return msg;
};

export interface SewadarInput { name: string; phone: string; department: string; deviceType: DeviceType; deviceRef: string }
export interface Stats { total: number; toCall: number; awaiting: number; arrived: number; notComing: number; badgePending: number; badgeIssued: number; withDevice: number }

interface Ctx {
  sewadars: Sewadar[]; loading: boolean; loadError: string; canManage: boolean; stats: Stats;
  add: (i: SewadarInput) => Promise<boolean>;
  addMany: (rows: SewadarInput[]) => Promise<{ added: number; skipped: number }>;
  update: (id: string, i: SewadarInput) => Promise<boolean>;
  remove: (ids: string[]) => Promise<boolean>;
  setArrival: (ids: string[], arrival: Arrival) => Promise<boolean>;
  setBadge: (ids: string[], issued: boolean) => Promise<boolean>;
  setDepartment: (ids: string[], department: string) => Promise<boolean>;
  logCall: (id: string, outcome: CallOutcome, note: string) => Promise<boolean>;
  fetchCalls: (id: string) => Promise<CallLog[]>;
}
const C = createContext<Ctx | null>(null);
export const useManpower = (): Ctx => { const c = useContext(C); if (!c) throw new Error('useManpower must be used inside <ManpowerProvider>'); return c; };

export const ManpowerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const w: any = useWalkie();
  const user = w.currentUser;
  const orgId: string | null = user?.organizationId || null;
  const ready = !!user && user.approved !== false && user.isActive !== false && !!orgId;
  const canManage = ready && (user.level === 'owner' || user.level === 'dept_head' || user.subDepartment === 'sewadars');

  const [sewadars, setSewadars] = useState<Sewadar[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const ref = useRef(sewadars); ref.current = sewadars;

  const toast = useCallback((m: string, t: 'success' | 'error' | 'warning' = 'success') => w.addToast?.(m, t), [w.addToast]);
  const log = useCallback((a: string, d: string, t = 'info') => { try { w.logAction?.(a, d, t); } catch { /* best effort */ } }, [w.logAction]);

  const load = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    const out: any[] = [];
    let error: any = null;
    for (let from = 0; ; from += 1000) {
      const r = await supabase.from('manpower_sewadars').select('*').order('created_at', { ascending: true }).range(from, from + 999);
      if (r.error) { error = r.error; break; }
      out.push(...(r.data || []));
      if (!r.data || r.data.length < 1000) break;
    }
    if (error) setLoadError(friendlyError(error)); else { setLoadError(''); setSewadars(out.map(mapSewadar).sort(sortSewadars)); }
    setLoading(false);
  }, [ready]);

  useEffect(() => { if (!ready) { setSewadars([]); setLoadError(''); return; } load(); }, [ready, orgId]); // eslint-disable-line

  const upsert = (list: Sewadar[], item: Sewadar) => [...list.filter(x => x.id !== item.id), item].sort(sortSewadars);

  useEffect(() => {
    if (!ready) return;
    const ch = supabase.channel(`manpower-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manpower_sewadars', filter: `organization_id=eq.${orgId}` }, (p: any) => {
        if (p.eventType === 'DELETE') setSewadars(prev => prev.filter(x => x.id !== p.old.id));
        else setSewadars(prev => upsert(prev, mapSewadar(p.new)));
      }).subscribe();
    const t = setInterval(load, 120000); // safety net if realtime drops
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [ready, orgId]); // eslint-disable-line

  const deny = () => { toast('You can view this list but not change it.', 'error'); return false; };
  const clean = (i: SewadarInput) => ({
    name: i.name.trim(), phone: i.phone.replace(/[^\d+]/g, ''), department: i.department || null,
    device_type: i.deviceType, device_ref: i.deviceType === 'none' ? '' : i.deviceRef.trim(),
  });

  const add: Ctx['add'] = async (i) => {
    if (!canManage) return deny();
    if (!i.name.trim()) { toast('Name is required.', 'error'); return false; }
    const { data, error } = await supabase.from('manpower_sewadars').insert({ id: uid('sew'), organization_id: orgId, ...clean(i) }).select().single();
    if (error) { toast(`Could not add: ${friendlyError(error)}`, 'error'); return false; }
    setSewadars(p => upsert(p, mapSewadar(data)));
    log('Sewadar Added', `${user.name} added ${i.name.trim()}`, 'success');
    toast(`${i.name.trim()} added.`);
    return true;
  };

  const addMany: Ctx['addMany'] = async (rows) => {
    if (!canManage) { deny(); return { added: 0, skipped: rows.length }; }
    const have = new Set(ref.current.map(s => s.phone).filter(Boolean));
    const seen = new Set<string>();
    const fresh = rows.filter(r => {
      const c = clean(r); if (!c.name) return false;
      if (c.phone) { if (have.has(c.phone) || seen.has(c.phone)) return false; seen.add(c.phone); }
      return true;
    });
    let added = 0;
    for (const part of chunk(fresh, 400)) {
      const { data, error } = await supabase.from('manpower_sewadars').insert(part.map(r => ({ id: uid('sew'), organization_id: orgId, ...clean(r) }))).select();
      if (error) { toast(`Import stopped: ${friendlyError(error)}`, 'error'); break; }
      added += data?.length || 0;
      setSewadars(p => [...p, ...(data || []).map(mapSewadar)].sort(sortSewadars));
    }
    if (added) { log('Sewadars Imported', `${user.name} imported ${added} sewadars`, 'success'); toast(`${added} sewadar(s) added.`); }
    return { added, skipped: rows.length - added };
  };

  const update: Ctx['update'] = async (id, i) => {
    if (!canManage) return deny();
    if (!i.name.trim()) { toast('Name is required.', 'error'); return false; }
    const { data, error } = await supabase.from('manpower_sewadars').update(clean(i)).eq('id', id).select().single();
    if (error) { toast(`Could not save: ${friendlyError(error)}`, 'error'); return false; }
    setSewadars(p => upsert(p, mapSewadar(data)));
    toast('Saved.');
    return true;
  };

  const remove: Ctx['remove'] = async (ids) => {
    if (!canManage) return deny();
    for (const part of chunk(ids, 100)) {
      const { error } = await supabase.from('manpower_sewadars').delete().in('id', part);
      if (error) { toast(`Could not delete: ${friendlyError(error)}`, 'error'); return false; }
    }
    setSewadars(p => p.filter(s => !ids.includes(s.id)));
    log('Sewadars Removed', `${user.name} removed ${ids.length} sewadar(s)`, 'warning');
    toast(`${ids.length} removed.`);
    return true;
  };

  // Optimistic bulk patch: update the screen first, roll back if the server refuses.
  const patch = async (ids: string[], local: (s: Sewadar) => Sewadar, db: any, okMsg?: string) => {
    if (!canManage) return deny();
    const idSet = new Set(ids);
    const before = ref.current;
    setSewadars(p => p.map(s => (idSet.has(s.id) ? local(s) : s)));
    for (const part of chunk(ids, 100)) {
      const { data, error } = await supabase.from('manpower_sewadars').update(db).in('id', part).select();
      if (error) { setSewadars(before); toast(`Could not update: ${friendlyError(error)}`, 'error'); return false; }
      setSewadars(p => { let n = p; (data || []).forEach((d: any) => { n = upsert(n, mapSewadar(d)); }); return n; });
    }
    if (okMsg) toast(okMsg);
    return true;
  };

  const setArrival: Ctx['setArrival'] = async (ids, arrival) => {
    const now = new Date().toISOString();
    const ok = await patch(ids, s => ({ ...s, arrival, arrivedAt: arrival === 'arrived' ? now : null }), { arrival },
      ids.length > 1 ? `${ids.length} updated.` : undefined);
    if (ok && ids.length > 1) log('Arrival Updated', `${user.name} set ${ids.length} sewadars to ${arrival}`, 'info');
    return ok;
  };
  const setBadge: Ctx['setBadge'] = (ids, issued) =>
    patch(ids, s => ({ ...s, badgeIssued: issued, badgeAt: issued ? new Date().toISOString() : null }), { badge_issued: issued }, ids.length > 1 ? `${ids.length} updated.` : undefined);
  const setDepartment: Ctx['setDepartment'] = (ids, department) =>
    patch(ids, s => ({ ...s, department }), { department: department || null }, `${ids.length} moved to ${DEPT_OPTIONS.find(d => d[0] === department)?.[1] || 'no department'}.`);

  const logCall: Ctx['logCall'] = async (id, outcome, note) => {
    if (!canManage) return deny();
    const now = new Date().toISOString();
    const { error } = await supabase.from('manpower_calls').insert({ id: uid('call'), organization_id: orgId, sewadar_id: id, outcome, note: note.trim(), called_by: user.name });
    if (error) { toast(`Could not log call: ${friendlyError(error)}`, 'error'); return false; }
    // The database bumps the counter; mirror it now so the row updates instantly.
    setSewadars(p => p.map(s => s.id === id ? { ...s, callCount: s.callCount + 1, lastCallAt: now, lastCallOutcome: outcome, lastCallBy: user.name } : s));
    if (outcome === 'not_coming') await setArrival([id], 'not_coming');
    toast('Call logged.');
    return true;
  };

  const fetchCalls: Ctx['fetchCalls'] = async (id) => {
    const { data, error } = await supabase.from('manpower_calls').select('*').eq('sewadar_id', id).order('called_at', { ascending: false });
    if (error) { toast(friendlyError(error), 'error'); return []; }
    return (data || []).map(mapCall);
  };

  const stats = useMemo<Stats>(() => {
    const s: Stats = { total: sewadars.length, toCall: 0, awaiting: 0, arrived: 0, notComing: 0, badgePending: 0, badgeIssued: 0, withDevice: 0 };
    for (const x of sewadars) {
      if (x.arrival === 'arrived') { s.arrived++; if (x.badgeIssued) s.badgeIssued++; else s.badgePending++; }
      else if (x.arrival === 'not_coming') s.notComing++;
      else if (x.callCount === 0) s.toCall++;
      else s.awaiting++;
      if (x.deviceType !== 'none') s.withDevice++;
    }
    return s;
  }, [sewadars]);

  const value: Ctx = { sewadars, loading, loadError, canManage, stats, add, addMany, update, remove, setArrival, setBadge, setDepartment, logCall, fetchCalls };
  return <C.Provider value={value}>{children}</C.Provider>;
};
