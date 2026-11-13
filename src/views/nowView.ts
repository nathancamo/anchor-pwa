import type { AnchorStore } from '../store';
import type { AnchorAppState } from '../types';
import { playGentleChime, playRefocusNudge, playTapConfirm } from '../audio';
import { escapeHtml, formatClockMMSS, formatElapsed } from '../utils/dom';

export interface NowViewCallbacks {
  onOpenAnchorModal: () => void;
  onShowToast: (msg: string) => void;
  onOpenTab: (tab: 'now' | 'did-i' | 'memory' | 'inbox') => void;
}

export function renderNowView(
  container: HTMLElement,
  store: AnchorStore,
  state: AnchorAppState,
  cb: NowViewCallbacks
): void {
  const { anchor, timer, tasks, settings } = state;
  const top3 = tasks.filter((t) => t.bucket === 'top3' && (settings.showCompletedTasks || !t.done));
  const activeTop3Count = tasks.filter((t) => t.bucket === 'top3' && !t.done).length;

  const radius = 37;
  const circumference = 2 * Math.PI * radius;
  const pct = timer.durationSec > 0 ? timer.remainingSec / timer.durationSec : 1;
  const dashOffset = circumference * (1 - Math.max(0, Math.min(1, pct)));

  container.innerHTML = `
    <section class="anchor-card" aria-labelledby="anchor-heading">
      <div class="anchor-badge-row">
        <span class="anchor-badge">⚓ Right Now</span>
        <span class="anchor-elapsed" id="anchor-elapsed-text">${escapeHtml(formatElapsed(anchor.startedAt))}</span>
      </div>
      <h2 class="anchor-title" id="anchor-heading">${escapeHtml(anchor.title)}</h2>
      ${anchor.note ? `<p class="anchor-note">${escapeHtml(anchor.note)}</p>` : ''}
      <div class="anchor-actions">
        <button type="button" class="ios-btn ios-btn-primary ios-btn-sm" id="btn-change-anchor">Change</button>
        <button type="button" class="ios-btn ios-btn-tinted ios-btn-sm" id="btn-refocus-anchor">Got Distracted — Refocus</button>
        <button type="button" class="ios-btn ios-btn-success ios-btn-sm" id="btn-done-anchor">Done ✓</button>
      </div>
    </section>

    <section aria-labelledby="timer-heading">
      <div class="section-header">
        <h3 class="section-title" id="timer-heading">Focus Timer</h3>
        <span class="ios-row-meta">${escapeHtml(timer.label)}</span>
      </div>
      <div class="ios-card timer-card">
        <div class="timer-ring-wrap">
          <svg class="timer-ring-svg" viewBox="0 0 88 88" aria-hidden="true">
            <circle class="timer-ring-track" cx="44" cy="44" r="${radius}"></circle>
            <circle
              class="timer-ring-progress"
              id="timer-ring-circle"
              cx="44"
              cy="44"
              r="${radius}"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${dashOffset}"
            ></circle>
          </svg>
          <span class="timer-clock" id="timer-clock-text">${formatClockMMSS(timer.remainingSec)}</span>
        </div>
        <div class="timer-info">
          <div class="timer-presets" role="group" aria-label="Timer duration presets">
            <button type="button" class="preset-chip ${timer.durationSec === 300 ? 'active' : ''}" data-mins="5" data-label="5m Just Start">5m Start</button>
            <button type="button" class="preset-chip ${timer.durationSec === 900 ? 'active' : ''}" data-mins="15" data-label="15m Focus Sprint">15m Sprint</button>
            <button type="button" class="preset-chip ${timer.durationSec === 1500 ? 'active' : ''}" data-mins="25" data-label="25m Deep Block">25m Block</button>
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" class="ios-btn ios-btn-primary ios-btn-sm" id="btn-timer-toggle">
              ${timer.running ? 'Pause' : timer.remainingSec < timer.durationSec ? 'Resume' : 'Start'}
            </button>
            <button type="button" class="ios-btn ios-btn-gray ios-btn-sm" id="btn-timer-reset">Reset</button>
          </div>
        </div>
      </div>
    </section>

    <section aria-labelledby="top3-heading">
      <div class="section-header">
        <h3 class="section-title" id="top3-heading">Today’s Top 3 (${activeTop3Count}/3)</h3>
        <button type="button" class="section-action" id="btn-see-inbox">Brain Dump →</button>
      </div>
      <div class="ios-card">
        ${
          top3.length === 0
            ? `<div class="empty-state">No Top 3 tasks right now. Add one below or promote from Brain Dump!</div>`
            : top3
                .map(
                  (t) => `
          <div class="ios-list-row">
            <button
              type="button"
              class="ios-check-btn ${t.done ? 'checked' : ''}"
              data-toggle-task="${t.id}"
              aria-label="Mark ${escapeHtml(t.title)} as ${t.done ? 'not done' : 'done'}"
            >${t.done ? '✓' : ''}</button>
            <div class="ios-row-body">
              <div class="ios-row-title ${t.done ? 'done' : ''}">${escapeHtml(t.title)}</div>
            </div>
            ${
              !t.done
                ? `<button type="button" class="ios-btn ios-btn-tinted ios-btn-sm" data-focus-task="${t.id}">Focus</button>`
                : ''
            }
          </div>
        `
                )
                .join('')
        }
      </div>
      <form id="top3-quick-form" class="quick-capture-bar" style="margin-top:10px;">
        <input
          type="text"
          id="top3-quick-input"
          class="ios-input"
          placeholder="${activeTop3Count >= 3 ? 'Add to Brain Dump (Top 3 is full)…' : 'Add a Top 3 priority…'}"
          aria-label="Add a priority task"
        />
        <button type="submit" class="ios-btn ios-btn-primary">Add</button>
      </form>
    </section>
  `;

  container.querySelector('#btn-change-anchor')?.addEventListener('click', () => {
    cb.onOpenAnchorModal();
  });

  container.querySelector('#btn-refocus-anchor')?.addEventListener('click', () => {
    store.refocusAnchor();
    playRefocusNudge(settings.soundEnabled);
    cb.onShowToast(`Back to: ${state.anchor.title}`);
  });

  container.querySelector('#btn-done-anchor')?.addEventListener('click', () => {
    playGentleChime(settings.soundEnabled);
    const nextTop = state.tasks.find((t) => t.bucket === 'top3' && !t.done);
    if (nextTop) {
      store.setAnchor(nextTop.title, 'From Today’s Top 3');
      cb.onShowToast('Nice work! Loaded your next Top 3.');
    } else {
      store.setAnchor('Take a short break', 'Hydrate, stretch, or pick your next small step.');
      cb.onShowToast('Anchor completed! Take a breather.');
    }
  });

  container.querySelectorAll<HTMLButtonElement>('[data-mins]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mins = Number(btn.dataset.mins || '15');
      const label = btn.dataset.label || `${mins}m Focus`;
      store.setTimerDuration(mins, label);
    });
  });

  container.querySelector('#btn-timer-toggle')?.addEventListener('click', () => {
    const cur = store.getState().timer;
    if (cur.running) {
      store.updateTimer({ running: false, startedAt: null });
    } else {
      const remaining = cur.remainingSec <= 0 ? cur.durationSec : cur.remainingSec;
      store.updateTimer({
        running: true,
        remainingSec: remaining,
        startedAt: Date.now(),
      });
    }
  });

  container.querySelector('#btn-timer-reset')?.addEventListener('click', () => {
    const cur = store.getState().timer;
    store.updateTimer({
      running: false,
      remainingSec: cur.durationSec,
      startedAt: null,
    });
  });

  container.querySelector('#btn-see-inbox')?.addEventListener('click', () => {
    cb.onOpenTab('inbox');
  });

  container.querySelectorAll<HTMLButtonElement>('[data-toggle-task]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.toggleTask!;
      store.toggleTask(id);
      playTapConfirm(settings.soundEnabled);
    });
  });

  container.querySelectorAll<HTMLButtonElement>('[data-focus-task]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.focusTask!;
      const task = store.getState().tasks.find((t) => t.id === id);
      if (task) {
        store.setAnchor(task.title, 'Focused from Today’s Top 3');
        playTapConfirm(settings.soundEnabled);
        cb.onShowToast('Set as Right Now Anchor');
      }
    });
  });

  container.querySelector('#top3-quick-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = container.querySelector<HTMLInputElement>('#top3-quick-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    const res = store.addTask(val, 'top3');
    input.value = '';
    playTapConfirm(settings.soundEnabled);
    if (res.demotedToLater) {
      cb.onShowToast('Top 3 is full — saved to Brain Dump!');
    }
  });
}
