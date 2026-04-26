/** 24h HH:mm (00:00–23:59) */
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidHhMm(s: string): boolean {
  return HHMM.test(s.trim());
}

/** Minutes from midnight, 0–1439, or null if invalid. */
export function hhMmToMinutes(s: string): number | null {
  if (!isValidHhMm(s)) return null;
  const [h, m] = s.trim().split(':').map((x) => parseInt(x, 10));
  return h * 60 + m;
}

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole calendar days from `day` to `from` (can be negative). */
export function localCalendarDaysBetween(from: Date, day: Date): number {
  const a = startOfLocalDay(from).getTime();
  const b = startOfLocalDay(day).getTime();
  return Math.round((b - a) / 86400000);
}

/**
 * For a local calendar (y, m, d) and wall times, return open/close instants.
 * If closed or invalid window, `closed` is true.
 */
export function computeOpenCloseForLocalDay(
  y: number,
  m1: number,
  d: number,
  opensAt: string,
  closesAt: string,
  isClosed: boolean,
): { open: Date; close: Date; closed: boolean } {
  if (isClosed) {
    return { open: new Date(0), close: new Date(0), closed: true };
  }
  const oMin = hhMmToMinutes(opensAt);
  const cMin = hhMmToMinutes(closesAt);
  if (oMin === null || cMin === null || oMin >= cMin) {
    return { open: new Date(0), close: new Date(0), closed: true };
  }
  return {
    open: new Date(y, m1 - 1, d, Math.floor(oMin / 60), oMin % 60, 0, 0),
    close: new Date(y, m1 - 1, d, Math.floor(cMin / 60), cMin % 60, 0, 0),
    closed: false,
  };
}
