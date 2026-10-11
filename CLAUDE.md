# Orange County Classical Academy Fine Arts site

Parent-facing website for the fine arts department of Orange County Classical Academy (an elementary school). Programs: **Art**, **Choir**, **Musical Theater**. The teacher (Tommy's wife) is the only editor and is not a developer.

## Purpose

The site is a **reference layer**, not a messaging tool. The school already uses **ParentSquare** for announcements and alerts, so this site does not duplicate them. Parents come here to check: what's coming up, what to bring, who to ask.

**Single source of truth: the calendar.** The teacher adds an event once in Google Calendar. The site displays it. ParentSquare posts link to the site's calendar. Nothing is typed twice.

## Pages (v1)

1. **Home**: hero, three program cards, next 3-4 upcoming events with program filter chips, "Big dates this year" strip, "Latest from ParentSquare" (3 link-outs), "Who to ask".
2. **Program page** (one template, three programs): colored hero with name, one-line description, and facts (grades, meets, where); "Coming up in [Program]" (only that program's events) with a program-only subscribe button; What to expect; What to bring; Good to know (attire, missed rehearsal, year-schedule PDF link); contact card with "Email the teacher".
3. **Calendar**: List view (default, grouped by month) and Month view toggle; program filters (checkboxes on desktop, chips on phone); tap an event to expand details with Add to calendar, Get directions, Related ParentSquare post; "Put it on your phone" subscribe card (everything, or per program); past events hidden behind a link.
4. **Contact**: not sketched yet. Keep it simple: teacher name, email, who-to-ask routing.

Mobile-first. Most parents arrive from a ParentSquare link on their phone.

## Calendar data

- One **Google Calendar per program** (Art, Choir, Musical Theater), each with a public feed. The teacher edits from her phone.
- Program is determined by which calendar an event comes from. That drives the filters, color tags, per-program program-page lists, and per-program subscribe links.
- "Subscribe to everything" can be a combined feed or three links. Decide during build.
- Event fields used: title, start/end, location, description. A ParentSquare link can live in the description; parse a URL from it if present.
- "Add to calendar" per event: generate an .ics download or Google/Apple links.
- Calendar fetching needs to avoid browser CORS problems with Google's feeds. Prefer fetching at build time or in a small serverless function, not directly from the browser.

## Suggested stack (confirm before committing)

- Static site generator (Astro suggested) with minimal client-side JS for filters, the List/Month toggle, and event expansion.
- Host on Netlify, Vercel, or Cloudflare Pages. Rebuild on a schedule (hourly) or fetch feeds in a serverless function so new events appear without a manual deploy.
- Program-page text (grades, meeting times, what to bring, attire) lives in plain content files (Markdown or JSON) the teacher or Tommy can edit. Do not hardcode copy in components.
- No database, no accounts, no CMS in v1.

## Design system (from the approved sketch)

Fonts: **Bricolage Grotesque** (700, headings) and **DM Sans** (400/500/700, body). Pill buttons, rounded cards, large tap targets (44px minimum).

School colors are **orange, navy blue, and white**. White is the base, navy carries text and primary buttons, orange is the accent.

| Token | Value | Use |
|---|---|---|
| White | `#FFFFFF` | page background |
| Navy | `#14305E` | text, primary buttons, big-dates band, Choir |
| Navy light | `#24467F` | cards on navy |
| Orange | `#F47B20` | date badges, logo circle, accents on navy. Use navy text on it, never white |
| Wash | `#F2F5FA` | hero and footer backgrounds |
| Rule | `#E1E6F0` | dividers |
| Art | `#C4540A` (tag bg `#FDE6D2`, tag text `#8A3A00`) | Art program color: a deeper orange so white text passes contrast |
| Choir | `#14305E` (tag bg `#DCE3F0`, tag text `#14305E`) | Choir program color |
| Musical Theater | `#2F6FB8` (tag bg `#DCE9F7`, tag text `#1F4F8A`) | Musical Theater program color: the one non-school color, needed to tell three programs apart |

Program tags always carry text, so color is never the only signal. If the school has a third brand color, swap it in for Musical Theater.

Components: header with nav (Calendar, Art, Choir, Musical Theater, Contact), date badge (yellow rounded square with month over day), program tag pill, filter chips, event row, expandable event details, navy "Put it on your phone" card, footer line: "Student photos shared only with approval".

Keep colors as CSS variables so they are easy to swap.

## Placeholders to replace with real content

School logo or mark, teacher name and email, program descriptions, grades, meeting days/times, rooms, what-to-bring lists, concert attire, missed-rehearsal policy, year-schedule PDFs, big dates for the year, ParentSquare URLs. The sketch uses bracketed placeholders like `[Event name]`. Use obvious placeholder content, never invented facts.

## Rules

- **Student privacy:** no student names or faces unless the photo has been approved. No photo galleries in v1. Use placeholder image areas.
- Accessibility: real headings, visible focus states, color is never the only signal (program tags carry text), sufficient contrast, labeled controls.
- Keep it easy for a non-developer to update. If a change needs a code edit to add an event, the design has failed.
- Out of scope for v1: email or text alerts (ParentSquare does this), announcements feed, forms and sign-ups, galleries, ticketing, past-productions archive.

## Open questions for Tommy

1. Hosting: school domain or standalone? Does the school restrict outside websites or require approved links from ParentSquare?
2. Google Calendar: which account owns the three calendars, and should they be created fresh?
3. Should the school-wide calendar also show fine arts events or link to this site?
4. Do Art and Musical Theater need anything the Choir template lacks (for example audition info for Musical Theater)?

## First steps

1. Scaffold the project and set up fonts, color variables, and the shared header and footer.
2. Build the Calendar page against a sample .ics file first, then connect real Google Calendar feeds.
3. Build the Home page and the program template on top of the same event data.
4. Add content files for the three programs.
5. Deploy a preview and test on a real phone.
