import React, { useEffect, useState } from 'react';
import { CalendarClock, Siren, Video, MapPin, Users, X, ExternalLink } from 'lucide-react';
import { useMeetings } from '../context/MeetingsContext';
import type { MeetingRow, MeetingMode } from '../context/MeetingsContext';
import { useApp as useWalkie } from '../modules/walkie/context/AppContext';
import { DEPTS } from '../pages/orgData';
import { Tabs } from './ui';
import type { SubDepartmentId } from '../types';

const input = 'bg-field border border-line-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-faint w-full outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20';
const btnP = 'px-4 py-2 rounded-lg text-sm font-medium bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white whitespace-nowrap transition-colors';
const btnD = 'px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white whitespace-nowrap transition-colors';
const link = 'text-xs font-medium text-cyan-300 hover:underline whitespace-nowrap';
const pill = (c: string, t: string) => <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${c}`}>{t}</span>;

const DEPT_IDS = Object.keys(DEPTS) as SubDepartmentId[];
const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const nextHour = () => { const d = new Date(Date.now() + 3600000); d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0); return localInput(d); };
// Only http(s) links are clickable; anything else (javascript:, free text with spaces) is shown as plain text.
const safeHref = (l: string) => { const t = l.trim(); if (!t || /\s/.test(t)) return ''; if (/^https?:\/\//i.test(t)) return t; if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return ''; return 'https://' + t; };
const audience = (m: MeetingRow) => m.audienceAll ? 'Everyone' : m.audienceDepts.map(d => DEPTS[d] || d).join(', ');

const STATUS: Record<string, [string, string]> = {
  scheduled: ['Upcoming', 'bg-cyan-500/15 text-cyan-300'], live: ['Live', 'bg-emerald-500/15 text-emerald-300'],
  done: ['Done', 'bg-raised text-mute'], cancelled: ['Cancelled', 'bg-raised text-mute'],
};

const Row: React.FC<{ m: MeetingRow; canAct: boolean; onStatus: (id: string, s: any) => void }> = ({ m, canAct, onStatus }) => {
  const href = m.mode === 'online' ? safeHref(m.link) : '';
  const emergency = m.kind === 'emergency';
  const open = m.status === 'scheduled' || m.status === 'live';
  const [label, cls] = emergency && m.status === 'live' ? ['Active', 'bg-red-500/15 text-red-300'] : emergency && m.status === 'done' ? ['Resolved', 'bg-raised text-mute'] : STATUS[m.status];
  return (
    <li className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-sm">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {emergency && <Siren size={14} className="text-red-400 shrink-0" />}
          <span className="text-ink font-medium">{m.title}</span>
          {!emergency && pill(m.mode === 'online' ? 'bg-purple-500/15 text-purple-300' : 'bg-amber-500/15 text-amber-300', m.mode === 'online' ? 'Online' : 'Offline')}
          {pill(cls, label)}
        </div>
        <div className="text-xs text-mute flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1"><CalendarClock size={12} />{fmt(m.startsAt)}</span>
          {m.mode === 'offline' ? <span className="inline-flex items-center gap-1"><MapPin size={12} />{m.place}</span>
            : href ? <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-cyan-300 hover:underline"><Video size={12} />Join link<ExternalLink size={11} /></a>
            : <span className="inline-flex items-center gap-1"><Video size={12} />{m.link}</span>}
          <span className="inline-flex items-center gap-1"><Users size={12} />{audience(m)}</span>
          {m.createdByName && <span>by {m.createdByName}</span>}
        </div>
        {m.agenda && <div className="text-xs text-ink-soft bg-raised/60 rounded-lg px-3 py-2 whitespace-pre-wrap">{m.agenda}</div>}
      </div>
      {canAct && open && (
        <div className="flex items-center gap-3 shrink-0 sm:pt-0.5">
          {emergency ? <button className={link} onClick={() => onStatus(m.id, 'done')}>Resolve</button> : <>
            {m.status === 'scheduled' && <button className={link} onClick={() => onStatus(m.id, 'live')}>Start</button>}
            <button className={link} onClick={() => onStatus(m.id, 'done')}>Mark done</button>
            <button className="text-xs font-medium text-red-400 hover:underline" onClick={() => { if (window.confirm('Cancel this meeting? Everyone invited will be told.')) onStatus(m.id, 'cancelled'); }}>Cancel</button>
          </>}
        </div>
      )}
    </li>
  );
};

const ScheduleForm: React.FC = () => {
  const { createMeeting } = useMeetings();
  const [title, setTitle] = useState(''); const [when, setWhen] = useState(nextHour); const [mode, setMode] = useState<MeetingMode>('offline');
  const [place, setPlace] = useState(''); const [url, setUrl] = useState(''); const [agenda, setAgenda] = useState('');
  const [everyone, setEveryone] = useState(true); const [depts, setDepts] = useState<SubDepartmentId[]>([]);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const toggle = (d: SubDepartmentId) => setDepts(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setOk('');
    if (!title.trim()) return setErr('Give the meeting a title.');
    if (!when) return setErr('Pick a date and time.');
    if (mode === 'offline' && !place.trim()) return setErr('Add the place where people should come.');
    if (mode === 'online' && !url.trim()) return setErr('Add the meeting link.');
    if (!everyone && !depts.length) return setErr('Pick at least one department, or choose Everyone.');
    setBusy(true);
    const m = await createMeeting({ kind: 'meeting', title, agenda, mode, place, link: url, startsAt: new Date(when).toISOString(), audienceAll: everyone, audienceDepts: depts });
    setBusy(false);
    if (m) return setErr(m);
    setOk(everyone ? 'Scheduled. Everyone has been notified.' : `Scheduled. ${depts.map(d => DEPTS[d]).join(', ')} have been notified.`);
    setTitle(''); setPlace(''); setUrl(''); setAgenda(''); setWhen(nextHour()); setDepts([]); setEveryone(true);
  };

  const seg = (on: boolean) => `px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${on ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300' : 'border-line text-mute hover:text-ink'}`;
  return (
    <form onSubmit={submit} className="space-y-3 mb-4 pb-4 border-b border-line">
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
        <input className={input} placeholder="Meeting title" aria-label="Meeting title" value={title} onChange={e => setTitle(e.target.value)} />
        <input type="datetime-local" className={input} aria-label="Date and time" value={when} onChange={e => setWhen(e.target.value)} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-mute mr-1">Type</span>
        <button type="button" className={seg(mode === 'offline')} onClick={() => setMode('offline')}>Offline (in person)</button>
        <button type="button" className={seg(mode === 'online')} onClick={() => setMode('online')}>Online</button>
      </div>
      {mode === 'offline'
        ? <input className={input} placeholder="Place, e.g. Control Room A" aria-label="Place" value={place} onChange={e => setPlace(e.target.value)} />
        : <input className={input} placeholder="Meeting link (Google Meet, Zoom...)" aria-label="Meeting link" value={url} onChange={e => setUrl(e.target.value)} />}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-mute mr-1">Who is it for</span>
          <button type="button" className={seg(everyone)} onClick={() => setEveryone(true)}>Everyone</button>
          <button type="button" className={seg(!everyone)} onClick={() => setEveryone(false)}>Selected departments</button>
        </div>
        {!everyone && (
          <div className="flex flex-wrap gap-2">{DEPT_IDS.map(d => (
            <button type="button" key={d} onClick={() => toggle(d)} aria-pressed={depts.includes(d)} className={seg(depts.includes(d))}>{DEPTS[d]}</button>))}
            <span className="text-[11px] text-faint self-center">Owner and IT head are always included.</span>
          </div>
        )}
      </div>
      <textarea className={input} rows={2} placeholder="Agenda (optional)" aria-label="Agenda" value={agenda} onChange={e => setAgenda(e.target.value)} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={btnP}>{busy ? 'Scheduling…' : 'Schedule and notify'}</button>
        {err && <span role="alert" className="text-sm text-red-400">{err}</span>}
        {ok && <span className="text-sm text-emerald-400">{ok}</span>}
      </div>
    </form>
  );
};

const EmergencyForm: React.FC = () => {
  const { createMeeting } = useMeetings();
  const [what, setWhat] = useState(''); const [place, setPlace] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (!what.trim() || !place.trim()) return setErr('Say what happened and where to meet.');
    setBusy(true);
    const m = await createMeeting({ kind: 'emergency', title: what, place, mode: 'offline', audienceAll: true });
    setBusy(false);
    if (m) return setErr(m);
    setWhat(''); setPlace('');
  };
  return (
    <form onSubmit={submit} className="mb-4 pb-4 border-b border-line space-y-2">
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
        <input className={input} placeholder="What happened?" aria-label="What happened" value={what} onChange={e => setWhat(e.target.value)} />
        <input className={input} placeholder="Meet at" aria-label="Meet at" value={place} onChange={e => setPlace(e.target.value)} />
        <button type="submit" disabled={busy} className={btnD}>{busy ? 'Calling…' : 'Call meetup'}</button>
      </div>
      <p className="text-[11px] text-faint">Everyone in the organization is notified right away.</p>
      {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
    </form>
  );
};

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => <li className="py-8 text-center text-sm text-mute">{children}</li>;

export const MeetingsCenter: React.FC<{ tab?: string; onTab?: (t: string) => void }> = ({ tab, onTab }) => {
  const { meetings, emergencies, canSchedule, canCallEmergency, setMeetingStatus, ready } = useMeetings();
  const w: any = useWalkie();
  const me: string | undefined = w.currentUser?.id;
  const power = w.currentUser?.level === 'owner' || w.currentUser?.level === 'dept_head';
  const [inner, setInner] = useState('upcoming');
  const cur = tab ?? inner;
  const go = (t: string) => (onTab ? onTab(t) : setInner(t));
  const [err, setErr] = useState('');
  const change = async (id: string, s: any) => { setErr(''); const m = await setMeetingStatus(id, s); if (m) setErr(m); };

  const stale = Date.now() - 6 * 3600000;
  const isPast = (m: MeetingRow) => m.status === 'done' || m.status === 'cancelled' || (m.status === 'scheduled' && new Date(m.startsAt).getTime() < stale);
  const upcoming = meetings.filter(m => !isPast(m)).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const past = meetings.filter(isPast).sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
  const liveEm = emergencies.filter(e => e.status === 'live');
  const can = (m: MeetingRow) => power || m.createdBy === me;

  return (
    <div className="space-y-4">
      {liveEm.length > 0 && cur !== 'emergency' && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-ink min-w-0"><Siren size={16} className="text-red-400 shrink-0" /><span className="truncate"><b>{liveEm.length} active {liveEm.length > 1 ? 'emergencies' : 'emergency'}:</b> {liveEm[0].title}, meet at {liveEm[0].place}</span></span>
          <button className={link} onClick={() => go('emergency')}>View</button>
        </div>
      )}
      <Tabs label="Meetings and emergency" value={cur} onChange={go} tabs={[
        { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
        { id: 'past', label: 'Past' },
        { id: 'emergency', label: 'Emergency', count: liveEm.length, alert: true },
      ]} />
      {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
      <section className="rounded-2xl border border-line bg-surface p-5">
        {cur === 'upcoming' && <>
          {canSchedule ? <ScheduleForm /> : <p className="text-xs text-mute mb-3">You will see every meeting meant for you here. Heads and the owner schedule them.</p>}
          <ul className="divide-y divide-line">
            {upcoming.map(m => <Row key={m.id} m={m} canAct={can(m)} onStatus={change} />)}
            {!upcoming.length && <Empty>{ready ? 'No upcoming meetings.' : 'Loading…'}</Empty>}
          </ul>
        </>}
        {cur === 'past' && <ul className="divide-y divide-line">
          {past.slice(0, 50).map(m => <Row key={m.id} m={m} canAct={false} onStatus={change} />)}
          {!past.length && <Empty>Nothing here yet.</Empty>}
        </ul>}
        {cur === 'emergency' && <>
          {canCallEmergency && <EmergencyForm />}
          <ul className="divide-y divide-line">
            {emergencies.slice(0, 30).map(m => <Row key={m.id} m={m} canAct={can(m)} onStatus={change} />)}
            {!emergencies.length && <Empty>No emergency meetups. Call one above if something happens.</Empty>}
          </ul>
        </>}
      </section>
    </div>
  );
};

// One panel for the whole app: the header Meetings button (and a tap on a meeting notification) opens it from any department.
export const MeetingsPanelHost: React.FC = () => {
  const { panelOpen, closePanel } = useMeetings();
  useEffect(() => {
    if (!panelOpen) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') closePanel(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [panelOpen, closePanel]);
  if (!panelOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 p-3 sm:p-8 overflow-y-auto" onClick={closePanel}>
      <div role="dialog" aria-modal="true" aria-label="Meetings" className="w-full max-w-3xl rounded-2xl border border-line bg-canvas text-ink shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-line">
          <h2 className="flex items-center gap-2 text-base font-semibold"><CalendarClock size={18} className="text-cyan-300" />Meetings</h2>
          <button onClick={closePanel} aria-label="Close" className="p-1.5 rounded-lg text-mute hover:bg-raised hover:text-ink"><X size={18} /></button>
        </div>
        <div className="p-4 sm:p-5"><MeetingsCenter /></div>
      </div>
    </div>
  );
};
