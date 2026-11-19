#!/usr/bin/env node
/**
 * Downloads the shop's two fonts from Google Fonts into public/fonts and writes app/fonts.css.
 * Run it only to change or update a font; the build itself never goes to Google:
 *
 *   node tools/fonts/fetch-fonts.mjs
 *
 * Why: next/font/google downloaded them during every build, and Google now and then answers a
 * data-centre address with a font link Next cannot read, so the build failed at random
 * ("An error occurred in `next/font`"). The files and their per-alphabet split (unicode-range)
 * are exactly what Google serves; the fallback metrics are the ones next/font computed, so
 * nothing moves while a font loads.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = path.join(ROOT, "public/fonts");
const CSS_FILE = path.join(ROOT, "app/fonts.css");
// The browser next/font presents itself as: Google then serves woff2 split by alphabet.
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36";

const FONTS = [
  { slug: "golos-text", query: "Golos+Text:wght@400..900", variable: "--font-text", fallback: "Golos Text Fallback", metrics: { ascent: "90.27%", descent: "20.26%", lineGap: "0.00%", size: "108.57%" } },
  { slug: "unbounded", query: "Unbounded:wght@500;600", variable: "--font-display", fallback: "Unbounded Fallback", metrics: { ascent: "73.93%", descent: "18.20%", lineGap: "0.00%", size: "134.59%" } },
];

fs.mkdirSync(OUT_DIR, { recursive: true });
const blocks = [];
const variables = [];
const preload = [];

for (const font of FONTS) {
  const response = await fetch(`https://fonts.googleapis.com/css2?family=${font.query}&display=swap`, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) throw new Error(`${font.slug}: Google Fonts answered ${response.status}`);
  const css = await response.text();
  const faces = [...css.matchAll(/\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)];
  if (faces.length === 0) throw new Error(`${font.slug}: no @font-face in the answer`);
  let family = "";
  for (const [, subset, body] of faces) {
    const url = /src:\s*url\(([^)]+)\)/.exec(body)?.[1];
    if (!url || !/\.woff2$/.test(url)) throw new Error(`${font.slug} ${subset}: unexpected font link ${url}`);
    family = /font-family:\s*'([^']+)'/.exec(body)[1];
    const weight = /font-weight:\s*([^;]+);/.exec(body)[1].trim();
    const range = /unicode-range:\s*([^;]+);/.exec(body)[1].trim();
    // One file per alphabet: the weights of a variable font share it.
    const file = `${font.slug}-${subset}.woff2`;
    if (!fs.existsSync(path.join(OUT_DIR, file)) || process.argv.includes("--refresh")) {
      const data = Buffer.from(await (await fetch(url)).arrayBuffer());
      fs.writeFileSync(path.join(OUT_DIR, file), data);
    }
    blocks.push(`/* ${family}, ${subset} */\n@font-face {\n  font-family: '${family}';\n  font-style: normal;\n  font-weight: ${weight};\n  font-display: swap;\n  src: url(/fonts/${file}) format('woff2');\n  unicode-range: ${range};\n}`);
    if (subset === "latin" || subset === "cyrillic") preload.push(`/fonts/${file}`);
  }
  const m = font.metrics;
  blocks.push(`/* Arial sized like ${family}, while it loads (the values next/font computed) */\n@font-face {\n  font-family: '${font.fallback}';\n  src: local("Arial");\n  ascent-override: ${m.ascent};\n  descent-override: ${m.descent};\n  line-gap-override: ${m.lineGap};\n  size-adjust: ${m.size};\n}`);
  variables.push(`  ${font.variable}: '${family}', '${font.fallback}';`);
}

const header = "/* Written by tools/fonts/fetch-fonts.mjs: the shop's fonts, served from /fonts. Do not edit by hand. */";
fs.writeFileSync(CSS_FILE, `${header}\n\n${blocks.join("\n\n")}\n\n:root {\n${[...new Set(variables)].join("\n")}\n}\n`);
fs.writeFileSync(path.join(ROOT, "lib/fonts.ts"), `/** Written by tools/fonts/fetch-fonts.mjs: the files every page preloads (Latin and Cyrillic). */\nexport const PRELOAD_FONTS = ${JSON.stringify([...new Set(preload)], null, 2)} as const;\n`);
console.log(`fonts: ${fs.readdirSync(OUT_DIR).length} files in public/fonts; app/fonts.css and lib/fonts.ts written`);
