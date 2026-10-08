// Measure effect files before adding a role: duration, sample peak, where the loudest 0.1 s sits, transients and a
// loudness sparkline (one char per 0.1 s). Long files need a `slice`; risers peak late (align "peak" + slice the tail).
// Usage: node tools/sfxinfo.ts "环境音效/叮.mp3" "击打-Hits/02 Bold Hit.wav" …   (paths relative to SFX_DIR, or absolute)
//        node tools/sfxinfo.ts --find=硬币|coin                                (search file names in SFX_DIR)
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { CONFIG } from "../src/lib/config.ts";
import { ffmpegBin } from "../src/lib/util.ts";

const find = process.argv.find((a) => a.startsWith("--find="))?.slice(7);
if (find) {
  const rx = new RegExp(find, "i"), hits: string[] = [];
  const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (rx.test(e.name)) hits.push(path.relative(CONFIG.sfxDir, p).replace(/\\/g, "/")); } };
  walk(CONFIG.sfxDir);
  console.log(hits.join("\n") || "(nothing)");
  process.exit(0);
}
for (const f of process.argv.slice(2)) {
  const file = path.isAbsolute(f) ? f : path.join(CONFIG.sfxDir, f), sr = 8000;
  const raw = spawnSync(ffmpegBin("ffmpeg"), ["-v", "error", "-i", file, "-ac", "1", "-ar", String(sr), "-f", "f32le", "-"], { maxBuffer: 1 << 28 }).stdout as Buffer;
  const n = Math.floor(raw.length / 4);
  if (!n) { console.log(`${f}: cannot decode`); continue; }
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = raw.readFloatLE(i * 4);
  const win = sr / 10, e: number[] = [];
  let pk = 0;
  for (let k = 0; k * win < n; k++) { let s = 0; for (let i = k * win; i < Math.min(n, (k + 1) * win); i++) { s += x[i] * x[i]; pk = Math.max(pk, Math.abs(x[i])); } e.push(10 * Math.log10(s / win + 1e-12)); }
  const mx = Math.max(...e), at = e.indexOf(mx) * 0.1;
  const tr: string[] = [];
  for (let k = 2; k < e.length; k++) if (e[k] > mx - 24 && e[k] - Math.min(e[k - 1], e[k - 2]) > 10 && (!tr.length || k * 0.1 - Number(tr[tr.length - 1]) > 0.3)) tr.push((k * 0.1).toFixed(1));
  const spark = e.map((v) => " ▁▂▃▄▅▆▇█"[Math.max(0, Math.min(8, Math.round((v - (mx - 40)) / 5)))]).join("");
  console.log(`${f}\n  ${(n / sr).toFixed(2)} s, peak ${(20 * Math.log10(pk + 1e-9)).toFixed(1)} dBFS, loudest at ${at.toFixed(1)} s, transients ${tr.slice(0, 10).join(" ") || "-"}\n  ${spark.slice(0, 150)}`);
}
