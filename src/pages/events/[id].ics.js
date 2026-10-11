// One small .ics file per event, for the "Add to calendar" button.
import { getAllEvents } from "../../lib/calendar.js";
import { buildIcs } from "../../lib/ics.js";

export async function getStaticPaths() {
  const events = await getAllEvents();
  return events.map((event) => ({ params: { id: event.id }, props: { event } }));
}

export function GET({ props }) {
  return new Response(buildIcs([props.event], { name: props.event.title }), {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
}
