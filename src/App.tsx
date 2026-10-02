import React, { useEffect, useState } from 'react';
import { Menu, LayoutDashboard, CalendarClock, Wallet, Users, BarChart3, Video, Wifi, Radio, Monitor, Boxes, ShoppingCart, BedDouble, HeartHandshake, LifeBuoy, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import type { UserProfile } from './types';
import { DEPTS } from './pages/orgData';
import { WalkieProvider, useWalkie, Walkie, LoginView, SignupView, ForgotPasswordView, ResetPasswordView, PendingApprovalView } from './modules/walkie';
import { Home } from './pages/Home';
import { ProfileMenu } from './components/ProfileMenu';
import { MeetingsEmergency, FinanceDesk, OtherDept } from './pages/Pages';
import { UserManagementView } from './components/owner/UserManagementView';
import { ReportsView } from './components/owner/ReportsView';
import { CCTVApp } from './components/apps/CCTVApp';
import { WiFiApp } from './components/apps/WiFiApp';
import { ControlRoomsApp } from './components/apps/ControlRoomsApp';
import { InventoryApp, InventoryProvider } from './modules/inventory';
import { PurchaseApp, PurchaseProvider } from './modules/purchase';
import { Accommodation, AccommodationProvider, LiveMealChip } from './modules/accommodation';
import { ManpowerApp, ManpowerProvider } from './modules/manpower';
import { MeetingsProvider } from './context/MeetingsContext';

const APP_VIEWS: Record<string, [React.ComponentType, any]> = {
  cctv: [CCTVApp, Video], wifi: [WiFiApp, Wifi], walkie: [Walkie as any, Radio], control: [ControlRoomsApp, Monitor],
  inventory: [InventoryApp, Boxes], purchase: [PurchaseApp as any, ShoppingCart], accommodation: [Accommodation, BedDouble], sewadars: [ManpowerApp, HeartHandshake],
};
// Organization pages. `roles` decides who can open a page; anyone else is sent to their own home.
// Meetings + Emergency and Payments + Approvals + Audit log are one page each (the tab is the second part of the address).
interface OrgPage { label: string; icon: any; roles: string[]; render: (tab?: string) => React.ReactNode }
const ORG_PAGES: Record<string, OrgPage> = {
  '': { label: 'Dashboard', icon: LayoutDashboard, roles: ['owner'], render: () => <Home /> },
  overview: { label: 'Overview', icon: LayoutDashboard, roles: ['dept_head'], render: () => <Home /> },
  meetings: { label: 'Meetings & Emergency', icon: CalendarClock, roles: ['owner', 'dept_head'], render: t => <MeetingsEmergency tab={t} /> },
  payments: { label: 'Payments & Approvals', icon: Wallet, roles: ['owner', 'dept_head'], render: t => <FinanceDesk tab={t} /> },
  users: { label: 'Users & Access', icon: Users, roles: ['owner', 'dept_head'], render: () => <UserManagementView initialTab="users_all" /> },
  reports: { label: 'Reports', icon: BarChart3, roles: ['owner', 'dept_head'], render: () => <ReportsView /> },
};
// Old addresses still work: they open the tab that replaced them.
const ALIASES: Record<string, string> = { emergency: 'meetings/emergency', approvals: 'payments/approvals', audit: 'payments/audit' };

const useRoute = () => {
  const get = () => location.hash.replace(/^#\/?/, '');
  const [r, setR] = useState(get);
  useEffect(() => { const f = () => setR(get()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return r;
};

// Where does this person belong, and is the address they asked for allowed? Pure function: easy to reason about.
//   Organization Head -> Dashboard (the only one who sees it)     IT Department Head -> Overview
//   Sub-department head / staff -> straight into their own department     Volunteer -> IT Support
const resolveRoute = (route: string, role: string, own: string[], apps: string[]) => {
  const [s0, s1] = route.split('/');
  const [seg, tab] = (ALIASES[s0] ?? (s1 ? `${s0}/${s1}` : s0)).split('/');
  const home = role === 'owner' ? '' : role === 'dept_head' ? 'overview' : (role === 'volunteer' || !own.length) ? 'support' : own[0];
  const allowed = (seg in ORG_PAGES && ORG_PAGES[seg].roles.includes(role)) || (seg in APP_VIEWS && apps.includes(seg)) || (seg === 'support' && home === 'support') || seg === 'meetings';
  const key = allowed ? seg : home;
  return { key, tab: allowed ? tab : undefined, home, canonical: allowed && tab ? `${key}/${tab}` : key };
};

// One theme for the whole app. The setting lives in the Walkie settings (so it is saved and shared with
// Walkie / Accommodation) and is mirrored onto <html class="dark"> so every screen follows it.
const useTheme = () => {
  const w: any = useWalkie();
  const isDark = w.settings?.theme === 'dark';
  useEffect(() => { document.documentElement.classList.toggle('dark', isDark); }, [isDark]);
  const toggle = () => w.setSettings?.((p: any) => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }));
  return { isDark, toggle };
};

const Shell: React.FC<{ out: () => void }> = ({ out }) => {
  const { currentUser: u, canAccessApp } = useApp();
  const { isDark } = useTheme();
  const route = useRoute();
  const [open, setOpen] = useState(false); // mobile drawer
  const [folded, setFolded] = useState(() => { try { return localStorage.getItem('eitc_sidebar_folded') === '1'; } catch { return false; } });
  const toggleFold = () => setFolded(f => { try { localStorage.setItem('eitc_sidebar_folded', f ? '0' : '1'); } catch {} return !f; });

  const own = Object.keys(APP_VIEWS).filter(k => canAccessApp(k as any));
  // Everyone signed in can at least VIEW Accommodation (rooms + live menu); editing is limited by role.
  const apps = own.includes('accommodation') ? own : [...own, 'accommodation'];
  const { key, tab, home, canonical } = resolveRoute(route, u.role, own, apps);
  // Wrong or forbidden address (e.g. a staff member typing #/): replace it, so Back never returns to it.
  useEffect(() => { if (route !== canonical) location.replace('#/' + canonical); }, [route, canonical]);

  const orgKeys = Object.keys(ORG_PAGES).filter(k => ORG_PAGES[k].roles.includes(u.role));
  const chip = <LiveMealChip dark={isDark} />; // handed to the department apps' own headers (Meetings + bell come from ProfileMenu)
  if (key === 'accommodation') return <Accommodation />;
  if (key === 'inventory') return <InventoryApp headerExtra={chip} />; // own sidebar layout, like Walkie
  if (key === 'purchase') return <PurchaseApp headerExtra={chip} />;
  if (key === 'walkie') return <Walkie headerExtra={chip} />; // Command Center + Sign out live in its profile dropdown
  const view = key === 'support' ? <OtherDept /> : key in APP_VIEWS ? React.createElement(APP_VIEWS[key][0]) : ORG_PAGES[key].render(tab);
  const title = key === 'support' ? 'IT Support' : key in APP_VIEWS ? DEPTS[key as keyof typeof DEPTS] : ORG_PAGES[key].label;

  // Labels hide when the desktop sidebar is folded (the mobile drawer is always full width).
  const hide = folded ? 'md:hidden' : '';
  const Item = ({ id, label, Icon }: { id: string; label: string; Icon: any }) => (
    <a href={'#/' + id} onClick={() => setOpen(false)} title={folded ? label : undefined} aria-label={label} aria-current={key === id ? 'page' : undefined}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${folded ? 'md:justify-center md:px-0' : ''} ${key === id ? 'bg-violet-500/15 text-violet-300 font-semibold' : 'text-mute hover:bg-raised hover:text-ink'}`}>
      <Icon size={17} className="shrink-0" /><span className={`truncate ${hide}`}>{label}</span></a>
  );
  const Label = ({ t }: { t: string }) => folded
    ? <div className="hidden md:block mx-3 my-3 border-t border-line" />
    : <div className="px-3 pt-5 pb-1 text-xs font-medium text-faint">{t}</div>;
  const orgLabel = u.role === 'owner' ? 'Organization' : 'IT Department';
  const showSupport = u.role === 'volunteer' || home === 'support';
  const hasNav = orgKeys.length > 0 || showSupport; // department staff go straight to their app: nothing to list
  return (
    <div className="flex h-screen bg-canvas text-ink">
      {hasNav && open && <div className="md:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setOpen(false)} />}
      {hasNav && <aside className={`${open ? 'flex' : 'hidden'} md:flex fixed md:static inset-y-0 left-0 z-40 w-60 ${folded ? 'md:w-[68px]' : 'md:w-60'} shrink-0 flex-col border-r border-line bg-surface p-3 transition-[width] duration-200`}>
        <div className={`flex items-center gap-2 pb-2 ${folded ? 'md:flex-col md:gap-2' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 min-w-0 px-1">
            <a href="#/" title="Owner Dashboard" aria-label="Owner Dashboard"
              className="grid place-items-center w-8 h-8 rounded-lg gradient-brand text-white text-xs font-bold shrink-0 hover:opacity-90 transition-opacity shadow-glow-sm">
              EC
            </a>
            <span className={`font-semibold text-ink truncate ${hide}`}>Event Command</span>
          </div>
          <button onClick={toggleFold} className="hidden md:grid place-items-center w-8 h-8 rounded-lg text-mute hover:bg-raised hover:text-ink" aria-label={folded ? 'Expand sidebar' : 'Collapse sidebar'} title={folded ? 'Expand sidebar' : 'Collapse sidebar'}>
            {folded ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto overflow-x-hidden" aria-label="Main">
          {orgKeys.length > 0 && <><Label t={orgLabel} />{orgKeys.map(k => <Item key={k} id={k} label={ORG_PAGES[k].label} Icon={ORG_PAGES[k].icon} />)}</>}
          {showSupport && <><Label t="Help" /><Item id="support" label="IT Support" Icon={LifeBuoy} /></>}
        </nav>
      </aside>}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 flex items-center justify-between gap-3 px-4 border-b border-line bg-surface">
          <div className="flex items-center gap-3 min-w-0">
            {hasNav && <button className="md:hidden p-2 -ml-2 rounded-lg text-mute hover:bg-raised" onClick={() => setOpen(!open)} aria-label="Open menu"><Menu size={18} /></button>}
            {!hasNav && key === 'meetings' && <a href={'#/' + home} className="text-sm text-violet-400 hover:underline shrink-0">← Back</a>}
            <h1 className="text-base font-semibold text-ink truncate">{title}</h1>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="hidden sm:block mr-1"><LiveMealChip dark={isDark} /></span>
            <ProfileMenu />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6"><div className="max-w-6xl mx-auto">{view}</div></main>
      </div>
    </div>
  );
};

const LABEL: Record<string, string> = { owner: 'Organization Head', dept_head: 'IT Department Head', sub_dept_head: 'Sub-department Head', staff: 'Staff', other: 'Other Department' };
const toProfile = (w: any): UserProfile => ({
  id: w.id, name: w.name || w.email, email: w.email, phone: '', departmentName: 'IT Department', designation: LABEL[w.level] || LABEL.other,
  role: ({ owner: 'owner', dept_head: 'dept_head', sub_dept_head: 'sub_dept_head', staff: 'staff' } as any)[w.level] || 'volunteer',
  subDepartmentId: w.subDepartment || undefined, avatar: String(w.name || 'U').slice(0, 2).toUpperCase(), badgeId: String(w.id).slice(0, 6),
  permissions: ['view', 'create', 'edit', 'approve', 'assign', 'export'], status: 'active', lastActive: 'Now',
});
const Loader = () => <div className="min-h-screen flex items-center justify-center text-sm text-faint">Loading…</div>;

// One login for everything: Supabase auth (RadioGate screens). Its profile decides the hierarchy level.
const Gate: React.FC = () => {
  const w: any = useWalkie();
  useEffect(() => { document.documentElement.classList.toggle('dark', w.settings?.theme === 'dark'); }, [w.settings?.theme]); const { setCurrentUser } = useApp(); const [ready, setReady] = useState(false);
  const wu = w.currentUser;
  useEffect(() => { if (wu && wu.approved) { setCurrentUser(toProfile(wu)); setReady(true); } else setReady(false); }, [wu]); // eslint-disable-line
  if (!w.authChecked) return <Loader />;
  if (w.authView === 'reset') return <ResetPasswordView />;
  if (!wu) return w.authView === 'signup' ? <SignupView /> : w.authView === 'forgot' ? <ForgotPasswordView /> : <LoginView />;
  if (!wu.approved) return <PendingApprovalView />;
  return ready ? <Shell out={w.logout} /> : <Loader />;
};
export default function App() { return <WalkieProvider><MeetingsProvider><AppProvider><AccommodationProvider><ManpowerProvider><InventoryProvider><PurchaseProvider><Gate /></PurchaseProvider></InventoryProvider></ManpowerProvider></AccommodationProvider></AppProvider></MeetingsProvider></WalkieProvider>; }
