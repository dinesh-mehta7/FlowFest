import React, { useState } from 'react';
import { Search, Download } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DEPTS } from '../../pages/orgData';
import { inputCls, Pill } from '../../pages/Home';
import { btnGhost, th } from '../ui';

const STATUS_TONE: Record<string, string> = { Completed: 'bg-emerald-500/15 text-emerald-300', Pending: 'bg-amber-500/15 text-amber-300', Flagged: 'bg-red-500/15 text-red-300' };
const deptName = (id: string, fallback: string) => (id in DEPTS ? DEPTS[id as keyof typeof DEPTS] : id === 'owner' ? 'Organization' : fallback);
const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

// Who did what, across every department. Filters apply to the CSV export as well.
export const AuditLogsView: React.FC = () => {
  const { auditLogs } = useApp();
  const [search, setSearch] = useState(''); const [dept, setDept] = useState('all'); const [status, setStatus] = useState('all');
  const q = search.trim().toLowerCase();
  const rows = auditLogs.filter(l =>
    (!q || l.action.toLowerCase().includes(q) || l.userName.toLowerCase().includes(q) || (l.details || '').toLowerCase().includes(q)) &&
    (dept === 'all' || l.subDepartmentId === dept) && (status === 'all' || l.status === status));

  const exportCsv = () => {
    const head = ['Time', 'User', 'Role', 'Department', 'Action', 'Details', 'Status'];
    const body = rows.map(l => [l.timestamp, l.userName, l.role, deptName(l.subDepartmentId, l.subDepartmentName), l.action, l.details, l.status].map(csvCell).join(','));
    const url = URL.createObjectURL(new Blob([[head.join(','), ...body].join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'audit-log.csv'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input className={inputCls + ' pl-9'} placeholder="Search user, action or detail" aria-label="Search audit log" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={inputCls + ' !w-auto'} aria-label="Department" value={dept} onChange={e => setDept(e.target.value)}>
          <option value="all">All departments</option>
          {(Object.keys(DEPTS) as (keyof typeof DEPTS)[]).map(k => <option key={k} value={k}>{DEPTS[k]}</option>)}
          <option value="owner">Organization</option>
        </select>
        <select className={inputCls + ' !w-auto'} aria-label="Status" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">All statuses</option><option value="Completed">Completed</option><option value="Pending">Pending</option><option value="Flagged">Flagged</option>
        </select>
        <button className={btnGhost + ' ml-auto'} onClick={exportCsv} disabled={!rows.length}><Download size={15} />Export CSV</button>
      </div>

      <div className="rounded-2xl border border-line bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-line bg-raised/40">
              <th className={th}>Time</th><th className={th}>User</th><th className={th}>Department</th><th className={th}>Action</th><th className={th}>Details</th><th className={th + ' text-right'}>Status</th>
            </tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map(l => (
                <tr key={l.id} className="hover:bg-raised/40 transition-colors">
                  <td className="px-4 py-3 text-xs text-mute whitespace-nowrap">{l.timestamp}</td>
                  <td className="px-4 py-3"><div className="font-medium text-ink">{l.userName}</div><div className="text-xs text-faint">{l.role}</div></td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{deptName(l.subDepartmentId, l.subDepartmentName)}</td>
                  <td className="px-4 py-3 text-ink">{l.action}</td>
                  <td className="px-4 py-3 text-xs text-mute">{l.details || '—'}</td>
                  <td className="px-4 py-3 text-right"><Pill c={STATUS_TONE[l.status] || 'bg-raised text-mute'}>{l.status}</Pill></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-mute">No log entries match.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
