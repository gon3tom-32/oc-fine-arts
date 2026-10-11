// Turns iCalendar (.ics) text into plain event objects the pages can render.
// Kept free of Astro imports so it can be tested with `node --test`.
import ICAL from "ical.js";
import { createHash } from "node:crypto";

// Repeating events are expanded within this window around the build time.
const PAST_DAYS = 365;
const FUTURE_DAYS = 400;
const DAY_MS = 24 * 60 * 60 * 1000;

// A line in the event description that marks it for the "Big dates" strip.
const BIG_DATE_LINE = /^\W*big date\W*$/i;
const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

/**
 * @typedef {object} CalendarEvent
 * @property {string} id         Stable id, safe for URLs and HTML ids.
 * @property {string} uid        UID from the source calendar.
 * @property {string} program    Program id (which calendar it came from).
 * @property {string} title
 * @property {boolean} allDay
 * @property {string} start      ISO timestamp (all-day: local midnight).
 * @property {string} end        ISO timestamp (all-day: local midnight after the last day).
 * @property {string} startDate  YYYY-MM-DD in the school's time zone.
 * @property {string} endDate    YYYY-MM-DD, last day the event covers.
 * @property {string} location
 * @property {string} description Plain text with markers and the ParentSquare link removed.
 * @property {string|null} parentSquareUrl
 * @property {boolean} big
 */

/**
 * Parse one program's calendar.
 * @param {string} icsText
 * @param {string} program
 * @param {{ timeZone: string, now?: Date }} options
 * @returns {CalendarEvent[]}
 */
export function parseCalendar(icsText, program, { timeZone, now = new Date() }) {
  const root = new ICAL.Component(ICAL.parse(icsText));

  for (const vtimezone of root.getAllSubcomponents("vtimezone")) {
    const tzid = vtimezone.getFirstPropertyValue("tzid");
    if (tzid && !ICAL.TimezoneService.has(tzid)) {
      ICAL.TimezoneService.register(vtimezone);
    }
  }

  // Group a repeating event with its edited occurrences (same UID, RECURRENCE-ID).
  const byUid = new Map();
  for (const vevent of root.getAllSubcomponents("vevent")) {
    const uid = vevent.getFirstPropertyValue("uid") || cryptoId(vevent.toString());
    if (!byUid.has(uid)) byUid.set(uid, { master: null, exceptions: [] });
    const group = byUid.get(uid);
    if (vevent.hasProperty("recurrence-id")) group.exceptions.push(vevent);
    else group.master = vevent;
  }

  const windowStart = new Date(now.getTime() - PAST_DAYS * DAY_MS);
  const windowEnd = new Date(now.getTime() + FUTURE_DAYS * DAY_MS);
  const events = [];

  for (const [uid, { master, exceptions }] of byUid) {
    if (!master) {
      // Edited occurrences whose series is missing: show them as single events.
      for (const exception of exceptions) {
        const event = new ICAL.Event(exception);
        pushOccurrence(events, event, event.startDate, event.endDate, { uid, program, timeZone });
      }
      continue;
    }

    const event = new ICAL.Event(master);
    for (const exception of exceptions) event.relateException(exception);

    if (!event.isRecurring()) {
      pushOccurrence(events, event, event.startDate, event.endDate, { uid, program, timeZone });
      continue;
    }

    const iterator = event.iterator();
    for (let next = iterator.next(); next; next = iterator.next()) {
      const startsAt = next.toJSDate();
      if (startsAt > windowEnd) break;
      const details = event.getOccurrenceDetails(next);
      if (details.endDate.toJSDate() < windowStart) continue;
      pushOccurrence(events, details.item, details.startDate, details.endDate, { uid, program, timeZone });
    }
  }

  return events.sort(compareEvents);
}

function pushOccurrence(events, item, startTime, endTime, { uid, program, timeZone }) {
  if (String(item.component.getFirstPropertyValue("status") || "").toUpperCase() === "CANCELLED") return;

  const allDay = startTime.isDate;
  // An event with no end: timed events last zero minutes, all-day events one day.
  if (!endTime || endTime.compare(startTime) < 0) {
    endTime = startTime.clone();
    if (allDay) endTime.adjust(1, 0, 0, 0);
  }

  let start, end, startDate, endDate;
  if (allDay) {
    startDate = startTime.toString();
    const exclusiveEnd = endTime.compare(startTime) > 0 ? endTime.toString() : addDays(startDate, 1);
    endDate = addDays(exclusiveEnd, -1);
    start = zonedMidnight(startDate, timeZone).toISOString();
    end = zonedMidnight(exclusiveEnd, timeZone).toISOString();
  } else {
    const startJs = startTime.toJSDate();
    const endJs = endTime.toJSDate();
    start = startJs.toISOString();
    end = endJs.toISOString();
    startDate = dateKey(startJs, timeZone);
    // An event ending exactly at midnight belongs to the day before.
    endDate = dateKey(new Date(Math.max(startJs.getTime(), endJs.getTime() - 1)), timeZone);
  }

  const { text, parentSquareUrl, big } = parseDescription(item.description || "");

  events.push({
    id: `${program}-${cryptoId(`${uid}|${start}`)}`,
    uid,
    program,
    title: (item.summary || "").trim() || "Untitled event",
    allDay,
    start,
    end,
    startDate,
    endDate,
    location: (item.location || "").trim(),
    description: text,
    parentSquareUrl,
    big,
  });
}

/**
 * Pull the "Big date" marker and a ParentSquare link out of a description.
 * Google Calendar stores descriptions written on the web as simple HTML,
 * so tags are turned back into plain text first.
 * @param {string} raw
 */
export function parseDescription(raw) {
  const hrefs = [...raw.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((match) => decodeEntities(match[1]));
  const plain = decodeEntities(
    raw
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li)>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  );

  const urls = [...hrefs, ...(plain.match(URL_PATTERN) || [])].map(trimUrl);
  const parentSquareUrl = urls.find(isParentSquareUrl) || null;

  let big = false;
  const lines = [];
  for (const line of plain.split(/\r?\n/)) {
    if (BIG_DATE_LINE.test(line.trim())) {
      big = true;
      continue;
    }
    let kept = line;
    if (parentSquareUrl) {
      kept = kept.replace(URL_PATTERN, (url) => (isParentSquareUrl(trimUrl(url)) ? "" : url));
      // Drop a label left alone on its line, such as "ParentSquare post:".
      if (kept !== line && /^(parentsquare( post)?|post|link|more info)?\s*:?$/i.test(kept.trim())) continue;
    }
    lines.push(kept.trimEnd());
  }

  const text = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return { text, parentSquareUrl, big };
}

function isParentSquareUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "parentsquare.com" || host.endsWith(".parentsquare.com") || host === "psqr.us";
  } catch {
    return false;
  }
}

function trimUrl(url) {
  return url.replace(/[).,;:!?]+$/, "");
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}

export function compareEvents(a, b) {
  return a.start.localeCompare(b.start) || a.title.localeCompare(b.title);
}

/** YYYY-MM-DD for a moment, in the given time zone. */
export function dateKey(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Midnight at the start of a YYYY-MM-DD date in the given time zone. */
export function zonedMidnight(key, timeZone) {
  const [year, month, day] = key.split("-").map(Number);
  const utcGuess = Date.UTC(year, month - 1, day);
  // Find the zone's offset near that moment, then correct the guess by it.
  const offset = zoneOffsetMs(new Date(utcGuess), timeZone);
  const result = new Date(utcGuess - offset);
  const offsetAfter = zoneOffsetMs(result, timeZone);
  return offsetAfter === offset ? result : new Date(utcGuess - offsetAfter);
}

function zoneOffsetMs(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function addDays(key, days) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function cryptoId(text) {
  return createHash("sha1").update(text).digest("hex").slice(0, 10);
}
