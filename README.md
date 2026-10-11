# Orange County Classical Academy Fine Arts

Parent-facing website for the fine arts department: **Art**, **Choir**, and **Musical Theater**. Parents check it for what's coming up, what to bring, and who to ask. Announcements stay on ParentSquare.

Live site: <https://gon3tom-32.github.io/oc-fine-arts/>

## For the teacher: everyday updates

### Add, change, or cancel an event

Use Google Calendar on your phone or computer. Each program has its own calendar (Art, Choir, Musical Theater). Put the event on the right one; that decides its color tag and which program page shows it.

The site picks up changes within about an hour. Nothing else needs to be edited.

In the event's **description** you can add:

- **A ParentSquare link.** Paste the post's link anywhere in the description. It shows up as a "Related ParentSquare post" button, and the post is listed under "Latest from ParentSquare" on the home page.
- **`Big date`** on a line by itself. The event then appears in the "Big dates this year" band on the home page. The line itself isn't shown to parents.

Repeating events (like a weekly rehearsal) and cancelling one rehearsal of a series both work as they normally do in Google Calendar.

### Change program text

Each program has a file in [`src/content/programs/`](src/content/programs/): `art.md`, `choir.md`, `musical-theater.md`. You can edit them right on GitHub (open the file, click the pencil icon, then **Commit changes**). The site updates a couple of minutes later.

- The part between the `---` lines holds the facts (grades, meeting times, room), the "What to bring" list, and the "Good to know" items. Change the words inside the quotes. Keep the dashes, colons, and spacing as they are.
- Everything below the second `---` is the "What to expect" section, written as plain paragraphs.
- To link a year-schedule PDF, upload the PDF to the [`public/`](public/) folder (for example `public/choir-schedule.pdf`) and set `scheduleUrl: "choir-schedule.pdf"`. A full link to a PDF somewhere else (such as Google Drive) also works.

Teacher name, email, the tagline, and the "Who to ask" list are in [`src/content/site.json`](src/content/site.json).

If an edit breaks the site, the build fails and the previous version stays live. The error shows on the repository's **Actions** tab.

## One-time setup

1. **GitHub Pages.** In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**. The workflow in `.github/workflows/deploy.yml` then builds and publishes the site on every change and every hour.
2. **Google Calendars.** Create three calendars (Art, Choir, Musical Theater) in the account that will own them. For each one, open **Settings → [calendar] → Access permissions** and turn on **Make available to public**. Then copy **Public address in iCal format** from **Integrate calendar** and paste it as that program's `icsUrl` in [`src/content/calendars.json`](src/content/calendars.json). Until a program has an `icsUrl`, the site shows the sample events in [`sample-data/`](sample-data/).
3. **Replace placeholders.** Everything in `[square brackets]` is a placeholder. That includes teacher details, meeting times, rooms, and the ParentSquare address. The school logo files are in `public/` (`crest.png`, `logo.png`, `favicon.png`, `apple-touch-icon.png`).

GitHub pauses hourly workflows in repositories with no activity for 60 days. If new events stop appearing, open the **Actions** tab and re-enable the workflow, or run it by hand with **Run workflow**.

## How it works

- [Astro](https://astro.build) builds a static site. Calendar feeds are fetched at build time, so there are no browser CORS problems and no server to run.
- Each program's events come from its own calendar. The build also publishes subscription feeds at `/feeds/all.ics`, `/feeds/art.ics`, and so on, plus one `.ics` file per event for "Add to calendar".
- A small script (`src/scripts/site.js`) handles the program filters, the List/Month toggle, month navigation, and hiding events that have ended since the last build. Pages still work without it.
- Colors and fonts are CSS variables at the top of [`src/styles/global.css`](src/styles/global.css). Program colors are the `--art`, `--choir`, and `--mt` groups. A new program needs a content file, a calendar entry in `calendars.json`, and a `.p-<id>` color class in that file.

## Development

Requires Node 22 or newer.

```sh
npm install
npm run dev      # local preview at http://localhost:4321/oc-fine-arts/
npm test         # calendar parsing tests
npm run build    # production build into dist/
```

## Open questions

1. Hosting: school domain or standalone? Does the school require approved links from ParentSquare? (Moving to a custom domain means changing `site` and `base` in `astro.config.mjs`.)
2. Which Google account owns the three calendars?
3. Should the school-wide calendar also show fine arts events, or link here?
4. Do Art and Musical Theater need anything the Choir template lacks? Musical Theater has a placeholder "Auditions" item under Good to know for now.
