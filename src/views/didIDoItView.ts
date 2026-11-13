import { formatRelativeDayTime, getLogicalDateKey, isTimestampInLogicalToday } from '../store';
import type { AnchorStore } from '../store';
import type { AnchorAppState, CheckInItem, Routine } from '../types';
import { playGentleChime, playTapConfirm } from '../audio';
import { escapeHtml } from '../utils/dom';

export interface DidIDoItCallbacks {
  onOpenGuidedRoutine: (routine: Routine) => void;
  onOpenAddCheckIn: () => void;
  onShowToast: (msg: string) => void;
}

function getLast7DayHits(item: CheckInItem, nowMs: number, resetHour: number): boolean[] {
  const hitKeys = new Set(item.history.map((ts) => getLogicalDateKey(ts, resetHour)));
  const dots: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const key = getLogicalDateKey(nowMs - i * 24 * 3600 * 1000, resetHour);
    dots.push(hitKeys.has(key));
  }
  return dots;
}

export function renderDidIDoItView(
  container: HTMLElement,
  store: AnchorStore,
  state: AnchorAppState,
  cb: DidIDoItCallbacks
): void {
  const nowMs = Date.now();
  const resetHour = state.settings.dailyResetHour;

  container.innerHTML = `
    <section aria-labelledby="did-i-heading">
      <div class="section-header">
        <h2 class="section-title" id="did-i-heading">Did I Do It Today?</h2>
        <button type="button" class="section-action" id="btn-add-checkin">+ Add</button>
      </div>
      <div class="checkin-grid">
        ${state.checkIns
          .map((item) => {
            const doneToday = isTimestampInLogicalToday(item.lastDoneAt, nowMs, resetHour);
            const dots = getLast7DayHits(item, nowMs, resetHour);
            return `
            <div class="checkin-card ${doneToday ? 'done-today' : ''}" data-checkin-card="${item.id}">
              <div class="checkin-top">
                <span class="checkin-icon" aria-hidden="true">${escapeHtml(item.icon)}</span>
                <span class="checkin-status-pill">${doneToday ? 'YES ✓' : 'NOT YET'}</span>
              </div>
              <div class="checkin-title">${escapeHtml(item.title)}</div>
              <div class="checkin-timestamp">${escapeHtml(formatRelativeDayTime(item.lastDoneAt, nowMs, resetHour))}</div>
              <div style="display:flex; align-items:center; justify-content:space-between; margin-top:auto; padding-top:4px;">
                <div class="history-dots" title="Last 7 days">
                  ${dots.map((hit) => `<span class="history-dot ${hit ? 'hit' : ''}"></span>`).join('')}
                </div>
                ${
                  doneToday
                    ? `<button type="button" class="ios-btn ios-btn-gray ios-btn-sm" data-undo-checkin="${item.id}" style="min-height:26px; padding:0 8px; font-size:11px;">Undo</button>`
                    : `<button type="button" class="ios-btn ios-btn-tinted ios-btn-sm" data-mark-checkin="${item.id}" style="min-height:28px; padding:0 10px; font-size:12px;">Mark Done</button>`
                }
              </div>
            </div>
          `;
          })
          .join('')}
      </div>
    </section>

    <section aria-labelledby="routines-heading">
      <div class="section-header">
        <h2 class="section-title" id="routines-heading">Step-by-Step Routines</h2>
      </div>
      <div style="display:flex; flex-direction:column; gap:12px;">
        ${state.routines
          .map((r) => {
            const doneCount = r.steps.filter((s) => s.done).length;
            const total = r.steps.length;
            return `
            <div class="ios-card">
              <div class="ios-list-row" style="justify-content:space-between;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <span style="font-size:22px;">${escapeHtml(r.icon)}</span>
                  <div>
                    <div class="ios-row-title" style="font-weight:700;">${escapeHtml(r.title)}</div>
                    <div class="ios-row-meta">${doneCount} of ${total} steps done</div>
                  </div>
                </div>
                <div style="display:flex; gap:6px;">
                  <button type="button" class="ios-btn ios-btn-tinted ios-btn-sm" data-guide-routine="${r.id}">Guide Me</button>
                  ${
                    doneCount > 0
                      ? `<button type="button" class="ios-btn ios-btn-gray ios-btn-sm" data-reset-routine="${r.id}">Reset</button>`
                      : ''
                  }
                </div>
              </div>
              ${r.steps
                .map(
                  (s) => `
                <div class="ios-list-row">
                  <button
                    type="button"
                    class="ios-check-btn ${s.done ? 'checked' : ''}"
                    data-routine-id="${r.id}"
                    data-step-id="${s.id}"
                    aria-label="Toggle ${escapeHtml(s.text)}"
                  >${s.done ? '✓' : ''}</button>
                  <div class="ios-row-body">
                    <div class="ios-row-title ${s.done ? 'done' : ''}">${escapeHtml(s.text)}</div>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          `;
          })
          .join('')}
      </div>
    </section>
  `;

  container.querySelector('#btn-add-checkin')?.addEventListener('click', () => {
    cb.onOpenAddCheckIn();
  });

  container.querySelectorAll<HTMLButtonElement>('[data-mark-checkin]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.markCheckin!;
      store.markCheckInDone(id);
      playTapConfirm(state.settings.soundEnabled);
      cb.onShowToast('Stamped with current time ✓');
    });
  });

  container.querySelectorAll<HTMLButtonElement>('[data-undo-checkin]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.undoCheckin!;
      store.undoCheckInToday(id);
      cb.onShowToast('Undid today’s stamp');
    });
  });

  container.querySelectorAll<HTMLButtonElement>('[data-guide-routine]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const routine = store.getState().routines.find((r) => r.id === btn.dataset.guideRoutine);
      if (routine) cb.onOpenGuidedRoutine(routine);
    });
  });

  container.querySelectorAll<HTMLButtonElement>('[data-reset-routine]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.resetRoutine(btn.dataset.resetRoutine!);
      cb.onShowToast('Routine reset');
    });
  });

  container.querySelectorAll<HTMLButtonElement>('[data-step-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const routineId = btn.dataset.routineId!;
      const stepId = btn.dataset.stepId!;
      store.toggleRoutineStep(routineId, stepId);
      const r = store.getState().routines.find((x) => x.id === routineId);
      if (r && r.steps.every((s) => s.done)) {
        playGentleChime(state.settings.soundEnabled);
        cb.onShowToast(`${r.title} complete!`);
      } else {
        playTapConfirm(state.settings.soundEnabled);
      }
    });
  });
}
