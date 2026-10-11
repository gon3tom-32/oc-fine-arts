// Loads every program's calendar once per build.
// Sample files are read relative to the project folder, where `npm run build` runs.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import calendars from "../content/calendars.json";
import { parseCalendar, compareEvents } from "./events.js";

export const timeZone = calendars.timeZone;

let loading;

/** @returns {Promise<import("./events.js").CalendarEvent[]>} */
export function getAllEvents() {
  loading ??= loadAll();
  return loading;
}

async function loadAll() {
  const now = new Date();
  const perProgram = await Promise.all(
    calendars.programs.map(async ({ id, icsUrl, sampleFile }) => {
      const text = icsUrl ? await fetchFeed(id, icsUrl) : await readFile(resolve(process.cwd(), sampleFile), "utf8");
      return parseCalendar(text, id, { timeZone, now });
    }),
  );
  return perProgram.flat().sort(compareEvents);
}

// A failed fetch stops the build on purpose, so the site that is already
// live stays up instead of being replaced by one with missing events.
async function fetchFeed(id, url) {
  const response = await fetch(url.replace(/^webcal:/i, "https:"));
  if (!response.ok) throw new Error(`Could not load the ${id} calendar (${response.status} ${response.statusText}) from ${url}`);
  const text = await response.text();
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error(`The ${id} calendar address did not return a calendar: ${url}`);
  return text;
}

export function isUsingSampleData() {
  return calendars.programs.some((program) => !program.icsUrl);
}
