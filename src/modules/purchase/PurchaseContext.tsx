import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../walkie/lib/supabaseClient';
import { useWalkie } from '../walkie';
import { todayStr } from '../accommodation/dates';
import { INCOMING, PAYABLE, poDue } from './types';
import type { PO, POItem, POStatus, Payment, Receipt, Vendor } from './types';

const mapVendor = (r: any): Vendor => ({ id: r.id, name: r.name, contact: r.contact_person || '', phone: r.phone || '', email: r.email || '', address: r.address || '', notes: r.notes || '' });
const mapItem = (r: any): POItem => ({ id: r.id, inventoryItemId: r.inventory_item_id || null, name: r.name, unit: r.unit || 'pcs', qtyOrdered: r.qty_ordered, qtyReceived: r.qty_received, rate: Number(r.rate) || 0 });
const mapPO = (r: any, items: POItem[]): PO => ({
  id: r.id, number: r.po_number || '', vendorId: r.vendor_id || null, title: r.title, requestedBy: r.requested_by || '', deliverTo: r.deliver_to || '',
  expectedDate: r.expected_date || '', status: r.status, notes: r.notes || '', paid: Number(r.paid_amount) || 0, createdBy: r.created_by || '',
  approvedBy: r.approved_by || '', approvedAt: r.approved_at || '', createdAt: r.created_at, items,
});
const mapReceipt = (r: any): Receipt => ({ id: r.id, poId: r.po_id, itemId: r.item_id, qty: r.qty, givenBy: r.given_by || '', receivedBy: r.received_by || '', challan: r.challan || '', note: r.note || '', doneBy: r.done_by || '', doneAt: r.done_at });
const mapPayment = (r: any): Payment => ({ id: r.id, poId: r.po_id, amount: Number(r.amount) || 0, mode: r.mode || '', ref: r.ref || '', paidBy: r.paid_by || '', note: r.note || '', doneBy: r.done_by || '', doneAt: r.done_at });

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const friendlyError = (error: any): string => {
  const msg: string = error?.message || 'Unknown error';
  if (/row-level security|permission denied/i.test(msg)) return "You don't have permission to do that.";
  if (error?.code === '23503' || /foreign key/i.test(msg)) return "That is still used by purchase orders, so it can't be deleted.";
  if (error?.code === '23505' || /duplicate key/i.test(msg)) return 'That name already exists.';
  if (/schema cache|does not exist|could not find/i.test(msg)) return `${msg} — run supabase/migration_v14_purchase.sql (after v13) in the Supabase SQL Editor, then reload.`;
  return msg;
};

export interface VendorInput { name: string; contact: string; phone: string; email: string; address: string; notes: string }
export interface OrderLineInput { inventoryItemId: string | null; name: string; unit: string; qtyOrdered: number; rate: number }
export interface OrderInput { title: string; vendorId: string; requestedBy: string; deliverTo: string; expectedDate: string; notes: string; items: OrderLineInput[] }
export interface ReceiveMeta { givenBy: string; receivedBy: string; challan: string; note: string }
export interface PayInput { amount: number; mode: string; ref: string; paidBy: string; note: string }
export interface PStats { awaiting: number; open: number; toReceive: number; overdue: number; due: number; orders: number }

interface Ctx {
  vendors: Vendor[]; orders: PO[]; loading: boolean; loadError: string; stats: PStats; userName: string;
  canManage: boolean; canApprove: boolean; canReceive: boolean;
  vendorName: (id: string | null) => string;
  addVendor: (v: VendorInput) => Promise<boolean>;
  updateVendor: (id: string, v: VendorInput) => Promise<boolean>;
  deleteVendor: (id: string) => Promise<boolean>;
  saveOrder: (input: OrderInput, id: string | null, submit: boolean) => Promise<boolean>;
  setStatus: (id: string, status: POStatus, doneMsg: string) => Promise<boolean>;
  deleteOrder: (id: string) => Promise<boolean>;
  receive: (poId: string, lines: { itemId: string; qty: number }[], meta: ReceiveMeta) => Promise<boolean>;
  pay: (poId: string, p: PayInput) => Promise<boolean>;
  fetchReceipts: (poId?: string, limit?: number) => Promise<Receipt[]>;
  fetchPayments: (poId?: string, limit?: number) => Promise<Payment[]>;
}
const C = createContext<Ctx | null>(null);
export const usePurchase = (): Ctx => { const c = useContext(C); if (!c) throw new Error('usePurchase must be used inside <PurchaseProvider>'); return c; };

export const PurchaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const w: any = useWalkie();
  const user = w.currentUser;
  const orgId: string | null = user?.organizationId || null;
  const ready = !!user && user.approved !== false && user.isActive !== false && !!orgId;
  const exec = ready && (user.level === 'owner' || user.level === 'dept_head');
  const canManage = exec || (ready && user.subDepartment === 'purchase');
  const canApprove = exec;
  const canReceive = canManage || (ready && user.subDepartment === 'inventory');

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<PO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const ordersRef = useRef(orders); ordersRef.current = orders;
  const vendorsRef = useRef(vendors); vendorsRef.current = vendors;

  const toast = useCallback((m: string, t: 'success' | 'error' | 'warning' = 'success') => w.addToast?.(m, t), [w.addToast]);
  const log = useCallback((a: string, d: string, t = 'info') => { try { w.logAction?.(a, d, t); } catch { /* best effort */ } }, [w.logAction]);

  const fetchAll = async (table: string, order: string) => {
    const out: any[] = [];
    for (let from = 0; ; from += 1000) {
      const r = await supabase.from(table).select('*').order(order, { ascending: true }).range(from, from + 999);
      if (r.error) return { data: [] as any[], error: r.error };
      out.push(...(r.data || []));
      if (!r.data || r.data.length < 1000) break;
    }
    return { data: out, error: null };
  };

  const load = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    const [v, o, i] = await Promise.all([fetchAll('purchase_vendors', 'created_at'), fetchAll('purchase_orders', 'created_at'), fetchAll('purchase_items', 'position')]);
    const err = v.error || o.error || i.error;
    if (err) setLoadError(friendlyError(err));
    else {
      setLoadError('');
      const byPo = new Map<string, POItem[]>();
      i.data.forEach((r: any) => { const l = byPo.get(r.po_id) || []; l.push(mapItem(r)); byPo.set(r.po_id, l); });
      setVendors(v.data.map(mapVendor).sort((a: Vendor, b: Vendor) => collator.compare(a.name, b.name)));
      setOrders(o.data.map((r: any) => mapPO(r, byPo.get(r.id) || [])).sort((a: PO, b: PO) => (a.createdAt < b.createdAt ? 1 : -1)));
    }
    setLoading(false);
  }, [ready]);

  useEffect(() => { if (!ready) { setVendors([]); setOrders([]); setLoadError(''); return; } load(); }, [ready, orgId]); // eslint-disable-line

  // Live sync: any change to orders / items / vendors reloads (debounced).
  useEffect(() => {
    if (!ready) return;
    let timer: any;
    const schedule = () => { clearTimeout(timer); timer = setTimeout(load, 500); };
    const filter = `organization_id=eq.${orgId}`;
    const ch = supabase.channel(`purchase-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders', filter }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_items', filter }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_vendors', filter }, schedule)
      .subscribe();
    const poll = setInterval(load, 120000);
    return () => { clearTimeout(timer); supabase.removeChannel(ch); clearInterval(poll); };
  }, [ready, orgId]); // eslint-disable-line

  const deny = () => { toast('You can view purchases but not change them.', 'error'); return false; };
  const vendorName = useCallback((id: string | null) => (id ? vendors.find(v => v.id === id)?.name || 'Removed vendor' : '—'), [vendors]);

  // ---- vendors --------------------------------------------------------------
  const vbody = (v: VendorInput) => ({ name: v.name.trim(), contact_person: v.contact.trim(), phone: v.phone.trim(), email: v.email.trim(), address: v.address.trim(), notes: v.notes.trim() });
  const addVendor: Ctx['addVendor'] = async (v) => {
    if (!canManage) return deny();
    if (!v.name.trim()) { toast('Vendor name is required.', 'error'); return false; }
    const { error } = await supabase.from('purchase_vendors').insert({ id: uid('ven'), organization_id: orgId, ...vbody(v) });
    if (error) { toast(error.code === '23505' ? 'A vendor with that name already exists.' : friendlyError(error), 'error'); return false; }
    await load(); toast(`${v.name.trim()} added.`);
    return true;
  };
  const updateVendor: Ctx['updateVendor'] = async (id, v) => {
    if (!canManage) return deny();
    if (!v.name.trim()) { toast('Vendor name is required.', 'error'); return false; }
    const { error } = await supabase.from('purchase_vendors').update(vbody(v)).eq('id', id);
    if (error) { toast(error.code === '23505' ? 'A vendor with that name already exists.' : friendlyError(error), 'error'); return false; }
    await load(); toast('Saved.');
    return true;
  };
  const deleteVendor: Ctx['deleteVendor'] = async (id) => {
    if (!canManage) return deny();
    const { error } = await supabase.from('purchase_vendors').delete().eq('id', id);
    if (error) { toast(friendlyError(error), 'error'); return false; }
    setVendors(p => p.filter(v => v.id !== id)); toast('Vendor deleted.');
    return true;
  };

  // ---- orders ---------------------------------------------------------------
  const saveOrder: Ctx['saveOrder'] = async (input, id, submit) => {
    if (!canManage) return deny();
    const title = input.title.trim();
    if (!title) { toast('Give the order a title.', 'error'); return false; }
    const lines = input.items.filter(l => l.name.trim() || l.qtyOrdered);
    if (!lines.length) { toast('Add at least one item.', 'error'); return false; }
    if (lines.some(l => !l.name.trim() || !(Math.floor(l.qtyOrdered) > 0))) { toast('Every item needs a name and a quantity.', 'error'); return false; }
    if (submit && !input.vendorId) { toast('Choose a vendor before sending for approval.', 'error'); return false; }

    const head = { title, vendor_id: input.vendorId || null, requested_by: input.requestedBy.trim(), deliver_to: input.deliverTo.trim(), expected_date: input.expectedDate || null, notes: input.notes.trim() };
    let poId = id;
    if (!id) {
      const r = await supabase.from('purchase_orders').insert({ id: uid('po'), organization_id: orgId, ...head, status: 'draft' }).select().single();
      if (r.error) { toast(`Could not create the order: ${friendlyError(r.error)}`, 'error'); return false; }
      poId = r.data.id;
    } else {
      const r = await supabase.from('purchase_orders').update(head).eq('id', id);
      if (r.error) { toast(`Could not save: ${friendlyError(r.error)}`, 'error'); return false; }
    }
    const oldIds = id ? (ordersRef.current.find(o => o.id === id)?.items.map(i => i.id) || []) : [];
    const rows = lines.map((l, k) => ({
      id: uid('pi'), organization_id: orgId, po_id: poId, inventory_item_id: l.inventoryItemId || null, name: l.name.trim(),
      unit: l.unit.trim() || 'pcs', qty_ordered: Math.floor(l.qtyOrdered), rate: Math.max(0, +l.rate || 0), position: k,
    }));
    const ins = await supabase.from('purchase_items').insert(rows);
    if (ins.error) {
      if (!id) await supabase.from('purchase_orders').delete().eq('id', poId);
      toast(`Could not save the items: ${friendlyError(ins.error)}`, 'error'); await load(); return false;
    }
    if (oldIds.length) await supabase.from('purchase_items').delete().in('id', oldIds);
    if (submit) {
      const s = await supabase.from('purchase_orders').update({ status: 'pending' }).eq('id', poId);
      if (s.error) { toast(`Saved as a draft, but could not send for approval: ${friendlyError(s.error)}`, 'warning'); await load(); return true; }
    }
    await load();
    log('Purchase Order', `${user.name} ${id ? 'updated' : 'created'} order "${title}"${submit ? ' and sent it for approval' : ''}`, 'info');
    toast(submit ? 'Sent for approval.' : id ? 'Saved.' : 'Draft saved.');
    return true;
  };

  const setStatus: Ctx['setStatus'] = async (id, status, doneMsg) => {
    const needsApprover = status === 'approved' || status === 'rejected';
    if (needsApprover && !canApprove) { toast('Only the owner or IT head can approve or reject orders.', 'error'); return false; }
    if (!needsApprover && !canManage) return deny();
    const { error } = await supabase.from('purchase_orders').update({ status }).eq('id', id);
    if (error) { toast(friendlyError(error), 'error'); return false; }
    const po = ordersRef.current.find(o => o.id === id);
    await load();
    log('Purchase Order', `${user.name}: ${po?.number || id} → ${status}`, status === 'rejected' || status === 'cancelled' ? 'warning' : 'info');
    toast(doneMsg);
    return true;
  };

  const deleteOrder: Ctx['deleteOrder'] = async (id) => {
    if (!canManage) return deny();
    const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
    if (error) { toast(friendlyError(error), 'error'); return false; }
    setOrders(p => p.filter(o => o.id !== id)); toast('Order deleted.');
    return true;
  };

  // ---- goods received + payments -----------------------------------------------
  const receive: Ctx['receive'] = async (poId, lines, meta) => {
    if (!canReceive) { toast("You don't have permission to receive goods.", 'error'); return false; }
    const po = ordersRef.current.find(o => o.id === poId);
    let done = 0;
    for (const l of lines.filter(x => x.qty > 0)) {
      const { error } = await supabase.from('purchase_receipts').insert({
        id: uid('rc'), organization_id: orgId, po_id: poId, item_id: l.itemId, qty: l.qty,
        given_by: meta.givenBy.trim(), received_by: meta.receivedBy.trim(), challan: meta.challan.trim(), note: meta.note.trim(), done_by: user.name,
      });
      if (error) { toast(`${done ? `${done} line(s) saved, then stopped: ` : ''}${friendlyError(error)}`, 'error'); await load(); return false; }
      done++;
    }
    await load();
    log('Purchase Received', `${user.name} received goods on ${po?.number || poId}`, 'success');
    toast(po && po.items.some(i => lines.some(l => l.itemId === i.id && l.qty > 0 && i.inventoryItemId)) ? 'Goods received. Linked items were added to store stock.' : 'Goods received.');
    return true;
  };

  const pay: Ctx['pay'] = async (poId, p) => {
    if (!canManage) return deny();
    if (!(p.amount > 0)) { toast('Enter the amount paid.', 'error'); return false; }
    const { error } = await supabase.from('purchase_payments').insert({
      id: uid('pay'), organization_id: orgId, po_id: poId, amount: Math.round(p.amount * 100) / 100, mode: p.mode, ref: p.ref.trim(), paid_by: p.paidBy.trim(), note: p.note.trim(), done_by: user.name,
    });
    if (error) { toast(friendlyError(error), 'error'); return false; }
    const po = ordersRef.current.find(o => o.id === poId);
    await load();
    log('Purchase Payment', `${user.name} recorded ₹${p.amount} against ${po?.number || poId}`, 'info');
    toast('Payment recorded.');
    return true;
  };

  const fetchReceipts: Ctx['fetchReceipts'] = async (poId, limit = 300) => {
    let q = supabase.from('purchase_receipts').select('*').order('done_at', { ascending: false }).limit(limit);
    if (poId) q = q.eq('po_id', poId);
    const { data, error } = await q;
    if (error) { toast(friendlyError(error), 'error'); return []; }
    return (data || []).map(mapReceipt);
  };
  const fetchPayments: Ctx['fetchPayments'] = async (poId, limit = 300) => {
    let q = supabase.from('purchase_payments').select('*').order('done_at', { ascending: false }).limit(limit);
    if (poId) q = q.eq('po_id', poId);
    const { data, error } = await q;
    if (error) { toast(friendlyError(error), 'error'); return []; }
    return (data || []).map(mapPayment);
  };

  const stats = useMemo<PStats>(() => {
    const s: PStats = { awaiting: 0, open: 0, toReceive: 0, overdue: 0, due: 0, orders: orders.length };
    const today = todayStr();
    for (const o of orders) {
      if (o.status === 'pending') s.awaiting++;
      if (['approved', 'ordered', 'partial'].includes(o.status)) s.open++;
      if (INCOMING.includes(o.status)) { s.toReceive++; if (o.expectedDate && o.expectedDate < today) s.overdue++; }
      if (PAYABLE.includes(o.status)) s.due += poDue(o);
    }
    s.due = Math.round(s.due * 100) / 100;
    return s;
  }, [orders]);

  const value: Ctx = { vendors, orders, loading, loadError, stats, userName: user?.name || '', canManage, canApprove, canReceive, vendorName, addVendor, updateVendor, deleteVendor, saveOrder, setStatus, deleteOrder, receive, pay, fetchReceipts, fetchPayments };
  return <C.Provider value={value}>{children}</C.Provider>;
};
