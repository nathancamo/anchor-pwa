import type { AnchorStore } from '../store';
import type { AnchorAppState } from '../types';
import { playTapConfirm } from '../audio';
import { isSpeechSupported, startVoiceDictation } from '../speech';
import { escapeHtml } from '../utils/dom';

export interface InboxViewCallbacks {
  onShowToast: (msg: string) => void;
}

type InboxFilter = 'active' | 'parked' | 'done';
let currentFilter: InboxFilter = 'active';

export function renderInboxView(
  container: HTMLElement,
  store: AnchorStore,
  state: AnchorAppState,
  cb: InboxViewCallbacks
): void {
  const voiceOk = isSpeechSupported();

  const filtered = state.tasks.filter((t) => {
    if (currentFilter === 'done') return t.done;
    if (currentFilter === 'parked') return !t.done && t.bucket === 'parked';
    return !t.done && (t.bucket === 'later' || t.bucket === 'top3');
  });

  const doneCount = state.tasks.filter((t) => t.done).length;

  container.innerHTML = `
    <section aria-labelledby="dump-heading">
      <div class="section-header">
        <h2 class="section-title" id="dump-heading">Brain Dump — Catch Everything</h2>
      </div>
      <form id="inbox-capture-form" class="quick-capture-bar">
        <input type="text" id="inbox-capture-input" class="ios-input" placeholder="Get it out of your head…" aria-label="Brain dump task" />
        ${
          voiceOk
            ? `<button type="button" class="ios-btn ios-btn-tinted" id="btn-inbox-voice" aria-label="Voice brain dump">🎙️</button>`
            : ''
        }
        <button type="submit" class="ios-btn ios-btn-primary">Dump</button>
      </form>
    </section>

    <section aria-label="Filter brain dump">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:10px;">
        <div class="filter-pills">
          <button type="button" class="filter-pill ${currentFilter === 'active' ? 'active' : ''}" data-inbox-filter="active">Do Soon</button>
          <button type="button" class="filter-pill ${currentFilter === 'parked' ? 'active' : ''}" data-inbox-filter="parked">Parked</button>
          <button type="button" class="filter-pill ${currentFilter === 'done' ? 'active' : ''}" data-inbox-filter="done">Done (${doneCount})</button>
        </div>
        ${
          currentFilter === 'done' && doneCount > 0
            ? `<button type="button" class="section-action" id="btn-clear-done">Clear Done</button>`
            : ''
        }
      </div>

      <div class="ios-card">
        ${
          filtered.length === 0
            ? `<div class="empty-state">Nothing here right now. Your head is clear!</div>`
            : filtered
                .map(
                  (t) => `
          <div class="ios-list-row">
            <button
              type="button"
              class="ios-check-btn ${t.done ? 'checked' : ''}"
              data-inbox-toggle="${t.id}"
              aria-label="Toggle ${escapeHtml(t.title)}"
            >${t.done ? '✓' : ''}</button>
            <div class="ios-row-body">
              <div class="ios-row-title ${t.done ? 'done' : ''}">${escapeHtml(t.title)}</div>
              <div class="ios-row-meta">${t.bucket === 'top3' ? '⭐ In Today’s Top 3' : t.bucket === 'parked' ? '🅿️ Parked for later' : 'Inbox'}</div>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">
              ${
                !t.done && t.bucket !== 'top3'
                  ? `<button type="button" class="ios-btn ios-btn-tinted ios-btn-sm" data-promote="${t.id}">Top 3</button>`
                  : ''
              }
              ${
                !t.done
                  ? `<button type="button" class="ios-btn ios-btn-gray ios-btn-sm" data-focus-inbox="${t.id}">Now</button>`
                  : ''
              }
              <button type="button" class="ios-btn ios-btn-danger-tinted ios-btn-sm" data-del-task="${t.id}" aria-label="Delete task">✕</button>
            </div>
          </div>
        `
                )
                .join('')
        }
      </div>
    </section>
  `;

  container.querySelector('#inbox-capture-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = container.querySelector<HTMLInputElement>('#inbox-capture-input');
    if (!inp || !inp.value.trim()) return;
    store.addTask(inp.value.trim(), currentFilter === 'parked' ? 'parked' : 'later');
    inp.value = '';
    playTapConfirm(state.settings.soundEnabled);
  });

  container.querySelector('#btn-inbox-voice')?.addEventListener('click', () => {
    const btn = container.querySelector<HTMLButtonElement>('#btn-inbox-voice');
    if (btn) btn.textContent = '⏺️';
    startVoiceDictation({
      onTranscript: (text) => {
        store.addTask(text, 'later');
        playTapConfirm(state.settings.soundEnabled);
        cb.onShowToast('Captured from voice!');
      },
      onError: (msg) => cb.onShowToast(msg),
      onEnd: () => {
        if (btn) btn.textContent = '🎙️';
      },
    });
  });

  container.querySelectorAll<HTMLButtonElement>('[data-inbox-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.inboxFilter as InboxFilter;
      renderInboxView(container, store, store.getState(), cb);
    });
  });

  container.querySelector('#btn-clear-done')?.addEventListener('click', () => {
    store.clearCompletedTasks();
    cb.onShowToast('Cleared completed items');
  });

  container.querySelectorAll<HTMLButtonElement>('[data-inbox-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.toggleTask(btn.dataset.inboxToggle!);
      playTapConfirm(state.settings.soundEnabled);
    });
  });

  container.querySelectorAll<HTMLButtonElement>('[data-promote]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const res = store.moveTaskBucket(btn.dataset.promote!, 'top3');
      if (!res.ok && res.reason) {
        cb.onShowToast(res.reason);
      } else {
        playTapConfirm(state.settings.soundEnabled);
        cb.onShowToast('Added to Today’s Top 3 ⭐');
      }
    });
  });

  container.querySelectorAll<HTMLButtonElement>('[data-focus-inbox]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const task = store.getState().tasks.find((t) => t.id === btn.dataset.focusInbox);
      if (task) {
        store.setAnchor(task.title, 'Focused from Brain Dump');
        playTapConfirm(state.settings.soundEnabled);
        cb.onShowToast(`Right Now: ${task.title}`);
      }
    });
  });

  container.querySelectorAll<HTMLButtonElement>('[data-del-task]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.deleteTask(btn.dataset.delTask!);
    });
  });
}
