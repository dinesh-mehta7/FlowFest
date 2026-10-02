import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Check, ChevronsLeft, ChevronsRight, Edit3, FileText, LayoutDashboard, Plus, Search, Trash2, Truck, Wallet, X } from 'lucide-react';
import { ToastContainer } from '../walkie';
import { Modal, ConfirmModal, btnGhost, cx, inputCls, labelCls } from '../accommodation/ui';
import { todayStr } from '../accommodation/dates';
import { useInventory } from '../inventory';
import { inr } from '../../pages/orgData';
import { ProfileMenu } from '../../components/ProfileMenu';
import { usePurchase } from './PurchaseContext';
import type { OrderInput, VendorInput } from './PurchaseContext';
import { INCOMING, PAYABLE, PAY_MODES, STATUS, payModeLabel, poDue, poTotal, poUnitsLeft } from './types';
import type { PO, POStatus, Payment, Receipt, Vendor } from './types';

// The command-center shell is always dark, so this module is dark-only.
const D = true;
const panel = 'rounded-2xl border border-line bg-surface/50';
const TONE: Record<string, string> = {
  ok: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  warn: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  bad: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  info: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  mute: 'bg-raised text-mute border-line-strong',
};
const primary = 'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed';
const good = 'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed';
const money = (n: number) => inr(Math.round(n * 100) / 100);
const when = (s: string) => new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const day = (s: string) => (s ? new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

type Tab = 'dashboard' | 'orders' | 'vendors' | 'receiving' | 'payments';
const NAV: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Purchase Orders', icon: FileText },
  { id: 'vendors', label: 'Vendors', icon: Building2 },
  { id: 'receiving', label: 'Receiving', icon: Truck },
  { id: 'payments', label: 'Payments', icon: Wallet },
];
const SUB: Record<Tab, string> = {
  dashboard: 'What needs approval, what is arriving, and what is still to be paid.',
  orders: 'Create, approve and track every purchase order.',
  vendors: 'Suppliers you buy from.',
  receiving: 'Goods arriving from vendors, and who received them.',
  payments: 'Money owed to vendors and payments made.',
};

// ---- small shared pieces ---------------------------------------------------
const Section: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, action, children }) => (
  <section className={cx(panel, 'overflow-hidden')}>
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line"><h2 className="text-sm font-bold">{title}</h2>{action}</div>
    {children}
  </section>
);
const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="py-10 px-4 text-center text-sm text-faint">{children}</p>;
const Stat: React.FC<{ label: string; value: React.ReactNode; dot?: string; onClick?: () => void }> = ({ label, value, dot, onClick }) => (
  <button onClick={onClick} className={cx(panel, 'px-4 py-3.5 text-left hover:bg-raised/40 transition-colors')}>
    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-mute">{dot && <span className={cx('w-2 h-2 rounded-full', dot)} />}{label}</div>
    <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
  </button>
);
const StatusChip: React.FC<{ s: POStatus }> = ({ s }) => <span className={cx('text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap', TONE[STATUS[s].tone])}>{STATUS[s].label}</span>;
const PayChip: React.FC<{ po: PO }> = ({ po }) => {
  if (!PAYABLE.includes(po.status)) return null;
  const total = poTotal(po);
  if (total <= 0) return null;
  const [l, t] = po.paid <= 0 ? ['Unpaid', 'warn'] : poDue(po) > 0 ? ['Part paid', 'info'] : ['Paid', 'ok'];
  return <span className={cx('text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap', TONE[t])}>{l}</span>;
};
const overdue = (po: PO) => INCOMING.includes(po.status) && !!po.expectedDate && po.expectedDate < todayStr();

// Latest receipts / payments, refreshed whenever an order changes.
const useLedger = <T,>(kind: 'receipts' | 'payments', limit = 300): T[] | null => {
  const { orders, fetchReceipts, fetchPayments } = usePurchase();
  const [rows, setRows] = useState<T[] | null>(null);
  const sig = orders.reduce((a, o) => a + o.paid * 3 + o.items.reduce((b, i) => b + i.qtyReceived * 7, 0) + o.items.length, 0);
  useEffect(() => {
    let on = true;
    (kind === 'receipts' ? fetchReceipts(undefined, limit) : fetchPayments(undefined, limit)).then((r: any) => { if (on) setRows(r); });
    return () => { on = false; };
  }, [kind, limit, sig]); // eslint-disable-line
  return rows;
};

const useLookups = () => {
  const { orders } = usePurchase();
  return useMemo(() => {
    const po = new Map<string, PO>(orders.map(o => [o.id, o] as [string, PO]));
    const line = new Map<string, { name: string; unit: string }>();
    orders.forEach(o => o.items.forEach(i => line.set(i.id, { name: i.name, unit: i.unit })));
    return { po, line };
  }, [orders]);
};

const ReceiptList: React.FC<{ rows: Receipt[] | null; empty: string; showPo?: boolean }> = ({ rows, empty, showPo = true }) => {
  const { po, line } = useLookups();
  if (rows === null) return <Empty>Loading…</Empty>;
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <ul className="divide-y divide-line/70">
      {rows.map(r => {
        const l = line.get(r.itemId); const o = po.get(r.poId);
        const who = [r.givenBy && `Delivered by ${r.givenBy}`, r.receivedBy && `Received by ${r.receivedBy}`, r.challan && `Challan ${r.challan}`, r.note].filter(Boolean).join(' · ');
        return (
          <li key={r.id} className="px-4 py-3 flex items-start justify-between gap-3 text-sm">
            <div className="min-w-0">
              <div className="font-semibold truncate">{l?.name || 'Removed item'}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-bold tabular-nums text-emerald-400">+{r.qty}<span className="text-xs text-faint font-normal"> {l?.unit}</span></span>
                {showPo && o && <span className="text-xs text-mute">{o.number} · {o.title}</span>}
              </div>
              {who && <div className="text-xs text-mute mt-1">{who}</div>}
            </div>
            <div className="text-[11px] text-faint text-right shrink-0">{when(r.doneAt)}<br />{r.doneBy}</div>
          </li>
        );
      })}
    </ul>
  );
};

const PaymentList: React.FC<{ rows: Payment[] | null; empty: string; showPo?: boolean }> = ({ rows, empty, showPo = true }) => {
  const { po } = useLookups();
  if (rows === null) return <Empty>Loading…</Empty>;
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <ul className="divide-y divide-line/70">
      {rows.map(r => {
        const o = po.get(r.poId);
        const meta = [payModeLabel(r.mode), r.ref && `Ref ${r.ref}`, r.paidBy && `Paid by ${r.paidBy}`, r.note].filter(Boolean).join(' · ');
        return (
          <li key={r.id} className="px-4 py-3 flex items-start justify-between gap-3 text-sm">
            <div className="min-w-0">
              <div className="font-bold tabular-nums">{money(r.amount)}</div>
              {showPo && o && <div className="text-xs text-mute mt-0.5">{o.number} · {o.title}</div>}
              <div className="text-xs text-mute mt-1">{meta}</div>
            </div>
            <div className="text-[11px] text-faint text-right shrink-0">{when(r.doneAt)}<br />{r.doneBy}</div>
          </li>
        );
      })}
    </ul>
  );
};

// ---- views -----------------------------------------------------------------
const DashboardView: React.FC<{ go: (t: Tab, f?: POStatus | 'all') => void; open: (id: string) => void }> = ({ go, open }) => {
  const { orders, stats, vendorName, canApprove } = usePurchase();
  const pending = orders.filter(o => o.status === 'pending');
  const incoming = orders.filter(o => INCOMING.includes(o.status)).sort((a, b) => (a.expectedDate || '9999').localeCompare(b.expectedDate || '9999')).slice(0, 8);
  const rec = useLedger<Receipt>('receipts', 6);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Awaiting approval" value={stats.awaiting} dot="bg-amber-400" onClick={() => go('orders', 'pending')} />
        <Stat label="Open orders" value={stats.open} dot="bg-blue-400" onClick={() => go('orders', 'all')} />
        <Stat label="To receive" value={stats.toReceive} dot="bg-cyan-400" onClick={() => go('receiving')} />
        <Stat label="Overdue" value={stats.overdue} dot="bg-rose-400" onClick={() => go('receiving')} />
        <Stat label="Payment due" value={money(stats.due)} dot="bg-emerald-400" onClick={() => go('payments')} />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="Waiting for approval" action={<button className="text-xs text-blue-400 hover:underline" onClick={() => go('orders', 'pending')}>See all</button>}>
          {pending.length === 0 ? <Empty>Nothing is waiting for approval.</Empty> : (
            <ul className="divide-y divide-line/70">
              {pending.slice(0, 6).map(o => (
                <li key={o.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <button className="min-w-0 text-left" onClick={() => open(o.id)}>
                    <div className="font-semibold text-sm truncate">{o.number} · {o.title}</div>
                    <div className="text-xs text-faint truncate">{vendorName(o.vendorId)} · {o.requestedBy || o.createdBy}</div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0"><b className="tabular-nums text-sm">{money(poTotal(o))}</b>{canApprove && <button className={cx(btnGhost(D), 'text-emerald-300')} onClick={() => open(o.id)}>Review</button>}</div>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Arriving" action={<button className="text-xs text-blue-400 hover:underline" onClick={() => go('receiving')}>Receiving</button>}>
          {incoming.length === 0 ? <Empty>No orders are on the way.</Empty> : (
            <ul className="divide-y divide-line/70">
              {incoming.map(o => (
                <li key={o.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <button className="min-w-0 text-left" onClick={() => open(o.id)}>
                    <div className="font-semibold text-sm truncate">{o.number} · {o.title}</div>
                    <div className="text-xs text-faint truncate">{vendorName(o.vendorId)} · {poUnitsLeft(o)} units left</div>
                  </button>
                  <span className={cx('text-xs shrink-0', overdue(o) ? 'text-rose-400 font-semibold' : 'text-mute')}>{o.expectedDate ? `${overdue(o) ? 'Was due ' : ''}${day(o.expectedDate)}` : 'No date'}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
      <Section title="Latest goods received" action={<button className="text-xs text-blue-400 hover:underline" onClick={() => go('receiving')}>Full log</button>}>
        <ReceiptList rows={rec} empty="Nothing has been received yet." />
      </Section>
    </div>
  );
};

const FILTERS: { key: POStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'draft', label: 'Draft' }, { key: 'pending', label: 'Awaiting approval' }, { key: 'approved', label: 'Approved' },
  { key: 'ordered', label: 'Ordered' }, { key: 'partial', label: 'Partly received' }, { key: 'received', label: 'Received' }, { key: 'rejected', label: 'Rejected' }, { key: 'cancelled', label: 'Cancelled' },
];

const OrdersView: React.FC<{ filter: POStatus | 'all'; setFilter: (f: POStatus | 'all') => void; open: (id: string) => void; onNew: () => void }> = ({ filter, setFilter, open, onNew }) => {
  const { orders, vendorName, canManage, loading } = usePurchase();
  const [q, setQ] = useState('');
  const count = (k: POStatus | 'all') => (k === 'all' ? orders.length : orders.filter(o => o.status === k).length);
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return orders.filter(o => (filter === 'all' || o.status === filter)
      && (!t || o.number.toLowerCase().includes(t) || o.title.toLowerCase().includes(t) || vendorName(o.vendorId).toLowerCase().includes(t) || o.requestedBy.toLowerCase().includes(t)));
  }, [orders, filter, q, vendorName]);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-faint" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search PO no., title, vendor…" aria-label="Search orders" className={cx(inputCls(D), 'pl-9')} />
        </div>
        {canManage && <button className={primary} onClick={onNew}><Plus className="w-4 h-4" />New order</button>}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filter by status">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} aria-pressed={filter === f.key}
            className={cx('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors', filter === f.key ? 'bg-blue-600 border-blue-500 text-white' : 'border-line-strong text-mute hover:bg-raised')}>
            {f.label} <span className="opacity-70 tabular-nums">{count(f.key)}</span>
          </button>
        ))}
      </div>
      <section className={cx(panel, 'overflow-hidden')}>
        {rows.length === 0 ? <Empty>{loading ? 'Loading…' : orders.length === 0 ? (canManage ? 'No purchase orders yet. Use "New order" to start one.' : 'No purchase orders yet.') : 'No orders match.'}</Empty> : (
          <ul className="divide-y divide-line/70">
            {rows.map(o => (
              <li key={o.id}>
                <button onClick={() => open(o.id)} className="w-full text-left px-4 py-3.5 hover:bg-raised/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-cyan-400 font-bold">{o.number}</span><span className="font-semibold text-sm">{o.title}</span><StatusChip s={o.status} /><PayChip po={o} /></div>
                    <div className="text-xs text-mute mt-1">{vendorName(o.vendorId)} · {o.items.length} item{o.items.length === 1 ? '' : 's'}{o.requestedBy ? ` · for ${o.requestedBy}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-5 shrink-0 text-right">
                    <div className="text-xs"><div className="text-faint">Expected</div><div className={overdue(o) ? 'text-rose-400 font-semibold' : 'text-ink-soft'}>{day(o.expectedDate)}</div></div>
                    <div><div className="text-[10px] uppercase text-faint">Total</div><div className="font-bold tabular-nums">{money(poTotal(o))}</div></div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

const VendorsView: React.FC = () => {
  const { vendors, orders, canManage, addVendor, updateVendor, deleteVendor } = usePurchase();
  const [form, setForm] = useState<Vendor | 'new' | null>(null);
  const [del, setDel] = useState<Vendor | null>(null);
  const stat = (id: string) => { const os = orders.filter(o => o.vendorId === id && o.status !== 'cancelled' && o.status !== 'rejected'); return { n: os.length, v: os.reduce((a, o) => a + poTotal(o), 0) }; };
  return (
    <div className="space-y-5">
      <div className="flex justify-end">{canManage && <button className={primary} onClick={() => setForm('new')}><Plus className="w-4 h-4" />Add vendor</button>}</div>
      <section className={cx(panel, 'overflow-hidden')}>
        {vendors.length === 0 ? <Empty>No vendors yet.</Empty> : (
          <ul className="divide-y divide-line/70">
            {vendors.map(v => {
              const s = stat(v.id);
              return (
                <li key={v.id} className="px-4 py-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">{v.name}</div>
                    <div className="text-xs text-mute mt-0.5">{[v.contact, v.phone, v.email].filter(Boolean).join(' · ') || 'No contact details'}</div>
                    {v.address && <div className="text-xs text-faint mt-0.5">{v.address}</div>}
                    <div className="text-xs text-faint mt-1">{s.n} order{s.n === 1 ? '' : 's'} · {money(s.v)}</div>
                  </div>
                  {canManage && (
                    <div className="flex gap-1.5 shrink-0">
                      <button className={btnGhost(D)} onClick={() => setForm(v)} aria-label={`Edit ${v.name}`}><Edit3 className="w-3.5 h-3.5" /></button>
                      <button className={cx(btnGhost(D), 'text-rose-400')} onClick={() => setDel(v)} aria-label={`Delete ${v.name}`}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {form && <VendorForm initial={form === 'new' ? null : form} onClose={() => setForm(null)} onSave={v => (form === 'new' ? addVendor(v) : updateVendor(form.id, v))} />}
      {del && <ConfirmModal dark={D} title={`Delete ${del.name}?`} body="Only possible if no order uses this vendor." confirmLabel="Delete" onConfirm={() => { deleteVendor(del.id); }} onClose={() => setDel(null)} />}
    </div>
  );
};

const VendorForm: React.FC<{ initial: Vendor | null; onClose: () => void; onSave: (v: VendorInput) => Promise<boolean> }> = ({ initial, onClose, onSave }) => {
  const [f, setF] = useState<VendorInput>({ name: initial?.name || '', contact: initial?.contact || '', phone: initial?.phone || '', email: initial?.email || '', address: initial?.address || '', notes: initial?.notes || '' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof VendorInput, v: string) => setF(p => ({ ...p, [k]: v }));
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); const ok = await onSave(f); setBusy(false); if (ok) onClose(); };
  const field = (id: string, label: string, k: keyof VendorInput, type = 'text') => <div><label className={labelCls(D)} htmlFor={id}>{label}</label><input id={id} type={type} value={f[k]} onChange={e => set(k, e.target.value)} className={inputCls(D)} /></div>;
  return (
    <Modal title={initial ? 'Edit vendor' : 'Add vendor'} dark={D} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div><label className={labelCls(D)} htmlFor="vn-n">Vendor name</label><input id="vn-n" autoFocus required value={f.name} onChange={e => set('name', e.target.value)} className={inputCls(D)} /></div>
        <div className="grid grid-cols-2 gap-3">{field('vn-c', 'Contact person', 'contact')}{field('vn-p', 'Phone', 'phone', 'tel')}</div>
        {field('vn-e', 'Email', 'email', 'email')}
        {field('vn-a', 'Address', 'address')}
        {field('vn-t', 'Notes', 'notes')}
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className={btnGhost(D)}>Cancel</button><button type="submit" disabled={busy || !f.name.trim()} className={primary}>{busy ? 'Saving…' : 'Save'}</button></div>
      </form>
    </Modal>
  );
};

const ReceivingView: React.FC<{ open: (id: string) => void; onReceive: (id: string) => void }> = ({ open, onReceive }) => {
  const { orders, vendorName, canReceive } = usePurchase();
  const incoming = orders.filter(o => INCOMING.includes(o.status)).sort((a, b) => (a.expectedDate || '9999').localeCompare(b.expectedDate || '9999'));
  const rows = useLedger<Receipt>('receipts', 300);
  return (
    <div className="space-y-5">
      <Section title={`Waiting to be received (${incoming.length})`}>
        {incoming.length === 0 ? <Empty>No orders are waiting for delivery.</Empty> : (
          <ul className="divide-y divide-line/70">
            {incoming.map(o => (
              <li key={o.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <button className="min-w-0 text-left" onClick={() => open(o.id)}>
                  <div className="font-semibold text-sm truncate">{o.number} · {o.title}</div>
                  <div className="text-xs text-faint">{vendorName(o.vendorId)} · {poUnitsLeft(o)} units left · <span className={overdue(o) ? 'text-rose-400 font-semibold' : ''}>{o.expectedDate ? day(o.expectedDate) : 'no date'}</span></div>
                </button>
                {canReceive && <button className={cx(btnGhost(D), 'text-emerald-300 shrink-0')} onClick={() => onReceive(o.id)}><Truck className="w-3.5 h-3.5" />Receive goods</button>}
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Goods received log"><ReceiptList rows={rows} empty="Nothing has been received yet." /></Section>
    </div>
  );
};

const PaymentsView: React.FC<{ open: (id: string) => void; onPay: (id: string) => void }> = ({ open, onPay }) => {
  const { orders, vendorName, canManage, stats } = usePurchase();
  const due = orders.filter(o => PAYABLE.includes(o.status) && poDue(o) > 0);
  const rows = useLedger<Payment>('payments', 300);
  return (
    <div className="space-y-5">
      <Section title={`Payment due (${due.length}) · ${money(stats.due)}`}>
        {due.length === 0 ? <Empty>Nothing is due.</Empty> : (
          <ul className="divide-y divide-line/70">
            {due.map(o => (
              <li key={o.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <button className="min-w-0 text-left" onClick={() => open(o.id)}>
                  <div className="font-semibold text-sm truncate">{o.number} · {o.title}</div>
                  <div className="text-xs text-faint">{vendorName(o.vendorId)} · total {money(poTotal(o))} · paid {money(o.paid)}</div>
                </button>
                <div className="flex items-center gap-2 shrink-0"><b className="tabular-nums text-amber-300">{money(poDue(o))}</b>{canManage && <button className={btnGhost(D)} onClick={() => onPay(o.id)}>Record payment</button>}</div>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Payments log"><PaymentList rows={rows} empty="No payments recorded yet." /></Section>
    </div>
  );
};

// ---- order detail ----------------------------------------------------------
const Info: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div><div className="text-[11px] uppercase tracking-wider text-faint">{label}</div><div className="text-sm mt-0.5">{children || <span className="text-faint">—</span>}</div></div>
);

const OrderModal: React.FC<{ id: string; onClose: () => void; onEdit: (o: PO) => void; onReceive: (id: string) => void; onPay: (id: string) => void }> = ({ id, onClose, onEdit, onReceive, onPay }) => {
  const { orders, vendors, canManage, canApprove, canReceive, setStatus, deleteOrder, fetchReceipts, fetchPayments } = usePurchase();
  const o = orders.find(x => x.id === id);
  const [rc, setRc] = useState<Receipt[] | null>(null);
  const [pm, setPm] = useState<Payment[] | null>(null);
  const [ask, setAsk] = useState<'cancel' | 'reject' | 'delete' | null>(null);
  const sig = o ? o.paid * 3 + o.items.reduce((a, i) => a + i.qtyReceived, 0) : 0;
  useEffect(() => { if (!o) return; let on = true; fetchReceipts(id).then(r => on && setRc(r)); fetchPayments(id).then(r => on && setPm(r)); return () => { on = false; }; }, [id, sig]); // eslint-disable-line
  if (!o) return <Modal title="Order" dark={D} onClose={onClose}><p className="text-sm text-mute">This order no longer exists.</p></Modal>;
  const vendor = vendors.find(v => v.id === o.vendorId);
  const total = poTotal(o); const due = poDue(o);
  const editable = ['draft', 'pending', 'rejected'].includes(o.status);
  const act = (s: POStatus, msg: string) => setStatus(o.id, s, msg);
  return (
    <Modal title={`${o.number} · ${o.title}`} dark={D} onClose={onClose} xl>
      <div className="flex flex-wrap items-center gap-2 mb-4"><StatusChip s={o.status} /><PayChip po={o} />{overdue(o) && <span className={cx('text-[11px] font-semibold px-2 py-0.5 rounded-full border', TONE.bad)}>Overdue</span>}</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
        <Info label="Vendor">{vendor ? <>{vendor.name}{vendor.phone && <div className="text-xs text-mute">{vendor.phone}</div>}</> : null}</Info>
        <Info label="Requested for">{o.requestedBy}</Info>
        <Info label="Deliver to">{o.deliverTo}</Info>
        <Info label="Expected">{o.expectedDate ? day(o.expectedDate) : ''}</Info>
        <Info label="Created by">{o.createdBy}</Info>
        <Info label={o.status === 'rejected' ? 'Rejected by' : 'Approved by'}>{o.approvedBy && (o.status !== 'draft' && o.status !== 'pending') ? `${o.approvedBy} · ${day(o.approvedAt.slice(0, 10))}` : ''}</Info>
      </div>
      {o.notes && <p className="text-xs text-mute mb-4">Note: {o.notes}</p>}

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm min-w-[32rem]">
          <thead><tr className="text-left text-[11px] uppercase tracking-wider text-faint border-b border-line"><th className="pl-3 py-2.5 font-semibold">Item</th><th className="px-3 py-2.5 font-semibold text-right">Ordered</th><th className="px-3 py-2.5 font-semibold text-right">Received</th><th className="px-3 py-2.5 font-semibold text-right">Rate</th><th className="px-3 py-2.5 pr-3 font-semibold text-right">Amount</th></tr></thead>
          <tbody className="divide-y divide-line/70">
            {o.items.map(i => (
              <tr key={i.id}>
                <td className="pl-3 py-2.5"><div className="font-medium">{i.name}</div>{i.inventoryItemId && <div className="text-[10px] text-emerald-400">adds to inventory stock</div>}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{i.qtyOrdered} <span className="text-xs text-faint">{i.unit}</span></td>
                <td className={cx('px-3 py-2.5 text-right tabular-nums', i.qtyReceived >= i.qtyOrdered ? 'text-emerald-400' : i.qtyReceived > 0 ? 'text-amber-300' : 'text-faint')}>{i.qtyReceived}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{money(i.rate)}</td>
                <td className="px-3 py-2.5 pr-3 text-right tabular-nums font-semibold">{money(i.qtyOrdered * i.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-6 mt-3 text-sm">
        <span className="text-mute">Total <b className="text-ink tabular-nums">{money(total)}</b></span>
        {PAYABLE.includes(o.status) && <><span className="text-mute">Paid <b className="text-emerald-400 tabular-nums">{money(o.paid)}</b></span><span className="text-mute">Due <b className="text-amber-300 tabular-nums">{money(due)}</b></span></>}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 mt-5">
        {o.status === 'pending' && canApprove && <>
          <button className={cx(btnGhost(D), 'text-rose-400')} onClick={() => setAsk('reject')}><X className="w-3.5 h-3.5" />Reject</button>
          <button className={good} onClick={async () => { if (await act('approved', 'Order approved.')) onClose(); }}><Check className="w-4 h-4" />Approve</button>
        </>}
        {o.status === 'pending' && !canApprove && <span className="text-xs text-mute mr-auto">Waiting for the owner or IT head to approve.</span>}
        {canManage && ['draft', 'rejected'].includes(o.status) && <button className={primary} onClick={async () => { if (await act('pending', 'Sent for approval.')) onClose(); }}>Send for approval</button>}
        {canManage && o.status === 'approved' && <button className={primary} onClick={() => act('ordered', 'Marked as ordered.')}>Mark as ordered</button>}
        {canReceive && INCOMING.includes(o.status) && <button className={good} onClick={() => onReceive(o.id)}><Truck className="w-4 h-4" />Receive goods</button>}
        {canManage && PAYABLE.includes(o.status) && due > 0 && <button className={btnGhost(D)} onClick={() => onPay(o.id)}>Record payment</button>}
        {canManage && editable && <button className={btnGhost(D)} onClick={() => onEdit(o)}><Edit3 className="w-3.5 h-3.5" />Edit</button>}
        {canManage && ['draft', 'pending', 'approved', 'rejected', 'ordered'].includes(o.status) && !o.items.some(i => i.qtyReceived > 0) && <button className={cx(btnGhost(D), 'text-rose-400')} onClick={() => setAsk('cancel')}>Cancel order</button>}
        {canManage && ['draft', 'rejected', 'cancelled'].includes(o.status) && <button className={cx(btnGhost(D), 'text-rose-400')} onClick={() => setAsk('delete')} aria-label="Delete order"><Trash2 className="w-3.5 h-3.5" /></button>}
      </div>

      {(rc === null || rc.length > 0) && <div className="mt-6"><div className="text-xs font-semibold text-mute mb-1">Goods received</div><div className={cx(panel, 'overflow-hidden')}><ReceiptList rows={rc} empty="" showPo={false} /></div></div>}
      {(pm === null || pm.length > 0) && <div className="mt-5"><div className="text-xs font-semibold text-mute mb-1">Payments</div><div className={cx(panel, 'overflow-hidden')}><PaymentList rows={pm} empty="" showPo={false} /></div></div>}

      {ask === 'reject' && <ConfirmModal dark={D} title="Reject this order?" body="It goes back to the requester, who can edit it and send it again." confirmLabel="Reject" onConfirm={() => { act('rejected', 'Order rejected.').then(ok => ok && onClose()); }} onClose={() => setAsk(null)} />}
      {ask === 'cancel' && <ConfirmModal dark={D} title="Cancel this order?" body="The order is closed and no goods or payments can be added to it." confirmLabel="Cancel order" onConfirm={() => { act('cancelled', 'Order cancelled.'); }} onClose={() => setAsk(null)} />}
      {ask === 'delete' && <ConfirmModal dark={D} title={`Delete ${o.number}?`} body="The order and its items are removed for good." confirmLabel="Delete" onConfirm={() => { deleteOrder(o.id).then(ok => ok && onClose()); }} onClose={() => setAsk(null)} />}
    </Modal>
  );
};

// ---- create / edit order -----------------------------------------------------
interface Line { key: number; inventoryItemId: string | null; name: string; unit: string; qty: string; rate: string }
let lineKey = 0;
const blank = (): Line => ({ key: ++lineKey, inventoryItemId: null, name: '', unit: 'pcs', qty: '', rate: '' });

const OrderForm: React.FC<{ initial: PO | null; onClose: () => void }> = ({ initial, onClose }) => {
  const { vendors, saveOrder, userName } = usePurchase();
  const { items: stock } = useInventory();
  const [f, setF] = useState({ title: initial?.title || '', vendorId: initial?.vendorId || '', requestedBy: initial?.requestedBy || '', deliverTo: initial?.deliverTo || 'Main store', expectedDate: initial?.expectedDate || '', notes: initial?.notes || '' });
  const [lines, setLines] = useState<Line[]>(initial ? initial.items.map(i => ({ key: ++lineKey, inventoryItemId: i.inventoryItemId, name: i.name, unit: i.unit, qty: String(i.qtyOrdered), rate: String(i.rate || '') })) : [blank()]);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF(p => ({ ...p, [k]: v }));
  const upd = (key: number, patch: Partial<Line>) => setLines(p => p.map(l => (l.key === key ? { ...l, ...patch } : l)));
  const total = lines.reduce((a, l) => a + (parseInt(l.qty, 10) || 0) * (parseFloat(l.rate) || 0), 0);
  const canSend = !initial || initial.status === 'draft' || initial.status === 'rejected';

  // Typing the exact name of an inventory item links the line to it (so receiving adds to stock).
  const onName = (key: number, name: string) => {
    const hit = stock.find(s => s.name.toLowerCase() === name.trim().toLowerCase());
    upd(key, hit ? { name, inventoryItemId: hit.id, unit: hit.unit } : { name, inventoryItemId: null });
  };
  const build = (): OrderInput => ({ ...f, items: lines.map(l => ({ inventoryItemId: l.inventoryItemId, name: l.name, unit: l.unit, qtyOrdered: parseInt(l.qty, 10) || 0, rate: parseFloat(l.rate) || 0 })) });
  const submit = async (send: boolean) => { setBusy(true); const ok = await saveOrder(build(), initial ? initial.id : null, send); setBusy(false); if (ok) onClose(); };

  return (
    <Modal title={initial ? `Edit ${initial.number}` : 'New purchase order'} dark={D} onClose={onClose} xl>
      <form onSubmit={e => { e.preventDefault(); submit(false); }} className="space-y-4">
        <div><label className={labelCls(D)} htmlFor="po-t">Title</label><input id="po-t" autoFocus required value={f.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Cat6 cable and PoE switches for Gate 3" className={inputCls(D)} /></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className={labelCls(D)} htmlFor="po-v">Vendor</label>
            <select id="po-v" value={f.vendorId} onChange={e => set('vendorId', e.target.value)} className={inputCls(D)}><option value="">{vendors.length ? 'Select vendor…' : 'Add a vendor first (Vendors tab)'}</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
          <div><label className={labelCls(D)} htmlFor="po-r">Requested for (team / person)</label><input id="po-r" value={f.requestedBy} onChange={e => set('requestedBy', e.target.value)} placeholder={userName} className={inputCls(D)} /></div>
          <div><label className={labelCls(D)} htmlFor="po-d">Deliver to</label><input id="po-d" value={f.deliverTo} onChange={e => set('deliverTo', e.target.value)} className={inputCls(D)} /></div>
          <div><label className={labelCls(D)} htmlFor="po-e">Expected by</label><input id="po-e" type="date" value={f.expectedDate} onChange={e => set('expectedDate', e.target.value)} className={inputCls(D)} /></div>
        </div>

        <div>
          <div className="text-xs font-semibold text-mute mb-2">Items <span className="font-normal text-faint">· type an inventory item's exact name to link it, so received goods go into stock</span></div>
          <datalist id="po-stock">{stock.map(s => <option key={s.id} value={s.name} />)}</datalist>
          <div className="space-y-2">
            {lines.map(l => (
              <div key={l.key} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-12 sm:col-span-5">
                  <input aria-label="Item name" list="po-stock" value={l.name} onChange={e => onName(l.key, e.target.value)} placeholder="Item name" className={inputCls(D)} />
                  {l.inventoryItemId && <div className="text-[10px] text-emerald-400 mt-0.5">linked to inventory</div>}
                </div>
                <input aria-label="Quantity" inputMode="numeric" value={l.qty} onChange={e => upd(l.key, { qty: e.target.value.replace(/\D/g, '') })} placeholder="Qty" className={cx(inputCls(D), 'col-span-4 sm:col-span-2')} />
                <input aria-label="Unit" value={l.unit} onChange={e => upd(l.key, { unit: e.target.value })} className={cx(inputCls(D), 'col-span-3 sm:col-span-2')} disabled={!!l.inventoryItemId} />
                <input aria-label="Rate per unit" inputMode="decimal" value={l.rate} onChange={e => upd(l.key, { rate: e.target.value.replace(/[^\d.]/g, '') })} placeholder="Rate ₹" className={cx(inputCls(D), 'col-span-4 sm:col-span-2')} />
                <button type="button" aria-label="Remove item" onClick={() => setLines(p => (p.length > 1 ? p.filter(x => x.key !== l.key) : [blank()]))} className={cx(btnGhost(D), 'col-span-1 text-rose-400 py-2.5')}><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3">
            <button type="button" className={btnGhost(D)} onClick={() => setLines(p => [...p, blank()])}><Plus className="w-3.5 h-3.5" />Add item</button>
            <span className="text-sm text-mute">Total <b className="text-ink tabular-nums">{money(total)}</b></span>
          </div>
        </div>
        <input aria-label="Notes" value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="Notes (optional)" className={inputCls(D)} />

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className={btnGhost(D)}>Cancel</button>
          <button type="submit" disabled={busy || !f.title.trim()} className={canSend ? btnGhost(D) : primary}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Save as draft'}</button>
          {canSend && <button type="button" disabled={busy || !f.title.trim()} onClick={() => submit(true)} className={primary}>Save & send for approval</button>}
        </div>
      </form>
    </Modal>
  );
};

// ---- receive goods -----------------------------------------------------------
const ReceiveModal: React.FC<{ id: string; onClose: () => void }> = ({ id, onClose }) => {
  const { orders, receive, userName } = usePurchase();
  const o = orders.find(x => x.id === id);
  const open = (o?.items || []).filter(i => i.qtyOrdered > i.qtyReceived);
  const [qty, setQty] = useState<Record<string, string>>(() => Object.fromEntries(open.map(i => [i.id, String(i.qtyOrdered - i.qtyReceived)])));
  const [givenBy, setGivenBy] = useState('');
  const [receivedBy, setReceivedBy] = useState(userName);
  const [challan, setChallan] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (!o) return null;
  const lines = open.map(i => ({ itemId: i.id, qty: parseInt(qty[i.id] || '0', 10) || 0, left: i.qtyOrdered - i.qtyReceived, linked: !!i.inventoryItemId }));
  const bad = lines.find(l => l.qty > l.left);
  const any = lines.some(l => l.qty > 0);
  const can = any && !bad && receivedBy.trim() !== '';
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!can) return;
    setBusy(true); const ok = await receive(o.id, lines.map(l => ({ itemId: l.itemId, qty: l.qty })), { givenBy, receivedBy, challan, note }); setBusy(false);
    if (ok) onClose();
  };
  return (
    <Modal title={`Receive goods · ${o.number}`} dark={D} onClose={onClose} xl>
      <form onSubmit={submit} className="space-y-4">
        {open.length === 0 ? <p className="text-sm text-mute">Everything on this order has been received.</p> : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm min-w-[28rem]">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-faint border-b border-line"><th className="pl-3 py-2.5 font-semibold">Item</th><th className="px-3 py-2.5 font-semibold text-right">Ordered</th><th className="px-3 py-2.5 font-semibold text-right">Already in</th><th className="px-3 py-2.5 pr-3 font-semibold text-right w-28">Receive now</th></tr></thead>
              <tbody className="divide-y divide-line/70">
                {open.map(i => (
                  <tr key={i.id}>
                    <td className="pl-3 py-2.5"><div className="font-medium">{i.name}</div>{i.inventoryItemId && <div className="text-[10px] text-emerald-400">adds to inventory stock</div>}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{i.qtyOrdered} <span className="text-xs text-faint">{i.unit}</span></td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-mute">{i.qtyReceived}</td>
                    <td className="px-3 py-2 pr-3"><input aria-label={`Receive now: ${i.name}`} inputMode="numeric" value={qty[i.id] ?? ''} onChange={e => setQty(p => ({ ...p, [i.id]: e.target.value.replace(/\D/g, '') }))} className={cx(inputCls(D), 'text-right py-1.5')} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {bad && <p role="alert" className="text-xs text-rose-400">More than is left to receive on one of the lines.</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className={labelCls(D)} htmlFor="rc-g">Delivered by (vendor / driver)</label><input id="rc-g" value={givenBy} onChange={e => setGivenBy(e.target.value)} className={inputCls(D)} /></div>
          <div><label className={labelCls(D)} htmlFor="rc-r">Received by *</label><input id="rc-r" value={receivedBy} onChange={e => setReceivedBy(e.target.value)} className={inputCls(D)} /></div>
          <div><label className={labelCls(D)} htmlFor="rc-c">Challan / bill no.</label><input id="rc-c" value={challan} onChange={e => setChallan(e.target.value)} className={inputCls(D)} /></div>
          <div><label className={labelCls(D)} htmlFor="rc-n">Note (optional)</label><input id="rc-n" value={note} onChange={e => setNote(e.target.value)} className={inputCls(D)} /></div>
        </div>
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className={btnGhost(D)}>Cancel</button><button type="submit" disabled={!can || busy} className={good}>{busy ? 'Saving…' : 'Record received'}</button></div>
      </form>
    </Modal>
  );
};

// ---- record payment ----------------------------------------------------------
const PayModal: React.FC<{ id: string; onClose: () => void }> = ({ id, onClose }) => {
  const { orders, pay, userName } = usePurchase();
  const o = orders.find(x => x.id === id);
  const [amount, setAmount] = useState(o ? String(poDue(o) || '') : '');
  const [mode, setMode] = useState('bank');
  const [ref, setRef] = useState('');
  const [paidBy, setPaidBy] = useState(userName);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (!o) return null;
  const due = poDue(o); const amt = parseFloat(amount) || 0;
  const problem = amt > due + 0.009 ? `Only ${money(due)} is still due.` : '';
  const can = amt > 0 && !problem;
  const submit = async (e: React.FormEvent) => { e.preventDefault(); if (!can) return; setBusy(true); const ok = await pay(o.id, { amount: amt, mode, ref, paidBy, note }); setBusy(false); if (ok) onClose(); };
  return (
    <Modal title={`Record payment · ${o.number}`} dark={D} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl border border-line bg-canvas/60 px-4 py-3 text-xs grid grid-cols-3 gap-3 text-center">
          {([['Total', poTotal(o), ''], ['Paid', o.paid, 'text-emerald-400'], ['Due', due, 'text-amber-300']] as const).map(([l, v, c]) => <div key={l}><div className="text-faint">{l}</div><div className={cx('font-bold tabular-nums', c)}>{money(v)}</div></div>)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls(D)} htmlFor="py-a">Amount (₹)</label><input id="py-a" autoFocus inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))} className={inputCls(D)} /></div>
          <div><label className={labelCls(D)} htmlFor="py-m">Paid via</label><select id="py-m" value={mode} onChange={e => setMode(e.target.value)} className={inputCls(D)}>{PAY_MODES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div><label className={labelCls(D)} htmlFor="py-r">UTR / cheque / voucher no.</label><input id="py-r" value={ref} onChange={e => setRef(e.target.value)} className={inputCls(D)} /></div>
          <div><label className={labelCls(D)} htmlFor="py-p">Paid by</label><input id="py-p" value={paidBy} onChange={e => setPaidBy(e.target.value)} className={inputCls(D)} /></div>
        </div>
        <input aria-label="Note" value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" className={inputCls(D)} />
        {problem && <p role="alert" className="text-xs text-rose-400">{problem}</p>}
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className={btnGhost(D)}>Cancel</button><button type="submit" disabled={!can || busy} className={primary}>{busy ? 'Saving…' : 'Record payment'}</button></div>
      </form>
    </Modal>
  );
};

// ---- shell: sidebar + topbar, same layout as Inventory --------------------------
export const PurchaseApp: React.FC<{ headerExtra?: React.ReactNode }> = ({ headerExtra = null }) => {
  const { loadError, canManage, canReceive } = usePurchase();
  const [tab, setTabRaw] = useState<Tab>(() => { const t = localStorage.getItem('pur_tab') as Tab; return NAV.some(n => n.id === t) ? t : 'dashboard'; });
  const [filter, setFilter] = useState<POStatus | 'all'>('all');
  const [folded, setFolded] = useState(() => localStorage.getItem('pur_sidebar_folded') === '1');
  const [viewing, setViewing] = useState<string | null>(null);
  const [editing, setEditing] = useState<PO | 'new' | null>(null);
  const [receiving, setReceiving] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  const setTab = (t: Tab) => { setTabRaw(t); try { localStorage.setItem('pur_tab', t); } catch { /* ignore */ } };
  const go = (t: Tab, f?: POStatus | 'all') => { if (f) setFilter(f); setTab(t); };
  const toggle = () => setFolded(f => { try { localStorage.setItem('pur_sidebar_folded', f ? '0' : '1'); } catch { /* ignore */ } return !f; });
  const cur = NAV.find(n => n.id === tab) || NAV[0];

  return (
    <div className="h-screen flex overflow-hidden bg-canvas text-ink">
      <aside className={cx(folded ? 'w-16' : 'w-64', 'h-screen hidden lg:flex flex-col border-r border-line bg-canvas shrink-0 transition-all duration-200')}>
        <div className={cx('h-16 px-4 border-b border-line flex items-center', folded ? 'justify-center' : 'justify-between')}>
          {!folded && <div className="flex items-center gap-2 min-w-0"><span className="text-2xl">🛒</span><h1 className="font-bold text-sm uppercase truncate">Purchase</h1></div>}
          <button onClick={toggle} title={folded ? 'Expand' : 'Fold'} className="p-1.5 rounded-lg text-mute hover:bg-slate-500/10">{folded ? <ChevronsRight className="w-5 h-5" /> : <ChevronsLeft className="w-5 h-5" />}</button>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto" aria-label="Purchase sections">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => go(id)} title={label}
              className={cx('w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium', folded && 'justify-center', tab === id ? 'bg-blue-600 text-white' : 'text-mute hover:bg-surface hover:text-ink')}>
              <Icon className="w-5 h-5 shrink-0" />{!folded && <span>{label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 shrink-0 border-b border-line bg-canvas px-4 md:px-8 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight truncate">{cur.label}</h2>
            <p className="text-xs text-mute hidden md:block truncate">{SUB[tab]}</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {headerExtra}
            <ProfileMenu />
          </div>
        </header>

        <nav className="lg:hidden flex gap-1 px-3 py-2 border-b border-line overflow-x-auto shrink-0" aria-label="Purchase sections">
          {NAV.map(({ id, label }) => (
            <button key={id} onClick={() => go(id)} className={cx('px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap', tab === id ? 'bg-blue-600 text-white' : 'text-mute bg-surface')}>{label}</button>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {!canManage && <div className="mb-5 p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-xs">🔒 {canReceive ? 'You can view purchases and record goods received, but not change orders.' : 'You can view purchases but not change them.'}</div>}
          {loadError && <div role="alert" className="mb-5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-400 text-sm p-3">Could not load purchases: {loadError}</div>}
          {tab === 'dashboard' && <DashboardView go={go} open={setViewing} />}
          {tab === 'orders' && <OrdersView filter={filter} setFilter={setFilter} open={setViewing} onNew={() => setEditing('new')} />}
          {tab === 'vendors' && <VendorsView />}
          {tab === 'receiving' && <ReceivingView open={setViewing} onReceive={setReceiving} />}
          {tab === 'payments' && <PaymentsView open={setViewing} onPay={setPaying} />}
        </main>
      </div>

      {viewing && !editing && !receiving && !paying && <OrderModal id={viewing} onClose={() => setViewing(null)} onEdit={o => setEditing(o)} onReceive={setReceiving} onPay={setPaying} />}
      {editing && <OrderForm initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {receiving && <ReceiveModal id={receiving} onClose={() => setReceiving(null)} />}
      {paying && <PayModal id={paying} onClose={() => setPaying(null)} />}
      <ToastContainer />
    </div>
  );
};
