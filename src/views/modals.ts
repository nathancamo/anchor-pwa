import QRCode from 'qrcode';
import type { AnchorStore } from '../store';
import type { MemoryCategory, Routine } from '../types';
import { playGentleChime, playTapConfirm } from '../audio';
import { isSpeechSupported, startVoiceDictation } from '../speech';
import { wireDialogHelpers } from '../utils/dialogHelpers';
import { escapeHtml } from '../utils/dom';

export interface ModalController {
  openCapture: () => void;
  openAnchor: () => void;
  openGuidedRoutine: (routine: Routine) => void;
  openAddCheckIn: () => void;
  openAddMemory: () => void;
  openSettings: () => void;
  openInstallShare: () => void;
}

export function mountModals(
  root: HTMLElement,
  store: AnchorStore,
  showToast: (msg: string) => void
): ModalController {
  const voiceOk = isSpeechSupported();

  root.innerHTML = `
    <dialog id="sheet-capture" class="ios-sheet" closedby="any" aria-labelledby="sheet-capture-title">
      <div class="sheet-inner">
        <div class="sheet-grabber" aria-hidden="true"></div>
        <div class="sheet-header">
          <h2 id="sheet-capture-title" class="sheet-title">Quick Catch</h2>
          <form method="dialog"><button class="ios-btn ios-btn-gray ios-btn-sm" value="cancel">Close</button></form>
        </div>
        <form id="form-quick-capture" style="display:flex; flex-direction:column; gap:10px;">
          <div style="display:flex; gap:8px;">
            <input id="qc-input" class="ios-input" type="text" placeholder="Type or speak before it slips…" autofocus required />
            ${voiceOk ? `<button type="button" id="qc-voice" class="ios-btn ios-btn-tinted" aria-label="Speak">🎙️</button>` : ''}
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <label style="flex:1; min-width:120px;">
              <span class="ios-row-meta" style="display:block; margin-bottom:4px;">Save to</span>
              <select id="qc-dest" class="ios-select">
                <option value="later">Brain Dump (Do Soon)</option>
                <option value="top3">Today’s Top 3</option>
                <option value="parked">Parked for Later</option>
                <option value="note">What Was I Saying? (Note)</option>
                <option value="anchor">Make This My Right Now Anchor</option>
              </select>
            </label>
          </div>
          <button type="submit" class="ios-btn ios-btn-primary">Save</button>
        </form>
      </div>
    </dialog>

    <dialog id="sheet-anchor" class="ios-sheet" closedby="any" aria-labelledby="sheet-anchor-title">
      <div class="sheet-inner">
        <div class="sheet-grabber" aria-hidden="true"></div>
        <div class="sheet-header">
          <h2 id="sheet-anchor-title" class="sheet-title">What Are You Doing Right Now?</h2>
          <form method="dialog"><button class="ios-btn ios-btn-gray ios-btn-sm" value="cancel">Close</button></form>
        </div>
        <form id="form-anchor" style="display:flex; flex-direction:column; gap:10px;">
          <input id="anchor-input-title" class="ios-input" type="text" placeholder="e.g. Making lunch & taking meds" autofocus required />
          <textarea id="anchor-input-note" class="ios-textarea" placeholder="Optional context (so if you get interrupted, you remember why)…"></textarea>
          <button type="submit" class="ios-btn ios-btn-primary">Set Right Now Anchor</button>
        </form>
      </div>
    </dialog>

    <dialog id="sheet-routine" class="ios-sheet" closedby="any" aria-labelledby="sheet-routine-title">
      <div class="sheet-inner" id="sheet-routine-body"></div>
    </dialog>

    <dialog id="sheet-add-checkin" class="ios-sheet" closedby="any" aria-labelledby="sheet-checkin-title">
      <div class="sheet-inner">
        <div class="sheet-grabber" aria-hidden="true"></div>
        <div class="sheet-header">
          <h2 id="sheet-checkin-title" class="sheet-title">New "Did I Do It?" Card</h2>
          <form method="dialog"><button class="ios-btn ios-btn-gray ios-btn-sm" value="cancel">Close</button></form>
        </div>
        <form id="form-add-checkin" style="display:flex; flex-direction:column; gap:10px;">
          <input id="ci-title" class="ios-input" type="text" placeholder="e.g. Fed the dog, Locked back gate" autofocus required />
          <div style="display:flex; gap:8px;">
            <input id="ci-icon" class="ios-input" type="text" value="✅" maxlength="4" style="width:72px; text-align:center;" aria-label="Emoji icon" />
            <select id="ci-cat" class="ios-select" aria-label="Category">
              <option value="selfcare">Self-Care</option>
              <option value="meds">Meds</option>
              <option value="safety">Home Safety</option>
              <option value="pet">Pets</option>
              <option value="home">Home</option>
            </select>
          </div>
          <button type="submit" class="ios-btn ios-btn-primary">Add Check-in</button>
        </form>
      </div>
    </dialog>

    <dialog id="sheet-add-memory" class="ios-sheet" closedby="any" aria-labelledby="sheet-mem-title">
      <div class="sheet-inner">
        <div class="sheet-grabber" aria-hidden="true"></div>
        <div class="sheet-header">
          <h2 id="sheet-mem-title" class="sheet-title">Add to Memory Vault</h2>
          <form method="dialog"><button class="ios-btn ios-btn-gray ios-btn-sm" value="cancel">Close</button></form>
        </div>
        <form id="form-add-memory" style="display:flex; flex-direction:column; gap:10px;">
          <input id="mem-title" class="ios-input" type="text" placeholder="What? (e.g. Spare house key)" autofocus required />
          <textarea id="mem-answer" class="ios-textarea" placeholder="Where / Answer (e.g. Inside blue mug on top shelf)" required></textarea>
          <select id="mem-cat" class="ios-select" aria-label="Category">
            <option value="keys">Keys & Wallet</option>
            <option value="home">Home</option>
            <option value="car">Car</option>
            <option value="people">People</option>
            <option value="other">Other</option>
          </select>
          <button type="submit" class="ios-btn ios-btn-primary">Save Memory Anchor</button>
        </form>
      </div>
    </dialog>

    <dialog id="sheet-settings" class="ios-sheet" closedby="any" aria-labelledby="sheet-settings-title">
      <div class="sheet-inner" id="sheet-settings-body"></div>
    </dialog>

    <dialog id="sheet-install" class="ios-sheet" closedby="any" aria-labelledby="sheet-install-title">
      <div class="sheet-inner" id="sheet-install-body"></div>
    </dialog>
  `;

  const dCapture = root.querySelector<HTMLDialogElement>('#sheet-capture')!;
  const dAnchor = root.querySelector<HTMLDialogElement>('#sheet-anchor')!;
  const dRoutine = root.querySelector<HTMLDialogElement>('#sheet-routine')!;
  const dCheckIn = root.querySelector<HTMLDialogElement>('#sheet-add-checkin')!;
  const dMemory = root.querySelector<HTMLDialogElement>('#sheet-add-memory')!;
  const dSettings = root.querySelector<HTMLDialogElement>('#sheet-settings')!;
  const dInstall = root.querySelector<HTMLDialogElement>('#sheet-install')!;

  [dCapture, dAnchor, dRoutine, dCheckIn, dMemory, dSettings, dInstall].forEach(wireDialogHelpers);

  // Quick capture submit
  root.querySelector('#form-quick-capture')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = root.querySelector<HTMLInputElement>('#qc-input')!;
    const dest = root.querySelector<HTMLSelectElement>('#qc-dest')!.value;
    const val = inp.value.trim();
    if (!val) return;
    if (dest === 'note') {
      store.addNote(val);
      showToast('Saved to Scratchpad');
    } else if (dest === 'anchor') {
      store.setAnchor(val);
      showToast('Updated Right Now Anchor');
    } else {
      const res = store.addTask(val, dest as 'top3' | 'later' | 'parked');
      showToast(res.demotedToLater ? 'Top 3 full — saved to Brain Dump' : 'Captured!');
    }
    playTapConfirm(store.getState().settings.soundEnabled);
    inp.value = '';
    dCapture.close('saved');
  });

  root.querySelector('#qc-voice')?.addEventListener('click', () => {
    const btn = root.querySelector<HTMLButtonElement>('#qc-voice')!;
    const inp = root.querySelector<HTMLInputElement>('#qc-input')!;
    btn.textContent = '⏺️';
    startVoiceDictation({
      onTranscript: (text) => {
        inp.value = inp.value ? `${inp.value} ${text}` : text;
      },
      onError: (msg) => showToast(msg),
      onEnd: () => {
        btn.textContent = '🎙️';
      },
    });
  });

  // Anchor submit
  root.querySelector('#form-anchor')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = root.querySelector<HTMLInputElement>('#anchor-input-title')!.value.trim();
    const note = root.querySelector<HTMLTextAreaElement>('#anchor-input-note')!.value.trim();
    if (!title) return;
    store.setAnchor(title, note);
    playTapConfirm(store.getState().settings.soundEnabled);
    dAnchor.close('saved');
    showToast('Right Now Anchor updated');
  });

  // Add Check-in
  root.querySelector('#form-add-checkin')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const titleEl = root.querySelector<HTMLInputElement>('#ci-title')!;
    const iconEl = root.querySelector<HTMLInputElement>('#ci-icon')!;
    const catEl = root.querySelector<HTMLSelectElement>('#ci-cat')!;
    store.addCheckIn(titleEl.value, iconEl.value, catEl.value as never);
    titleEl.value = '';
    playTapConfirm(store.getState().settings.soundEnabled);
    dCheckIn.close('saved');
    showToast('Added "Did I?" card');
  });

  // Add Memory
  root.querySelector('#form-add-memory')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const tEl = root.querySelector<HTMLInputElement>('#mem-title')!;
    const aEl = root.querySelector<HTMLTextAreaElement>('#mem-answer')!;
    const cEl = root.querySelector<HTMLSelectElement>('#mem-cat')!;
    store.addMemory(tEl.value, aEl.value, cEl.value as MemoryCategory, false);
    tEl.value = '';
    aEl.value = '';
    playTapConfirm(store.getState().settings.soundEnabled);
    dMemory.close('saved');
    showToast('Saved to Memory Vault');
  });

  function renderGuidedStep(routineId: string): void {
    const routine = store.getState().routines.find((r) => r.id === routineId);
    const body = root.querySelector('#sheet-routine-body')!;
    if (!routine) {
      dRoutine.close();
      return;
    }
    const nextIdx = routine.steps.findIndex((s) => !s.done);
    const allDone = nextIdx === -1;

    body.innerHTML = `
      <div class="sheet-grabber" aria-hidden="true"></div>
      <div class="sheet-header">
        <h2 id="sheet-routine-title" class="sheet-title">${escapeHtml(routine.icon)} ${escapeHtml(routine.title)}</h2>
        <form method="dialog"><button class="ios-btn ios-btn-gray ios-btn-sm" value="cancel">Close</button></form>
      </div>
      ${
        allDone
          ? `
        <div class="guided-step-box">
          <div style="font-size:38px;">🎉</div>
          <div class="guided-step-text">All ${routine.steps.length} steps complete!</div>
          <p class="ios-row-meta" style="margin:0;">You did every step. No second-guessing needed.</p>
        </div>
        <button type="button" class="ios-btn ios-btn-gray" id="btn-guided-reset">Reset Routine</button>
      `
          : `
        <div class="guided-step-box">
          <div class="guided-step-count">Step ${nextIdx + 1} of ${routine.steps.length}</div>
          <div class="guided-step-text">${escapeHtml(routine.steps[nextIdx].text)}</div>
        </div>
        <button type="button" class="ios-btn ios-btn-success" id="btn-guided-done" autofocus>Done — Next Step →</button>
      `
      }
    `;

    body.querySelector('#btn-guided-done')?.addEventListener('click', () => {
      const step = routine.steps[nextIdx];
      store.toggleRoutineStep(routine.id, step.id);
      const updated = store.getState().routines.find((r) => r.id === routine.id);
      if (updated && updated.steps.every((s) => s.done)) {
        playGentleChime(store.getState().settings.soundEnabled);
      } else {
        playTapConfirm(store.getState().settings.soundEnabled);
      }
      renderGuidedStep(routine.id);
    });

    body.querySelector('#btn-guided-reset')?.addEventListener('click', () => {
      store.resetRoutine(routine.id);
      renderGuidedStep(routine.id);
    });
  }

  function renderSettingsBody(): void {
    const s = store.getState().settings;
    const body = root.querySelector('#sheet-settings-body')!;
    body.innerHTML = `
      <div class="sheet-grabber" aria-hidden="true"></div>
      <div class="sheet-header">
        <h2 id="sheet-settings-title" class="sheet-title">Settings & Backup</h2>
        <form method="dialog"><button class="ios-btn ios-btn-gray ios-btn-sm" value="cancel" autofocus>Done</button></form>
      </div>

      <div class="ios-card" style="padding:0 14px; background:var(--ios-fill);">
        <label class="setting-row">
          <span>Gentle Sound Chimes</span>
          <input type="checkbox" switch id="set-sound" ${s.soundEnabled ? 'checked' : ''} />
        </label>
        <label class="setting-row">
          <span>Focus Check-in Nudges</span>
          <input type="checkbox" switch id="set-nudges" ${s.gentleNudges ? 'checked' : ''} />
        </label>
        <label class="setting-row">
          <span>Show Completed Top 3</span>
          <input type="checkbox" switch id="set-show-done" ${s.showCompletedTasks ? 'checked' : ''} />
        </label>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <label>
          <span class="ios-row-meta" style="display:block; margin-bottom:4px;">Appearance</span>
          <select id="set-theme" class="ios-select">
            <option value="system" ${s.theme === 'system' ? 'selected' : ''}>Auto (iOS)</option>
            <option value="light" ${s.theme === 'light' ? 'selected' : ''}>Light</option>
            <option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Dark</option>
          </select>
        </label>
        <label>
          <span class="ios-row-meta" style="display:block; margin-bottom:4px;">New Day Resets At</span>
          <select id="set-reset-hour" class="ios-select">
            <option value="0" ${s.dailyResetHour === 0 ? 'selected' : ''}>12:00 AM</option>
            <option value="3" ${s.dailyResetHour === 3 ? 'selected' : ''}>3:00 AM</option>
            <option value="4" ${s.dailyResetHour === 4 ? 'selected' : ''}>4:00 AM (Night Owl)</option>
            <option value="5" ${s.dailyResetHour === 5 ? 'selected' : ''}>5:00 AM</option>
          </select>
        </label>
      </div>

      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button type="button" class="ios-btn ios-btn-tinted" id="btn-export-json" style="flex:1;">Export Backup</button>
        <label class="ios-btn ios-btn-gray" style="flex:1; cursor:pointer;">
          Import Backup
          <input type="file" id="input-import-json" accept="application/json,.json" hidden />
        </label>
      </div>
    `;

    body.querySelector<HTMLInputElement>('#set-sound')?.addEventListener('change', (e) => {
      store.updateSettings({ soundEnabled: (e.target as HTMLInputElement).checked });
    });
    body.querySelector<HTMLInputElement>('#set-nudges')?.addEventListener('change', (e) => {
      store.updateSettings({ gentleNudges: (e.target as HTMLInputElement).checked });
    });
    body.querySelector<HTMLInputElement>('#set-show-done')?.addEventListener('change', (e) => {
      store.updateSettings({ showCompletedTasks: (e.target as HTMLInputElement).checked });
    });
    body.querySelector<HTMLSelectElement>('#set-theme')?.addEventListener('change', (e) => {
      store.updateSettings({ theme: (e.target as HTMLSelectElement).value as 'system' | 'light' | 'dark' });
    });
    body.querySelector<HTMLSelectElement>('#set-reset-hour')?.addEventListener('change', (e) => {
      store.updateSettings({ dailyResetHour: Number((e.target as HTMLSelectElement).value) });
    });

    body.querySelector('#btn-export-json')?.addEventListener('click', () => {
      const blob = new Blob([store.exportJSON()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `anchor-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup downloaded');
    });

    body.querySelector<HTMLInputElement>('#input-import-json')?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const res = store.importJSON(text);
      if (res.ok) {
        dSettings.close();
        showToast('Backup restored!');
      } else {
        showToast(res.error || 'Import failed');
      }
    });
  }

  return {
    openCapture: () => {
      dCapture.showModal();
    },
    openAnchor: () => {
      const cur = store.getState().anchor;
      root.querySelector<HTMLInputElement>('#anchor-input-title')!.value = cur.title;
      root.querySelector<HTMLTextAreaElement>('#anchor-input-note')!.value = cur.note;
      dAnchor.showModal();
    },
    openGuidedRoutine: (routine: Routine) => {
      renderGuidedStep(routine.id);
      dRoutine.showModal();
    },
    openAddCheckIn: () => dCheckIn.showModal(),
    openAddMemory: () => dMemory.showModal(),
    openSettings: () => {
      renderSettingsBody();
      dSettings.showModal();
    },
    openInstallShare: async () => {
      const body = root.querySelector('#sheet-install-body')!;
      const cleanUrl = `${window.location.origin}${window.location.pathname}`;
      let qrSvg = '';
      try {
        qrSvg = await QRCode.toString(cleanUrl, {
          type: 'svg',
          margin: 1,
          width: 176,
          color: { dark: '#000000', light: '#ffffff' },
        });
      } catch {
        qrSvg = '';
      }

      body.innerHTML = `
        <div class="sheet-grabber" aria-hidden="true"></div>
        <div class="sheet-header">
          <h2 id="sheet-install-title" class="sheet-title">Get Anchor on iPhone</h2>
          <form method="dialog"><button class="ios-btn ios-btn-gray ios-btn-sm" value="cancel" autofocus>Done</button></form>
        </div>

        <div style="display:flex; flex-direction:column; align-items:center; gap:10px; background:var(--ios-fill); border-radius:16px; padding:16px;">
          <div style="background:#ffffff; padding:10px; border-radius:14px; line-height:0; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
            ${qrSvg}
          </div>
          <div style="font-size:13px; color:var(--ios-text-secondary); text-align:center;">
            Point Brad’s iPhone Camera at this QR code to open Anchor in Safari
          </div>
        </div>

        <div class="ios-card" style="padding:14px; background:var(--ios-fill); display:flex; flex-direction:column; gap:8px; font-size:14px; line-height:1.4;">
          <div style="font-weight:700; font-size:15px;">Install as a Native App (2 Taps):</div>
          <div>1. Open in <b>Safari</b> on iPhone</div>
          <div>2. Tap the <b>Share</b> button (square with arrow ↑) at the bottom</div>
          <div>3. Tap <b>Add to Home Screen</b> — it appears as a full-screen app!</div>
        </div>

        <div style="display:flex; gap:8px;">
          <button type="button" class="ios-btn ios-btn-primary" id="btn-share-link" style="flex:1;">Share / Text Link</button>
          <button type="button" class="ios-btn ios-btn-gray" id="btn-copy-link">Copy URL</button>
        </div>
      `;

      body.querySelector('#btn-share-link')?.addEventListener('click', async () => {
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'Anchor — Daily Memory & Focus',
              text: 'Open this in Safari and tap Share → Add to Home Screen:',
              url: cleanUrl,
            });
            return;
          } catch {
            // User cancelled or share failed; fallback to copy
          }
        }
        await navigator.clipboard?.writeText(cleanUrl);
        showToast('Link copied! Paste in iMessage to Brad');
      });

      body.querySelector('#btn-copy-link')?.addEventListener('click', async () => {
        await navigator.clipboard?.writeText(cleanUrl);
        showToast('Link copied!');
      });

      dInstall.showModal();
    },
  };
}
