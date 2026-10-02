import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Download, Edit3, History, Laptop, Package, Phone, PhoneCall, Plus, Radio, Search, Smartphone, Tablet, Trash2, Upload, Users } from 'lucide-react';
import { ToastContainer } from '../walkie';
import { DEPT_LABEL, DEPT_OPTIONS } from '../accommodation/types';
import { Modal, ConfirmModal, btnGhost, btnPrimary, cx, inputCls, labelCls } from '../accommodation/ui';
import { timeAgo } from '../accommodation/dates';
import { useManpower } from './ManpowerContext';
import type { SewadarInput } from './ManpowerContext';
import { DEVICES, DEVICE_LABEL, OUTCOMES, OUTCOME_LABEL, OUTCOME_TONE } from './types';
import type { CallLog, DeviceType, Sewadar } from './types';

// The command-center shell is always dark, so this module is dark-only.
const D = true;
const panel = 'rounded-2xl border border-line bg-surface/50';
const TONE: Record<string, string> = {
  ok: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  warn: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  bad: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  mute: 'bg-raised text-mute border-line-strong',
};
const DEVICE_ICON: Record<DeviceType, any> = { none: null, walkie: Radio, phone: Smartphone, laptop: Laptop, tablet: Tablet, other: Package };
const clock = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '');

type Stage = 'all' | 'toCall' | 'awaiting' | 'arrived' | 'badge' | 'notComing';
const inStage = (s: Sewadar, st: Stage) => {
  switch (st) {
    case 'toCall': return s.arrival === 'pending' && s.callCount === 0;
    case 'awaiting': return s.arrival === 'pending' && s.callCount > 0;
    case 'arrived': return s.arrival === 'arrived';
    case 'badge': return s.arrival === 'arrived' && !s.badgeIssued;
    case 'notComing': return s.arrival === 'not_coming';
    default: return true;
  }
};

export const ManpowerApp: React.FC = () => {
  const m = useManpower();
  const { sewadars, stats, canManage, loading, loadError } = m;
  const [stage, setStage] = useState<Stage>('all');
  const [dept, setDept] = useState('all');
  const [q, setQ] = useState('');
  const [size, setSize] = useState(50);
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Sewadar | 'new' | null>(null);
  const [calling, setCalling] = useState<Sewadar | null>(null);
  const [importing, setImporting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return sewadars.filter(s => inStage(s, stage)
      && (dept === 'all' || (dept === 'none' ? !s.department : s.department === dept))
      && (!t || s.name.toLowerCase().includes(t) || s.phone.includes(t) || s.deviceRef.toLowerCase().includes(t)));
  }, [sewadars, stage, dept, q]);

  useEffect(() => { setPage(0); }, [stage, dept, q, size]);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const view = rows.slice(page * size, page * size + size);
  const allOnPage = view.length > 0 && view.every(s => sel.has(s.id));
  const toggle = (id: string) => setSel(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const togglePage = () => setSel(p => { const n = new Set(p); view.forEach(s => (allOnPage ? n.delete(s.id) : n.add(s.id))); return n; });
  const ids = Array.from(sel);

  const exportCSV = () => {
    const head = ['Name', 'Phone', 'Department', 'Device', 'Device ID', 'Calls', 'Last call', 'Arrival', 'Arrived at', 'Badge'];
    const body = rows.map(s => [s.name, s.phone, DEPT_LABEL[s.department] || '', DEVICE_LABEL[s.deviceType], s.deviceRef, s.callCount,
      s.lastCallOutcome ? OUTCOME_LABEL[s.lastCallOutcome] : '', s.arrival, s.arrivedAt || '', s.badgeIssued ? 'Issued' : 'Pending']);
    const csv = [head, ...body].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `sewadars_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  const tabs: { key: Stage; label: string; n: number; tone: string }[] = [
    { key: 'all', label: 'All sewadars', n: stats.total, tone: '' },
    { key: 'toCall', label: 'To call', n: stats.toCall, tone: 'bg-amber-400' },
    { key: 'awaiting', label: 'Called · awaiting', n: stats.awaiting, tone: 'bg-blue-400' },
    { key: 'arrived', label: 'Arrived', n: stats.arrived, tone: 'bg-emerald-400' },
    { key: 'badge', label: 'Badge pending', n: stats.badgePending, tone: 'bg-orange-400' },
    { key: 'notComing', label: 'Not coming', n: stats.notComing, tone: 'bg-rose-400' },
  ];
  const pct = (n: number) => (stats.total ? (n / stats.total) * 100 : 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Users className="w-6 h-6 text-purple-400" />Manpower</h1>
          <p className="text-sm text-mute">Call, arrival, badge, department and device for every sewadar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnGhost(D)} onClick={exportCSV}><Download className="w-4 h-4" />Export</button>
          {canManage && <button className={btnGhost(D)} onClick={() => setImporting(true)}><Upload className="w-4 h-4" />Import list</button>}
          {canManage && <button className={btnPrimary} onClick={() => setEditing('new')}><Plus className="w-4 h-4" />Add sewadar</button>}
        </div>
      </div>

      {loadError && <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-400 text-sm p-3">Could not load manpower data: {loadError}</div>}

      {/* One panel: pipeline stages (also the filters) + progress bar + search */}
      <section className={cx(panel, 'overflow-hidden')}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 lg:divide-x divide-line">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setStage(t.key)} aria-pressed={stage === t.key}
              className={cx('px-4 py-3.5 text-left border-b-2 transition-colors', stage === t.key ? 'border-purple-400 bg-purple-500/5' : 'border-transparent hover:bg-slate-500/5')}>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-mute">
                {t.tone && <span className={cx('w-2 h-2 rounded-full', t.tone)} />}{t.label}
              </div>
              <div className="text-2xl font-bold mt-1 tabular-nums">{t.n}</div>
            </button>
          ))}
        </div>
        <div className="flex h-1.5 bg-raised" aria-hidden="true">
          <div className="bg-emerald-400" style={{ width: `${pct(stats.arrived)}%` }} />
          <div className="bg-blue-400" style={{ width: `${pct(stats.awaiting)}%` }} />
          <div className="bg-rose-400" style={{ width: `${pct(stats.notComing)}%` }} />
        </div>
        <div className="p-3 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between border-t border-line">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-faint" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, phone or device ID…" className={cx(inputCls(D), 'pl-9')} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-mute">
            <select value={dept} onChange={e => setDept(e.target.value)} aria-label="Department" className={cx(inputCls(D), 'w-auto')}>
              <option value="all">All departments</option>
              {DEPT_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              <option value="none">No department</option>
            </select>
            <span>{stats.withDevice} hold a device</span>
          </div>
        </div>
      </section>

      {sel.size > 0 && canManage && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2.5 flex flex-wrap items-center gap-2 text-sm">
          <b>{sel.size} selected</b>
          <button className={btnGhost(D)} onClick={() => m.setArrival(ids, 'arrived')}><Check className="w-3.5 h-3.5" />Mark arrived</button>
          <button className={btnGhost(D)} onClick={() => m.setBadge(ids, true)}>Issue badge</button>
          <select aria-label="Move to department" value="" onChange={e => { if (e.target.value) m.setDepartment(ids, e.target.value === '__none' ? '' : e.target.value); }} className={cx(inputCls(D), 'w-auto py-1.5 text-xs')}>
            <option value="">Move to department…</option>
            {DEPT_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            <option value="__none">No department</option>
          </select>
          <button className={cx(btnGhost(D), 'text-rose-400')} onClick={() => setConfirmDel(true)}><Trash2 className="w-3.5 h-3.5" />Delete</button>
          <button className="ml-auto text-xs text-mute hover:text-ink" onClick={() => setSel(new Set())}>Clear</button>
        </div>
      )}

      <section className={cx(panel, 'overflow-x-auto')}>
        <table className="w-full text-sm min-w-[56rem]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-faint border-b border-line">
              <th className="pl-4 py-3 w-8">{canManage && <input type="checkbox" aria-label="Select page" checked={allOnPage} onChange={togglePage} className="rounded" />}</th>
              <th className="px-3 py-3 font-semibold">Sewadar</th>
              <th className="px-3 py-3 font-semibold">Department</th>
              <th className="px-3 py-3 font-semibold">Device</th>
              <th className="px-3 py-3 font-semibold">Calls</th>
              <th className="px-3 py-3 font-semibold">Arrival</th>
              <th className="px-3 py-3 font-semibold">Badge</th>
              <th className="px-3 py-3 pr-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {view.map(s => {
              const DevIcon = DEVICE_ICON[s.deviceType];
              return (
                <tr key={s.id} className={cx('align-middle', sel.has(s.id) && 'bg-purple-500/5')}>
                  <td className="pl-4 py-3">{canManage && <input type="checkbox" aria-label={`Select ${s.name}`} checked={sel.has(s.id)} onChange={() => toggle(s.id)} className="rounded" />}</td>
                  <td className="px-3 py-3">
                    <div className="font-semibold">{s.name}</div>
                    {s.phone ? <a href={`tel:${s.phone}`} className="text-xs text-mute hover:text-cyan-300 inline-flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</a> : <span className="text-xs text-faint">No phone</span>}
                  </td>
                  <td className="px-3 py-3">{s.department ? <span className="text-xs px-2 py-0.5 rounded-full border border-line-strong bg-raised/60">{DEPT_LABEL[s.department]}</span> : <span className="text-faint">—</span>}</td>
                  <td className="px-3 py-3">
                    {DevIcon ? <div className="flex items-center gap-1.5 text-xs"><DevIcon className="w-3.5 h-3.5 text-mute" /><span>{DEVICE_LABEL[s.deviceType]}</span>{s.deviceRef && <span className="font-mono text-mute">· {s.deviceRef}</span>}</div> : <span className="text-faint">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums font-bold w-5">{s.callCount}</span>
                      {s.lastCallOutcome ? (
                        <div className="leading-tight">
                          <span className={cx('text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap', TONE[OUTCOME_TONE[s.lastCallOutcome]])}>{OUTCOME_LABEL[s.lastCallOutcome]}</span>
                          <div className="text-[10px] text-faint mt-0.5">{timeAgo(s.lastCallAt)}{s.lastCallBy ? ` · ${s.lastCallBy}` : ''}</div>
                        </div>
                      ) : <span className="text-xs text-faint">Not called</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {s.arrival === 'arrived' ? (
                      <button disabled={!canManage} onClick={() => m.setArrival([s.id], 'pending')} title="Click to undo" className={cx('text-xs font-semibold px-2.5 py-1 rounded-full border', TONE.ok)}>Arrived · {clock(s.arrivedAt)}</button>
                    ) : s.arrival === 'not_coming' ? (
                      <button disabled={!canManage} onClick={() => m.setArrival([s.id], 'pending')} title="Click to reset" className={cx('text-xs font-semibold px-2.5 py-1 rounded-full border', TONE.bad)}>Not coming</button>
                    ) : canManage ? (
                      <button onClick={() => m.setArrival([s.id], 'arrived')} className="text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-600 text-ink-soft hover:bg-emerald-500/15 hover:text-emerald-300 hover:border-emerald-500/40">Mark arrived</button>
                    ) : <span className="text-xs text-faint">Not arrived</span>}
                  </td>
                  <td className="px-3 py-3">
                    <button disabled={!canManage} onClick={() => m.setBadge([s.id], !s.badgeIssued)}
                      className={cx('text-xs font-semibold px-2.5 py-1 rounded-full border', s.badgeIssued ? TONE.ok : TONE.warn)}>{s.badgeIssued ? 'Issued' : 'Pending'}</button>
                  </td>
                  <td className="px-3 py-3 pr-4">
                    <div className="flex justify-end gap-1.5">
                      <button className={btnGhost(D)} onClick={() => setCalling(s)} aria-label={`Log call for ${s.name}`}><PhoneCall className="w-3.5 h-3.5" />Call</button>
                      {canManage && <button className={btnGhost(D)} onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}><Edit3 className="w-3.5 h-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {view.length === 0 && (
          <div className="py-14 text-center text-sm text-faint">
            {loading ? 'Loading…' : sewadars.length === 0 ? (canManage ? 'No sewadars yet — use "Import list" to paste names and numbers.' : 'No sewadars added yet.') : 'No one matches these filters.'}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-line text-xs text-mute">
          <span>{rows.length ? `${page * size + 1}–${Math.min(rows.length, page * size + size)} of ${rows.length}` : '0 results'}</span>
          <div className="flex items-center gap-2">
            <select aria-label="Rows per page" value={size} onChange={e => setSize(+e.target.value)} className={cx(inputCls(D), 'w-auto py-1 text-xs')}>{[25, 50, 100, 200].map(n => <option key={n} value={n}>{n} / page</option>)}</select>
            <button className={btnGhost(D)} disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
            <span>{page + 1} / {pages}</span>
            <button className={btnGhost(D)} disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)} aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </section>

      {editing && <SewadarForm initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)}
        onSave={(i) => (editing === 'new' ? m.add(i) : m.update(editing.id, i))}
        onDelete={editing !== 'new' ? () => m.remove([editing.id]) : undefined} />}
      {calling && <CallModal s={calling} onClose={() => setCalling(null)} />}
      {importing && <ImportModal onClose={() => setImporting(false)} />}
      {confirmDel && <ConfirmModal dark={D} title={`Delete ${sel.size} sewadar(s)?`} body="They and their call history will be permanently removed." confirmLabel="Delete" onConfirm={async () => { if (await m.remove(ids)) setSel(new Set()); }} onClose={() => setConfirmDel(false)} />}
      <ToastContainer />
    </div>
  );
};

// ---------------------------------------------------------------------------
const SewadarForm: React.FC<{ initial: Sewadar | null; onClose: () => void; onSave: (i: SewadarInput) => Promise<boolean>; onDelete?: () => Promise<boolean> }> = ({ initial, onClose, onSave, onDelete }) => {
  const [f, setF] = useState<SewadarInput>({ name: initial?.name || '', phone: initial?.phone || '', department: initial?.department || '', deviceType: initial?.deviceType || 'none', deviceRef: initial?.deviceRef || '' });
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(false);
  const set = (k: keyof SewadarInput, v: string) => setF(p => ({ ...p, [k]: v }));
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); const ok = await onSave(f); setBusy(false); if (ok) onClose(); };
  return (
    <Modal title={initial ? 'Edit sewadar' : 'Add sewadar'} dark={D} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div><label className={labelCls(D)} htmlFor="sw-n">Full name</label><input id="sw-n" autoFocus required value={f.name} onChange={e => set('name', e.target.value)} className={inputCls(D)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls(D)} htmlFor="sw-p">Phone</label><input id="sw-p" inputMode="tel" value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="98xxxxxxxx" className={inputCls(D)} /></div>
          <div><label className={labelCls(D)} htmlFor="sw-d">Department</label>
            <select id="sw-d" value={f.department} onChange={e => set('department', e.target.value)} className={inputCls(D)}><option value="">Not assigned</option>{DEPT_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls(D)} htmlFor="sw-t">Device</label>
            <select id="sw-t" value={f.deviceType} onChange={e => set('deviceType', e.target.value)} className={inputCls(D)}>{DEVICES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}</select></div>
          <div><label className={labelCls(D)} htmlFor="sw-r">Device ID / serial</label><input id="sw-r" disabled={f.deviceType === 'none'} value={f.deviceRef} onChange={e => set('deviceRef', e.target.value)} placeholder="e.g. WT-0142" className={inputCls(D)} /></div>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          {onDelete ? <button type="button" className={cx(btnGhost(D), 'text-rose-400')} onClick={() => setDel(true)}><Trash2 className="w-3.5 h-3.5" />Delete</button> : <span />}
          <div className="flex gap-2"><button type="button" onClick={onClose} className={btnGhost(D)}>Cancel</button><button type="submit" disabled={busy} className={btnPrimary}>{busy ? 'Saving…' : 'Save'}</button></div>
        </div>
      </form>
      {del && onDelete && <ConfirmModal dark={D} title={`Delete ${initial?.name}?`} body="Their call history is removed too." confirmLabel="Delete" onConfirm={async () => { if (await onDelete()) onClose(); }} onClose={() => setDel(false)} />}
    </Modal>
  );
};

const CallModal: React.FC<{ s: Sewadar; onClose: () => void }> = ({ s, onClose }) => {
  const { logCall, fetchCalls, canManage, sewadars } = useManpower();
  const live = sewadars.find(x => x.id === s.id) || s;
  const [outcome, setOutcome] = useState<string>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [hist, setHist] = useState<CallLog[] | null>(null);
  useEffect(() => { let on = true; fetchCalls(s.id).then(h => on && setHist(h)); return () => { on = false; }; }, [s.id, live.callCount]); // eslint-disable-line
  const save = async () => {
    if (!outcome) return;
    setBusy(true);
    const ok = await logCall(s.id, outcome as any, note);
    setBusy(false);
    if (ok) { setOutcome(''); setNote(''); }
  };
  return (
    <Modal title={live.name} dark={D} onClose={onClose} wide>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="text-sm text-mute">{live.callCount} call{live.callCount === 1 ? '' : 's'} so far</div>
        {live.phone && <a href={`tel:${live.phone}`} className={cx(btnPrimary, 'bg-emerald-600 hover:bg-emerald-500')}><Phone className="w-4 h-4" />Call {live.phone}</a>}
      </div>
      {canManage && (
        <div className="space-y-3 mb-5">
          <div className="text-xs font-semibold text-mute">What happened on the call?</div>
          <div className="flex flex-wrap gap-2">
            {OUTCOMES.map(o => (
              <button key={o.key} type="button" aria-pressed={outcome === o.key} onClick={() => setOutcome(o.key)}
                className={cx('text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors', outcome === o.key ? 'bg-purple-600 border-purple-500 text-white' : TONE[o.tone])}>{o.label}</button>
            ))}
          </div>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional) — e.g. reaching by 6 PM" className={inputCls(D)} />
          <div className="flex justify-end"><button className={btnPrimary} disabled={!outcome || busy} onClick={save}>{busy ? 'Saving…' : 'Log call'}</button></div>
        </div>
      )}
      <div className="flex items-center gap-2 text-xs font-semibold text-mute mb-2"><History className="w-3.5 h-3.5" />Call history</div>
      {hist === null ? <p className="text-sm text-faint">Loading…</p> : hist.length === 0 ? <p className="text-sm text-faint">No calls logged yet.</p> : (
        <ul className="divide-y divide-line max-h-56 overflow-y-auto">
          {hist.map(h => (
            <li key={h.id} className="py-2 flex items-start justify-between gap-3 text-sm">
              <div><span className={cx('text-[11px] font-semibold px-2 py-0.5 rounded-full border', TONE[OUTCOME_TONE[h.outcome]])}>{OUTCOME_LABEL[h.outcome]}</span>{h.note && <div className="text-xs text-mute mt-1">{h.note}</div>}</div>
              <div className="text-[11px] text-faint text-right shrink-0">{new Date(h.calledAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}<br />{h.calledBy}</div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};

const ImportModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { addMany } = useManpower();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const parsed = useMemo<SewadarInput[]>(() => text.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const [name = '', phone = '', d = ''] = l.split(/[,\t]/).map(x => x.trim());
    const key = d.toLowerCase();
    const dep = DEPT_OPTIONS.find(([k, label]) => k === key || label.toLowerCase() === key);
    return { name, phone, department: dep ? dep[0] : '', deviceType: 'none' as DeviceType, deviceRef: '' };
  }).filter(r => r.name), [text]);
  const go = async () => { setBusy(true); const r = await addMany(parsed); setBusy(false); if (r.added) onClose(); };
  return (
    <Modal title="Import sewadars" dark={D} onClose={onClose} wide>
      <p className="text-xs text-mute mb-2">One person per line: <span className="font-mono">Name, Phone, Department</span> (department optional). Paste straight from Excel or Sheets. Numbers already in the list are skipped.</p>
      <textarea rows={9} autoFocus value={text} onChange={e => setText(e.target.value)} placeholder={'Amit Sharma, 9876543210, WiFi\nRavi Kumar, 9123456780'} className={cx(inputCls(D), 'font-mono text-xs')} />
      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-mute">{parsed.length} ready to import</span>
        <div className="flex gap-2"><button className={btnGhost(D)} onClick={onClose}>Cancel</button><button className={btnPrimary} disabled={!parsed.length || busy} onClick={go}>{busy ? 'Importing…' : `Import ${parsed.length}`}</button></div>
      </div>
    </Modal>
  );
};
