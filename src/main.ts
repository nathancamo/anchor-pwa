import './styles/ios.css';
import { AnchorStore, isTimestampInLogicalToday } from './store';
import type { AnchorAppState, TabId } from './types';
import { playGentleChime } from './audio';
import { formatClockMMSS, formatElapsed } from './utils/dom';
import { renderNowView } from './views/nowView';
import { renderDidIDoItView } from './views/didIDoItView';
import { renderVaultView } from './views/vaultView';
import { renderInboxView } from './views/inboxView';
import { mountModals } from './views/modals';

// Conditional polyfill for <input type="checkbox" switch> (native in Safari 17.4+)
if (!('switch' in HTMLInputElement.prototype)) {
  void import('input-switch-polyfill');
}

// Register offline-first Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js').catch(() => {
      // Ignore SW registration errors in dev
    });
  });
}

const store = new AnchorStore();
let activeTab: TabId = 'now';

const params = new URLSearchParams(window.location.search);
const tabParam = params.get('tab');
if (tabParam === 'now' || tabParam === 'did-i' || tabParam === 'memory' || tabParam === 'inbox') {
  activeTab = tabParam;
}

const appRoot = document.querySelector<HTMLElement>('#app')!;
appRoot.innerHTML = `
  <div class="app-shell">
    <header class="ios-navbar">
      <div class="ios-navbar-title-group">
        <span class="ios-navbar-subtitle" id="nav-date-subtitle"></span>
        <h1 class="ios-navbar-title" id="nav-title">Anchor</h1>
      </div>
      <div class="ios-navbar-actions">
        <button type="button" class="ios-icon-btn" id="btn-open-install" aria-label="Get on iPhone or share">📲</button>
        <button type="button" class="ios-icon-btn" id="btn-open-settings" aria-label="Settings and backup">⚙️</button>
      </div>
    </header>

    <main class="ios-main" id="main-content"></main>

    <button type="button" class="fab-capture" id="btn-fab-capture" aria-label="Quick Catch">
      <span aria-hidden="true">＋</span> Catch It
    </button>

    <nav class="ios-tabbar" aria-label="Main navigation">
      <button type="button" class="tab-btn" data-tab="now">
        <span class="tab-icon" aria-hidden="true">⚓</span>
        <span>Now</span>
      </button>
      <button type="button" class="tab-btn" data-tab="did-i">
        <span class="tab-icon" aria-hidden="true">✅</span>
        <span>Did I?</span>
        <span class="tab-badge" id="badge-didi" hidden>0</span>
      </button>
      <button type="button" class="tab-btn" data-tab="memory">
        <span class="tab-icon" aria-hidden="true">🧠</span>
        <span>Memory</span>
      </button>
      <button type="button" class="tab-btn" data-tab="inbox">
        <span class="tab-icon" aria-hidden="true">📥</span>
        <span>Dump</span>
        <span class="tab-badge" id="badge-inbox" hidden>0</span>
      </button>
    </nav>
  </div>
  <div id="modals-root"></div>
  <div id="ios-toast" class="ios-toast" role="status" aria-live="polite"></div>
`;

const mainEl = appRoot.querySelector<HTMLElement>('#main-content')!;
const navTitleEl = appRoot.querySelector<HTMLElement>('#nav-title')!;
const navSubEl = appRoot.querySelector<HTMLElement>('#nav-date-subtitle')!;
const toastEl = appRoot.querySelector<HTMLElement>('#ios-toast')!;
const modalsRoot = appRoot.querySelector<HTMLElement>('#modals-root')!;

let toastTimer: number | undefined;
function showToast(msg: string): void {
  toastEl.textContent = msg;
  toastEl.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl.classList.remove('visible');
  }, 2600);
}

const modals = mountModals(modalsRoot, store, showToast);

function isIosSafariNotStandalone(): boolean {
  const ua = window.navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return isIOS && !standalone;
}

function applyTheme(theme: AnchorAppState['settings']['theme']): void {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

const TAB_TITLES: Record<TabId, string> = {
  now: 'Right Now',
  'did-i': 'Did I Do It?',
  memory: 'Memory Vault',
  inbox: 'Brain Dump',
};

function renderApp(state: AnchorAppState): void {
  applyTheme(state.settings.theme);

  const now = new Date();
  navSubEl.textContent = now.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  navTitleEl.textContent = TAB_TITLES[activeTab];

  // Update tab active states & badges
  appRoot.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((btn) => {
    const isAct = btn.dataset.tab === activeTab;
    btn.classList.toggle('active', isAct);
    btn.setAttribute('aria-current', isAct ? 'page' : 'false');
  });

  const pendingCheckIns = state.checkIns.filter(
    (c) => !isTimestampInLogicalToday(c.lastDoneAt, Date.now(), state.settings.dailyResetHour)
  ).length;
  const badgeDidI = appRoot.querySelector<HTMLElement>('#badge-didi')!;
  badgeDidI.hidden = pendingCheckIns === 0;
  badgeDidI.textContent = String(pendingCheckIns);

  const inboxCount = state.tasks.filter((t) => !t.done && t.bucket === 'later').length;
  const badgeInbox = appRoot.querySelector<HTMLElement>('#badge-inbox')!;
  badgeInbox.hidden = inboxCount === 0;
  badgeInbox.textContent = String(inboxCount);

  mainEl.innerHTML = '';
  const viewWrap = document.createElement('div');
  viewWrap.style.display = 'flex';
  viewWrap.style.flexDirection = 'column';
  viewWrap.style.gap = '18px';

  if (isIosSafariNotStandalone() && !state.settings.dismissedInstallBanner) {
    const banner = document.createElement('div');
    banner.className = 'install-banner';
    banner.innerHTML = `
      <div>
        <strong>Add Anchor to your iPhone Home Screen</strong>
        Tap the <b>Share</b> button below, then <b>Add to Home Screen</b> for full-screen offline access.
      </div>
      <button type="button" class="ios-btn ios-btn-gray ios-btn-sm" id="btn-dismiss-install">Got it</button>
    `;
    banner.querySelector('#btn-dismiss-install')?.addEventListener('click', () => {
      store.updateSettings({ dismissedInstallBanner: true });
    });
    mainEl.appendChild(banner);
  }

  mainEl.appendChild(viewWrap);

  if (activeTab === 'now') {
    renderNowView(viewWrap, store, state, {
      onOpenAnchorModal: () => modals.openAnchor(),
      onShowToast: showToast,
      onOpenTab: (t) => {
        activeTab = t;
        renderApp(store.getState());
      },
    });
  } else if (activeTab === 'did-i') {
    renderDidIDoItView(viewWrap, store, state, {
      onOpenGuidedRoutine: (r) => modals.openGuidedRoutine(r),
      onOpenAddCheckIn: () => modals.openAddCheckIn(),
      onShowToast: showToast,
    });
  } else if (activeTab === 'memory') {
    renderVaultView(viewWrap, store, state, {
      onOpenAddMemory: () => modals.openAddMemory(),
      onOpenAddSmartTag: () => modals.openAddSmartTag(),
      onShowToast: showToast,
    });
  } else {
    renderInboxView(viewWrap, store, state, {
      onShowToast: showToast,
    });
  }
}

appRoot.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    activeTab = btn.dataset.tab as TabId;
    renderApp(store.getState());
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  });
});

appRoot.querySelector('#btn-fab-capture')?.addEventListener('click', () => modals.openCapture());
appRoot.querySelector('#btn-open-install')?.addEventListener('click', () => modals.openInstallShare());
appRoot.querySelector('#btn-open-settings')?.addEventListener('click', () => modals.openSettings());

store.subscribe(renderApp);
renderApp(store.getState());
void store.hydrateFromIndexedDB();

if (params.get('action') === 'capture') {
  modals.openCapture();
}

// 1-second tick for Focus Timer & Anchor elapsed label
window.setInterval(() => {
  store.checkDailyReset();
  const state = store.getState();

  const elapsedEl = document.querySelector('#anchor-elapsed-text');
  if (elapsedEl) {
    elapsedEl.textContent = formatElapsed(state.anchor.startedAt);
  }

  if (state.timer.running) {
    const nextRem = state.timer.remainingSec - 1;
    if (nextRem <= 0) {
      store.updateTimer({ running: false, remainingSec: 0, startedAt: null });
      playGentleChime(state.settings.soundEnabled);
      showToast('Focus block complete! Take a breath.');
    } else {
      store.updateTimer({ remainingSec: nextRem }, true);
      const clockEl = document.querySelector('#timer-clock-text');
      const circleEl = document.querySelector<SVGCircleElement>('#timer-ring-circle');
      if (clockEl) clockEl.textContent = formatClockMMSS(nextRem);
      if (circleEl) {
        const radius = 37;
        const circumference = 2 * Math.PI * radius;
        const pct = state.timer.durationSec > 0 ? nextRem / state.timer.durationSec : 0;
        circleEl.style.strokeDashoffset = String(circumference * (1 - pct));
      }
    }
  }
}, 1000);
