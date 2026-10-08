// Mix: narration + music beds (ducked under speech; a bed can tape-stop) + sound effects placed by their measured onset or
// peak. Linked look-ahead limiter, two-pass loudness to −14 LUFS, stems for QA, then mux with the rendered picture.
// Beds (file, level, entry point) come from timeline.ts `music`; effect roles from sfx-roles.ts plus timeline.ts `roles`.
// Usage: node src/audio.ts [--mux]   → out/mix.wav (+ out/final.mp4 with --mux)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { LEAD, PROJECT, alignment } from "./common.ts";
import { readWav16, writeWav16 } from "./lib/wav.ts";
import { ensureDir, ffmpegBin, loudnorm, writeJson } from "./lib/util.ts";
import * as TL from "./timeline.ts";
import { writeSrt } from "./captions.ts";
import { CONFIG } from "./lib/config.ts";
import { SFX_ROLES, type Role } from "./sfx-roles.ts";

const { END, music, sfx } = TL;

const SR = 48000, N = Math.ceil(END * SR) + SR;
const BGM = CONFIG.bgmDir, LIB = CONFIG.sfxDir;
const db = (x: number) => 10 ** (x / 20), todb = (x: number) => 20 * Math.log10(Math.max(x, 1e-9));

function decode(file: string): [Float32Array, Float32Array] {
  const r = spawnSync(ffmpegBin("ffmpeg"), ["-v", "error", "-i", file, "-ac", "2", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  const b = r.stdout as Buffer, n = Math.floor(b.length / 8), L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = b.readFloatLE(i * 8); R[i] = b.readFloatLE(i * 8 + 4); }
  if (!n) throw new Error(`could not decode ${file}`);
  return [L, R];
}
/** RMS over 10 ms windows (max of channels). */
function env10(L: Float32Array, R?: Float32Array): Float32Array {
  const w = SR / 100, out = new Float32Array(Math.floor(L.length / w));
  for (let k = 0; k < out.length; k++) { let a = 0, b = 0; for (let i = k * w; i < (k + 1) * w; i++) { a += L[i] * L[i]; if (R) b += R[i] * R[i]; } out[k] = Math.sqrt(Math.max(a, b) / w); }
  return out;
}

// ---------- voice ----------
const v = readWav16(path.join(PROJECT, "vo", "voice.wav"));
if (v.sampleRate !== SR) throw new Error("voice.wav must be 48 kHz");
const voice = new Float32Array(N);
{
  const e = env10(v.samples), act = Array.from(e).filter((x) => x > db(-40));
  const rms = act.length ? Math.sqrt(act.reduce((a, x) => a + x * x, 0) / act.length) : 0;
  const g = rms > 0 ? db(-18) / rms : 1;
  voice.set(v.samples.map((x) => x * g).subarray(0, Math.max(0, N - Math.round(LEAD * SR))), Math.round(LEAD * SR));
  console.log(`[audio] voice ${alignment.draft ? "(DRAFT: silent placeholder)" : ""} active rms ${todb(rms).toFixed(1)} dBFS → −18`);
}

// ---------- music ----------
const mL = new Float32Array(N), mR = new Float32Array(N);
const report: Record<string, unknown> = {};
for (const m of music) {
  const bed = m, [L, R] = decode(path.join(BGM, bed.file));
  // enter on the first real onset so the bed starts on a beat
  const e = env10(L, R), peak = Math.max(...e), onset = Math.max(0, e.findIndex((x) => x > peak * db(-24)) - 1) / 100;
  const from = m.from ?? onset;
  // level by the louder 25% of 2-second windows of the part we use
  const a0 = Math.round(from * 100), a1 = Math.min(e.length, a0 + Math.round((m.t1 - m.t0) * 100));
  const wins: number[] = [];
  for (let k = a0; k + 200 <= a1; k += 100) { let s = 0; for (let i = k; i < k + 200; i++) s += e[i] * e[i]; wins.push(Math.sqrt(s / 200)); }
  wins.sort((x, y) => x - y);
  const ref = wins.length ? wins[Math.floor(wins.length * 0.75)] : peak * 0.3, g = db(bed.level) / ref;
  const i0 = Math.round(m.t0 * SR), len = Math.round((m.t1 - m.t0) * SR), src0 = Math.round(from * SR);
  const fi = Math.max(1, Math.round(m.fadeIn * SR)), fo = Math.max(1, Math.round(m.fadeOut * SR)), ts = Math.round((m.tapeStop ?? 0) * SR);
  let pos = src0;
  for (let i = 0; i < len && i0 + i < N; i++) {
    let rate = 1;
    if (ts && i >= len - ts) rate = (1 - (i - (len - ts)) / ts) ** 1.6;
    const p = Math.floor(pos), f = pos - p;
    if (p + 1 >= L.length) break;
    let amp = g;
    if (i < fi) amp *= Math.sin((Math.PI / 2) * (i / fi));
    if (i > len - fo) amp *= Math.sin((Math.PI / 2) * Math.max(0, (len - i) / fo));
    for (const [a, b, d] of m.duck ?? []) { const t = (i0 + i) / SR; if (t >= a && t < b) amp *= db(d * Math.min(1, (t - a) / 0.3, (b - t) / 0.3)); }
    mL[i0 + i] += (L[p] * (1 - f) + L[p + 1] * f) * amp;
    mR[i0 + i] += (R[p] * (1 - f) + R[p + 1] * f) * amp;
    pos += rate;
  }
  report[m.k] = { file: bed.file, from: +from.toFixed(2), t0: +m.t0.toFixed(2), t1: +m.t1.toFixed(2), gainDb: +todb(g).toFixed(1) };
  console.log(`[audio] bed ${m.k.padEnd(7)} ${bed.file}  from ${from.toFixed(2)} s  ${m.t0.toFixed(2)}–${m.t1.toFixed(2)}  gain ${todb(g).toFixed(1)} dB${m.tapeStop ? "  tape-stop" : ""}`);
}
// duck the beds under the narration: −10 dB while speaking, 40 ms attack, 350 ms release (effects get half the depth)
const duckDb = new Float32Array(Math.floor(N / (SR / 100)) + 1);
{
  const e = env10(voice), w = SR / 100, gain = new Float32Array(e.length);
  let gdb = 0;
  for (let k = 0; k < e.length; k++) {
    let mx = 0; for (let j = k; j < Math.min(e.length, k + 6); j++) mx = Math.max(mx, e[j]);   // look ahead 60 ms
    const target = -10 * Math.min(1, Math.max(0, (todb(mx) + 48) / 12));
    gdb += (target - gdb) * (target < gdb ? 0.25 : 0.028);
    gain[k] = db(gdb); duckDb[k] = gdb;
  }
  for (let i = 0; i < N; i++) { const k = Math.min(gain.length - 1, Math.floor(i / w)), k2 = Math.min(gain.length - 1, k + 1), f = (i % w) / w, g = gain[k] * (1 - f) + gain[k2] * f; mL[i] *= g; mR[i] *= g; }
}

// ---------- effects ----------
const ROLES: Record<string, Role> = { ...SFX_ROLES, ...((TL as { roles?: Record<string, Role> }).roles ?? {}) };
const sL = new Float32Array(N), sR = new Float32Array(N);
const cache = new Map<string, { L: Float32Array; R: Float32Array; at: number; pk: number }>();
function prep(r: Role) {
  const key = `${r.file}|${r.slice?.join(",") ?? ""}|${r.align}`;
  let c = cache.get(key);
  if (c) return c;
  let [L, R] = decode(path.join(LIB, r.file));
  if (r.slice) { L = L.slice(Math.round(r.slice[0] * SR), Math.round(r.slice[1] * SR)); R = R.slice(Math.round(r.slice[0] * SR), Math.round(r.slice[1] * SR)); }
  const fade = Math.round((r.fade ?? 0.01) * SR), fin = Math.round(0.004 * SR);
  for (let i = 0; i < Math.min(fade, L.length); i++) { const g = i / fade; L[L.length - 1 - i] *= g; R[R.length - 1 - i] *= g; }
  for (let i = 0; i < Math.min(fin, L.length); i++) { const g = i / fin; L[i] *= g; R[i] *= g; }
  const e = env10(L, R), pkv = Math.max(...e), pkAt = e.indexOf(pkv) / 100, on = Math.max(0, e.findIndex((x) => x > pkv * db(-30))) / 100;
  let sp = 0; for (let i = 0; i < L.length; i++) sp = Math.max(sp, Math.abs(L[i]), Math.abs(R[i]));
  c = { L, R, at: r.align === "peak" ? pkAt : on, pk: sp };
  cache.set(key, c);
  return c;
}
const placed: Array<{ k: string; t: number }> = [];
for (const cue of sfx) {
  const r = ROLES[cue.k];
  if (!r) throw new Error(`no sound role "${cue.k}"`);
  const c = prep(r), g = db(r.peak + (cue.g ?? 0)) / c.pk, start = Math.round((cue.t - c.at) * SR);
  for (let i = 0; i < c.L.length; i++) { const j = start + i; if (j < 0 || j >= N) continue; sL[j] += c.L[i] * g; sR[j] += c.R[i] * g; }
  placed.push({ k: cue.k, t: +cue.t.toFixed(3) });
}
console.log(`[audio] ${placed.length} effects placed from ${new Set(placed.map((p) => p.k)).size} roles`);

// effects sit under the words too, at half the duck depth
{
  const w = SR / 100;
  for (let i = 0; i < N; i++) { const k = Math.min(duckDb.length - 1, Math.floor(i / w)), g = db(duckDb[k] * 0.5); sL[i] *= g; sR[i] *= g; }
}
// ---------- master ----------
const L = new Float32Array(N), R = new Float32Array(N);
for (let i = 0; i < N; i++) { L[i] = voice[i] + mL[i] + sL[i]; R[i] = voice[i] + mR[i] + sR[i]; }
{
  // linked look-ahead limiter at −1 dBFS: 5 ms look-ahead, 120 ms release
  const ceil = db(-1), la = Math.round(0.005 * SR), rel = 1 - Math.exp(-1 / (0.12 * SR));
  const need = new Float32Array(N);
  for (let i = 0; i < N; i++) { const p = Math.max(Math.abs(L[i]), Math.abs(R[i])); need[i] = p > ceil ? ceil / p : 1; }
  const dq: number[] = []; let head = 0, g = 1, minGain = 1;
  for (let i = 0; i < N; i++) {
    const j = i + la;
    if (j < N) { while (dq.length > head && need[dq[dq.length - 1]] >= need[j]) dq.pop(); dq.push(j); }
    while (head < dq.length && dq[head] < i) head++;
    const target = head < dq.length ? Math.min(need[dq[head]], 1) : 1;
    g = target < g ? target : g + (target - g) * rel;
    L[i] *= g; R[i] *= g; minGain = Math.min(minGain, g);
  }
  console.log(`[audio] limiter max reduction ${todb(minGain).toFixed(1)} dB`);
}
const outDir = ensureDir(path.join(PROJECT, "out"));
const inter = (a: Float32Array, b: Float32Array, n = Math.ceil(END * SR)) => { const o = new Float32Array(n * 2); for (let i = 0; i < n; i++) { o[2 * i] = a[i]; o[2 * i + 1] = b[i]; } return o; };
writeWav16(path.join(outDir, "mix_raw.wav"), inter(L, R), SR, 2);
const m = loudnorm(path.join(outDir, "mix_raw.wav"), path.join(outDir, "mix.wav"));
console.log(`[audio] loudness ${m.i.toFixed(1)} LUFS → −14 (two-pass)`);
// stems at the same relative level for the voice-over-background check
writeWav16(path.join(outDir, "stem_voice.wav"), inter(voice, voice), SR, 2);
const bgL = new Float32Array(N), bgR = new Float32Array(N);
for (let i = 0; i < N; i++) { bgL[i] = mL[i] + sL[i]; bgR[i] = mR[i] + sR[i]; }
writeWav16(path.join(outDir, "stem_bg.wav"), inter(bgL, bgR), SR, 2);
writeJson(path.join(outDir, "audio_plan.json"), { draftVoice: !!alignment.draft, beds: report, effects: placed });
writeSrt(path.join(outDir, "captions.srt"));

if (process.argv.includes("--mux")) {
  const video = path.join(outDir, "video.mp4"), final = path.join(outDir, "final.mp4");
  const r = spawnSync(ffmpegBin("ffmpeg"), ["-y", "-v", "error", "-i", video, "-i", path.join(outDir, "mix.wav"), "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
    "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", final], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("mux failed");
  console.log(`[audio] muxed → ${final}`);
}
