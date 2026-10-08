// Copies the finished video and its subtitles to OUTPUT_DIR (default: the folder holding this project) as
// "<title>_16比9讲解版.mp4/.srt", where <title> is script.json "title". Usage: node src/deliver.ts [--name=自定义文件名]
import fs from "node:fs";
import path from "node:path";
import { PROJECT, SCRIPT } from "./common.ts";
import { CONFIG } from "./lib/config.ts";
import { ensureDir } from "./lib/util.ts";

const arg = process.argv.find((a) => a.startsWith("--name="))?.slice(7);
const base = (arg || `${SCRIPT.title}_16比9讲解版`).replace(/[\/:*?"<>|]/g, "_");
const out = ensureDir(CONFIG.outputDir);
const pairs: Array<[string, string]> = [["out/final.mp4", ".mp4"], ["out/captions.srt", ".srt"]];
for (const [rel, ext] of pairs) {
  const src = path.join(PROJECT, rel);
  if (!fs.existsSync(src)) { console.error(`[deliver] missing ${rel} — run the render, mix (--mux) and qa first`); process.exit(1); }
  const dst = path.join(out, base + ext);
  fs.copyFileSync(src, dst);
  console.log(`[deliver] ${dst}`);
}
const cost = path.join(PROJECT, "out", "cost.json");
if (fs.existsSync(cost)) console.log(`[deliver] TTS cost so far: ¥${JSON.parse(fs.readFileSync(cost, "utf8")).totals.yuan}`);
