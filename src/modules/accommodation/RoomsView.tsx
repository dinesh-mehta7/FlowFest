import React, { useMemo, useState } from 'react';
import { BedDouble, Building2, Edit3, Lock, Plus, Search, Trash2, UserPlus, Users } from 'lucide-react';
import { useAccommodation } from './AccommodationContext';
import { DEPT_LABEL, DEPT_OPTIONS } from './types';
import type { Member, Room } from './types';
import { Modal, ConfirmModal, btnGhost, btnPrimary, card, cx, inputCls, labelCls } from './ui';

type Mode = 'rooms' | 'members';

export const RoomsView: React.FC = () => {
  const { rooms, members, canManageRooms, isDark: dark, loading, membersInRoom,
    addRoom, updateRoom, deleteRoom, addMembers, updateMember, deleteMember } = useAccommodation();

  const [mode, setMode] = useState<Mode>('rooms');
  const [search, setSearch] = useState('');
  const [roomFilter, setRoomFilter] = useState<string>('all'); // all | none | roomId
  const [roomModal, setRoomModal] = useState<null | 'new' | Room>(null);
  const [memberModal, setMemberModal] = useState<null | { room?: string } | Member>(null);
  const [confirm, setConfirm] = useState<null | { title: string; body: string; label: string; run: () => void }>(null);

  const totalBeds = rooms.reduce((t, r) => t + r.capacity, 0);
  const placed = members.filter(m => m.roomId && rooms.some(r => r.id === m.roomId)).length;
  const unassigned = members.length - placed;
  const roomById = useMemo(() => new Map(rooms.map(r => [r.id, r])), [rooms]);

  const stats = [
    { label: 'Total rooms', value: rooms.length, icon: Building2, tone: 'text-blue-500' },
    { label: 'Total beds', value: totalBeds, icon: BedDouble, tone: 'text-violet-500' },
    { label: 'Total members', value: members.length, icon: Users, tone: 'text-emerald-500' },
    { label: 'Beds free', value: Math.max(0, totalBeds - placed), icon: BedDouble, tone: 'text-amber-500' },
    { label: 'Not in a room', value: unassigned, icon: Users, tone: unassigned ? 'text-rose-500' : 'text-slate-400' },
  ];

  // rooms grouped by block
  const grouped = useMemo(() => {
    const g = new Map<string, Room[]>();
    rooms.forEach(r => { const k = r.block || 'Rooms'; g.set(k, [...(g.get(k) || []), r]); });
    return Array.from(g.entries());
  }, [rooms]);

  const q = search.trim().toLowerCase();
  const visibleMembers = members.filter(m => {
    if (roomFilter === 'none' && m.roomId) return false;
    if (roomFilter !== 'all' && roomFilter !== 'none' && m.roomId !== roomFilter) return false;
    if (!q) return true;
    const room = m.roomId ? roomById.get(m.roomId) : null;
    return m.name.toLowerCase().includes(q) || (room?.name || '').toLowerCase().includes(q) || (DEPT_LABEL[m.department] || '').toLowerCase().includes(q);
  });

  const muted = dark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rooms &amp; Members</h1>
          <p className={cx('text-sm', muted)}>Every room, and who is staying in which one.</p>
        </div>
        {canManageRooms ? (
          <div className="flex gap-2">
            <button className={btnGhost(dark)} onClick={() => setMemberModal({})}><UserPlus className="w-4 h-4" />Add members</button>
            <button className={btnPrimary} onClick={() => setRoomModal('new')}><Plus className="w-4 h-4" />Add room</button>
          </div>
        ) : (
          <p className={cx('flex items-center gap-1.5 text-xs', muted)}><Lock className="w-3.5 h-3.5" />View only — only the department owner can change rooms and members.</p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map(s => (
          <div key={s.label} className={cx('rounded-2xl border p-4', card(dark))}>
            <div className={cx('flex items-center gap-1.5 text-xs font-semibold', muted)}><s.icon className={cx('w-3.5 h-3.5', s.tone)} />{s.label}</div>
            <div className="text-2xl font-bold mt-1 tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      <div role="tablist" aria-label="Rooms or members" className={cx('inline-flex p-1 rounded-xl', dark ? 'bg-slate-900' : 'bg-slate-100')}>
        {(['rooms', 'members'] as Mode[]).map(m => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={cx('px-4 py-2 rounded-lg text-xs font-bold capitalize transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
              mode === m ? 'bg-blue-600 text-white shadow' : muted)}>
            {m === 'rooms' ? `Rooms (${rooms.length})` : `Members (${members.length})`}
          </button>
        ))}
      </div>

      {loading && !rooms.length && !members.length && <p className={cx('text-sm', muted)}>Loading…</p>}

      {mode === 'rooms' && (
        <>
          {!loading && !rooms.length && (
            <div className={cx('rounded-2xl border p-10 text-center', card(dark))}>
              <Building2 className="w-8 h-8 mx-auto mb-3 text-slate-400" />
              <p className="font-semibold">No rooms yet</p>
              <p className={cx('text-sm mt-1', muted)}>{canManageRooms ? 'Add your first room to start placing members.' : 'The department owner has not added any rooms yet.'}</p>
            </div>
          )}
          {grouped.map(([block, list]) => (
            <section key={block} aria-label={block}>
              <h2 className={cx('text-xs font-bold uppercase tracking-wider mb-2', muted)}>{block} · {list.length} room{list.length === 1 ? '' : 's'}</h2>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {list.map(r => {
                  const inside = membersInRoom(r.id);
                  const pct = Math.min(100, Math.round((inside.length / r.capacity) * 100));
                  const full = inside.length >= r.capacity;
                  return (
                    <article key={r.id} className={cx('rounded-2xl border p-4 flex flex-col', card(dark))}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-base truncate" title={r.name}>{r.name}</h3>
                          {r.notes && <p className={cx('text-xs truncate', muted)} title={r.notes}>{r.notes}</p>}
                        </div>
                        <span className={cx('shrink-0 text-xs font-bold px-2 py-1 rounded-lg tabular-nums',
                          full ? 'bg-rose-500/15 text-rose-500' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400')}>
                          {inside.length}/{r.capacity}{full ? ' · Full' : ''}
                        </span>
                      </div>
                      <div className={cx('h-1.5 rounded-full mt-3 overflow-hidden', dark ? 'bg-slate-800' : 'bg-slate-100')} aria-hidden>
                        <div className={cx('h-full rounded-full', full ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${pct}%` }} />
                      </div>
                      <ul className="mt-3 space-y-1 text-sm flex-1 max-h-40 overflow-y-auto">
                        {inside.map(m => (
                          <li key={m.id} className="flex items-center justify-between gap-2">
                            <span className="truncate">{m.name}</span>
                            {m.department && <span className={cx('text-[10px] shrink-0', muted)}>{DEPT_LABEL[m.department]}</span>}
                          </li>
                        ))}
                        {!inside.length && <li className={cx('text-xs italic', muted)}>Empty</li>}
                      </ul>
                      {canManageRooms && (
                        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-500/20">
                          <button className={btnGhost(dark)} disabled={full} onClick={() => setMemberModal({ room: r.id })}><UserPlus className="w-3.5 h-3.5" />Add people</button>
                          <button className={btnGhost(dark)} onClick={() => setRoomModal(r)} aria-label={`Edit room ${r.name}`}><Edit3 className="w-3.5 h-3.5" /></button>
                          <button className={cx(btnGhost(dark), 'text-rose-500')} aria-label={`Delete room ${r.name}`}
                            onClick={() => setConfirm({
                              title: `Delete room ${r.name}?`,
                              body: inside.length ? `${inside.length} member(s) will be left without a room. They are not deleted.` : 'This room is empty.',
                              label: 'Delete room', run: () => deleteRoom(r.id),
                            })}><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}

      {mode === 'members' && (
        <div className={cx('rounded-2xl border', card(dark))}>
          <div className="p-3 flex flex-col sm:flex-row gap-2 border-b border-slate-500/20">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
              <input aria-label="Search members" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, room or department…" className={cx(inputCls(dark), 'pl-9')} />
            </div>
            <select aria-label="Filter by room" value={roomFilter} onChange={e => setRoomFilter(e.target.value)} className={cx(inputCls(dark), 'sm:w-56')}>
              <option value="all">All members</option>
              <option value="none">Not in a room</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={cx('text-left text-xs uppercase tracking-wider', muted)}>
                  <th className="px-4 py-3 font-semibold">Member</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Room</th>
                  {canManageRooms && <th className="px-4 py-3 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className={dark ? 'divide-y divide-slate-800' : 'divide-y divide-slate-100'}>
                {visibleMembers.map(m => {
                  const room = m.roomId ? roomById.get(m.roomId) : null;
                  return (
                    <tr key={m.id}>
                      <td className="px-4 py-2.5 font-semibold">{m.name}</td>
                      <td className={cx('px-4 py-2.5', muted)}>{DEPT_LABEL[m.department] || '—'}</td>
                      <td className="px-4 py-2.5">
                        {canManageRooms ? (
                          <select aria-label={`Room for ${m.name}`} value={m.roomId || ''} onChange={e => updateMember(m.id, { roomId: e.target.value || null })} className={cx(inputCls(dark), 'py-1.5 text-xs min-w-[10rem]')}>
                            <option value="">— Not in a room —</option>
                            {rooms.map(r => {
                              const free = r.capacity - membersInRoom(r.id).length;
                              return <option key={r.id} value={r.id} disabled={free <= 0 && r.id !== m.roomId}>{r.name} ({Math.max(0, free)} free)</option>;
                            })}
                          </select>
                        ) : room ? <span className="font-medium">{room.name}</span> : <span className={cx('text-xs italic', muted)}>Not in a room</span>}
                      </td>
                      {canManageRooms && (
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <button className={cx(btnGhost(dark), 'mr-1.5')} aria-label={`Edit ${m.name}`} onClick={() => setMemberModal(m)}><Edit3 className="w-3.5 h-3.5" /></button>
                          <button className={cx(btnGhost(dark), 'text-rose-500')} aria-label={`Remove ${m.name}`}
                            onClick={() => setConfirm({ title: `Remove ${m.name}?`, body: 'They will be taken off the list entirely.', label: 'Remove', run: () => deleteMember(m.id) })}><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {!visibleMembers.length && (
                  <tr><td colSpan={canManageRooms ? 4 : 3} className={cx('px-4 py-10 text-center text-sm', muted)}>{members.length ? 'No members match.' : 'No members added yet.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {roomModal && <RoomForm dark={dark} room={roomModal === 'new' ? null : roomModal} onClose={() => setRoomModal(null)}
        onSave={(v) => (roomModal === 'new' ? addRoom(v) : updateRoom(roomModal.id, v))} />}
      {memberModal && <MemberForm dark={dark} rooms={rooms} members={members}
        edit={'id' in memberModal ? memberModal : null} presetRoom={'id' in memberModal ? undefined : memberModal.room}
        onClose={() => setMemberModal(null)} onAdd={addMembers} onEdit={updateMember} />}
      {confirm && <ConfirmModal dark={dark} title={confirm.title} body={confirm.body} confirmLabel={confirm.label} onConfirm={confirm.run} onClose={() => setConfirm(null)} />}
    </div>
  );
};

// ---------------------------------------------------------------------------
const RoomForm: React.FC<{ dark: boolean; room: Room | null; onClose: () => void; onSave: (v: { name: string; block: string; capacity: number; notes: string }) => Promise<boolean> }> = ({ dark, room, onClose, onSave }) => {
  const [name, setName] = useState(room?.name || '');
  const [block, setBlock] = useState(room?.block || '');
  const [capacity, setCapacity] = useState(String(room?.capacity ?? 4));
  const [notes, setNotes] = useState(room?.notes || '');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await onSave({ name, block, capacity: Number(capacity), notes });
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Modal title={room ? `Edit room ${room.name}` : 'Add room'} dark={dark} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls(dark)} htmlFor="rn">Room name / number</label><input id="rn" autoFocus required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. A-101" className={inputCls(dark)} /></div>
          <div><label className={labelCls(dark)} htmlFor="rb">Block / camp (optional)</label><input id="rb" value={block} onChange={e => setBlock(e.target.value)} placeholder="e.g. Block A" className={inputCls(dark)} /></div>
        </div>
        <div><label className={labelCls(dark)} htmlFor="rc">Beds (capacity)</label><input id="rc" type="number" min={1} max={500} required value={capacity} onChange={e => setCapacity(e.target.value)} className={inputCls(dark)} /></div>
        <div><label className={labelCls(dark)} htmlFor="rno">Notes (optional)</label><input id="rno" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Ground floor, AC" className={inputCls(dark)} /></div>
        <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={onClose} className={btnGhost(dark)}>Cancel</button><button type="submit" disabled={busy} className={btnPrimary}>{busy ? 'Saving…' : 'Save room'}</button></div>
      </form>
    </Modal>
  );
};

const MemberForm: React.FC<{
  dark: boolean; rooms: Room[]; members: Member[]; edit: Member | null; presetRoom?: string; onClose: () => void;
  onAdd: (names: string[], department: string, roomId: string | null) => Promise<boolean>;
  onEdit: (id: string, patch: { name?: string; department?: string; roomId?: string | null }) => Promise<boolean>;
}> = ({ dark, rooms, members, edit, presetRoom, onClose, onAdd, onEdit }) => {
  const [names, setNames] = useState(edit?.name || '');
  const [dept, setDept] = useState(edit?.department || '');
  const [roomId, setRoomId] = useState(edit?.roomId || presetRoom || '');
  const [busy, setBusy] = useState(false);
  const freeIn = (r: Room) => r.capacity - members.filter(m => m.roomId === r.id && m.id !== edit?.id).length;
  const count = names.split('\n').map(n => n.trim()).filter(Boolean).length;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = edit
      ? await onEdit(edit.id, { name: names, department: dept, roomId: roomId || null })
      : await onAdd(names.split('\n'), dept, roomId || null);
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Modal title={edit ? `Edit ${edit.name}` : 'Add members'} dark={dark} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {edit ? (
          <div><label className={labelCls(dark)} htmlFor="mn">Name</label><input id="mn" autoFocus required value={names} onChange={e => setNames(e.target.value)} className={inputCls(dark)} /></div>
        ) : (
          <div>
            <label className={labelCls(dark)} htmlFor="mns">Names — one per line{count > 1 ? ` (${count})` : ''}</label>
            <textarea id="mns" autoFocus required rows={5} value={names} onChange={e => setNames(e.target.value)} placeholder={'Jaspreet Kaur\nGurdeep Singh\n…'} className={inputCls(dark)} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls(dark)} htmlFor="md">Department (optional)</label>
            <select id="md" value={dept} onChange={e => setDept(e.target.value)} className={inputCls(dark)}>
              <option value="">—</option>
              {DEPT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls(dark)} htmlFor="mr">Room</label>
            <select id="mr" value={roomId} onChange={e => setRoomId(e.target.value)} className={inputCls(dark)}>
              <option value="">— Not in a room —</option>
              {rooms.map(r => <option key={r.id} value={r.id} disabled={freeIn(r) <= 0}>{r.name} ({Math.max(0, freeIn(r))} free)</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={onClose} className={btnGhost(dark)}>Cancel</button><button type="submit" disabled={busy} className={btnPrimary}>{busy ? 'Saving…' : edit ? 'Save' : `Add ${count > 1 ? count + ' members' : 'member'}`}</button></div>
      </form>
    </Modal>
  );
};
