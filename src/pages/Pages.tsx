import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { inr, DEPTS } from './orgData';
import { Card, inputCls, btnPrimary } from './Home';
import { PageIntro, Tabs, Stat } from '../components/ui';
import { ApprovalsView } from '../components/owner/ApprovalsView';
import { AuditLogsView } from '../components/owner/AuditLogsView';
import { Wallet, LifeBuoy, TrendingDown, Clock, CheckSquare } from 'lucide-react';
import type { SubDepartmentId } from '../types';

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => <li className="py-8 text-center text-sm text-mute">{children}</li>;
const Row: React.FC<{ dot?: string; title: string; meta: string; right: React.ReactNode }> = ({ dot, title, meta, right }) => (
  <li className="py-3 flex items-center justify-between gap-3 text-sm">
    <div className="flex items-start gap-3 min-w-0">
      {dot && <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dot}`} />}
      <div className="min-w-0"><div className="text-ink">{title}</div><div className="text-xs text-mute">{meta}</div></div>
    </div>
    <div className="flex items-center gap-3 shrink-0">{right}</div>
  </li>
);
export { MeetingsEmergency } from './MeetingsPage';

const Transactions: React.FC = () => {
  const { finance, purchaseOrders } = useApp();
  const waiting = purchaseOrders.filter(p => p.status === 'Submitted' || p.status === 'Sub-Dept Approved').length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Wallet} label="Budget" value={inr(finance.incoming)} />
        <Stat icon={TrendingDown} label="Spent" value={inr(finance.outgoing)} />
        <Stat icon={Clock} label="Pending" value={inr(finance.pending)} />
        <Stat icon={CheckSquare} label="Awaiting approval" value={waiting} hint="purchase orders" warn={waiting > 0} />
      </div>
      <Card icon={Wallet} title="Transactions">
        <ul className="divide-y divide-line">{finance.transactions.map(t => (
          <Row key={t.id} title={t.party} meta={`${t.category} · ${t.date}`}
            right={<div className="text-right"><div className="text-ink tabular-nums">{t.type === 'incoming' ? '+' : '-'}{inr(t.amount)}</div><div className="text-[11px] text-mute">{t.status}</div></div>} />))}
          {!finance.transactions.length && <Empty>No transactions yet.</Empty>}</ul>
      </Card>
    </div>
  );
};

// Payments, approvals and the audit log in one place. The audit log is for the Organization Head only.
export const FinanceDesk: React.FC<{ tab?: string }> = ({ tab }) => {
  const { currentUser, purchaseOrders, accessRequests } = useApp();
  const owner = currentUser.role === 'owner';
  const pending = purchaseOrders.filter(p => p.status === 'Submitted' || p.status === 'Sub-Dept Approved').length + accessRequests.filter(r => r.status === 'pending').length;
  const tabs = [
    { id: 'payments', label: 'Payments' },
    { id: 'approvals', label: 'Approvals', count: pending, alert: true },
    ...(owner ? [{ id: 'audit', label: 'Audit log' }] : []),
  ];
  const cur = tabs.some(t => t.id === tab) ? (tab as string) : 'payments';
  return (
    <div className="space-y-4">
      <PageIntro>Track spending, sign off purchase orders and access requests, and review who did what.</PageIntro>
      <Tabs label="Payments and approvals" value={cur} onChange={id => { location.hash = '#/payments/' + id; }} tabs={tabs} />
      {cur === 'payments' && <Transactions />}
      {cur === 'approvals' && <ApprovalsView />}
      {cur === 'audit' && owner && <AuditLogsView />}
    </div>
  );
};

export const OtherDept: React.FC = () => {
  const { submitAccessRequest } = useApp(); const [d, setD] = useState<SubDepartmentId>('cctv'); const [r, setR] = useState(''); const [sent, setSent] = useState(false);
  return (
    <Card icon={LifeBuoy} title="Request IT support or access">
      <div className="space-y-3 max-w-lg">
        <select className={inputCls} value={d} onChange={e => setD(e.target.value as SubDepartmentId)} aria-label="Department">{(Object.keys(DEPTS) as SubDepartmentId[]).map(k => <option key={k} value={k}>{DEPTS[k]}</option>)}</select>
        <textarea className={inputCls} rows={4} placeholder="What do you need?" value={r} onChange={e => setR(e.target.value)} />
        <button className={btnPrimary} onClick={() => { if (r) { submitAccessRequest(d, 'staff', r); setSent(true); setR(''); } }}>Send request</button>
        {sent && <p className="text-sm text-emerald-400">Sent to the {DEPTS[d]} head for approval.</p>}</div>
    </Card>
  );
};
