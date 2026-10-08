// Voice over background, per music bed, from the stems written by src/audio.ts (100 ms windows where the voice speaks).
// Target: median ≥ 14 dB in the hook bed and everywhere else; low "worst 10%" spots are usually hits landing on words.
// Usage: node src/audio.ts && node tools/vob.ts [--list]   (--list prints the windows under 9 dB)
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../src/lib/config.ts";
import { readWav16 } from "../src/lib/wav.ts";

const v = readWav16(path.join(ROOT, "out", "stem_voice.wav")).samples, b = readWav16(path.join(ROOT, "out", "stem_bg.wav")).samples;
const plan = JSON.parse(fs.readFileSync(path.join(ROOT, "out", "audio_plan.json"), "utf8")) as { beds: Record<string, { t0: number; t1: number }> };
const SR = 48000, w = 4800 * 2;
const beds = Object.entries(plan.beds).sort((p, q) => p[1].t0 - q[1].t0);
const regions = beds.map(([k, bd], i) => [k, bd.t0, i + 1 < beds.length ? beds[i + 1][1].t0 : 1e9] as const);
for (const [name, a, z] of regions) {
  const diffs: number[] = [], low: string[] = [];
  for (let i = Math.floor(a * SR) * 2; i + w <= Math.min(v.length, b.length, Math.floor(z * SR) * 2); i += w) {
    let sv = 0, sb = 0;
    for (let k = i; k < i + w; k++) { sv += v[k] * v[k]; sb += b[k] * b[k]; }
    const dv = 10 * Math.log10(sv / w + 1e-12), dbg = 10 * Math.log10(sb / w + 1e-12);
    if (dv > -32) { diffs.push(dv - dbg); if (dv - dbg < 9) low.push(`${(i / 2 / SR).toFixed(1)}s`); }
  }
  diffs.sort((x, y) => x - y);
  if (!diffs.length) { console.log(`${name.padEnd(10)} no speech`); continue; }
  const med = diffs[Math.floor(diffs.length / 2)], p10 = diffs[Math.floor(diffs.length * 0.1)];
  console.log(`${name.padEnd(10)} ${a.toFixed(1)}–${Math.min(z, 9999).toFixed(1)} s   median ${med.toFixed(1)} dB   worst10% ${p10.toFixed(1)} dB   ${med < 14 ? "← LOW: lower this bed or the hits on words" : ""}`);
  if (process.argv.includes("--list") && low.length) console.log(`           under 9 dB at: ${low.join(" ")}`);
}
