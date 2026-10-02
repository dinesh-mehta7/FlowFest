import React from 'react';
import { ShoppingCart, UserCheck, Check, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DEPTS, inr } from '../../pages/orgData';
import { Card, Pill, btnPrimary, linkBtn } from '../../pages/Home';
import { btnGhost } from '../ui';

const ROLE: Record<string, string> = { staff: 'Staff', sub_dept_head: 'Sub-department head', dept_head: 'Department head', owner: 'Organization head' };

// Everything waiting for a sign-off, in one list: purchase orders first, then access requests.
export const ApprovalsView: React.FC = () => {
  const { purchaseOrders, approvePurchaseOrder, accessRequests, reviewAccessRequest, currentUser } = useApp();
  const pendingPOs = purchaseOrders.filter(p => p.status === 'Submitted' || p.status === 'Sub-Dept Approved');
  const pendingRequests = accessRequests.filter(r => r.status === 'pending');
  const approvePO = (id: string) => approvePurchaseOrder(id, currentUser.role === 'owner' ? 'owner' : 'sub_dept');

  return (
    <div className="space-y-4">
      <Card icon={ShoppingCart} title="Purchase orders" action={<span className="text-xs text-mute">{pendingPOs.length} awaiting sign-off</span>}>
        <ul className="divide-y divide-line">
          {pendingPOs.map(po => (
            <li key={po.id} className="py-3 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{po.title}</span>
                  <Pill c="bg-amber-500/15 text-amber-300">{po.status}</Pill>
                </div>
                <div className="text-xs text-mute">{po.poNumber} · {DEPTS[po.requestedByDept]} · {po.vendorName} · {po.itemCount} items</div>
                <div className="text-xs text-faint">Created {po.dateCreated} · Delivery by {po.estimatedDelivery}</div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right"><div className="text-xs text-mute">Amount</div><div className="text-base font-bold text-ink tabular-nums">{inr(po.totalAmount)}</div></div>
                <button className={btnPrimary + ' inline-flex items-center gap-1.5'} onClick={() => approvePO(po.id)}><Check size={15} />Approve</button>
              </div>
            </li>
          ))}
          {!pendingPOs.length && <li className="py-8 text-center text-sm text-mute">No purchase orders waiting.</li>}
        </ul>
      </Card>

      <Card icon={UserCheck} title="Access requests" action={<span className="text-xs text-mute">{pendingRequests.length} waiting</span>}>
        <ul className="divide-y divide-line">
          {pendingRequests.map(req => (
            <li key={req.id} className="py-3 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{req.userName}</span>
                  <span className="text-xs text-mute">{req.userEmail}</span>
                  <Pill c="bg-cyan-500/15 text-cyan-300">{DEPTS[req.requestedSubDepartment]} · {ROLE[req.requestedRole] || req.requestedRole}</Pill>
                </div>
                {req.reason && <div className="text-xs text-ink-soft bg-raised/60 rounded-lg px-3 py-2">{req.reason}</div>}
                <div className="text-xs text-faint">Requested {req.submittedAt} · Goes to {ROLE[req.assignedApproverRole] || req.assignedApproverRole}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button className={btnGhost} onClick={() => reviewAccessRequest(req.id, 'rejected', 'Declined in Approvals')}><X size={15} />Reject</button>
                <button className={btnPrimary + ' inline-flex items-center gap-1.5'} onClick={() => reviewAccessRequest(req.id, 'approved', 'Approved in Approvals')}><Check size={15} />Approve</button>
              </div>
            </li>
          ))}
          {!pendingRequests.length && <li className="py-8 text-center text-sm text-mute">No access requests waiting.</li>}
        </ul>
      </Card>
    </div>
  );
};
