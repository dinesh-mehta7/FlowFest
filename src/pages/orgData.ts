import type { SubDepartmentId } from '../types';
import { useEffect, useState } from 'react';

export interface Meeting { id: string; title: string; time: string; place: string; who: string; status: 'Live' | 'Upcoming' | 'Done'; }
export interface Emergency { id: string; title: string; place: string; time: string; calledBy: string; status: 'Active' | 'Resolved'; }

const M0: Meeting[] = [
  { id: 'm1', title: 'IT Command Review', time: '10:00 AM', place: 'Control Room A', who: 'IT Head + all sub-dept heads', status: 'Live' },
  { id: 'm2', title: 'Vendor call: Airtel leased line', time: '12:30 PM', place: 'Conference Bridge', who: 'WiFi, Purchase', status: 'Upcoming' },
  { id: 'm3', title: 'Security & CCTV coverage briefing', time: '04:00 PM', place: 'Admin Block', who: 'CCTV, Control Rooms', status: 'Upcoming' },
  { id: 'm4', title: 'Manpower shift handover', time: '07:30 AM', place: 'Camp Office', who: 'Manpower, Accommodation', status: 'Done' },
];
const E0: Emergency[] = [
  { id: 'e1', title: 'Zone 4 power loss: cameras and APs down', place: 'Sector D, Outer Ring', time: '09:42 AM', calledBy: 'CCTV Head', status: 'Active' },
];

export function useStore<T>(key: string, init: T): [T, (v: T) => void] {
  const [v, set] = useState<T>(() => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; } catch { return init; } });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, set];
}
export const useMeetings = () => useStore<Meeting[]>('eitc_meetings', M0);
export const useEmergencies = () => useStore<Emergency[]>('eitc_emergencies', E0);
export const inr = (n: number) => '₹' + new Intl.NumberFormat('en-IN').format(n);

export const DEPTS: Record<SubDepartmentId, string> = {
  cctv: 'CCTV', wifi: 'WiFi', walkie: 'Walkie-Talkie', control: 'Control Rooms',
  inventory: 'Inventory', purchase: 'Purchase', accommodation: 'Accommodation', sewadars: 'Manpower',
};
