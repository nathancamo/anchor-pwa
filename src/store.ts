import type {
  AnchorAppState,
  AppSettings,
  CheckInCategory,
  MemoryCategory,
  MemoryItem,
  NoteItem,
  Routine,
  SmartTagItem,
  TaskBucket,
  TaskItem,
} from './types';

const STORAGE_KEY = 'anchor_pwa_state_v1';
const DB_NAME = 'anchor-pwa-db';
const DB_STORE = 'app_state';
const DB_KEY = 'singleton';

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Computes a logical date key (YYYY-MM-DD) shifted back by `resetHour`
 * so late-night activity (e.g., 12:30 AM) still counts as the same day
 * until `resetHour` (default 4:00 AM).
 */
export function getLogicalDateKey(nowMs: number, resetHour = 4): string {
  const shifted = new Date(nowMs - resetHour * 3600 * 1000);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, '0');
  const d = String(shifted.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isTimestampInLogicalToday(
  ts: number | null,
  nowMs = Date.now(),
  resetHour = 4
): boolean {
  if (!ts) return false;
  return getLogicalDateKey(ts, resetHour) === getLogicalDateKey(nowMs, resetHour);
}

export function formatTimeShort(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatRelativeDayTime(ts: number | null, nowMs = Date.now(), resetHour = 4): string {
  if (!ts) return 'Not recorded yet';
  if (isTimestampInLogicalToday(ts, nowMs, resetHour)) {
    return `Today at ${formatTimeShort(ts)}`;
  }
  const yesterdayMs = nowMs - 24 * 3600 * 1000;
  if (getLogicalDateKey(ts, resetHour) === getLogicalDateKey(yesterdayMs, resetHour)) {
    return `Yesterday at ${formatTimeShort(ts)}`;
  }
  const d = new Date(ts);
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${formatTimeShort(ts)}`;
}

export function createDefaultState(nowMs = Date.now()): AnchorAppState {
  const resetHour = 4;
  return {
    version: 1,
    lastResetDateKey: getLogicalDateKey(nowMs, resetHour),
    anchor: {
      title: 'Take a breath & pick one thing',
      note: 'Tap "Change" whenever you switch tasks so you never lose your place.',
      startedAt: nowMs,
    },
    timer: {
      durationSec: 15 * 60,
      remainingSec: 15 * 60,
      running: false,
      startedAt: null,
      label: '15m Focus Sprint',
    },
    tasks: [
      {
        id: uid('task'),
        title: 'Drink a full glass of water',
        bucket: 'top3',
        done: false,
        doneAt: null,
        createdAt: nowMs,
      },
      {
        id: uid('task'),
        title: 'Check today’s messages & reply to 1 person',
        bucket: 'top3',
        done: false,
        doneAt: null,
        createdAt: nowMs - 1000,
      },
      {
        id: uid('task'),
        title: '10-minute tidy of desk or kitchen bench',
        bucket: 'later',
        done: false,
        doneAt: null,
        createdAt: nowMs - 2000,
      },
    ],
    checkIns: [
      {
        id: 'ci_meds_am',
        title: 'Took Morning Meds',
        icon: '💊',
        category: 'meds',
        lastDoneAt: null,
        history: [],
      },
      {
        id: 'ci_water',
        title: 'Drank Water',
        icon: '💧',
        category: 'selfcare',
        lastDoneAt: null,
        history: [],
      },
      {
        id: 'ci_ate',
        title: 'Ate a Proper Meal',
        icon: '🍽️',
        category: 'selfcare',
        lastDoneAt: null,
        history: [],
      },
      {
        id: 'ci_door',
        title: 'Locked Front Door',
        icon: '🔒',
        category: 'safety',
        lastDoneAt: null,
        history: [],
      },
      {
        id: 'ci_stove',
        title: 'Stove & Appliances Off',
        icon: '🔥',
        category: 'safety',
        lastDoneAt: null,
        history: [],
      },
      {
        id: 'ci_meds_pm',
        title: 'Took Evening Meds',
        icon: '🌙',
        category: 'meds',
        lastDoneAt: null,
        history: [],
      },
    ],
    memories: [
      {
        id: 'mem_car',
        title: 'Where I Parked the Car',
        answer: 'Tap "Update Car Spot" when you park to stamp time & bay',
        category: 'car',
        updatedAt: nowMs,
        pinned: true,
      },
      {
        id: 'mem_keys',
        title: 'House & Car Keys',
        answer: 'Hook / bowl right inside the front door',
        category: 'keys',
        updatedAt: nowMs,
        pinned: true,
      },
      {
        id: 'mem_wallet',
        title: 'Wallet & Everyday Bag',
        answer: 'On the entry table next to the keys',
        category: 'keys',
        updatedAt: nowMs,
        pinned: false,
      },
    ],
    routines: [
      {
        id: 'rt_leave',
        title: 'Leaving the House',
        icon: '🚪',
        lastCompletedAt: null,
        steps: [
          { id: uid('st'), text: 'Keys in pocket / hand', done: false },
          { id: uid('st'), text: 'Wallet & ID', done: false },
          { id: uid('st'), text: 'Phone charged & in pocket', done: false },
          { id: uid('st'), text: 'Stove / heater / iron off', done: false },
          { id: uid('st'), text: 'Front door locked behind me', done: false },
        ],
      },
      {
        id: 'rt_morning',
        title: 'Morning Reset',
        icon: '☀️',
        lastCompletedAt: null,
        steps: [
          { id: uid('st'), text: 'Drink a glass of water', done: false },
          { id: uid('st'), text: 'Take morning meds (tap Did I?)', done: false },
          { id: uid('st'), text: 'Open blinds / get 2 min daylight', done: false },
          { id: uid('st'), text: 'Pick Top 3 for today', done: false },
        ],
      },
      {
        id: 'rt_night',
        title: 'Evening Wind-Down',
        icon: '🌙',
        lastCompletedAt: null,
        steps: [
          { id: uid('st'), text: 'Put keys & wallet in their spot', done: false },
          { id: uid('st'), text: 'Plug phone in to charge', done: false },
          { id: uid('st'), text: 'Lock doors & check stove', done: false },
          { id: uid('st'), text: 'Set tomorrow’s 1st anchor', done: false },
        ],
      },
    ],
    notes: [
      {
        id: uid('note'),
        text: 'Use this space whenever you think "wait, what was I just about to say or look up?"',
        createdAt: nowMs,
        pinned: false,
      },
    ],
    smartTags: [
      {
        id: 'tag_keys',
        name: 'Temu Smart Tag',
        attachedTo: 'House & Car Keys',
        lastNote: 'Tap "Open Find Hub" to ring or see live map location',
        updatedAt: nowMs,
      },
    ],
    settings: {
      userName: 'Brad',
      soundEnabled: true,
      gentleNudges: true,
      showCompletedTasks: true,
      dailyResetHour: resetHour,
      theme: 'system',
      dismissedInstallBanner: false,
    },
  };
}

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function readFromIDB(): Promise<AnchorAppState | null> {
  try {
    const db = await openDB();
    if (!db) return null;
    return await new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const store = tx.objectStore(DB_STORE);
      const req = store.get(DB_KEY);
      req.onsuccess = () => resolve((req.result as AnchorAppState) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function writeToIDB(state: AnchorAppState): Promise<void> {
  try {
    const db = await openDB();
    if (!db) return;
    await new Promise<void>((resolve) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      store.put(state, DB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore IDB errors; localStorage mirror still persists
  }
}

export function applyDailyResetIfNeeded(state: AnchorAppState, nowMs = Date.now()): boolean {
  const resetHour = state.settings?.dailyResetHour ?? 4;
  const todayKey = getLogicalDateKey(nowMs, resetHour);
  if (state.lastResetDateKey === todayKey) return false;

  state.lastResetDateKey = todayKey;
  // Reset daily routine checkboxes so they're fresh for today
  for (const routine of state.routines) {
    for (const step of routine.steps) {
      step.done = false;
    }
  }
  return true;
}

type Listener = (state: AnchorAppState) => void;

export class AnchorStore {
  private state: AnchorAppState;
  private listeners = new Set<Listener>();

  constructor(initial?: AnchorAppState) {
    this.state = initial ?? this.loadSync();
    applyDailyResetIfNeeded(this.state);
  }

  private loadSync(): AnchorAppState {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as AnchorAppState;
          if (parsed && typeof parsed === 'object' && Array.isArray(parsed.checkIns)) {
            return this.mergeWithDefaults(parsed);
          }
        }
      }
    } catch {
      // Fallback to default
    }
    return createDefaultState();
  }

  private mergeWithDefaults(partial: Partial<AnchorAppState>): AnchorAppState {
    const def = createDefaultState();
    return {
      ...def,
      ...partial,
      anchor: { ...def.anchor, ...(partial.anchor ?? {}) },
      timer: { ...def.timer, ...(partial.timer ?? {}) },
      settings: { ...def.settings, ...(partial.settings ?? {}) },
      tasks: Array.isArray(partial.tasks) ? partial.tasks : def.tasks,
      checkIns: Array.isArray(partial.checkIns) ? partial.checkIns : def.checkIns,
      memories: Array.isArray(partial.memories) ? partial.memories : def.memories,
      routines: Array.isArray(partial.routines) ? partial.routines : def.routines,
      notes: Array.isArray(partial.notes) ? partial.notes : def.notes,
      smartTags: Array.isArray(partial.smartTags) ? partial.smartTags : def.smartTags,
    };
  }

  async hydrateFromIndexedDB(): Promise<void> {
    const idbState = await readFromIDB();
    if (idbState && Array.isArray(idbState.checkIns)) {
      this.state = this.mergeWithDefaults(idbState);
      applyDailyResetIfNeeded(this.state);
      this.emit();
    }
  }

  getState(): AnchorAppState {
    return this.state;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private persist(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch {
      // Ignore quota errors
    }
    void writeToIDB(this.state);
  }

  private emit(): void {
    this.persist();
    for (const fn of this.listeners) {
      fn(this.state);
    }
  }

  checkDailyReset(nowMs = Date.now()): void {
    if (applyDailyResetIfNeeded(this.state, nowMs)) {
      this.emit();
    }
  }

  // --- Current Anchor ---
  setAnchor(title: string, note = '', nowMs = Date.now()): void {
    const clean = title.trim();
    if (!clean) return;
    this.state.anchor = {
      title: clean,
      note: note.trim(),
      startedAt: nowMs,
    };
    this.emit();
  }

  refocusAnchor(nowMs = Date.now()): void {
    this.state.anchor.startedAt = nowMs;
    this.emit();
  }

  // --- Timer ---
  setTimerDuration(minutes: number, label?: string): void {
    const sec = Math.max(60, Math.round(minutes * 60));
    this.state.timer = {
      durationSec: sec,
      remainingSec: sec,
      running: false,
      startedAt: null,
      label: label ?? `${minutes}m Focus`,
    };
    this.emit();
  }

  updateTimer(patch: Partial<AnchorAppState['timer']>, silent = false): void {
    this.state.timer = { ...this.state.timer, ...patch };
    if (silent) {
      this.persist();
    } else {
      this.emit();
    }
  }

  // --- Tasks ---
  addTask(title: string, bucket: TaskBucket = 'later', nowMs = Date.now()): { added: TaskItem | null; demotedToLater: boolean } {
    const clean = title.trim();
    if (!clean) return { added: null, demotedToLater: false };
    let targetBucket = bucket;
    let demotedToLater = false;
    if (bucket === 'top3') {
      const activeTop3 = this.state.tasks.filter((t) => t.bucket === 'top3' && !t.done).length;
      if (activeTop3 >= 3) {
        targetBucket = 'later';
        demotedToLater = true;
      }
    }
    const item: TaskItem = {
      id: uid('task'),
      title: clean,
      bucket: targetBucket,
      done: false,
      doneAt: null,
      createdAt: nowMs,
    };
    this.state.tasks.unshift(item);
    this.emit();
    return { added: item, demotedToLater };
  }

  toggleTask(id: string, nowMs = Date.now()): void {
    const task = this.state.tasks.find((t) => t.id === id);
    if (!task) return;
    task.done = !task.done;
    task.doneAt = task.done ? nowMs : null;
    this.emit();
  }

  moveTaskBucket(id: string, bucket: TaskBucket): { ok: boolean; reason?: string } {
    const task = this.state.tasks.find((t) => t.id === id);
    if (!task) return { ok: false };
    if (bucket === 'top3' && !task.done) {
      const activeTop3 = this.state.tasks.filter((t) => t.bucket === 'top3' && !t.done && t.id !== id).length;
      if (activeTop3 >= 3) {
        return { ok: false, reason: 'Top 3 is full! Complete or move one first to keep overwhelm low.' };
      }
    }
    task.bucket = bucket;
    this.emit();
    return { ok: true };
  }

  deleteTask(id: string): void {
    this.state.tasks = this.state.tasks.filter((t) => t.id !== id);
    this.emit();
  }

  clearCompletedTasks(): void {
    this.state.tasks = this.state.tasks.filter((t) => !t.done);
    this.emit();
  }

  // --- Did I Do It? Check-ins ---
  markCheckInDone(id: string, nowMs = Date.now()): void {
    const item = this.state.checkIns.find((c) => c.id === id);
    if (!item) return;
    const resetHour = this.state.settings.dailyResetHour;
    if (isTimestampInLogicalToday(item.lastDoneAt, nowMs, resetHour)) {
      // Already done today — allow undo if tapped intentionally via undoCheckIn
      return;
    }
    item.lastDoneAt = nowMs;
    const cutoff = nowMs - 14 * 24 * 3600 * 1000;
    item.history = [...item.history.filter((ts) => ts >= cutoff), nowMs];
    this.emit();
  }

  undoCheckInToday(id: string, nowMs = Date.now()): void {
    const item = this.state.checkIns.find((c) => c.id === id);
    if (!item) return;
    const resetHour = this.state.settings.dailyResetHour;
    const todayKey = getLogicalDateKey(nowMs, resetHour);
    item.history = item.history.filter((ts) => getLogicalDateKey(ts, resetHour) !== todayKey);
    item.lastDoneAt = item.history.length > 0 ? item.history[item.history.length - 1] : null;
    this.emit();
  }

  addCheckIn(title: string, icon = '✅', category: CheckInCategory = 'selfcare'): void {
    const clean = title.trim();
    if (!clean) return;
    this.state.checkIns.push({
      id: uid('ci'),
      title: clean,
      icon: icon.trim() || '✅',
      category,
      lastDoneAt: null,
      history: [],
    });
    this.emit();
  }

  deleteCheckIn(id: string): void {
    this.state.checkIns = this.state.checkIns.filter((c) => c.id !== id);
    this.emit();
  }

  // --- Memory Vault ("Where Did I Put It?") ---
  addMemory(title: string, answer: string, category: MemoryCategory = 'other', pinned = false, nowMs = Date.now()): void {
    const t = title.trim();
    const a = answer.trim();
    if (!t || !a) return;
    const item: MemoryItem = {
      id: uid('mem'),
      title: t,
      answer: a,
      category,
      updatedAt: nowMs,
      pinned,
    };
    this.state.memories.unshift(item);
    this.emit();
  }

  updateMemory(id: string, patch: Partial<Pick<MemoryItem, 'title' | 'answer' | 'category' | 'pinned'>>, nowMs = Date.now()): void {
    const item = this.state.memories.find((m) => m.id === id);
    if (!item) return;
    Object.assign(item, patch, { updatedAt: nowMs });
    this.emit();
  }

  stampCarParking(location: string, nowMs = Date.now()): void {
    const clean = location.trim();
    if (!clean) return;
    const car = this.state.memories.find((m) => m.id === 'mem_car' || m.category === 'car');
    const stamped = `${clean} (Parked ${formatTimeShort(nowMs)})`;
    if (car) {
      car.answer = stamped;
      car.updatedAt = nowMs;
      car.pinned = true;
    } else {
      this.state.memories.unshift({
        id: 'mem_car',
        title: 'Where I Parked the Car',
        answer: stamped,
        category: 'car',
        updatedAt: nowMs,
        pinned: true,
      });
    }
    this.emit();
  }

  deleteMemory(id: string): void {
    this.state.memories = this.state.memories.filter((m) => m.id !== id);
    this.emit();
  }

  // --- Routines ---
  toggleRoutineStep(routineId: string, stepId: string, nowMs = Date.now()): void {
    const routine = this.state.routines.find((r) => r.id === routineId);
    if (!routine) return;
    const step = routine.steps.find((s) => s.id === stepId);
    if (!step) return;
    step.done = !step.done;
    if (routine.steps.length > 0 && routine.steps.every((s) => s.done)) {
      routine.lastCompletedAt = nowMs;
    }
    this.emit();
  }

  resetRoutine(routineId: string): void {
    const routine = this.state.routines.find((r) => r.id === routineId);
    if (!routine) return;
    for (const s of routine.steps) s.done = false;
    this.emit();
  }

  addRoutine(title: string, icon: string, stepsText: string[]): void {
    const clean = title.trim();
    const steps = stepsText.map((s) => s.trim()).filter(Boolean);
    if (!clean || steps.length === 0) return;
    const r: Routine = {
      id: uid('rt'),
      title: clean,
      icon: icon.trim() || '📋',
      lastCompletedAt: null,
      steps: steps.map((text) => ({ id: uid('st'), text, done: false })),
    };
    this.state.routines.push(r);
    this.emit();
  }

  // --- Quick Notes ("What Was I Saying?") ---
  addNote(text: string, nowMs = Date.now()): void {
    const clean = text.trim();
    if (!clean) return;
    const note: NoteItem = {
      id: uid('note'),
      text: clean,
      createdAt: nowMs,
      pinned: false,
    };
    this.state.notes.unshift(note);
    this.emit();
  }

  togglePinNote(id: string): void {
    const n = this.state.notes.find((x) => x.id === id);
    if (!n) return;
    n.pinned = !n.pinned;
    this.emit();
  }

  deleteNote(id: string): void {
    this.state.notes = this.state.notes.filter((n) => n.id !== id);
    this.emit();
  }

  // --- Smart Tags (Google Find Hub) ---
  addSmartTag(name: string, attachedTo: string, lastNote = '', nowMs = Date.now()): void {
    const cleanName = name.trim();
    const cleanAttached = attachedTo.trim();
    if (!cleanName || !cleanAttached) return;
    const tag: SmartTagItem = {
      id: uid('tag'),
      name: cleanName,
      attachedTo: cleanAttached,
      lastNote: lastNote.trim() || 'Linked to Google Find Hub',
      updatedAt: nowMs,
    };
    this.state.smartTags.unshift(tag);
    this.emit();
  }

  updateSmartTagNote(id: string, lastNote: string, nowMs = Date.now()): void {
    const tag = this.state.smartTags.find((t) => t.id === id);
    if (!tag) return;
    tag.lastNote = lastNote.trim();
    tag.updatedAt = nowMs;
    this.emit();
  }

  deleteSmartTag(id: string): void {
    this.state.smartTags = this.state.smartTags.filter((t) => t.id !== id);
    this.emit();
  }

  // --- Settings & Backup ---
  updateSettings(patch: Partial<AppSettings>): void {
    this.state.settings = { ...this.state.settings, ...patch };
    this.emit();
  }

  exportJSON(): string {
    return JSON.stringify(this.state, null, 2);
  }

  importJSON(jsonStr: string): { ok: boolean; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr) as Partial<AnchorAppState>;
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.checkIns)) {
        return { ok: false, error: 'Invalid Anchor backup file.' };
      }
      this.state = this.mergeWithDefaults(parsed);
      applyDailyResetIfNeeded(this.state);
      this.emit();
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not parse JSON backup.' };
    }
  }
}
