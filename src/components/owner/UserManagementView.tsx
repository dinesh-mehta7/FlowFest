import React, { useState } from 'react';
import { Users, Shield, Check, X, Search, Filter, UserPlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageIntro, Tabs } from '../ui';
import { DEPTS } from '../../pages/orgData';
import { UserProfile, AccessRequest, SubDepartmentId } from '../../types';

interface Props {
  initialTab?: string;
}

export const UserManagementView: React.FC<Props> = ({ initialTab = 'users_all' }) => {
  const { 
    users, 
    accessRequests, 
    reviewAccessRequest, 
    currentUser,
    addAuditLog 
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState(initialTab);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserProfile['role']>('staff');
  const [newUserDept, setNewUserDept] = useState<SubDepartmentId>('cctv');
  const [newUserDesignation, setNewUserDesignation] = useState('');

  const TABS = [
    { id: 'users_all', label: 'All Users', count: users.length },
    { id: 'users_requests', label: 'Access Requests', count: accessRequests.filter(r => r.status === 'pending').length },
    { id: 'users_dept_heads', label: 'Department Heads', count: users.filter(u => u.role === 'dept_head').length },
    { id: 'users_sub_heads', label: 'Sub-Department Heads', count: users.filter(u => u.role === 'sub_dept_head').length },
    { id: 'users_roles', label: 'Roles & Permissions Matrix' },
  ];

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
      u.email.toLowerCase().includes(searchFilter.toLowerCase()) ||
      u.badgeId.toLowerCase().includes(searchFilter.toLowerCase());
    
    if (activeSubTab === 'users_dept_heads') {
      return matchesSearch && u.role === 'dept_head';
    }
    if (activeSubTab === 'users_sub_heads') {
      return matchesSearch && u.role === 'sub_dept_head';
    }
    if (selectedDeptFilter !== 'all' && u.subDepartmentId !== selectedDeptFilter) {
      return false;
    }
    return matchesSearch;
  });

  const handleApprove = (reqId: string) => {
    reviewAccessRequest(reqId, 'approved', 'Authorized by IT Owner');
  };

  const handleReject = (reqId: string) => {
    reviewAccessRequest(reqId, 'rejected', 'Declined by IT Owner');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-mute max-w-2xl">Hierarchical authorization: Owner ➔ Department Head ➔ Sub-Department Head ➔ Staff with strict data boundary isolation.</p>

        <button
          onClick={() => setIsAddUserModalOpen(true)}
          className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shrink-0"
        >
          <UserPlus size={14} /> Provision New User
        </button>
      </div>

      <Tabs value={activeSubTab} onChange={t => setActiveSubTab(t as any)} tabs={TABS.map(t => ({ id: t.id, label: t.label, count: t.count, alert: t.id === 'users_requests' }))} />

      {/* Tab Content */}
      {activeSubTab === 'users_requests' ? (
        /* Access Requests Workflow */
        <div className="bg-surface border border-line rounded-xl overflow-hidden">
          <div className="p-4 border-b border-line bg-surface/80 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-ink">Access requests waiting for approval</h2>
              <p className="text-[11px] text-mute">
                Staff requests routed to Sub-Department Heads or escalated to Owner.
              </p>
            </div>
            <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded">
              {accessRequests.filter(r => r.status === 'pending').length} Pending Review
            </span>
          </div>

          <div className="divide-y divide-line/60">
            {accessRequests.length === 0 ? (
              <div className="p-8 text-center text-faint text-xs">No access requests on file.</div>
            ) : (
              accessRequests.map((req) => (
                <div key={req.id} className="p-4 hover:bg-raised/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink text-sm">{req.userName}</span>
                      <span className="text-faint text-xs">({req.userEmail})</span>
                      <span className={`text-[10px]  px-2 py-0.5 rounded border  ${
                        req.status === 'pending'
                          ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                          : req.status === 'approved'
                          ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                          : 'border-red-500/30 text-red-400 bg-red-500/10'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="text-xs text-ink-soft">
                      Requesting <strong className="text-cyan-400 font-semibold">{DEPTS[req.requestedSubDepartment]}</strong> access as <span className="capitalize text-ink">{req.requestedRole.replace('_', ' ')}</span>
                    </div>

                    <div className="text-xs text-mute bg-canvas p-2.5 rounded-lg border border-line">
                      <span className="text-faint text-[10px] ">Reason: </span>
                      {req.reason}
                    </div>

                    <div className="text-[10px] text-faint flex items-center gap-2 pt-0.5">
                      <span>Submitted: {req.submittedAt}</span>
                      {req.approverName && (
                        <>
                          <span>·</span>
                          <span>Reviewed by: {req.approverName}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {req.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleReject(req.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-mute hover:text-red-300 hover:bg-red-500/10 border border-line-strong transition-colors flex items-center gap-1.5"
                      >
                        <X size={14} /> Reject
                      </button>
                      <button
                        onClick={() => handleApprove(req.id)}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center gap-1.5"
                      >
                        <Check size={14} /> Approve & Grant Access
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeSubTab === 'users_roles' ? (
        /* RBAC Matrix */
        <div className="bg-surface border border-line rounded-xl overflow-hidden p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-ink ">Role-Based Access Control (RBAC) Matrix</h2>
            <p className="text-xs text-mute">
              Configured operational privileges per tier. Strict sub-department boundary isolation prevents cross-domain visibility.
            </p>
          </div>

          <div className="overflow-x-auto border border-line rounded-lg">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-canvas text-mute border-b border-line text-[11px] font-semibold ">
                  <th className="p-3">Role Level</th>
                  <th className="p-3">View</th>
                  <th className="p-3">Create</th>
                  <th className="p-3">Edit</th>
                  <th className="p-3">Delete</th>
                  <th className="p-3">Approve</th>
                  <th className="p-3">Assign</th>
                  <th className="p-3">Export</th>
                  <th className="p-3">Manage Users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink-soft">
                <tr className="hover:bg-raised bg-amber-500/5">
                  <td className="p-3 font-sans font-bold text-amber-300 flex items-center gap-2">
                    <Shield size={14} /> IT Owner (Super Admin)
                  </td>
                  <td className="p-3 text-emerald-400">YES (All)</td>
                  <td className="p-3 text-emerald-400">YES (All)</td>
                  <td className="p-3 text-emerald-400">YES (All)</td>
                  <td className="p-3 text-emerald-400">YES (All)</td>
                  <td className="p-3 text-emerald-400">YES (Override)</td>
                  <td className="p-3 text-emerald-400">YES (All)</td>
                  <td className="p-3 text-emerald-400">YES (All)</td>
                  <td className="p-3 text-emerald-400">YES (Full)</td>
                </tr>
                <tr className="hover:bg-raised">
                  <td className="p-3 font-sans font-semibold text-cyan-300">Department Head</td>
                  <td className="p-3 text-emerald-400">YES (Cluster)</td>
                  <td className="p-3 text-emerald-400">YES</td>
                  <td className="p-3 text-emerald-400">YES</td>
                  <td className="p-3 text-faint">NO</td>
                  <td className="p-3 text-emerald-400">YES</td>
                  <td className="p-3 text-emerald-400">YES</td>
                  <td className="p-3 text-emerald-400">YES</td>
                  <td className="p-3 text-emerald-400">YES (Dept)</td>
                </tr>
                <tr className="hover:bg-raised">
                  <td className="p-3 font-sans font-semibold text-blue-300">Sub-Department Head</td>
                  <td className="p-3 text-emerald-400">YES (Sub-Dept)</td>
                  <td className="p-3 text-emerald-400">YES</td>
                  <td className="p-3 text-emerald-400">YES</td>
                  <td className="p-3 text-faint">NO</td>
                  <td className="p-3 text-emerald-400">YES (Sub-Dept)</td>
                  <td className="p-3 text-emerald-400">YES</td>
                  <td className="p-3 text-emerald-400">YES</td>
                  <td className="p-3 text-faint">NO</td>
                </tr>
                <tr className="hover:bg-raised">
                  <td className="p-3 font-sans font-medium text-ink-soft">Staff / Field Technician</td>
                  <td className="p-3 text-emerald-400">YES (Assigned)</td>
                  <td className="p-3 text-emerald-400">YES</td>
                  <td className="p-3 text-emerald-400">YES</td>
                  <td className="p-3 text-faint">NO</td>
                  <td className="p-3 text-faint">NO</td>
                  <td className="p-3 text-faint">NO</td>
                  <td className="p-3 text-faint">NO</td>
                  <td className="p-3 text-faint">NO</td>
                </tr>
                <tr className="hover:bg-raised">
                  <td className="p-3 font-sans font-normal text-faint">Volunteer / Unassigned</td>
                  <td className="p-3 text-mute">Read-Only</td>
                  <td className="p-3 text-faint">NO</td>
                  <td className="p-3 text-faint">NO</td>
                  <td className="p-3 text-faint">NO</td>
                  <td className="p-3 text-faint">NO</td>
                  <td className="p-3 text-faint">NO</td>
                  <td className="p-3 text-faint">NO</td>
                  <td className="p-3 text-faint">NO</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Users Table */
        <div className="bg-surface border border-line rounded-xl overflow-hidden">
          {/* Filter Bar */}
          <div className="p-3 border-b border-line bg-surface/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="flex items-center bg-canvas border border-line rounded-lg px-2.5 py-1.5 text-xs w-full">
                <Search size={14} className="text-faint mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Filter users by name, email, badge..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="bg-transparent text-ink outline-none w-full text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-mute">Sub-Dept:</span>
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="bg-canvas border border-line rounded-lg px-2.5 py-1 text-xs text-ink focus:outline-none"
              >
                <option value="all">All Departments</option>
                <option value="cctv">CCTV</option>
                <option value="wifi">WiFi / Network</option>
                <option value="walkie">Walkie-Talkie</option>
                <option value="control">Control Rooms</option>
                <option value="inventory">Inventory</option>
                <option value="purchase">Purchase</option>
                <option value="accommodation">Accommodation</option>
                <option value="sewadars">IT Sewadars</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-canvas/80 text-mute border-b border-line text-[11px] font-semibold ">
                  <th className="p-3 pl-4">User Identity</th>
                  <th className="p-3">Badge & Contact</th>
                  <th className="p-3">Assigned Sub-Department</th>
                  <th className="p-3">Role Tier</th>
                  <th className="p-3">Permissions Count</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60 text-ink-soft">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-raised/60 transition-colors">
                    <td className="p-3 pl-4">
                      <div className="flex items-center gap-3">
                        <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-lg object-cover border border-line-strong shrink-0" />
                        <div>
                          <div className="font-semibold text-ink">{u.name}</div>
                          <div className="text-[10px] text-faint">{u.designation}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-xs">
                      <div className="text-cyan-400">{u.badgeId}</div>
                      <div className="text-[10px] text-faint">{u.phone}</div>
                    </td>
                    <td className="p-3">
                      {u.subDepartmentId ? (
                        <span className=" text-[11px] text-ink bg-canvas border border-line px-2 py-0.5 rounded">
                          {DEPTS[u.subDepartmentId]}
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-400 italic">Global / Cross-dept</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px]  px-2 py-0.5 rounded border  ${
                        u.role === 'owner'
                          ? 'border-amber-500/30 text-amber-300 bg-amber-500/10'
                          : u.role === 'sub_dept_head'
                          ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10'
                          : 'border-line-strong text-ink-soft bg-raised'
                      }`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 tabular-nums text-mute">
                      {u.permissions.length} RBAC keys
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                        <span className="capitalize">{u.status}</span>
                      </span>
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <button
                        onClick={() => alert(`Viewing RBAC settings for ${u.name}`)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        Edit Privileges
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
