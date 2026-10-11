import { timeZone } from "./calendar.js";

const fmt = (options) => new Intl.DateTimeFormat("en-US", { timeZone, ...options });
const longDate = fmt({ weekday: "long", month: "long", day: "numeric" });
const time = fmt({ hour: "numeric", minute: "2-digit" });
const monthYear = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
const dayOfDate = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });

/** A YYYY-MM-DD key as a Date at UTC noon, for formatting the calendar date itself. */
const keyDate = (key) => new Date(`${key}T12:00:00Z`);

const badgeMonth = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short" });

export function badgeParts(event) {
  const date = keyDate(event.startDate);
  return { month: badgeMonth.format(date).toUpperCase(), day: String(date.getUTCDate()) };
}

/** "Thursday, December 10 · 6:00 – 7:30 PM", or the date range of an all-day event. */
export function whenText(event) {
  if (event.allDay) {
    const first = dayOfDate.format(keyDate(event.startDate));
    if (event.endDate === event.startDate) return `${first} · All day`;
    return `${first} – ${dayOfDate.format(keyDate(event.endDate))}`;
  }
  const start = new Date(event.start);
  const end = new Date(event.end);
  const day = longDate.format(start);
  if (event.end === event.start) return `${day} · ${time.format(start)}`;
  if (event.endDate !== event.startDate) return `${day}, ${time.format(start)} – ${longDate.format(end)}, ${time.format(end)}`;
  return `${day} · ${timeRange(start, end)}`;
}

/** "6:00 – 7:30 PM" (drops the repeated AM/PM). */
function timeRange(start, end) {
  const a = time.format(start);
  const b = time.format(end);
  const suffix = (text) => text.slice(-2);
  return suffix(a) === suffix(b) ? `${a.slice(0, -3)} – ${b}` : `${a} – ${b}`;
}

/** Short time for compact rows: "6:00 PM" or "All day". */
export function shortTime(event) {
  return event.allDay ? "All day" : time.format(new Date(event.start));
}

export function monthLabel(key) {
  return monthYear.format(keyDate(`${key.slice(0, 7)}-01`));
}
