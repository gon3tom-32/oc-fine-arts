// Builds .ics files (subscription feeds and single-event downloads)
// and "Add to Google Calendar" / "Get directions" links.
import { addDays } from "./events.js";

const compactUtc = (iso) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const compactDate = (key) => key.replace(/-/g, "");

function escapeText(text) {
  return text.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

// iCalendar lines are folded at 75 bytes; continuation lines start with a space.
function fold(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const charSize = new TextEncoder().encode(char).length;
    if (size + charSize > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += charSize;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function fullDescription(event) {
  return [event.description, event.parentSquareUrl && `ParentSquare post: ${event.parentSquareUrl}`].filter(Boolean).join("\n\n");
}

function veventLines(event, stamp) {
  const lines = ["BEGIN:VEVENT", `UID:${event.id}@oc-fine-arts`, `DTSTAMP:${stamp}`];
  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${compactDate(event.startDate)}`, `DTEND;VALUE=DATE:${compactDate(addDays(event.endDate, 1))}`);
  } else {
    lines.push(`DTSTART:${compactUtc(event.start)}`, `DTEND:${compactUtc(event.end)}`);
  }
  lines.push(`SUMMARY:${escapeText(event.title)}`);
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  const description = fullDescription(event);
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
  if (event.parentSquareUrl) lines.push(`URL:${event.parentSquareUrl}`);
  lines.push("END:VEVENT");
  return lines;
}

/**
 * @param {import("./events.js").CalendarEvent[]} events
 * @param {{ name: string, now?: Date }} options
 */
export function buildIcs(events, { name, now = new Date() }) {
  const stamp = compactUtc(now.toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OC Classical Academy Fine Arts//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
    ...events.flatMap((event) => veventLines(event, stamp)),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarLink(event) {
  const dates = event.allDay
    ? `${compactDate(event.startDate)}/${compactDate(addDays(event.endDate, 1))}`
    : `${compactUtc(event.start)}/${compactUtc(event.end)}`;
  const params = new URLSearchParams({ action: "TEMPLATE", text: event.title, dates });
  const details = fullDescription(event);
  if (details) params.set("details", details);
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function directionsLink(location) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}
