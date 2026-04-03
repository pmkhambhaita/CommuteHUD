export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function parseHHMM(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(':').map(Number);
  return { hours: h, minutes: m };
}

export function hhmmToEpoch(time: string, referenceDate?: Date): number {
  const ref = referenceDate || new Date();
  const { hours, minutes } = parseHHMM(time);
  const d = new Date(ref);
  d.setHours(hours, minutes, 0, 0);
  // If time is earlier than now, assume it's tomorrow
  if (d.getTime() < ref.getTime() - 3600000) {
    d.setDate(d.getDate() + 1);
  }
  return d.getTime();
}

export function minutesUntil(epochMs: number): number {
  return Math.max(0, Math.round((epochMs - Date.now()) / 60000));
}

export function formatCountdown(minutes: number): string {
  if (minutes <= 0) return 'now';
  if (minutes === 1) return '1 min';
  return `${minutes} mins`;
}

export function formatSecondsAsMinutes(seconds: number): string {
  if (seconds < 90) return 'now';
  const m = Math.round(seconds / 60);
  return `${m}m`;
}

export function timeSinceString(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  return `${mins}m ago`;
}
