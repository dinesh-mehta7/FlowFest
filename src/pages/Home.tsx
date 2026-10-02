import React, { useEffect, useState } from 'react';
import { Wallet, Zap, Video, Wifi, Radio, Monitor, Boxes, ShoppingCart, BedDouble, HeartHandshake } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { inr, DEPTS } from './orgData';
import { supabase } from '../modules/walkie/lib/supabaseClient';
import { useAccommodation } from '../modules/accommodation';
import { useManpower } from '../modules/manpower';
import { useInventory } from '../modules/inventory';
import { usePurchase } from '../modules/purchase';
import { pickLive } from '../modules/accommodation/live';
import { nowMinutes, todayStr } from '../modules/accommodation/dates';
import { STATUS_STEPS } from '../modules/accommodation/types';
import type { SubDepartmentId } from '../types';

export const Card: React.FC<{ icon: any; title: string; tone?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }> = ({ icon: I, title, tone = 'text-cyan-300', action, className = '', children }) => (
  <section className={`rounded-2xl border border-line bg-surface p-5 flex flex-col ${className}`}>
    <header className="flex items-center justify-between gap-3 mb-4">
      <h2 className="flex items-center gap-2.5 text-sm font-semibold text-ink"><span className={`grid place-items-center w-8 h-8 rounded-lg bg-raised ${tone}`}><I size={16} /></span>{title}</h2>{action}
    </header>{children}
  </section>
);
export const Pill: React.FC<{ c: string; children: React.ReactNode }> = ({ c, children }) => <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${c}`}>{children}</span>;
// Shared form + button styles so every page looks the same.
export const inputCls = 'bg-field border border-line-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-faint w-full outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20';
export const btnPrimary = 'px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white whitespace-nowrap transition-colors';
export const btnDanger = 'px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white whitespace-nowrap transition-colors';
export const linkBtn = 'text-xs font-medium text-violet-400 hover:underline whitespace-nowrap';

// Live walkie counts straight from the RadioGate Supabase DB (needs a signed-in walkie session).
const useWalkieLive = () => {
  const [s, setS] = useState<{ total: number; out: number; fix: number } | null>(null);
  useEffect(() => {
    let on = true;
    const load = async () => {
      try {
        const { data, error } = await supabase.from('walkies').select('status');
        if (on && !error && data) setS({ total: data.length, out: data.filter((w: any) => w.status === 'Allocated').length, fix: data.filter((w: any) => w.status === 'Under Maintenance').length });
      } catch {}
    };
    load(); const t = setInterval(load, 20000);
    return () => { on = false; clearInterval(t); };
  }, []);
  return s;
};

const ICONS: Record<SubDepartmentId, any> = { cctv: Video, wifi: Wifi, walkie: Radio, control: Monitor, inventory: Boxes, purchase: ShoppingCart, accommodation: BedDouble, sewadars: HeartHandshake };
const PRIORITY_DOT: Record<string, string> = { Critical: 'bg-red-500', High: 'bg-amber-400', Medium: 'bg-cyan-500' };

export const Home: React.FC = () => {
  const { cameras, wifiAPs, walkies, controlRooms, finance, needsAttention, resolveNeedsAttention, currentUser, canAccessApp } = useApp();
  const wl = useWalkieLive();
  const acc = useAccommodation();
  const mp = useManpower().stats;
  const inv = useInventory().stats;
  const pur = usePurchase().stats;
  const n = (a: any[], f: (x: any) => boolean) => a.filter(f).length;
  const beds = acc.rooms.reduce((t, r) => t + r.capacity, 0);
  const placed = acc.members.filter(m => m.roomId).length;
  const unhoused = acc.members.length - placed;
  const liveMeal = pickLive(acc.mealsOn(todayStr()), nowMinutes());
  const exec = currentUser.role === 'owner' || currentUser.role === 'dept_head';
  const cards: Record<SubDepartmentId, [string, string, number]> = {
    cctv: [`${n(cameras, c => c.status === 'online')}/${cameras.length}`, 'cameras online', n(cameras, c => c.status !== 'online')],
    wifi: [`${n(wifiAPs, a => a.status === 'online')}/${wifiAPs.length}`, `APs online · ${wifiAPs.reduce((t, a) => t + a.connectedClients, 0)} clients`, n(wifiAPs, a => a.status !== 'online')],
    walkie: wl ? [`${wl.out}/${wl.total}`, `radios out · ${wl.fix} in repair`, wl.fix]
      : [`${n(walkies, w => w.status === 'active')}/${walkies.length}`, 'radios active', n(walkies, w => ['lost', 'overdue', 'maintenance'].includes(w.status))],
    control: [`${n(controlRooms, r => r.status === 'operational')}/${controlRooms.length}`, 'rooms operational', n(controlRooms, r => r.status === 'alert')],
    inventory: [`${inv.needRestock}`, `need restock · ${inv.total} items${inv.withDamaged ? ` · ${inv.withDamaged} with damage` : ''}`, inv.needRestock],
    purchase: [`${pur.open}`, `open orders · ${pur.awaiting} await approval${pur.overdue ? ` · ${pur.overdue} overdue` : ''}`, pur.awaiting + pur.overdue],
    accommodation: [`${placed}/${beds}`, `beds filled${liveMeal ? ` · ${liveMeal.label}: ${STATUS_STEPS.find(x => x.key === liveMeal.status)?.label}` : ''}${unhoused ? ` · ${unhoused} need a room` : ''}`, unhoused],
    sewadars: [`${mp.arrived}/${mp.total}`, `arrived · ${mp.toCall} to call · ${mp.badgePending} badge pending`, mp.badgePending],
  };
  // Everyone can open Accommodation; the rest depend on access. Heads see all eight.
  const keys = (Object.keys(cards) as SubDepartmentId[]).filter(k => exec || k === 'accommodation' || canAccessApp(k));
  const open = needsAttention.filter(a => !a.resolved && (exec || keys.includes(a.deptId))).slice(0, 6);
  const pay = finance.transactions.filter(t => t.status !== 'Settled').slice(0, 4);
  return (
    <div className="space-y-5">
      {/* a) the eight department buttons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {keys.map(k => {
          const [main, sub, bad] = cards[k]; const I = ICONS[k];
          return (
            <a key={k} href={'#/' + k} className={`group rounded-2xl border bg-surface p-4 transition hover:-translate-y-0.5 hover:shadow-md hover:border-violet-500/50 ${bad ? 'border-amber-500/40' : 'border-line'}`}>
              <div className="flex items-center justify-between">
                <span className="grid place-items-center w-9 h-9 rounded-lg bg-raised text-violet-400 group-hover:bg-violet-500/15"><I size={18} /></span>
                <span className={`w-2 h-2 rounded-full ${bad ? 'bg-amber-400' : 'bg-emerald-400'}`} title={bad ? 'Needs a look' : 'All good'} />
              </div>
              <div className="mt-3 text-sm font-medium text-ink-soft">{DEPTS[k]}</div>
              <div className="text-2xl font-bold text-ink leading-tight">{main}</div>
              <div className="text-xs text-mute mt-1 line-clamp-2">{sub}</div>
            </a>
          );
        })}
      </div>
      {/* b) needs attention (left)  c) payments (right) */}
      <div className={`grid gap-4 items-stretch ${exec ? 'lg:grid-cols-2' : ''}`}>
        <Card icon={Zap} title="Needs attention" action={<span className="text-xs text-mute">{open.length} open</span>}>
          <ul className="divide-y divide-line">{open.map(a => (
            <li key={a.id} className="py-3 flex items-center justify-between gap-3 text-sm first:pt-0">
              <a href={'#/' + a.targetView.appId} className="flex items-start gap-3 text-left min-w-0">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[a.priority] || 'bg-cyan-500'}`} />
                <span className="min-w-0"><span className="block text-ink truncate">{a.title}</span><span className="block text-xs text-mute">{a.deptName} · {a.priority}</span></span>
              </a>
              <button onClick={() => resolveNeedsAttention(a.id)} className={linkBtn}>Resolve</button>
            </li>))}{!open.length && <li className="py-6 text-center text-sm text-mute">All clear. Nothing needs attention.</li>}</ul>
        </Card>
        {exec && <Card icon={Wallet} title="Payments" action={<a href="#/payments" className={linkBtn}>View all</a>}>
          <div className="grid grid-cols-3 gap-2 mb-4">{[['Budget', finance.incoming], ['Spent', finance.outgoing], ['Pending', finance.pending]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl bg-raised/60 px-3 py-2"><div className="text-xs text-mute">{l}</div><div className="text-sm font-bold text-ink">{inr(v as number)}</div></div>))}</div>
          <ul className="divide-y divide-line">{pay.map(t => (
            <li key={t.id} className="py-3 flex justify-between gap-3 text-sm first:pt-0"><div className="min-w-0"><div className="text-ink truncate">{t.party}</div><div className="text-xs text-mute">{t.category}</div></div><div className="text-right shrink-0"><div className="text-ink">{inr(t.amount)}</div><div className="text-[11px] text-amber-400">{t.status}</div></div></li>))}
            {!pay.length && <li className="py-6 text-center text-sm text-mute">No pending payments.</li>}</ul>
        </Card>}
      </div>
    </div>
  );
};
