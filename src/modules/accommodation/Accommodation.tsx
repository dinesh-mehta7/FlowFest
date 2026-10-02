import React, { useEffect, useState } from 'react';
import { ArrowLeft, BedDouble, UtensilsCrossed } from 'lucide-react';
import { useWalkie, ToastContainer } from '../walkie';
import { ProfileMenu } from '../../components/ProfileMenu';
import { useAccommodation } from './AccommodationContext';
import { RoomsView } from './RoomsView';
import { MenuView } from './MenuView';
import { STATUS_STEPS } from './types';
import { nowMinutes, todayStr } from './dates';
import { pickLive, statusTone } from './live';
import { cx } from './ui';

type Page = 'rooms' | 'menu';

export const Accommodation: React.FC = () => {
  const w: any = useWalkie();
  const { isDark: dark, canManageRooms, canManageMenu, loadError, mealsOn } = useAccommodation();
  const [page, setPage] = useState<Page>('menu');

  // tick so the top-bar live chip follows the clock
  const [, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 30000); return () => clearInterval(t); }, []);
  const live = pickLive(mealsOn(todayStr()), nowMinutes());

  const nav: { id: Page; label: string; icon: any }[] = [
    { id: 'menu', label: 'Menu & Live', icon: UtensilsCrossed },
    { id: 'rooms', label: 'Rooms & Members', icon: BedDouble },
  ];
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const role = canManageRooms ? 'Owner · can edit rooms & menu' : canManageMenu ? 'Accommodation head · controls menu & live status' : 'View only';

  return (
    <div className={cx('flex h-screen', dark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900')}>
      <aside className={cx('hidden lg:flex w-60 shrink-0 flex-col border-r p-3', dark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200')}>
        <div className="px-3 py-3">
          <div className="font-bold text-lg leading-tight">Accommodation</div>
          <div className={cx('text-xs', muted)}>Rooms, members &amp; meals</div>
        </div>
        <nav className="mt-2 space-y-1" aria-label="Accommodation sections">
          {nav.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} aria-current={page === n.id ? 'page' : undefined}
              className={cx('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
                page === n.id ? 'bg-blue-600 text-white' : dark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')}>
              <n.icon className="w-4 h-4" />{n.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className={cx('shrink-0 border-b px-4 py-2.5 flex items-center justify-between gap-3', dark ? 'border-slate-800' : 'border-slate-200 bg-white')}>
          <div className="flex items-center gap-3 min-w-0">
            <a href="#/" className="lg:hidden p-1.5 -ml-1.5 rounded-lg" aria-label="Back to Command Center"><ArrowLeft className="w-4 h-4" /></a>
            <span className={cx('text-xs truncate', muted)}>{role}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {live && (
              <button onClick={() => setPage('menu')} className={cx('hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border', statusTone(live.status, dark))}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />{live.label} · {STATUS_STEPS.find(s => s.key === live.status)?.label}
              </button>
            )}
            <ProfileMenu />
          </div>
        </header>

        <nav className={cx('lg:hidden flex gap-1 px-3 py-2 border-b', dark ? 'border-slate-800' : 'border-slate-200 bg-white')} aria-label="Accommodation sections">
          {nav.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} aria-current={page === n.id ? 'page' : undefined}
              className={cx('flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold', page === n.id ? 'bg-blue-600 text-white' : muted)}>
              <n.icon className="w-3.5 h-3.5" />{n.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-5xl mx-auto">
            {loadError && <div role="alert" className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-500 text-sm p-3">Could not load Accommodation data: {loadError}</div>}
            {page === 'menu' ? <MenuView /> : <RoomsView />}
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
};
