// Subscription feeds: /feeds/all.ics plus one per program.
// Rebuilt every hour along with the rest of the site.
import { getAllEvents } from "../../lib/calendar.js";
import { programs, programById } from "../../lib/programs.js";
import { buildIcs } from "../../lib/ics.js";
import site from "../../content/site.json";

export function getStaticPaths() {
  return [{ params: { program: "all" } }, ...programs.map((program) => ({ params: { program: program.id } }))];
}

export async function GET({ params }) {
  const all = await getAllEvents();
  const isAll = params.program === "all";
  const events = isAll ? all : all.filter((event) => event.program === params.program);
  const name = isAll ? `${site.schoolName} ${site.departmentName}` : `${site.departmentName}: ${programById[params.program].name}`;
  return new Response(buildIcs(events, { name }), { headers: { "Content-Type": "text/calendar; charset=utf-8" } });
}
