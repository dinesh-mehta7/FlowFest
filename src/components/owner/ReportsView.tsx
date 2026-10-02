import React, { useState } from 'react';
import { Download, Printer, BarChart3 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ReportsView: React.FC = () => {
  const { 
    cameras, 
    wifiAPs, 
    walkies, 
    sewadars, 
    inventoryItems, 
    finance 
  } = useApp();

  const [selectedReportType, setSelectedReportType] = useState('executive_summary');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownload = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);
  };

  return (
    <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-mute max-w-2xl">Exportable operational metrics, vendor performance SLAs, inventory valuation, and manpower deployment.</p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-surface hover:bg-raised border border-line rounded-lg text-xs text-ink-soft hover:text-ink flex items-center gap-1.5 transition-colors"
          >
            <Printer size={14} /> Print
          </button>
          <button
            onClick={handleDownload}
            className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs text-white font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download size={14} /> {downloadSuccess ? 'Downloaded CSV' : 'Export Full Report (CSV)'}
          </button>
        </div>
      </div>

      {/* KPI Highlights Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface border border-line p-3.5 rounded-xl">
          <div className="text-[11px] text-mute">Overall Infrastructure SLA</div>
          <div className="text-2xl font-bold text-emerald-400 tabular-nums mt-1">99.82%</div>
          <div className="text-[10px] text-faint mt-0.5">Target: 99.5% minimum</div>
        </div>

        <div className="bg-surface border border-line p-3.5 rounded-xl">
          <div className="text-[11px] text-mute">Total Fleet Deployed</div>
          <div className="text-2xl font-bold text-ink tabular-nums mt-1">5,260</div>
          <div className="text-[10px] text-faint mt-0.5">Radios, APs, CCTV & Switches</div>
        </div>

        <div className="bg-surface border border-line p-3.5 rounded-xl">
          <div className="text-[11px] text-mute">Budget Spent / Committed</div>
          <div className="text-2xl font-bold text-cyan-400 tabular-nums mt-1">
            ₹{((finance.outgoing + finance.pending) / 100000).toFixed(1)}L
          </div>
          <div className="text-[10px] text-faint mt-0.5">Out of ₹250.0L allocated</div>
        </div>

        <div className="bg-surface border border-line p-3.5 rounded-xl">
          <div className="text-[11px] text-mute">Manpower Attendance</div>
          <div className="text-2xl font-bold text-purple-400 tabular-nums mt-1">92.4%</div>
          <div className="text-[10px] text-faint mt-0.5">875 Active on Duty today</div>
        </div>
      </div>

      {/* Sub-Department Operational Audit Breakdown */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="p-4 border-b border-line bg-surface/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-cyan-400" />
            <h2 className="text-sm font-bold text-ink ">
              Sub-Department Readiness & Uptime Metrics
            </h2>
          </div>
          <span className="text-xs text-mute">Live Telemetry Snapshot</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-canvas/80 text-mute border-b border-line text-[11px] font-semibold ">
                <th className="p-3 pl-4">Sub-Department</th>
                <th className="p-3">Fleet Size</th>
                <th className="p-3">Active %</th>
                <th className="p-3">Offline / Flags</th>
                <th className="p-3">Open Tickets</th>
                <th className="p-3 pr-4 text-right">Readiness Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 text-ink-soft">
              <tr className="hover:bg-raised/50">
                <td className="p-3 pl-4 font-sans font-semibold text-ink">CCTV Surveillance</td>
                <td className="p-3">1,480 Units</td>
                <td className="p-3 text-emerald-400">95.4%</td>
                <td className="p-3 text-red-400">12 Cameras</td>
                <td className="p-3">4 Maintenance</td>
                <td className="p-3 pr-4 text-right text-emerald-400 font-bold">98 / 100</td>
              </tr>
              <tr className="hover:bg-raised/50">
                <td className="p-3 pl-4 font-sans font-semibold text-ink">WiFi & Enterprise Network</td>
                <td className="p-3">580 APs</td>
                <td className="p-3 text-emerald-400">97.2%</td>
                <td className="p-3 text-amber-400">8 High Latency</td>
                <td className="p-3">2 Cable Splices</td>
                <td className="p-3 pr-4 text-right text-emerald-400 font-bold">96 / 100</td>
              </tr>
              <tr className="hover:bg-raised/50">
                <td className="p-3 pl-4 font-sans font-semibold text-ink">Walkie-Talkie Fleet</td>
                <td className="p-3">3,200 Radios</td>
                <td className="p-3 text-emerald-400">92.1%</td>
                <td className="p-3 text-amber-400">45 Batt Issues</td>
                <td className="p-3">14 Overdue Ret.</td>
                <td className="p-3 pr-4 text-right text-emerald-400 font-bold">94 / 100</td>
              </tr>
              <tr className="hover:bg-raised/50">
                <td className="p-3 pl-4 font-sans font-semibold text-ink">Control Rooms & Video Walls</td>
                <td className="p-3">14 Rooms</td>
                <td className="p-3 text-emerald-400">100.0%</td>
                <td className="p-3 text-faint">None</td>
                <td className="p-3">1 HDMI Matrix</td>
                <td className="p-3 pr-4 text-right text-emerald-400 font-bold">99 / 100</td>
              </tr>
              <tr className="hover:bg-raised/50">
                <td className="p-3 pl-4 font-sans font-semibold text-ink">IT Inventory & Warehouses</td>
                <td className="p-3">6,240 SKUs</td>
                <td className="p-3 text-emerald-400">89.0%</td>
                <td className="p-3 text-amber-400">2 Low Stock</td>
                <td className="p-3">3 RMAs</td>
                <td className="p-3 pr-4 text-right text-emerald-400 font-bold">95 / 100</td>
              </tr>
              <tr className="hover:bg-raised/50">
                <td className="p-3 pl-4 font-sans font-semibold text-ink">IT Sewadar Manpower Bureau</td>
                <td className="p-3">960 Volunteers</td>
                <td className="p-3 text-emerald-400">92.4%</td>
                <td className="p-3 text-mute">20 Unassigned</td>
                <td className="p-3">5 Shift Swaps</td>
                <td className="p-3 pr-4 text-right text-emerald-400 font-bold">97 / 100</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
