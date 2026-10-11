import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCalendar, parseDescription, zonedMidnight } from "../src/lib/events.js";
import { buildIcs } from "../src/lib/ics.js";

const timeZone = "America/Los_Angeles";
const now = new Date("2026-10-11T12:00:00Z");
const load = (program) => parseCalendar(readFileSync(`sample-data/${program}.ics`, "utf8"), program, { timeZone, now });

test("timed events convert from the school's time zone", () => {
  const concert = load("choir").find((event) => event.title === "[Winter concert]");
  assert.equal(concert.start, "2026-12-11T02:00:00.000Z"); // 6:00 PM PST
  assert.equal(concert.startDate, "2026-12-10");
  assert.equal(concert.allDay, false);
});

test("repeating events are expanded into each occurrence", () => {
  const club = load("art").filter((event) => event.title === "[Weekly art club]");
  assert.deepEqual(
    club.map((event) => event.startDate),
    ["2026-11-12", "2026-11-19", "2026-11-26", "2026-12-03"],
  );
  assert.equal(new Set(club.map((event) => event.id)).size, 4);
});

test("all-day events keep their date and end at local midnight", () => {
  const show = load("art").find((event) => event.title === "[Art show]");
  assert.equal(show.allDay, true);
  assert.equal(show.startDate, "2027-03-19");
  assert.equal(show.endDate, "2027-03-19");
  assert.equal(show.end, "2027-03-20T07:00:00.000Z"); // midnight PDT
});

test("descriptions: Big date marker and ParentSquare link are pulled out", () => {
  const result = parseDescription("Big date\nArrive by 5:30.\nParentSquare post: https://www.parentsquare.com/feeds/123.");
  assert.equal(result.big, true);
  assert.equal(result.parentSquareUrl, "https://www.parentsquare.com/feeds/123");
  assert.equal(result.text, "Arrive by 5:30.");
});

test("descriptions written in Google Calendar's web editor (HTML) are cleaned", () => {
  const result = parseDescription('Wear black.<br><a href="https://www.parentsquare.com/feeds/9">Read more</a><br>BIG DATE!');
  assert.equal(result.big, true);
  assert.equal(result.parentSquareUrl, "https://www.parentsquare.com/feeds/9");
  assert.equal(result.text, "Wear black.\nRead more");
});

test("other links stay in the description", () => {
  const result = parseDescription("Tickets: https://example.org/tickets");
  assert.equal(result.parentSquareUrl, null);
  assert.equal(result.text, "Tickets: https://example.org/tickets");
});

test("cancelled occurrences are dropped", () => {
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0",
    "BEGIN:VEVENT", "UID:x", "DTSTART:20261105T230000Z", "DTEND:20261106T000000Z", "RRULE:FREQ=WEEKLY;COUNT=3", "SUMMARY:Rehearsal", "END:VEVENT",
    "BEGIN:VEVENT", "UID:x", "RECURRENCE-ID:20261112T230000Z", "DTSTART:20261112T230000Z", "DTEND:20261113T000000Z", "STATUS:CANCELLED", "SUMMARY:Rehearsal", "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const events = parseCalendar(ics, "choir", { timeZone, now });
  assert.deepEqual(events.map((event) => event.startDate), ["2026-11-05", "2026-11-19"]);
});

test("zonedMidnight handles both sides of daylight saving time", () => {
  assert.equal(zonedMidnight("2027-01-15", timeZone).toISOString(), "2027-01-15T08:00:00.000Z");
  assert.equal(zonedMidnight("2027-07-15", timeZone).toISOString(), "2027-07-15T07:00:00.000Z");
});

test("generated feeds round-trip through the parser", () => {
  const original = load("choir");
  const feed = buildIcs(original, { name: "Choir, test; feed", now });
  const reparsed = parseCalendar(feed, "choir", { timeZone, now });
  assert.deepEqual(
    reparsed.map(({ title, start, end, location, parentSquareUrl, allDay }) => ({ title, start, end, location, parentSquareUrl, allDay })),
    original.map(({ title, start, end, location, parentSquareUrl, allDay }) => ({ title, start, end, location, parentSquareUrl, allDay })),
  );
  for (const line of feed.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75, line);
});
