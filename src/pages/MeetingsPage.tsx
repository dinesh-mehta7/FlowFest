import React, { useState } from 'react';
import { Siren, CalendarClock, Video, MapPin } from 'lucide-react';
import { useMeetings, MeetingRow, MeetingMode } from '../context/MeetingsContext';
import { DEPTS } from './orgData';
import { Card, Pill, inputCls, btnPrimary, btnDanger, linkBtn } from './Home';
import { PageIntro, Tabs } from '../components/ui';
import type { SubDepartmentId } from '../types';

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
const who = (m: MeetingRow) => (m.audienceAll ? 'Everyone' : m.audienceDepts.map(d => DEPTS[d] || d).join(', '));
const tone = (s: string) => s === 'live' ? 'bg-emerald-500/15 text-emerald-300' : s === 'scheduled' ? 'bg-cyan-500/15 text-cyan-300' : s === 'cancelled' ? 'bg-red-500/15 text-red-300' : 'bg-raised text-mute';
const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => <li className="py-8 text-center text-sm text-mute">{children}</li>;
const Err: React.FC<{ msg: string }> = ({ msg }) => msg ? <p role="alert" className="text-xs text-red-400 mb-3">{msg}</p> : null;

const MeetingRowView: React.FC<{ m: MeetingRow; canChange: boolean; onStatus: (id: string, s: any) => void }> = ({ m, canChange, onStatus }) => {
  const open = m.status === 'scheduled' || m.status === 'live';
  return (
    <li className="py-3 flex items-start justify-between gap-3 text-sm">
      <div className="min-w-0">
        <div className="text-ink font-medium">{m.title}</div>
        <div className="text-xs text-mute flex flex-wrap gap-x-2 items-center">
          <span>{when(m.startsAt)}</span>
          <span className="inline-flex items-center gap-1">{m.mode === 'online' ? <Video size={12} /> : <MapPin size={12} />}{m.mode === 'online' ? 'Online' : m.place}</span>
          <span>For {who(m)}</span><span>by {m.createdByName}</span>
        </div>
        {m.agenda && <div className="text-xs text-mute mt-1">{m.agenda}</div>}
        {m.mode === 'online' && m.link && open && <a className={linkBtn} href={m.link} target="_blank" rel="noreferrer">Join meeting</a>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Pill c={tone(m.status)}>{m.status}</Pill>
        {canChange && m.status === 'scheduled' && <button className={linkBtn} onClick={() => onStatus(m.id, 'live')}>Start</button>}
        {canChange && open && <button className={linkBtn} onClick={() => onStatus(m.id, 'done')}>{m.kind === 'emergency' ? 'Resolve' : 'Mark done'}</button>}
        {canChange && m.status === 'scheduled' && <button className={linkBtn} onClick={() => onStatus(m.id, 'cancelled')}>Cancel</button>}
      </div>
    </li>
  );
};

const MeetingsList: React.FC = () => {
  const { meetings, canSchedule, createMeeting, setMeetingStatus } = useMeetings();
  const [title, setTitle] = useState(''); const [agenda, setAgenda] = useState(''); const [mode, setMode] = useState<MeetingMode>('offline');
  const [place, setPlace] = useState(''); const [link, setLink] = useState(''); const [at, setAt] = useState('');
  const [all, setAll] = useState(true); const [depts, setDepts] = useState<SubDepartmentId[]>([]);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const toggle = (d: SubDepartmentId) => setDepts(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);
  const submit = async () => {
    setErr(''); if (!at) { setErr('Pick a date and time.'); return; }
    setBusy(true);
    const e = await createMeeting({ kind: 'meeting', title, agenda, mode, place, link, startsAt: new Date(at).toISOString(), audienceAll: all, audienceDepts: depts });
    setBusy(false);
    if (e) { setErr(e); return; }
    setTitle(''); setAgenda(''); setPlace(''); setLink(''); setAt(''); setDepts([]); setAll(true);
  };
  const sorted = [...meetings].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  return (
    <Card icon={CalendarClock} title="Meetings" action={<span className="text-xs text-mute">{meetings.filter(m => m.status === 'scheduled' || m.status === 'live').length} scheduled</span>}>
      {canSchedule && (
        <form onSubmit={e => { e.preventDefault(); submit(); }} className="grid gap-2 sm:grid-cols-2 mb-4 pb-4 border-b border-line">
          <input className={inputCls} placeholder="Meeting title" aria-label="Meeting title" value={title} onChange={e => setTitle(e.target.value)} />
          <input className={inputCls} type="datetime-local" aria-label="Date and time" value={at} onChange={e => setAt(e.target.value)} />
          <select className={inputCls} aria-label="Meeting type" value={mode} onChange={e => setMode(e.target.value as MeetingMode)}>
            <option value="offline">Offline (in person)</option><option value="online">Online</option>
          </select>
          {mode === 'offline'
            ? <input className={inputCls} placeholder="Place" aria-label="Place" value={place} onChange={e => setPlace(e.target.value)} />
            : <input className={inputCls} placeholder="Meeting link" aria-label="Meeting link" value={link} onChange={e => setLink(e.target.value)} />}
          <input className={`${inputCls} sm:col-span-2`} placeholder="Agenda (optional)" aria-label="Agenda" value={agenda} onChange={e => setAgenda(e.target.value)} />
          <div className="sm:col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink">
            <label className="flex items-center gap-2"><input type="radio" checked={all} onChange={() => setAll(true)} /> Everyone</label>
            <label className="flex items-center gap-2"><input type="radio" checked={!all} onChange={() => setAll(false)} /> Selected departments</label>
            {!all && (Object.keys(DEPTS) as SubDepartmentId[]).map(d => (
              <label key={d} className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={depts.includes(d)} onChange={() => toggle(d)} />{DEPTS[d]}</label>
            ))}
          </div>
          <div className="sm:col-span-2 flex items-center justify-between gap-3">
            <span className="text-xs text-mute">Everyone invited gets a notification.</span>
            <button type="submit" disabled={busy} className={btnPrimary}>{busy ? 'Scheduling…' : 'Schedule'}</button>
          </div>
        </form>
      )}
      <Err msg={err} />
      <ul className="divide-y divide-line">
        {sorted.map(m => <MeetingRowView key={m.id} m={m} canChange={canSchedule} onStatus={async (id, s) => setErr((await setMeetingStatus(id, s)) || '')} />)}
        {!sorted.length && <Empty>{canSchedule ? 'No meetings yet. Schedule one above.' : 'No meetings for you right now.'}</Empty>}
      </ul>
    </Card>
  );
};

const EmergencyList: React.FC = () => {
  const { emergencies, canCallEmergency, createMeeting, setMeetingStatus } = useMeetings();
  const [title, setTitle] = useState(''); const [place, setPlace] = useState(''); const [err, setErr] = useState('');
  const call = async () => { setErr(''); const e = await createMeeting({ kind: 'emergency', title, place }); if (e) setErr(e); else { setTitle(''); setPlace(''); } };
  return (
    <Card icon={Siren} title="Emergency meetups" tone="text-red-400" action={<span className="text-xs text-mute">{emergencies.filter(e => e.status === 'live').length} active</span>}>
      {canCallEmergency && (
        <form onSubmit={e => { e.preventDefault(); call(); }} className="grid gap-2 sm:grid-cols-[2fr_1fr_auto] mb-4 pb-4 border-b border-line">
          <input className={inputCls} placeholder="What happened?" aria-label="What happened" value={title} onChange={e => setTitle(e.target.value)} />
          <input className={inputCls} placeholder="Meet at" aria-label="Meet at" value={place} onChange={e => setPlace(e.target.value)} />
          <button type="submit" className={btnDanger}>Call meetup</button>
        </form>
      )}
      <Err msg={err} />
      <ul className="divide-y divide-line">
        {emergencies.map(m => <MeetingRowView key={m.id} m={m} canChange={canCallEmergency} onStatus={async (id, s) => setErr((await setMeetingStatus(id, s)) || '')} />)}
        {!emergencies.length && <Empty>No emergency meetups. Everyone is notified at once when one is called.</Empty>}
      </ul>
    </Card>
  );
};

export const MeetingsEmergency: React.FC<{ tab?: string }> = ({ tab }) => {
  const { meetings, emergencies } = useMeetings();
  const active = emergencies.filter(e => e.status === 'live');
  const cur = tab === 'emergency' ? 'emergency' : 'meetings';
  const go = (id: string) => { location.hash = '#/meetings/' + id; };
  return (
    <div className="space-y-4">
      <PageIntro>Schedule meetings (in person or online) for everyone or chosen departments, and call an emergency meetup when needed.</PageIntro>
      {active.length > 0 && cur !== 'emergency' && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-ink min-w-0"><Siren size={16} className="text-red-400 shrink-0" /><span className="truncate"><b>{active.length} active {active.length > 1 ? 'emergencies' : 'emergency'}:</b> {active[0].title}</span></span>
          <button className={linkBtn} onClick={() => go('emergency')}>View</button>
        </div>
      )}
      <Tabs label="Meetings and emergency" value={cur} onChange={go} tabs={[
        { id: 'meetings', label: 'Meetings', count: meetings.filter(m => m.status === 'scheduled' || m.status === 'live').length },
        { id: 'emergency', label: 'Emergency', count: active.length, alert: true },
      ]} />
      {cur === 'meetings' ? <MeetingsList /> : <EmergencyList />}
    </div>
  );
};
