export type TabId = 'now' | 'did-i' | 'memory' | 'inbox';

export type TaskBucket = 'top3' | 'later' | 'parked';

export interface CurrentAnchor {
  title: string;
  note: string;
  startedAt: number | null;
}

export interface FocusTimerState {
  durationSec: number;
  remainingSec: number;
  running: boolean;
  startedAt: number | null;
  label: string;
}

export interface TaskItem {
  id: string;
  title: string;
  bucket: TaskBucket;
  done: boolean;
  doneAt: number | null;
  createdAt: number;
}

export type CheckInCategory = 'meds' | 'safety' | 'selfcare' | 'pet' | 'home';

export interface CheckInItem {
  id: string;
  title: string;
  icon: string;
  category: CheckInCategory;
  lastDoneAt: number | null;
  /** Timestamps (ms) of completions for 7-day history */
  history: number[];
}

export type MemoryCategory = 'keys' | 'car' | 'home' | 'people' | 'other';

export interface MemoryItem {
  id: string;
  title: string;
  answer: string;
  category: MemoryCategory;
  updatedAt: number;
  pinned: boolean;
}

export interface RoutineStep {
  id: string;
  text: string;
  done: boolean;
}

export interface Routine {
  id: string;
  title: string;
  icon: string;
  steps: RoutineStep[];
  lastCompletedAt: number | null;
}

export interface NoteItem {
  id: string;
  text: string;
  createdAt: number;
  pinned: boolean;
}

export interface SmartTagItem {
  id: string;
  name: string;
  attachedTo: string;
  lastNote: string;
  updatedAt: number;
}

export interface AppSettings {
  userName: string;
  soundEnabled: boolean;
  gentleNudges: boolean;
  showCompletedTasks: boolean;
  dailyResetHour: number;
  theme: 'system' | 'light' | 'dark';
  dismissedInstallBanner: boolean;
}

export interface AnchorAppState {
  version: number;
  lastResetDateKey: string;
  anchor: CurrentAnchor;
  timer: FocusTimerState;
  tasks: TaskItem[];
  checkIns: CheckInItem[];
  memories: MemoryItem[];
  routines: Routine[];
  notes: NoteItem[];
  smartTags: SmartTagItem[];
  settings: AppSettings;
}
