// Copies the finished video and its subtitles to OUTPUT_DIR (default: the folder holding this project) as
// "<title>_16比9讲解版.mp4/.srt", where <title> is script.json "title", and makes the landscape and portrait covers
// (src/cover.ts) as "<title>_封面横版.jpg" / "<title>_封面竖版.jpg"; plus "<title>_9比16竖版.mp4" when `npm run vertical` made one.
// Usage: node src/deliver.ts [--name=自定义文件名] [--no-covers]
import fs from "node:fs";
import path from "node:path";
import { PROJECT, SCRIPT } from "./common.ts";
import { CONFIG } from "./lib/config.ts";
import { makeCovers } from "./cover.ts";
import { ensureDir } from "./lib/util.ts";

const arg = process.argv.find((a) => a.startsWith("--name="))?.slice(7);
const clean = (s: string) => s.replace(/[\/:*?"<>|]/g, "_");
const base = clean(arg || `${SCRIPT.title}_16比9讲解版`), stem = clean(arg || SCRIPT.title);
const out = ensureDir(CONFIG.outputDir);
const pairs: Array<[string, string]> = [["out/final.mp4", ".mp4"], ["out/captions.srt", ".srt"]];
for (const [rel, ext] of pairs) {
  const src = path.join(PROJECT, rel);
  if (!fs.existsSync(src)) { console.error(`[deliver] missing ${rel} — run the render, mix (--mux) and qa first`); process.exit(1); }
  const dst = path.join(out, base + ext);
  fs.copyFileSync(src, dst);
  console.log(`[deliver] ${dst}`);
}
const vert = path.join(PROJECT, "out", "final_9x16.mp4"), fin = path.join(PROJECT, "out", "final.mp4");
if (fs.existsSync(vert)) {
  if (fs.statSync(vert).mtimeMs < fs.statSync(fin).mtimeMs) console.warn("[deliver] out/final_9x16.mp4 is older than final.mp4 — run npm run vertical again");
  const dst = path.join(out, `${stem}_9比16竖版.mp4`);
  fs.copyFileSync(vert, dst);
  console.log(`[deliver] ${dst}`);
}
if (!process.argv.includes("--no-covers")) {
  const [land, port] = await makeCovers();
  for (const [src, name] of [[land, `${stem}_封面横版.jpg`], [port, `${stem}_封面竖版.jpg`]]) {
    const dst = path.join(out, name);
    fs.copyFileSync(src, dst);
    console.log(`[deliver] ${dst}`);
  }
}
const cost = path.join(PROJECT, "out", "cost.json");
if (fs.existsSync(cost)) console.log(`[deliver] TTS cost so far: ¥${JSON.parse(fs.readFileSync(cost, "utf8")).totals.yuan}`);
