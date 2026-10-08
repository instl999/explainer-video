// BGM survey: duration, loudness, a 2-second energy profile, tempo and pulse strength for every track in the library,
// so the beds can be chosen by mood label and entered where the music is already at full energy.
// Usage: node src/bgmscan.ts [filter]  → prints a table and writes out/bgm_scan.json
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT, ffmpegBin, writeJson } from "./lib/util.ts";
import { CONFIG } from "./lib/config.ts";

export const BGM_DIR = CONFIG.bgmDir;
const SR = 11025;
export function decodeMono(file: string, sr = SR): Float32Array {
  const r = spawnSync(ffmpegBin("ffmpeg"), ["-v", "error", "-i", file, "-ac", "1", "-ar", String(sr), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  const b = r.stdout as Buffer, n = Math.floor(b.length / 4);
  if (b.byteOffset % 4 === 0) return new Float32Array(b.buffer, b.byteOffset, n);
  const out = new Float32Array(n); for (let i = 0; i < n; i++) out[i] = b.readFloatLE(i * 4); return out;
}
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const ar = re[i + j], ai = im[i + j], br = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci, bi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr;
        re[i + j] = ar + br; im[i + j] = ai + bi; re[i + j + len / 2] = ar - br; im[i + j + len / 2] = ai - bi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
export function analyse(x: Float32Array, sr = SR) {
  const N = 1024, hop = 512, frames = Math.floor((x.length - N) / hop);
  const flux = new Float64Array(frames), rmsF = new Float64Array(frames), cent = new Float64Array(frames);
  let prev = new Float64Array(N / 2);
  const win = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  const kLo = Math.ceil((150 * N) / sr);
  for (let f = 0; f < frames; f++) {
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = x[f * hop + i] * win[i];
    fft(re, im);
    const mag = new Float64Array(N / 2);
    let fl = 0, e = 0, c = 0, m = 0;
    for (let k = 1; k < N / 2; k++) {
      mag[k] = Math.log1p(100 * Math.hypot(re[k], im[k]));
      const d = mag[k] - prev[k]; if (d > 0) fl += d;
      if (k >= kLo) e += re[k] ** 2 + im[k] ** 2;
      const a = Math.hypot(re[k], im[k]); c += a * k; m += a;
    }
    flux[f] = fl; rmsF[f] = Math.sqrt(e / N) / 8; cent[f] = m > 0 ? ((c / m) * sr) / N : 0; prev = mag;
  }
  const fps = sr / hop;
  // tempo: autocorrelation of the mean-removed flux, 70–170 BPM
  const mean = flux.reduce((a, b) => a + b, 0) / frames, o = Array.from(flux, (v) => Math.max(0, v - mean));
  let best = 0, bestLag = 0;
  const ac = (lag: number) => { let s = 0; for (let i = 0; i + lag < o.length; i++) s += o[i] * o[i + lag]; return s / (o.length - lag); };
  const ac0 = ac(0) || 1;
  for (let lag = Math.round((fps * 60) / 170); lag <= Math.round((fps * 60) / 70); lag++) { const v = ac(lag); if (v > best) { best = v; bestLag = lag; } }
  const bpm = (60 * fps) / bestLag, pulse = best / ac0;
  const db = (v: number) => 20 * Math.log10(Math.max(v, 1e-6));
  const per2: number[] = [];
  for (let s = 0; s * 2 * fps < frames; s++) {
    let acc = 0, n = 0;
    for (let f = Math.floor(s * 2 * fps); f < Math.min(frames, Math.floor((s + 1) * 2 * fps)); f++) { acc += rmsF[f] ** 2; n++; }
    per2.push(+db(Math.sqrt(acc / Math.max(1, n))).toFixed(1));
  }
  const sorted = [...per2].sort((a, b) => a - b), p75 = sorted[Math.floor(sorted.length * 0.75)];
  const brightness = cent.reduce((a, b) => a + b, 0) / frames;
  return { dur: x.length / sr, bpm: +bpm.toFixed(1), pulse: +pulse.toFixed(2), p75, per2, brightness: Math.round(brightness) };
}
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1].endsWith("bgmscan.ts")) {
  const filter = process.argv[2] ?? "";
  const files = fs.readdirSync(BGM_DIR).filter((f) => /\.(mp3|wav|m4a|flac)$/i.test(f) && f.includes(filter));
  const out: Record<string, unknown> = {};
  const bars = " ▁▂▃▄▅▆▇█";
  for (const f of files) {
    const a = analyse(decodeMono(path.join(BGM_DIR, f)));
    out[f] = a;
    const lo = a.p75 - 24, spark = a.per2.map((v) => bars[Math.max(0, Math.min(8, Math.round(((v - lo) / 24) * 8)))]).join("");
    console.log(`${f.slice(0, 44).padEnd(44)} ${a.dur.toFixed(0).padStart(4)}s ${String(a.bpm).padStart(6)}bpm pulse ${a.pulse.toFixed(2)} p75 ${a.p75.toFixed(1)}dB bright ${a.brightness}\n    ${spark}`);
  }
  writeJson(path.join(ROOT, "out", "bgm_scan.json"), out);
}
