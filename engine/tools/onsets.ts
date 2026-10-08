// Strong onsets (spectral-flux peaks) of a BGM track inside a window, to choose where a bed enters so a measured accent
// lands on a word: in timeline.ts set  from: <accent time> - (<word time> - <bed t0>).
// Prints "time(strength×mean, level dB)"; regular spacing = the beat, the biggest × = accents/drops.
// Usage: node tools/onsets.ts "<file in BGM_DIR>" [from=0] [to=60]
import path from "node:path";
import { decodeMono, BGM_DIR } from "../src/bgmscan.ts";

const [file, a = "0", b = "60"] = process.argv.slice(2);
if (!file) { console.error('usage: node tools/onsets.ts "<file in BGM_DIR>" [from] [to]'); process.exit(1); }
const sr = 11025, x = decodeMono(path.isAbsolute(file) ? file : path.join(BGM_DIR, file), sr);
const N = 1024, hop = 256, frames = Math.floor((x.length - N) / hop);
const flux = new Float64Array(frames), rms = new Float64Array(frames);
let prev = new Float64Array(N / 2);
const win = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
for (let f = 0; f < frames; f++) {
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < N; i++) re[i] = x[f * hop + i] * win[i];
  for (let i = 1, j = 0; i < N; i++) { let bit = N >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) [re[i], re[j]] = [re[j], re[i]]; }
  for (let len = 2; len <= N; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < N; i += len) for (let k = 0; k < len / 2; k++) {
      const wr = Math.cos(ang * k), wi = Math.sin(ang * k), ur = re[i + k], ui = im[i + k];
      const vr = re[i + k + len / 2] * wr - im[i + k + len / 2] * wi, vi = re[i + k + len / 2] * wi + im[i + k + len / 2] * wr;
      re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
    }
  }
  const mag = new Float64Array(N / 2);
  let fl = 0, e = 0;
  for (let k = 1; k < N / 2; k++) { mag[k] = Math.log1p(100 * Math.hypot(re[k], im[k])); const d = mag[k] - prev[k]; if (d > 0) fl += d; e += re[k] ** 2 + im[k] ** 2; }
  flux[f] = fl; rms[f] = 10 * Math.log10(e / N + 1e-12); prev = mag;
}
const fps = sr / hop, t0 = Number(a), t1 = Number(b), loc: Array<[number, number, number]> = [];
for (let f = 2; f < frames - 2; f++) {
  const t = f / fps; if (t < t0 || t > t1) continue;
  if (flux[f] > flux[f - 1] && flux[f] >= flux[f + 1] && flux[f] > flux[f - 2] && flux[f] >= flux[f + 2]) loc.push([t, flux[f], rms[f]]);
}
const mean = loc.reduce((s, v) => s + v[1], 0) / Math.max(1, loc.length);
console.log(`${file}  window ${t0}-${t1}s  mean flux ${mean.toFixed(0)}`);
console.log(loc.filter((v) => v[1] > mean * 1.35).map((v) => `${v[0].toFixed(2)}(${(v[1] / mean).toFixed(1)}x,${v[2].toFixed(0)}dB)`).join("  "));
