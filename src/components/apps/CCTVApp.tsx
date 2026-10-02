import React, { useState } from 'react';
import { Video, Plus, Eye, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageIntro, Tabs } from '../ui';
import { CameraItem } from '../../types';

export const CCTVApp: React.FC = () => {
  const { 
    cameras, 
    toggleCameraStatus, 
    addCamera, 
    setActiveApp, 
    canAccessApp,
    subAppActiveTab,
    setSubAppActiveTab,
    currentUser
  } = useApp();

  const currentTab = subAppActiveTab['cctv'] || 'Dashboard';
  const setCurrentTab = (t: string) => setSubAppActiveTab('cctv', t);

  const TABS = [
    'Dashboard', 
    'Cameras', 
    'Locations', 
    'Control Rooms', 
    'Installation', 
    'Maintenance', 
    'Incidents', 
    'Reports'
  ];

  const [search, setSearch] = useState('');
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isAddCameraModalOpen, setIsAddCameraModalOpen] = useState(false);
  const [selectedFeedCamera, setSelectedFeedCamera] = useState<CameraItem | null>(null);

  // New camera form state
  const [newCamCode, setNewCamCode] = useState('');
  const [newCamName, setNewCamName] = useState('');
  const [newCamZone, setNewCamZone] = useState('Sector A - Main Diwan');
  const [newCamLocation, setNewCamLocation] = useState('');
  const [newCamType, setNewCamType] = useState<CameraItem['type']>('PTZ 4K');
  const [newCamIP, setNewCamIP] = useState('');

  const onlineCount = cameras.filter(c => c.status === 'online').length;
  const offlineCount = cameras.filter(c => c.status === 'offline').length;
  const maintCount = cameras.filter(c => c.status === 'maintenance').length;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCamCode || !newCamName || !newCamIP) return;
    addCamera({
      cameraCode: newCamCode,
      name: newCamName,
      zone: newCamZone,
      locationDetails: newCamLocation || 'Mount Pole',
      type: newCamType,
      ipAddress: newCamIP,
      controlRoomId: 'CR-MAIN',
      status: 'online',
      lastPing: 'Just now',
      storageDays: 30,
    });
    setIsAddCameraModalOpen(false);
    setNewCamCode('');
    setNewCamName('');
    setNewCamIP('');
    setNewCamLocation('');
  };

  const filteredCameras = cameras.filter(c => {
    const matchesSearch = c.cameraCode.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.ipAddress.includes(search) ||
      c.locationDetails.toLowerCase().includes(search.toLowerCase());

    const matchesZone = selectedZone === 'all' || c.zone === selectedZone;
    const matchesStatus = selectedStatus === 'all' || c.status === selectedStatus;
    return matchesSearch && matchesZone && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Top Application Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-mute max-w-2xl">Real-time IP camera streams, perimeter blindspot surveillance, NVR failover storage, and security incidents.</p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddCameraModalOpen(true)}
            className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs text-white font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus size={14} /> Register Camera IP
          </button>
        </div>
      </div>

      <Tabs value={currentTab} onChange={t => setCurrentTab(t as any)} tabs={TABS.map(t => ({ id: t, label: t }))} />

      {/* TAB: DASHBOARD */}
      {currentTab === 'Dashboard' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-surface border border-line p-3.5 rounded-xl">
              <div className="text-[11px] text-mute">Total Cameras Deployed</div>
              <div className="text-2xl font-bold text-ink tabular-nums mt-1">1,480</div>
              <div className="text-[10px] text-faint mt-0.5">8 Event Sectors Covered</div>
            </div>

            <div className="bg-surface border border-line p-3.5 rounded-xl">
              <div className="text-[11px] text-mute">Active Live Feeds</div>
              <div className="text-2xl font-bold text-emerald-400 tabular-nums mt-1">1,412</div>
              <div className="text-[10px] text-faint mt-0.5">95.4% Optical Uptime</div>
            </div>

            <div className="bg-surface border border-line p-3.5 rounded-xl border-l-2 border-l-red-500">
              <div className="text-[11px] text-mute">Dark / Offline</div>
              <div className="text-2xl font-bold text-red-400 tabular-nums mt-1">48</div>
              <div className="text-[10px] text-faint mt-0.5">Technicians in transit</div>
            </div>

            <div className="bg-surface border border-line p-3.5 rounded-xl border-l-2 border-l-amber-500">
              <div className="text-[11px] text-mute">Under Maintenance</div>
              <div className="text-2xl font-bold text-amber-400 tabular-nums mt-1">20</div>
              <div className="text-[10px] text-faint mt-0.5">Lens cleaning & alignment</div>
            </div>
          </div>

          {/* Quick Matrix Feed Simulation */}
          <div className="bg-surface border border-line rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-ink flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Video Wall Matrix Sample (CR-01 Central Command)
              </h3>
              <span className="text-[11px] text-mute">H.265 / 30 FPS / RTSP Stream</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {cameras.slice(0, 4).map((c) => (
                <div 
                  key={c.id} 
                  onClick={() => setSelectedFeedCamera(c)}
                  className="bg-canvas border border-line rounded-lg p-2.5 hover:border-cyan-500/50 cursor-pointer group transition-all"
                >
                  <div className="aspect-video bg-surface rounded relative overflow-hidden flex items-center justify-center border border-line/80 mb-2">
                    <Video size={24} className="text-slate-700 group-hover:text-cyan-400 transition-colors" />
                    <div className="absolute top-1.5 left-1.5 flex items-center gap-1.5 bg-black/60 px-1.5 py-0.5 rounded text-[9px] text-ink">
                      <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'online' ? 'bg-emerald-400' : 'bg-red-500'}`} />
                      <span>{c.cameraCode}</span>
                    </div>
                    <div className="absolute bottom-1.5 right-1.5 bg-black/60 px-1.5 py-0.5 rounded text-[9px] text-mute">
                      REC · 24H
                    </div>
                  </div>
                  <div className="text-xs font-medium text-ink truncate">{c.name}</div>
                  <div className="text-[10px] text-faint flex items-center justify-between mt-1">
                    <span>{c.ipAddress}</span>
                    <span className={c.status === 'online' ? 'text-emerald-400' : 'text-red-400'}>
                      <span className="capitalize">{c.status}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: CAMERAS TABLE */}
      {currentTab === 'Cameras' && (
        <div className="bg-surface border border-line rounded-xl overflow-hidden">
          <div className="p-3 border-b border-line bg-surface/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="flex items-center bg-canvas border border-line rounded-lg px-2.5 py-1.5 text-xs w-full">
                <Search size={14} className="text-faint mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search code, IP, location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent text-ink outline-none w-full text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-mute">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-canvas border border-line rounded-lg px-2 py-1 text-xs text-ink"
              >
                <option value="all">All</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-canvas/80 text-mute border-b border-line text-[11px] font-semibold ">
                  <th className="p-3 pl-4">Camera ID</th>
                  <th className="p-3">Designation / Placement</th>
                  <th className="p-3">Zone</th>
                  <th className="p-3">Optics Type</th>
                  <th className="p-3">Static IP Address</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60 text-ink-soft">
                {filteredCameras.map((c) => (
                  <tr key={c.id} className="hover:bg-raised/60 transition-colors">
                    <td className="p-3 pl-4 font-bold text-ink">
                      {c.cameraCode}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-ink">{c.name}</div>
                      <div className="text-[10px] text-faint">{c.locationDetails}</div>
                    </td>
                    <td className="p-3 text-ink-soft">{c.zone}</td>
                    <td className="p-3 text-cyan-400 text-[11px]">{c.type}</td>
                    <td className="p-3 text-xs">{c.ipAddress}</td>
                    <td className="p-3">
                      <span className={`text-[10px]  px-2 py-0.5 rounded border  ${
                        c.status === 'online'
                          ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/10'
                          : c.status === 'offline'
                          ? 'border-red-500/20 text-red-400 bg-red-500/10'
                          : 'border-amber-500/20 text-amber-400 bg-amber-500/10'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedFeedCamera(c)}
                          className="px-2 py-1 rounded bg-raised hover:bg-line-strong text-ink hover:text-ink transition-colors"
                          title="View Live Stream"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          onClick={() => toggleCameraStatus(c.id, c.status === 'online' ? 'offline' : 'online')}
                          className={`px-2 py-1 rounded text-[11px]  transition-colors ${
                            c.status === 'online'
                              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {c.status === 'online' ? 'Simulate Fault' : 'Restore Online'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* OTHER TABS: LOCATIONS, CONTROL ROOMS, INSTALLATION, MAINTENANCE, INCIDENTS, REPORTS */}
      {(currentTab === 'Locations' || currentTab === 'Control Rooms' || currentTab === 'Installation' || currentTab === 'Maintenance' || currentTab === 'Incidents' || currentTab === 'Reports') && (
        <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h3 className="text-sm font-bold text-ink ">CCTV: {currentTab}</h3>
              <p className="text-xs text-mute">Sector deployment and real-time maintenance audit logs.</p>
            </div>
            <span className="text-xs text-cyan-400 bg-cyan-950 border border-cyan-800 px-2 py-1 rounded">
              SECTOR 1-8 MONITORED
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-canvas p-3 rounded-lg border border-line">
              <div className="text-[11px] text-mute">Sector A (Main Diwan)</div>
              <div className="text-base font-bold text-emerald-400 mt-1">420 Cameras (100% Online)</div>
            </div>
            <div className="bg-canvas p-3 rounded-lg border border-line">
              <div className="text-[11px] text-mute">Sector B (Mega Langar)</div>
              <div className="text-base font-bold text-emerald-400 mt-1">310 Cameras (99.2% Online)</div>
            </div>
            <div className="bg-canvas p-3 rounded-lg border border-line border-l-2 border-l-amber-500">
              <div className="text-[11px] text-mute">Sector D (Perimeter Gates)</div>
              <div className="text-base font-bold text-amber-400 mt-1">180 Cameras (1 Offline)</div>
            </div>
          </div>
        </div>
      )}

      {/* FEED PREVIEW MODAL */}
      {selectedFeedCamera && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-line w-full max-w-2xl rounded-xl shadow-2xl p-5 relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-3 border-b border-line pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className=" text-xs font-bold text-ink">{selectedFeedCamera.cameraCode}</span>
                <span className="text-mute text-xs">· {selectedFeedCamera.name}</span>
              </div>
              <button 
                onClick={() => setSelectedFeedCamera(null)}
                className="text-xs text-mute hover:text-ink"
              >
                Close ✕
              </button>
            </div>

            <div className="aspect-video bg-black rounded-lg relative overflow-hidden flex items-center justify-center border border-line">
              {/* Simulated camera feed with grid overlay */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="text-center space-y-2 relative z-10">
                <Video size={48} className="text-cyan-400/80 mx-auto" />
                <div className="text-xs text-cyan-300">LIVE OPTICAL STREAM · RTSP://{selectedFeedCamera.ipAddress}:554/h265</div>
                <div className="text-[10px] text-faint">FRAME TIME: 2026-10-01 10:45:12.894 UTC</div>
              </div>

              <div className="absolute bottom-3 left-3 bg-black/70 px-2 py-1 rounded text-[10px] text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>BITRATE: 4.8 Mbps · 3840x2160 @ 30fps</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-mute ">
              <span>Location: {selectedFeedCamera.locationDetails} ({selectedFeedCamera.zone})</span>
              <span>NVR Node: {selectedFeedCamera.controlRoomId}</span>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER CAMERA MODAL */}
      {isAddCameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-line w-full max-w-md rounded-xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-semibold text-ink mb-1">Enroll New CCTV Camera</h3>
            <p className="text-xs text-mute mb-4">Assign IP address, optical model, and physical pole location.</p>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">Camera Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CAM-Z1-050"
                    value={newCamCode}
                    onChange={(e) => setNewCamCode(e.target.value)}
                    className="w-full bg-canvas border border-line rounded-lg p-2.5 text-xs text-ink "
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">Static IP Address</label>
                  <input
                    type="text"
                    required
                    placeholder="10.10.1.50"
                    value={newCamIP}
                    onChange={(e) => setNewCamIP(e.target.value)}
                    className="w-full bg-canvas border border-line rounded-lg p-2.5 text-xs text-ink "
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">Name / Placement Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwan Hall South Emergency Exit"
                  value={newCamName}
                  onChange={(e) => setNewCamName(e.target.value)}
                  className="w-full bg-canvas border border-line rounded-lg p-2.5 text-xs text-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">Sector Zone</label>
                  <select
                    value={newCamZone}
                    onChange={(e) => setNewCamZone(e.target.value)}
                    className="w-full bg-canvas border border-line rounded-lg p-2.5 text-xs text-ink"
                  >
                    <option value="Sector A - Main Diwan">Sector A - Main Diwan</option>
                    <option value="Sector B - Mega Langar">Sector B - Mega Langar</option>
                    <option value="Sector C - Parking Lots">Sector C - Parking Lots</option>
                    <option value="Sector D - Perimeter Gates">Sector D - Perimeter Gates</option>
                    <option value="Sector E - Medical & Emergency">Sector E - Medical & Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">Optics Type</label>
                  <select
                    value={newCamType}
                    onChange={(e) => setNewCamType(e.target.value as any)}
                    className="w-full bg-canvas border border-line rounded-lg p-2.5 text-xs text-ink"
                  >
                    <option value="PTZ 4K">PTZ 4K</option>
                    <option value="Fixed Bullet">Fixed Bullet</option>
                    <option value="Dome 360">Dome 360</option>
                    <option value="Thermal Perimeter">Thermal Perimeter</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCameraModalOpen(false)}
                  className="px-4 py-2 bg-raised text-ink-soft rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold"
                >
                  Save Camera
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
