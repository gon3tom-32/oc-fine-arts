// Builds links that work under the site's base path (for example /oc-fine-arts/).
const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");

/** Site-relative link: link("calendar/") -> "/oc-fine-arts/calendar/" */
export function link(path = "") {
  return base + path.replace(/^\//, "");
}

/** Full https address, needed for calendar subscriptions. */
export function absolute(path, site) {
  return new URL(link(path), site).href;
}

export function feedPath(programId) {
  return `feeds/${programId ?? "all"}.ics`;
}

/** Links that subscribe a phone or Google Calendar to one of the site's feeds. */
export function subscribeLinks(programId, site) {
  const https = absolute(feedPath(programId), site);
  const webcal = https.replace(/^https?:/, "webcal:");
  return {
    https,
    webcal,
    google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`,
  };
}
