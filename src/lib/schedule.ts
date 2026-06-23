import type { Schedule } from './storage';

// (Pro) Time-of-day / day-of-week block windows. When schedules exist, the
// manual block list is only active inside a matching window; outside, those
// sites are open. No schedules = always active (whenever master is on).

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':');
  return (Number(h) || 0) * 60 + (Number(m) || 0);
}

function matchesWindow(s: Schedule, day: number, mins: number): boolean {
  const start = toMinutes(s.start);
  const end = toMinutes(s.end);
  if (start === end) return false;

  if (start < end) {
    // Same-day window, e.g. 09:00–17:00.
    return s.days.includes(day) && mins >= start && mins < end;
  }
  // Overnight window, e.g. 22:00–06:00 (spans midnight). It belongs to its
  // start day in the evening and continues into the next morning.
  const inEvening = s.days.includes(day) && mins >= start;
  const prevDay = (day + 6) % 7;
  const inMorning = s.days.includes(prevDay) && mins < end;
  return inEvening || inMorning;
}

/** True if `now` falls in any schedule window. Empty list => always true. */
export function isWithinSchedules(
  list: Schedule[],
  now: Date = new Date(),
): boolean {
  if (list.length === 0) return true;
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  return list.some((s) => matchesWindow(s, day, mins));
}
