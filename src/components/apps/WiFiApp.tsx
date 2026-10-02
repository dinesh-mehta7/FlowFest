import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageIntro, Tabs } from '../ui';
import { WiFiAccessPoint } from '../../types';

export const WiFiApp: React.FC = () => {
  const { 
    wifiAPs, 
    toggleAPStatus, 
    setActiveApp, 
    canAccessApp,
    subAppActiveTab,
    setSubAppActiveTab 
  } = useApp();

  const currentTab = subAppActiveTab['wifi'] || 'Dashboard';
  const setCurrentTab = (t: string) => setSubAppActiveTab('wifi', t);

  const TABS = [
    'Dashboard', 
    'Access Points', 
    'Networks', 
    'Locations', 
    'Devices', 
    'Installation', 
    'Issues', 
    'Maintenance', 
    'Reports'
  ];

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const totalClients = wifiAPs.reduce((acc, ap) => acc + ap.connectedClients, 0);
  const totalBandwidth = wifiAPs.reduce((acc, ap) => acc + ap.bandwidthUsageMbps, 0);

  const filteredAPs = wifiAPs.filter((ap) => {
    const matchesSearch = ap.apCode.toLowerCase().includes(search.toLowerCase()) ||
      ap.model.toLowerCase().includes(search.toLowerCase()) ||
      ap.ipAddress.includes(search) ||
      ap.location.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ap.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-mute max-w-2xl">580 enterprise Wi-Fi 6 access points, fiber backhaul rings, captive portals, and real-time client density.</p>

        <div className="flex items-center gap-2 text-xs">
          <div className="bg-surface border border-line px-3 py-1.5 rounded-lg text-right">
            <div className="text-[10px] text-mute">Total Concurrent Clients</div>
            <div className="text-emerald-400 font-bold tabular-nums">{(totalClients * 42).toLocaleString()} Users</div>
          </div>
        </div>
      </div>

      <Tabs value={currentTab} onChange={t => setCurrentTab(t as any)} tabs={TABS.map(t => ({ id: t, label: t }))} />

      {/* TAB: DASHBOARD */}
      {currentTab === 'Dashboard' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-surface border border-line p-3.5 rounded-xl">
              <div className="text-[11px] text-mute">Total Access Points</div>
              <div className="text-2xl font-bold text-ink tabular-nums mt-1">580</div>
              <div className="text-[10px] text-faint mt-0.5">Cisco, Aruba & Ruckus</div>
            </div>

            <div className="bg-surface border border-line p-3.5 rounded-xl">
              <div className="text-[11px] text-mute">Operational & Online</div>
              <div className="text-2xl font-bold text-emerald-400 tabular-nums mt-1">564</div>
              <div className="text-[10px] text-faint mt-0.5">97.2% Network availability</div>
            </div>

            <div className="bg-surface border border-line p-3.5 rounded-xl border-l-2 border-l-amber-500">
              <div className="text-[11px] text-mute">High Latency / RF Noise</div>
              <div className="text-2xl font-bold text-amber-400 tabular-nums mt-1">11</div>
              <div className="text-[10px] text-faint mt-0.5">Pangat Hall & Transit Bays</div>
            </div>

            <div className="bg-surface border border-line p-3.5 rounded-xl border-l-2 border-l-red-500">
              <div className="text-[11px] text-mute">Offline / Dark Nodes</div>
              <div className="text-2xl font-bold text-red-400 tabular-nums mt-1">5</div>
              <div className="text-[10px] text-faint mt-0.5">Outdoor fiber cut check</div>
            </div>
          </div>

          {/* Network SSIDs Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface border border-line rounded-xl p-4">
              <h3 className="text-xs font-semibold text-ink mb-3 flex items-center justify-between">
                <span>Active Broadcast SSIDs</span>
                <span className="text-[10px] text-mute">802.11ax / WPA3</span>
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 bg-canvas border border-line rounded flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-ink">Event-Guest-HighSpeed</div>
                    <div className="text-[10px] text-faint">VLAN 10 · 20Mbps Bandwidth Throttle / User</div>
                  </div>
                  <span className=" text-cyan-400 font-semibold">38,200 Connected</span>
                </div>
                <div className="p-2.5 bg-canvas border border-line rounded flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-ink">IT-Ops-Secure</div>
                    <div className="text-[10px] text-faint">VLAN 20 · 802.1X Enterprise Certificate</div>
                  </div>
                  <span className=" text-emerald-400 font-semibold">1,450 Connected</span>
                </div>
                <div className="p-2.5 bg-canvas border border-line rounded flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-ink">VIP-Secretariat-Mesh</div>
                    <div className="text-[10px] text-faint">VLAN 30 · Dedicated 1Gbps Uplink Pipe</div>
                  </div>
                  <span className=" text-purple-400 font-semibold">320 Connected</span>
                </div>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-xl p-4">
              <h3 className="text-xs font-semibold text-ink mb-3">
                Core ISP Uplinks & Backhaul Rings
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-canvas border border-line rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-ink">Primary Leased Line (Bharti Airtel 10G)</span>
                    <span className=" text-emerald-400 text-xs">ACTIVE (6.8 Gbps Load)</span>
                  </div>
                  <div className="w-full bg-raised h-1.5 rounded-full overflow-hidden mt-1">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '68%' }} />
                  </div>
                </div>

                <div className="p-3 bg-canvas border border-line rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-ink">Secondary Redundant Leased Line (Tata Tele 10G)</span>
                    <span className=" text-cyan-400 text-xs">HOT STANDBY (0.4 Gbps)</span>
                  </div>
                  <div className="w-full bg-raised h-1.5 rounded-full overflow-hidden mt-1">
                    <div className="bg-cyan-500 h-full rounded-full" style={{ width: '12%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: ACCESS POINTS & OTHER VIEWS */}
      {(currentTab === 'Access Points' || currentTab === 'Networks' || currentTab === 'Locations' || currentTab === 'Devices' || currentTab === 'Installation' || currentTab === 'Issues' || currentTab === 'Maintenance' || currentTab === 'Reports') && (
        <div className="bg-surface border border-line rounded-xl overflow-hidden">
          <div className="p-3 border-b border-line bg-surface/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="flex items-center bg-canvas border border-line rounded-lg px-2.5 py-1.5 text-xs w-full">
                <Search size={14} className="text-faint mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search AP code, MAC, location, IP..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent text-ink outline-none w-full text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-mute">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-canvas border border-line rounded-lg px-2.5 py-1 text-xs text-ink"
              >
                <option value="all">All</option>
                <option value="online">Online</option>
                <option value="high_latency">High Latency</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-canvas/80 text-mute border-b border-line text-[11px] font-semibold ">
                  <th className="p-3 pl-4">AP Identifier</th>
                  <th className="p-3">Hardware Model</th>
                  <th className="p-3">Zone & Mounting</th>
                  <th className="p-3">IP / MAC Address</th>
                  <th className="p-3">Active Clients</th>
                  <th className="p-3">Switch Port</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60 text-ink-soft">
                {filteredAPs.map((ap) => (
                  <tr key={ap.id} className="hover:bg-raised/60 transition-colors">
                    <td className="p-3 pl-4 font-bold text-ink">
                      {ap.apCode}
                    </td>
                    <td className="p-3 text-mute">{ap.model}</td>
                    <td className="p-3">
                      <div className="font-semibold text-ink">{ap.zone}</div>
                      <div className="text-[10px] text-faint">{ap.location}</div>
                    </td>
                    <td className="p-3 text-[11px]">
                      <div className="text-cyan-400">{ap.ipAddress}</div>
                      <div className="text-[10px] text-faint">{ap.macAddress}</div>
                    </td>
                    <td className="p-3 ">
                      <span className="font-bold text-ink">{ap.connectedClients}</span> clients
                      <div className="text-[10px] text-faint">{ap.bandwidthUsageMbps} Mbps</div>
                    </td>
                    <td className="p-3 text-mute text-[11px]">{ap.switchPort}</td>
                    <td className="p-3">
                      <span className={`text-[10px]  px-2 py-0.5 rounded border  ${
                        ap.status === 'online'
                          ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/10'
                          : ap.status === 'offline'
                          ? 'border-red-500/20 text-red-400 bg-red-500/10'
                          : 'border-amber-500/20 text-amber-400 bg-amber-500/10'
                      }`}>
                        {ap.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <button
                        onClick={() => toggleAPStatus(ap.id, ap.status === 'online' ? 'high_latency' : 'online')}
                        className="px-2 py-1 rounded bg-raised hover:bg-line-strong text-xs text-ink-soft hover:text-ink"
                      >
                        {ap.status === 'online' ? 'Flag Interference' : 'Restore'}
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
