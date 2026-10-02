import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../walkie/lib/supabaseClient';
import { useWalkie } from '../walkie';
import { MEALS, MEAL_PRESETS, mealSlug } from './types';
import { minutesOf } from './dates';
import type { MealKey, MealRow, MealStatus, Member, Room } from './types';

// ---------------------------------------------------------------------------
// Row mappers (database snake_case  ->  UI camelCase)
// ---------------------------------------------------------------------------
const mapRoom = (r: any): Room => ({
  id: r.id, name: r.name, block: r.block || '', capacity: r.capacity, notes: r.notes || '',
});
const mapMember = (r: any): Member => ({
  id: r.id, name: r.name, department: r.department || '', roomId: r.room_id || null,
});
const mapMeal = (r: any): MealRow => ({
  id: r.id,
  date: r.menu_date,
  meal: r.meal,
  label: r.meal_label || MEAL_PRESETS.find(x => x.key === r.meal)?.label || (r.meal ? r.meal.charAt(0).toUpperCase() + r.meal.slice(1).replace(/-/g, ' ') : 'Meal'),
  start: String(r.start_time).slice(0, 5),
  end: String(r.end_time).slice(0, 5),
  items: r.items || '',
  status: r.status,
  changedAt: r.status_changed_at || null,
  changedBy: r.status_changed_by || '',
});

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const sortRooms = (a: Room, b: Room) => collator.compare(`${a.block}\u0000${a.name}`, `${b.block}\u0000${b.name}`);
const sortMembers = (a: Member, b: Member) => collator.compare(a.name, b.name);
const sortMeals = (a: MealRow, b: MealRow) =>
  a.date === b.date ? minutesOf(a.start) - minutesOf(b.start) : a.date < b.date ? -1 : 1;

const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Turn raw database / policy errors into something a person can act on.
export const friendlyError = (error: any): string => {
  const msg: string = error?.message || 'Unknown error';
  if (/row-level security|permission denied/i.test(msg)) return "You don't have permission to do that.";
  if (error?.code === '23505' || /duplicate key|already exists/i.test(msg)) return 'That name already exists — pick a different one.';
  if (/schema cache|does not exist|could not find/i.test(msg)) {
    return `${msg} — run supabase/migration_v7_accommodation.sql (and v8, v9) in the Supabase SQL Editor, then reload.`;
  }
  return msg;
};

// Supabase returns at most 1000 rows per request; page through so a big camp
// (hundreds of members) is never silently cut off.
async function fetchAll(table: string, order: string): Promise<{ data: any[]; error: any }> {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select('*').order(order, { ascending: true }).range(from, from + 999);
    if (error) return { data: [], error };
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return { data: out, error: null };
}

export interface RoomInput { name: string; block: string; capacity: number; notes: string }

interface AccommodationCtx {
  rooms: Room[];
  members: Member[];
  meals: MealRow[];
  loading: boolean;
  loadError: string;
  canManageRooms: boolean; // organization owner
  canManageMenu: boolean; // accommodation head or organization owner
  isDark: boolean;
  toggleTheme: () => void;
  membersInRoom: (roomId: string) => Member[];

  addRoom: (input: RoomInput) => Promise<boolean>;
  updateRoom: (id: string, input: RoomInput) => Promise<boolean>;
  deleteRoom: (id: string) => Promise<boolean>;

  addMembers: (names: string[], department: string, roomId: string | null) => Promise<boolean>;
  updateMember: (id: string, patch: { name?: string; department?: string; roomId?: string | null }) => Promise<boolean>;
  deleteMember: (id: string) => Promise<boolean>;

  mealsOn: (date: string) => MealRow[];
  createDay: (date: string, copyFrom?: string) => Promise<boolean>;
  saveMeal: (id: string, patch: { start: string; end: string; items: string }) => Promise<boolean>;
  setMealStatus: (id: string, status: MealStatus) => Promise<boolean>;
  deleteDay: (date: string) => Promise<boolean>;
  addMeal: (date: string, label: string, start?: string, end?: string) => Promise<boolean>;
  deleteMeal: (id: string) => Promise<boolean>;
  refreshMenu: () => Promise<void>;
}

const Ctx = createContext<AccommodationCtx | null>(null);

export const useAccommodation = (): AccommodationCtx => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAccommodation must be used inside <AccommodationProvider>');
  return c;
};

export const AccommodationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const w: any = useWalkie();
  const user = w.currentUser;
  const orgId: string | null = user?.organizationId || null;
  const ready = !!user && user.approved !== false && user.isActive !== false && !!orgId;

  const [rooms, setRooms] = useState<Room[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [meals, setMeals] = useState<MealRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  // The database enforces these too (row-level security); the UI just mirrors
  // them so people don't see buttons that would be refused.
  const canManageRooms = ready && user.level === 'owner';
  const canManageMenu = ready && (user.level === 'owner' || (user.level === 'sub_dept_head' && user.subDepartment === 'accommodation'));

  const toast = useCallback((msg: string, type: 'success' | 'error' | 'warning' = 'success') => w.addToast?.(msg, type), [w.addToast]);
  const log = useCallback((action: string, details: string, type = 'info') => { try { w.logAction?.(action, details, type); } catch { /* best effort */ } }, [w.logAction]);

  // ---- Loading ------------------------------------------------------------
  const loadAll = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    const [r, m, mm] = await Promise.all([
      fetchAll('accommodation_rooms', 'created_at'),
      fetchAll('accommodation_members', 'created_at'),
      fetchAll('meal_menu', 'menu_date'),
    ]);
    const err = r.error || m.error || mm.error;
    if (err) {
      setLoadError(friendlyError(err));
    } else {
      setLoadError('');
      setRooms(r.data.map(mapRoom).sort(sortRooms));
      setMembers(m.data.map(mapMember).sort(sortMembers));
      setMeals(mm.data.map(mapMeal).sort(sortMeals));
    }
    setLoading(false);
  }, [ready]);

  useEffect(() => {
    if (!ready) { setRooms([]); setMembers([]); setMeals([]); setLoadError(''); return; }
    loadAll();
  }, [ready, orgId]);

  // Just the menu — cheap, used as a safety net so the "live" card never goes
  // stale even if the realtime connection silently drops.
  const refreshMenu = useCallback(async () => {
    if (!ready) return;
    const { data, error } = await fetchAll('meal_menu', 'menu_date');
    if (!error) setMeals(data.map(mapMeal).sort(sortMeals));
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const t = setInterval(refreshMenu, 60000);
    const onVisible = () => { if (document.visibilityState === 'visible') refreshMenu(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
  }, [ready, refreshMenu]);

  // ---- Realtime: everyone sees changes the moment they happen -----------------
  const upsert = <T extends { id: string }>(list: T[], item: T, sorter: (a: T, b: T) => number) =>
    [...list.filter(x => x.id !== item.id), item].sort(sorter);

  useEffect(() => {
    if (!ready) return;
    const filter = `organization_id=eq.${orgId}`;
    const ch = supabase
      .channel(`accommodation-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accommodation_rooms', filter }, (p: any) => {
        if (p.eventType === 'DELETE') setRooms(prev => prev.filter(x => x.id !== p.old.id));
        else setRooms(prev => upsert(prev, mapRoom(p.new), sortRooms));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accommodation_members', filter }, (p: any) => {
        if (p.eventType === 'DELETE') setMembers(prev => prev.filter(x => x.id !== p.old.id));
        else setMembers(prev => upsert(prev, mapMember(p.new), sortMembers));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_menu', filter }, (p: any) => {
        if (p.eventType === 'DELETE') setMeals(prev => prev.filter(x => x.id !== p.old.id));
        else setMeals(prev => upsert(prev, mapMeal(p.new), sortMeals));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ready, orgId]);

  // Deleting a room un-assigns its people in the database (on delete set null)
  // — mirror that locally instantly.
  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;

  // ---- Rooms -----------------------------------------------------------------
  const validRoom = (i: RoomInput) => {
    if (!i.name.trim()) { toast('Room name is required.', 'error'); return false; }
    if (!Number.isInteger(i.capacity) || i.capacity < 1 || i.capacity > 500) { toast('Capacity must be a whole number from 1 to 500.', 'error'); return false; }
    return true;
  };

  const addRoom: AccommodationCtx['addRoom'] = async (i) => {
    if (!canManageRooms) { toast('Only the department owner can add rooms.', 'error'); return false; }
    if (!validRoom(i)) return false;
    const row = { id: uid('room'), organization_id: orgId, name: i.name.trim(), block: i.block.trim(), capacity: i.capacity, notes: i.notes.trim() };
    const { data, error } = await supabase.from('accommodation_rooms').insert(row).select().single();
    if (error) { toast(`Could not add room: ${friendlyError(error)}`, 'error'); return false; }
    setRooms(prev => upsert(prev, mapRoom(data), sortRooms));
    log('Room Added', `${user.name} added room ${row.name} (${row.capacity} beds)`, 'success');
    toast(`Room ${row.name} added.`);
    return true;
  };

  const updateRoom: AccommodationCtx['updateRoom'] = async (id, i) => {
    if (!canManageRooms) { toast('Only the department owner can edit rooms.', 'error'); return false; }
    if (!validRoom(i)) return false;
    const { data, error } = await supabase.from('accommodation_rooms')
      .update({ name: i.name.trim(), block: i.block.trim(), capacity: i.capacity, notes: i.notes.trim() })
      .eq('id', id).select().single();
    if (error) { toast(`Could not update room: ${friendlyError(error)}`, 'error'); return false; }
    setRooms(prev => upsert(prev, mapRoom(data), sortRooms));
    log('Room Updated', `${user.name} updated room ${i.name.trim()}`, 'info');
    toast('Room updated.');
    return true;
  };

  const deleteRoom: AccommodationCtx['deleteRoom'] = async (id) => {
    if (!canManageRooms) { toast('Only the department owner can delete rooms.', 'error'); return false; }
    const room = roomsRef.current.find(r => r.id === id);
    const { error } = await supabase.from('accommodation_rooms').delete().eq('id', id);
    if (error) { toast(`Could not delete room: ${friendlyError(error)}`, 'error'); return false; }
    setRooms(prev => prev.filter(r => r.id !== id));
    setMembers(prev => prev.map(m => (m.roomId === id ? { ...m, roomId: null } : m)));
    log('Room Deleted', `${user.name} deleted room ${room?.name || id}`, 'warning');
    toast(`Room ${room?.name || ''} deleted. Its members are now unassigned.`);
    return true;
  };

  // ---- Members ---------------------------------------------------------------
  const addMembers: AccommodationCtx['addMembers'] = async (names, department, roomId) => {
    if (!canManageRooms) { toast('Only the department owner can add members.', 'error'); return false; }
    const clean = Array.from(new Set(names.map(n => n.trim()).filter(Boolean)));
    if (!clean.length) { toast('Enter at least one name.', 'error'); return false; }
    if (roomId) {
      const room = roomsRef.current.find(r => r.id === roomId);
      const used = members.filter(m => m.roomId === roomId).length;
      if (room && used + clean.length > room.capacity) {
        toast(`Room ${room.name} has only ${Math.max(0, room.capacity - used)} free bed(s) — you are adding ${clean.length}.`, 'error');
        return false;
      }
    }
    const rows = clean.map(name => ({ id: uid('mem'), organization_id: orgId, name, department: department || null, room_id: roomId || null }));
    const { data, error } = await supabase.from('accommodation_members').insert(rows).select();
    if (error) { toast(`Could not add members: ${friendlyError(error)}`, 'error'); return false; }
    setMembers(prev => {
      let next = prev;
      (data || []).forEach((d: any) => { next = upsert(next, mapMember(d), sortMembers); });
      return next;
    });
    log('Members Added', `${user.name} added ${rows.length} member(s)`, 'success');
    toast(rows.length === 1 ? `${rows[0].name} added.` : `${rows.length} members added.`);
    return true;
  };

  const updateMember: AccommodationCtx['updateMember'] = async (id, patch) => {
    if (!canManageRooms) { toast('Only the department owner can change members and rooms.', 'error'); return false; }
    const body: any = {};
    if (patch.name !== undefined) {
      if (!patch.name.trim()) { toast('Name cannot be empty.', 'error'); return false; }
      body.name = patch.name.trim();
    }
    if (patch.department !== undefined) body.department = patch.department || null;
    if (patch.roomId !== undefined) body.room_id = patch.roomId || null;
    const { data, error } = await supabase.from('accommodation_members').update(body).eq('id', id).select().single();
    if (error) { toast(`Could not update member: ${friendlyError(error)}`, 'error'); return false; }
    const m = mapMember(data);
    setMembers(prev => upsert(prev, m, sortMembers));
    if (patch.roomId !== undefined) {
      const room = roomsRef.current.find(r => r.id === m.roomId);
      log('Member Moved', `${user.name} put ${m.name} in ${room ? `room ${room.name}` : 'no room'}`, 'info');
      toast(room ? `${m.name} → room ${room.name}` : `${m.name} unassigned.`);
    } else {
      toast('Member updated.');
    }
    return true;
  };

  const deleteMember: AccommodationCtx['deleteMember'] = async (id) => {
    if (!canManageRooms) { toast('Only the department owner can remove members.', 'error'); return false; }
    const m = members.find(x => x.id === id);
    const { error } = await supabase.from('accommodation_members').delete().eq('id', id);
    if (error) { toast(`Could not remove member: ${friendlyError(error)}`, 'error'); return false; }
    setMembers(prev => prev.filter(x => x.id !== id));
    log('Member Removed', `${user.name} removed ${m?.name || 'a member'}`, 'warning');
    toast(`${m?.name || 'Member'} removed.`);
    return true;
  };

  // ---- Menu ------------------------------------------------------------------
  const mealsOn = useCallback((date: string) => meals.filter(m => m.date === date), [meals]);

  const createDay: AccommodationCtx['createDay'] = async (date, copyFrom) => {
    if (!canManageMenu) { toast('Only the Accommodation head or owner can edit the menu.', 'error'); return false; }
    const source = copyFrom ? meals.filter(m => m.date === copyFrom) : [];
    const existing = new Set(meals.filter(m => m.date === date).map(m => m.meal));
    // Copy whatever meals the source day had (breakfast, brunch, custom...); otherwise start with the 4 defaults.
    const base = source.length
      ? source.map(m => ({ key: m.meal, label: m.label, start: m.start, end: m.end, items: m.items }))
      : MEALS.map(m => ({ key: m.key, label: m.label, start: m.start, end: m.end, items: '' }));
    const rows = base.filter(b => !existing.has(b.key)).map(b => ({
      id: uid('meal'), organization_id: orgId, menu_date: date, meal: b.key, meal_label: b.label,
      start_time: b.start, end_time: b.end, items: b.items, status: 'scheduled',
    }));
    if (!rows.length) { toast('This day already has these meals.', 'warning'); return false; }
    const { data, error } = await supabase.from('meal_menu').insert(rows).select();
    if (error) { toast(`Could not create the menu: ${friendlyError(error)}`, 'error'); return false; }
    setMeals(prev => {
      let next = prev;
      (data || []).forEach((d: any) => { next = upsert(next, mapMeal(d), sortMeals); });
      return next;
    });
    log('Menu Created', `${user.name} created the menu for ${date}${copyFrom ? ` (copied from ${copyFrom})` : ''}`, 'success');
    toast('Menu created — add the dishes for each meal.');
    return true;
  };

  const saveMeal: AccommodationCtx['saveMeal'] = async (id, patch) => {
    if (!canManageMenu) { toast('Only the Accommodation head or owner can edit the menu.', 'error'); return false; }
    if (patch.end <= patch.start) { toast('End time must be after the start time.', 'error'); return false; }
    const { data, error } = await supabase.from('meal_menu')
      .update({ start_time: patch.start, end_time: patch.end, items: patch.items.trim() }).eq('id', id).select().single();
    if (error) { toast(`Could not save: ${friendlyError(error)}`, 'error'); return false; }
    setMeals(prev => upsert(prev, mapMeal(data), sortMeals));
    toast('Menu saved.');
    return true;
  };

  const setMealStatus: AccommodationCtx['setMealStatus'] = async (id, status) => {
    if (!canManageMenu) { toast('Only the Accommodation head or owner can change the live status.', 'error'); return false; }
    const prev = meals.find(m => m.id === id);
    if (!prev || prev.status === status) return true;
    // Update on screen immediately so the head sees it instantly; the server
    // then stamps who/when and we replace with its version.
    setMeals(p => p.map(m => (m.id === id ? { ...m, status } : m)));
    const { data, error } = await supabase.from('meal_menu').update({ status }).eq('id', id).select().single();
    if (error) {
      setMeals(p => p.map(m => (m.id === id ? prev : m)));
      toast(`Could not change status: ${friendlyError(error)}`, 'error');
      return false;
    }
    setMeals(p => upsert(p, mapMeal(data), sortMeals));
    log('Meal Status', `${user.name} set ${prev.label} on ${prev.date} to ${status}`, 'info');
    return true;
  };

  const deleteDay: AccommodationCtx['deleteDay'] = async (date) => {
    if (!canManageMenu) { toast('Only the Accommodation head or owner can edit the menu.', 'error'); return false; }
    const { error } = await supabase.from('meal_menu').delete().eq('organization_id', orgId).eq('menu_date', date);
    if (error) { toast(`Could not delete: ${friendlyError(error)}`, 'error'); return false; }
    setMeals(prev => prev.filter(m => m.date !== date));
    log('Menu Deleted', `${user.name} deleted the menu for ${date}`, 'warning');
    toast('Menu for that day deleted.');
    return true;
  };

  const addMeal: AccommodationCtx['addMeal'] = async (date, label, start, end) => {
    if (!canManageMenu) { toast('Only the Accommodation head or owner can edit the menu.', 'error'); return false; }
    const name = label.trim();
    const key = mealSlug(name);
    if (!key) { toast('Give the meal a name.', 'error'); return false; }
    if (meals.some(m => m.date === date && m.meal === key)) { toast(`${name} is already on this day.`, 'warning'); return false; }
    const preset = MEAL_PRESETS.find(p => p.key === key);
    const st = start || preset?.start || '12:00';
    const en = end || preset?.end || '13:00';
    if (en <= st) { toast('End time must be after the start time.', 'error'); return false; }
    const row = { id: uid('meal'), organization_id: orgId, menu_date: date, meal: key, meal_label: preset?.label || name, start_time: st, end_time: en, items: '', status: 'scheduled' };
    const { data, error } = await supabase.from('meal_menu').insert(row).select().single();
    if (error) { toast(`Could not add ${name}: ${friendlyError(error)}`, 'error'); return false; }
    setMeals(prev => upsert(prev, mapMeal(data), sortMeals));
    log('Meal Added', `${user.name} added ${name} on ${date}`, 'info');
    toast(`${row.meal_label} added.`);
    return true;
  };

  const deleteMeal: AccommodationCtx['deleteMeal'] = async (id) => {
    if (!canManageMenu) { toast('Only the Accommodation head or owner can edit the menu.', 'error'); return false; }
    const m = meals.find(x => x.id === id);
    const { error } = await supabase.from('meal_menu').delete().eq('id', id);
    if (error) { toast(`Could not remove meal: ${friendlyError(error)}`, 'error'); return false; }
    setMeals(prev => prev.filter(x => x.id !== id));
    log('Meal Removed', `${user.name} removed ${m?.label} on ${m?.date}`, 'warning');
    toast('Meal removed.');
    return true;
  };

  // ---- Theme (shares the walkie module's setting) -----------------------------
  const isDark = w.settings?.theme === 'dark';
  const toggleTheme = () => w.setSettings?.((p: any) => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }));

  const membersInRoom = useCallback((roomId: string) => members.filter(m => m.roomId === roomId), [members]);

  // Built on every render on purpose: the actions close over the latest
  // members/meals/user, and memoizing would risk stale data.
  const value: AccommodationCtx = {
    rooms, members, meals, loading, loadError, canManageRooms, canManageMenu, isDark, toggleTheme, membersInRoom,
    addRoom, updateRoom, deleteRoom, addMembers, updateMember, deleteMember,
    mealsOn, createDay, saveMeal, setMealStatus, deleteDay, addMeal, deleteMeal, refreshMenu,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

