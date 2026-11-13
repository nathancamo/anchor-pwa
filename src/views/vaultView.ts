import { formatRelativeDayTime } from '../store';
import type { AnchorStore } from '../store';
import type { AnchorAppState, MemoryCategory } from '../types';
import { playTapConfirm } from '../audio';
import { isSpeechSupported, startVoiceDictation } from '../speech';
import { escapeHtml } from '../utils/dom';

export interface VaultViewCallbacks {
  onOpenAddMemory: () => void;
  onShowToast: (msg: string) => void;
}

const CAT_LABELS: Record<MemoryCategory | 'all', string> = {
  all: 'All',
  keys: 'Keys & Wallet',
  car: 'Car',
  home: 'Home',
  people: 'People',
  other: 'Other',
};

let currentSearch = '';
let currentCategory: MemoryCategory | 'all' = 'all';

export function renderVaultView(
  container: HTMLElement,
  store: AnchorStore,
  state: AnchorAppState,
  cb: VaultViewCallbacks
): void {
  const q = currentSearch.trim().toLowerCase();
  const filtered = state.memories
    .filter((m) => (currentCategory === 'all' ? true : m.category === currentCategory))
    .filter((m) =>
      !q ? true : m.title.toLowerCase().includes(q) || m.answer.toLowerCase().includes(q)
    )
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);

  const carMemory = state.memories.find((m) => m.id === 'mem_car' || m.category === 'car');
  const voiceOk = isSpeechSupported();

  container.innerHTML = `
    <section aria-labelledby="car-stamp-heading">
      <div class="section-header">
        <h2 class="section-title" id="car-stamp-heading">Quick Car Parking Stamp</h2>
      </div>
      <div class="ios-card ios-card-padded" style="display:flex; flex-direction:column; gap:10px;">
        <div style="font-size:15px; font-weight:600;">
          🚗 ${escapeHtml(carMemory ? carMemory.answer : 'Tap a preset or type where you parked')}
        </div>
        <div class="filter-pills">
          <button type="button" class="preset-chip" data-car-preset="Level 1">Level 1</button>
          <button type="button" class="preset-chip" data-car-preset="Level 2">Level 2</button>
          <button type="button" class="preset-chip" data-car-preset="Roof / Top">Roof</button>
          <button type="button" class="preset-chip" data-car-preset="Street out front">Street</button>
          <button type="button" class="preset-chip" data-car-preset="Driveway">Driveway</button>
        </div>
        <form id="car-custom-form" class="quick-capture-bar">
          <input type="text" id="car-custom-input" class="ios-input" placeholder="e.g. Level 2, Bay B14 near lift" aria-label="Custom parking spot" />
          <button type="submit" class="ios-btn ios-btn-primary">Stamp</button>
        </form>
      </div>
    </section>

    <section aria-labelledby="where-heading">
      <div class="section-header">
        <h2 class="section-title" id="where-heading">Where Did I Put It?</h2>
        <button type="button" class="section-action" id="btn-add-memory">+ Add Item</button>
      </div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <input
          type="search"
          id="vault-search-input"
          class="ios-input"
          value="${escapeHtml(currentSearch)}"
          placeholder="Search keys, passport, Wi-Fi, names…"
          aria-label="Search memory vault"
        />
        <div class="filter-pills" role="tablist" aria-label="Filter memory items">
          ${(Object.keys(CAT_LABELS) as Array<MemoryCategory | 'all'>)
            .map(
              (cat) => `
            <button type="button" class="filter-pill ${currentCategory === cat ? 'active' : ''}" data-vault-cat="${cat}">
              ${CAT_LABELS[cat]}
            </button>
          `
            )
            .join('')}
        </div>
        <div class="ios-card">
          ${
            filtered.length === 0
              ? `<div class="empty-state">No matching memory anchors. Tap "+ Add Item" to save one!</div>`
              : filtered
                  .map(
                    (m) => `
            <div class="ios-list-row" style="align-items:flex-start;">
              <div class="ios-row-body">
                <div class="ios-row-title" style="font-weight:700;">
                  ${m.pinned ? '📌 ' : ''}${escapeHtml(m.title)}
                </div>
                <div style="font-size:15px; margin-top:3px;">${escapeHtml(m.answer)}</div>
                <div class="ios-row-meta">Updated ${escapeHtml(formatRelativeDayTime(m.updatedAt, Date.now(), state.settings.dailyResetHour))}</div>
              </div>
              <div style="display:flex; gap:6px;">
                <button type="button" class="ios-btn ios-btn-gray ios-btn-sm" data-pin-mem="${m.id}" aria-label="Pin ${escapeHtml(m.title)}">
                  ${m.pinned ? 'Unpin' : 'Pin'}
                </button>
                <button type="button" class="ios-btn ios-btn-danger-tinted ios-btn-sm" data-del-mem="${m.id}" aria-label="Delete ${escapeHtml(m.title)}">
                  ✕
                </button>
              </div>
            </div>
          `
                  )
                  .join('')
          }
        </div>
      </div>
    </section>

    <section aria-labelledby="notes-heading">
      <div class="section-header">
        <h2 class="section-title" id="notes-heading">Wait, What Was I Saying?</h2>
      </div>
      <form id="note-quick-form" class="quick-capture-bar" style="margin-bottom:10px;">
        <input type="text" id="note-quick-input" class="ios-input" placeholder="Jot down a thought before it slips…" aria-label="Quick thought note" />
        ${
          voiceOk
            ? `<button type="button" class="ios-btn ios-btn-tinted" id="btn-note-voice" aria-label="Dictate thought">🎙️</button>`
            : ''
        }
        <button type="submit" class="ios-btn ios-btn-primary">Save</button>
      </form>
      <div class="ios-card">
        ${
          state.notes.length === 0
            ? `<div class="empty-state">Scratchpad is empty.</div>`
            : state.notes
                .map(
                  (n) => `
          <div class="ios-list-row" style="align-items:flex-start;">
            <div class="ios-row-body">
              <div class="ios-row-title">${escapeHtml(n.text)}</div>
              <div class="ios-row-meta">${escapeHtml(formatRelativeDayTime(n.createdAt, Date.now(), state.settings.dailyResetHour))}</div>
            </div>
            <button type="button" class="ios-btn ios-btn-danger-tinted ios-btn-sm" data-del-note="${n.id}" aria-label="Delete note">✕</button>
          </div>
        `
                )
                .join('')
        }
      </div>
    </section>
  `;

  container.querySelectorAll<HTMLButtonElement>('[data-car-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.stampCarParking(btn.dataset.carPreset!);
      playTapConfirm(state.settings.soundEnabled);
      cb.onShowToast('Car spot stamped!');
    });
  });

  container.querySelector('#car-custom-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = container.querySelector<HTMLInputElement>('#car-custom-input');
    if (!inp || !inp.value.trim()) return;
    store.stampCarParking(inp.value.trim());
    inp.value = '';
    playTapConfirm(state.settings.soundEnabled);
    cb.onShowToast('Car spot stamped!');
  });

  container.querySelector('#btn-add-memory')?.addEventListener('click', () => cb.onOpenAddMemory());

  const searchInput = container.querySelector<HTMLInputElement>('#vault-search-input');
  searchInput?.addEventListener('input', () => {
    currentSearch = searchInput.value;
    const pos = searchInput.selectionStart ?? currentSearch.length;
    renderVaultView(container, store, store.getState(), cb);
    const nextInput = container.querySelector<HTMLInputElement>('#vault-search-input');
    if (nextInput) {
      nextInput.focus();
      nextInput.setSelectionRange(pos, pos);
    }
  });

  container.querySelectorAll<HTMLButtonElement>('[data-vault-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.vaultCat as MemoryCategory | 'all';
      renderVaultView(container, store, store.getState(), cb);
    });
  });

  container.querySelectorAll<HTMLButtonElement>('[data-pin-mem]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.pinMem!;
      const item = store.getState().memories.find((m) => m.id === id);
      if (item) store.updateMemory(id, { pinned: !item.pinned });
    });
  });

  container.querySelectorAll<HTMLButtonElement>('[data-del-mem]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.deleteMemory(btn.dataset.delMem!);
      cb.onShowToast('Removed from Memory Vault');
    });
  });

  container.querySelector('#note-quick-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = container.querySelector<HTMLInputElement>('#note-quick-input');
    if (!inp || !inp.value.trim()) return;
    store.addNote(inp.value.trim());
    inp.value = '';
    playTapConfirm(state.settings.soundEnabled);
  });

  container.querySelector('#btn-note-voice')?.addEventListener('click', () => {
    const btn = container.querySelector<HTMLButtonElement>('#btn-note-voice');
    if (btn) btn.textContent = '⏺️';
    startVoiceDictation({
      onTranscript: (text) => {
        store.addNote(text);
        playTapConfirm(state.settings.soundEnabled);
        cb.onShowToast('Saved voice note!');
      },
      onError: (msg) => cb.onShowToast(msg),
      onEnd: () => {
        if (btn) btn.textContent = '🎙️';
      },
    });
  });

  container.querySelectorAll<HTMLButtonElement>('[data-del-note]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.deleteNote(btn.dataset.delNote!);
    });
  });
}
