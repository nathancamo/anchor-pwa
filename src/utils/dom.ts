export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatElapsed(startedAt: number | null, nowMs = Date.now()): string {
  if (!startedAt) return 'Just started';
  const diffSec = Math.max(0, Math.floor((nowMs - startedAt) / 1000));
  if (diffSec < 60) return 'Started just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m on this`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m on this` : `${hrs}h on this`;
}

export function formatClockMMSS(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}
