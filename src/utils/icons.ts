import { escapeHtml } from './dom';

export type IconName =
  | 'anchor'
  | 'brain'
  | 'car'
  | 'check'
  | 'check-circle'
  | 'door'
  | 'drop'
  | 'external-link'
  | 'flame'
  | 'home'
  | 'inbox'
  | 'lock'
  | 'meal'
  | 'mic'
  | 'moon'
  | 'paw'
  | 'pill'
  | 'pin'
  | 'settings'
  | 'share'
  | 'shield-check'
  | 'sparkles'
  | 'sun'
  | 'tag'
  | 'x';

const ICON_MARKUP: Record<IconName, string> = {
  anchor: '<circle cx="12" cy="5" r="3"/><path d="M12 8v14M5 12H2a10 10 0 0 0 20 0h-3M12 2v3"/>',
  brain: '<path d="M12 18V5a3 3 0 0 0-5.8-1A4 4 0 0 0 4 11a4 4 0 0 0 2 7.5A3.5 3.5 0 0 0 12 18Zm0-8a3 3 0 0 1 5.8-1A4 4 0 0 1 20 16a3.5 3.5 0 0 1-6 2"/>',
  car: '<path d="m5 11 1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11M3 11h18v8H3zM6 19v2m12-2v2M6 15h.01M18 15h.01M3 14h2m14 0h2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
  door: '<path d="M5 21h14M7 21V4l10-2v19M13 12h.01"/>',
  drop: '<path d="M12 22a7 7 0 0 0 7-7c0-4-7-13-7-13S5 11 5 15a7 7 0 0 0 7 7Z"/>',
  'external-link': '<path d="M14 4h6v6m0-6-9 9"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/>',
  flame: '<path d="M12 22a7 7 0 0 0 7-7c0-3-2-5-4-7 0 3-2 4-2 4 0-5-3-8-6-10 1 5-2 8-2 13a7 7 0 0 0 7 7Z"/><path d="M12 22a3 3 0 0 0 3-3c0-1.5-1-2.5-2-3.5 0 1.5-1 2-1 2-1-1.5-2-2-2-2.5A4 4 0 0 0 9 19a3 3 0 0 0 3 3Z"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  inbox: '<path d="M4 4h16l2 11h-6a4 4 0 0 1-8 0H2L4 4Z"/><path d="M4 4v3m16-3v3"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  meal: '<path d="M7 3v7m-3-7v4a3 3 0 0 0 6 0V3m-3 7v11m8-18v18m0-18c3 2 4 5 4 9h-4"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0m-7 7v5m-4 0h8"/>',
  moon: '<path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z"/>',
  paw: '<ellipse cx="12" cy="16.5" rx="5.5" ry="4"/><ellipse cx="5.5" cy="10" rx="1.7" ry="2.4"/><ellipse cx="10" cy="6.5" rx="1.7" ry="2.4"/><ellipse cx="15" cy="6.5" rx="1.7" ry="2.4"/><ellipse cx="18.5" cy="10" rx="1.7" ry="2.4"/>',
  pill: '<path d="M10.5 20.5a6 6 0 0 1-8.5-8.5l8-8a6 6 0 0 1 8.5 8.5z"/><path d="m8 7 9 9"/>',
  pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  settings: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2m10-10h-2M4 12H2m17.1-7.1-1.4 1.4M6.3 17.7l-1.4 1.4m14.2 0-1.4-1.4M6.3 6.3 4.9 4.9"/>',
  share: '<path d="M12 16V3m-5 5 5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  'shield-check': '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
  sparkles: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm7 11 1 2.5 2.5 1-2.5 1L19 21l-1-2.5-2.5-1 2.5-1L19 14ZM5 2l.8 2.2L8 5l-2.2.8L5 8l-.8-2.2L2 5l2.2-.8L5 2Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V4h9l8.6 8.6a.6.6 0 0 1 0 .8Z"/><circle cx="7.5" cy="8.5" r="1"/>',
  x: '<path d="m18 6-12 12M6 6l12 12"/>',
};

const ICON_ALIASES: Record<string, IconName> = {
  '⚓': 'anchor',
  '✅': 'check-circle',
  '💊': 'pill',
  '💧': 'drop',
  '🍽️': 'meal',
  '🔒': 'lock',
  '🔥': 'flame',
  '🌙': 'moon',
  '🚪': 'door',
  '☀️': 'sun',
  '📋': 'inbox',
  '📡': 'share',
  '🏷️': 'tag',
  '🚗': 'car',
  '📌': 'pin',
  '🎙️': 'mic',
};

export function renderIcon(name: IconName, size = 20, className = 'ui-icon'): string {
  return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICON_MARKUP[name]}</svg>`;
}

export function renderIconToken(token: string, size = 24, className = 'ui-icon'): string {
  const name = ICON_ALIASES[token] ?? (Object.hasOwn(ICON_MARKUP, token) ? (token as IconName) : null);
  return name
    ? renderIcon(name, size, className)
    : `<span class="user-icon-fallback" aria-hidden="true">${escapeHtml(token)}</span>`;
}
