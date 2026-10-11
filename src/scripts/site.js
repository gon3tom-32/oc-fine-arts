// Small client-side behavior: program filters, hiding past events,
// the List/Month toggle, and month-by-month navigation.
// Every page works without it; it only refines what is shown.

// The school's time zone, set on <html> from src/content/calendars.json.
const TIME_ZONE = document.documentElement.dataset.timeZone || "America/Los_Angeles";
const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private browsing); the choice just isn't remembered.
  }
}

function refresh(scope) {
  const filter = scope.querySelector("[data-filter]");
  const checked = filter ? new Set([...filter.querySelectorAll("input:checked")].map((input) => input.value)) : null;
  const showPast = scope.classList.contains("show-past");
  const now = Date.now();
  const isShown = (item) => !item.classList.contains("is-filtered") && (showPast || !item.classList.contains("is-past"));

  let pastCount = 0;
  for (const item of scope.querySelectorAll("[data-program][data-end]")) {
    const past = item.hasAttribute("data-hide-when-past") && Date.parse(item.dataset.end) < now;
    item.classList.toggle("is-past", past);
    item.classList.toggle("is-filtered", checked !== null && !checked.has(item.dataset.program));
    if (past && !item.classList.contains("is-filtered")) pastCount += 1;
  }

  for (const pill of scope.querySelectorAll("[data-pill]")) {
    pill.classList.toggle("is-filtered", checked !== null && !checked.has(pill.dataset.program));
  }

  for (const list of scope.querySelectorAll("[data-limit]")) {
    const limit = Number(list.dataset.limit);
    let shown = 0;
    for (const item of list.querySelectorAll("[data-end]")) {
      item.classList.remove("is-over-limit");
      if (!isShown(item)) continue;
      shown += 1;
      item.classList.toggle("is-over-limit", shown > limit);
    }
  }

  for (const group of scope.querySelectorAll("[data-group]")) {
    group.classList.toggle("is-empty", ![...group.querySelectorAll("[data-end]")].some(isShown));
  }

  for (const container of scope.querySelectorAll("[data-list]")) {
    const empty = container.querySelector("[data-empty]");
    if (empty) empty.hidden = [...container.querySelectorAll("[data-end]")].some(isShown);
  }

  for (const button of scope.querySelectorAll("[data-past-toggle]")) {
    button.hidden = pastCount === 0;
    button.textContent = showPast ? "Hide past events" : `Show past events (${pastCount})`;
    button.setAttribute("aria-expanded", String(showPast));
  }
}

function setUpScope(scope) {
  scope.addEventListener("change", (event) => {
    if (event.target.closest("[data-filter]")) refresh(scope);
  });
  for (const button of scope.querySelectorAll("[data-past-toggle]")) {
    button.addEventListener("click", () => {
      scope.classList.toggle("show-past");
      refresh(scope);
    });
  }
  refresh(scope);
}

function setUpViews(root) {
  const buttons = [...root.querySelectorAll("[data-view]")];
  const panels = [...root.querySelectorAll("[data-view-panel]")];
  if (!buttons.length) return;

  const show = (name) => {
    for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.view === name));
    for (const panel of panels) panel.hidden = panel.dataset.viewPanel !== name;
    storageSet("calendar-view", name);
  };
  for (const button of buttons) button.addEventListener("click", () => show(button.dataset.view));

  const saved = storageGet("calendar-view");
  if (saved && buttons.some((button) => button.dataset.view === saved)) show(saved);
}

function setUpMonths(root) {
  const months = [...root.querySelectorAll("[data-month-panel]")];
  if (!months.length) return;
  const label = root.querySelector("[data-month-label]");
  const prev = root.querySelector('[data-month-nav="-1"]');
  const next = root.querySelector('[data-month-nav="1"]');
  const thisMonth = todayKey.slice(0, 7);

  let index = months.findIndex((panel) => panel.dataset.monthPanel >= thisMonth);
  if (index === -1) index = months.length - 1;

  const show = (newIndex) => {
    index = Math.max(0, Math.min(months.length - 1, newIndex));
    months.forEach((panel, i) => (panel.hidden = i !== index));
    if (label) label.textContent = months[index].dataset.monthName;
    if (prev) prev.disabled = index === 0;
    if (next) next.disabled = index === months.length - 1;
  };
  prev?.addEventListener("click", () => show(index - 1));
  next?.addEventListener("click", () => show(index + 1));
  show(index);

  for (const cell of root.querySelectorAll(`[data-date="${todayKey}"]`)) {
    cell.classList.add("is-today");
    cell.setAttribute("aria-current", "date");
  }
}

// Links to an event (from the month grid) open its details.
document.addEventListener("click", (event) => {
  const anchor = event.target.closest("a[data-open]");
  if (!anchor) return;
  const target = document.getElementById(anchor.getAttribute("href").slice(1));
  const details = target?.querySelector("details");
  if (details) details.open = true;
});

// Arriving with a link to an event (for example from "Big dates") opens it.
function openFromHash() {
  if (!location.hash) return;
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  const details = target?.querySelector("details");
  if (details) details.open = true;
}
window.addEventListener("hashchange", openFromHash);

for (const scope of document.querySelectorAll("[data-events]")) setUpScope(scope);
setUpViews(document);
setUpMonths(document);
openFromHash();
