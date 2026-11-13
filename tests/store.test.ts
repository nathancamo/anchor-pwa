import { describe, it, expect } from 'vitest';
import {
  AnchorStore,
  createDefaultState,
  getLogicalDateKey,
  isTimestampInLogicalToday,
} from '../src/store';

describe('AnchorStore & Memory/ADHD Logic', () => {
  it('treats late-night hours before dailyResetHour as the same logical day', () => {
    // 2026-11-13 01:30 AM local time
    const lateNight = new Date(2026, 10, 13, 1, 30, 0).getTime();
    const eveningBefore = new Date(2026, 10, 12, 22, 0, 0).getTime();
    expect(getLogicalDateKey(lateNight, 4)).toBe(getLogicalDateKey(eveningBefore, 4));
    expect(isTimestampInLogicalToday(eveningBefore, lateNight, 4)).toBe(true);

    // 2026-11-13 05:00 AM is a new logical day
    const morning = new Date(2026, 10, 13, 5, 0, 0).getTime();
    expect(getLogicalDateKey(morning, 4)).not.toBe(getLogicalDateKey(eveningBefore, 4));
  });

  it('enforces the Rule of 3 by demoting a 4th active Top 3 task to later', () => {
    const base = createDefaultState(1_700_000_000_000);
    base.tasks = [];
    const store = new AnchorStore(base);

    expect(store.addTask('Task 1', 'top3').demotedToLater).toBe(false);
    expect(store.addTask('Task 2', 'top3').demotedToLater).toBe(false);
    expect(store.addTask('Task 3', 'top3').demotedToLater).toBe(false);

    const fourth = store.addTask('Task 4', 'top3');
    expect(fourth.demotedToLater).toBe(true);
    expect(fourth.added?.bucket).toBe('later');
  });

  it('stamps and undoes "Did I Do It?" check-ins with exact timestamps', () => {
    const now = new Date(2026, 10, 13, 9, 15, 0).getTime();
    const store = new AnchorStore(createDefaultState(now));

    store.markCheckInDone('ci_meds_am', now);
    const afterMark = store.getState().checkIns.find((c) => c.id === 'ci_meds_am')!;
    expect(afterMark.lastDoneAt).toBe(now);
    expect(afterMark.history).toContain(now);

    store.undoCheckInToday('ci_meds_am', now);
    const afterUndo = store.getState().checkIns.find((c) => c.id === 'ci_meds_am')!;
    expect(afterUndo.lastDoneAt).toBeNull();
    expect(afterUndo.history).toHaveLength(0);
  });

  it('stamps car parking location and pins the memory item', () => {
    const now = new Date(2026, 10, 13, 14, 5, 0).getTime();
    const store = new AnchorStore(createDefaultState(now));

    store.stampCarParking('Level 2, Bay B14', now);
    const car = store.getState().memories.find((m) => m.id === 'mem_car')!;
    expect(car.answer).toContain('Level 2, Bay B14');
    expect(car.pinned).toBe(true);
  });

  it('exports and imports JSON backup cleanly', () => {
    const store = new AnchorStore(createDefaultState());
    store.setAnchor('Call Mum', 'Ask about Sunday dinner');
    const json = store.exportJSON();

    const restored = new AnchorStore(createDefaultState());
    const res = restored.importJSON(json);
    expect(res.ok).toBe(true);
    expect(restored.getState().anchor.title).toBe('Call Mum');
    expect(restored.getState().anchor.note).toBe('Ask about Sunday dinner');
  });
});
