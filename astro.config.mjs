// @ts-check
import { defineConfig } from "astro/config";

// The site lives at https://gon3tom-32.github.io/oc-fine-arts/.
// If it moves to its own domain (for example finearts.example.org),
// set `site` to that address and `base` to "/".
export default defineConfig({
  site: "https://gon3tom-32.github.io",
  base: "/oc-fine-arts",
  trailingSlash: "always",
});
