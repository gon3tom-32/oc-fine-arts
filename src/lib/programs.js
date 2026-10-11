// Program pages are built from the Markdown files in src/content/programs/.
const files = import.meta.glob("../content/programs/*.md", { eager: true });

/**
 * @typedef {object} Program
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} grades
 * @property {string} meets
 * @property {string} where
 * @property {string[]} whatToBring
 * @property {{label: string, text: string}[]} goodToKnow
 * @property {string} scheduleLabel
 * @property {string} scheduleUrl
 * @property {any} Content
 */

/** @type {Program[]} */
export const programs = Object.entries(files)
  .map(([path, file]) => ({
    id: path.split("/").pop().replace(/\.md$/, ""),
    ...file.frontmatter,
    whatToBring: file.frontmatter.whatToBring ?? [],
    goodToKnow: file.frontmatter.goodToKnow ?? [],
    Content: file.Content,
  }))
  .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

export const programById = Object.fromEntries(programs.map((program) => [program.id, program]));
