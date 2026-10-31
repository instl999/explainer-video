// Narration: Doubao Speech Synthesis 2.0 (解说小明 2.0), one request per sentence so each keeps natural prosody; results cached by
// request hash and ledgered. "holds" widen the natural gap after a phrase without re-synthesising.
// --draft builds the same files from a fitted pace model (silent audio, no API call) so the edit can be laid out first.
// Writes vo/voice.wav (48 kHz mono) and vo/alignment.json (per-character times on the display text).
// Usage: node src/voice.ts [--rate=10] [--draft] [--times]
import fs from "node:fs";
import path from "node:path";
import { synthesize, type TtsWord } from "./lib/tts.ts";
import { PUNCT, alignSpoken, normalize } from "./lib/text.ts";
import { pcm16ToFloat, writeWav16 } from "./lib/wav.ts";
import { ROOT, cacheGet, cachePut, ensureDir, ledger, loadKey, sha256, stableHash, writeJson } from "./lib/util.ts";
import { CONFIG } from "./lib/config.ts";

const SR = 48000;
interface Line { id: string; text: string; pause: number; rate?: number; instruction?: string; holds?: Array<[string, number]> }
interface Script { title: string; speaker?: string; instruction: string; lexicon?: Record<string, string>; lines: Line[] }
const script = JSON.parse(fs.readFileSync(path.join(ROOT, "script.json"), "utf8")) as Script;
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const rate = Number(arg("rate") ?? 10), draft = process.argv.includes("--draft");
const AFP_PER_10K_CHARS = 1350;
const speaker = script.speaker || CONFIG.speaker;
const h = sha256(`${script.title}|explainer`);
const sectionId = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;

function timedChars(words: TtsWord[]): Array<[string, number, number]> {
  const out: Array<[string, number, number]> = [];
  for (const w of words) {
    const chars = [...w.word].filter((c) => !PUNCT.has(c));
    const step = (w.endTime - w.startTime) / Math.max(1, chars.length);
    chars.forEach((c, k) => out.push([c, w.startTime + k * step, w.startTime + (k + 1) * step]));
  }
  return out;
}
/** Draft pace: 5.5 characters a second at rate 10 (scaled by the line rate), short rests at punctuation (fitted to 解说小明 2.0). */
function draftTake(spoken: string, r: number): { take: Float32Array; words: TtsWord[] } {
  const cps = 5.5 * (1 + r / 100) / 1.1;
  const words: TtsWord[] = [];
  let t = 0.04;
  for (const c of spoken) {
    if (PUNCT.has(c)) { t += "，、".includes(c) ? 0.17 : "：；？！".includes(c) ? 0.26 : 0.1; continue; }
    words.push({ word: c, startTime: t, endTime: t + 1 / cps }); t += 1 / cps;
  }
  return { take: new Float32Array(Math.round((t + 0.14) * SR)), words };
}
function env10(x: Float32Array): Float32Array {
  const win = SR / 100, out = new Float32Array(Math.floor(x.length / win));
  for (let w = 0; w < out.length; w++) { let s = 0; for (let k = 0; k < win; k++) s += x[w * win + k] ** 2; out[w] = Math.sqrt(s / win); }
  return out;
}
function speechBounds(x: Float32Array): [number, number] {
  const e = env10(x), thr = 10 ** (-42 / 20), win = SR / 100;
  let first = -1, last = -1;
  e.forEach((v, w) => { if (v > thr) { if (first < 0) first = w * win; last = (w + 1) * win; } });
  return first < 0 ? [0, x.length] : [first, last];
}

interface Char { d: number; c: string; start: number; end: number }
const linesDir = ensureDir(path.join(ROOT, "vo", "lines"));
let key: ReturnType<typeof loadKey> | null = null, offset = 0;
const out: unknown[] = [], pcmAll: Float32Array[] = [];
for (const line of script.lines) {
  const { spoken, spans } = normalize(line.text, script.lexicon ?? {});
  let take: Float32Array, words: TtsWord[], shift = 0;
  const lineRate = line.rate ?? rate;
  if (draft) ({ take, words } = draftTake(spoken, lineRate));
  else {
    const req = { text: spoken, speaker, rate: lineRate, instruction: line.instruction ?? script.instruction, sectionId, pauseMs: 150, sampleRate: SR };
    const ck = stableHash({ model: "seed-tts-2.0", ...req });
    let pcm = cacheGet(ck, ".pcm");
    if (pcm) { words = JSON.parse(cacheGet(ck, ".json")!.toString("utf8")) as TtsWord[]; ledger({ stage: "voice", item: line.id, model: "doubao-seed-tts-2.0", units: 0, unit: "characters", afp: 0, cached: true }); }
    else {
      key ??= loadKey();
      const res = await synthesize(key, req);
      pcm = res.pcm; words = res.words;
      cachePut(ck, ".pcm", pcm); cachePut(ck, ".json", JSON.stringify(words));
      ledger({ stage: "voice", item: line.id, model: "doubao-seed-tts-2.0", units: res.billed, unit: "characters", afp: +((res.billed / 10000) * AFP_PER_10K_CHARS).toFixed(2), cached: false });
    }
    const raw = pcm16ToFloat(pcm);
    const [b0, b1] = speechBounds(raw);
    const s0 = Math.max(0, b0 - Math.round(0.03 * SR)), s1 = Math.min(raw.length, b1 + Math.round(0.14 * SR));
    take = raw.slice(s0, s1);
    const f = Math.round(0.01 * SR);
    for (let i = 0; i < f && i < take.length; i++) { take[i] *= i / f; take[take.length - 1 - i] *= i / f; }
    shift = s0 / SR;
  }
  const { times, coverage } = alignSpoken(spoken, timedChars(words));
  let chars: Char[] = [];
  for (const [d0, d1, sp0, sp1] of spans) {
    const ts: Array<[number, number]> = [];
    for (let s = sp0; s < sp1; s++) { const t = times.get(s); if (t) ts.push(t); }
    if (!ts.length) continue;
    const st = ts[0][0] - shift, en = ts[ts.length - 1][1] - shift, vis: number[] = [];
    for (let d = d0; d < d1; d++) if (!PUNCT.has(line.text[d])) vis.push(d);
    vis.forEach((d, k) => chars.push({ d, c: line.text[d], start: st + ((en - st) * k) / vis.length, end: st + ((en - st) * (k + 1)) / vis.length }));
  }
  for (const [phrase, sec] of line.holds ?? []) {
    const at = line.text.indexOf(phrase);
    if (at < 0) throw new Error(`hold "${phrase}" not in ${line.id}`);
    const lastD = Math.max(...chars.filter((c) => c.d >= at && c.d < at + phrase.length).map((c) => c.d)), k = chars.findIndex((c) => c.d === lastD);
    if (k < 0 || k + 1 >= chars.length) throw new Error(`hold "${phrase}" in ${line.id} has no following speech`);
    const e = env10(take), g0 = Math.floor(chars[k].end * 100), g1 = Math.max(g0 + 1, Math.ceil(chars[k + 1].start * 100));
    let best = g0;
    for (let w = g0; w < Math.min(g1, e.length); w++) if (e[w] < e[best]) best = w;
    const cut = Math.round((best + 0.5) * 0.01 * SR), add = Math.round(sec * SR), xf = Math.round(0.006 * SR);
    const next = new Float32Array(take.length + add);
    next.set(take.subarray(0, cut), 0); next.set(take.subarray(cut), cut + add);
    for (let i = 0; i < xf; i++) { next[cut - 1 - i] *= i / xf; next[cut + add + i] *= i / xf; }
    take = next;
    const tCut = cut / SR;
    chars = chars.map((c) => (c.start >= tCut - 0.005 ? { ...c, start: c.start + sec, end: c.end + sec } : c));
  }
  const dur = take.length / SR;
  writeWav16(path.join(linesDir, `${line.id}.wav`), take, SR);
  out.push({ id: line.id, text: line.text, spoken, start: +offset.toFixed(3), end: +(offset + dur).toFixed(3),
             chars: chars.map((c) => ({ d: c.d, c: c.c, start: +(offset + c.start).toFixed(3), end: +(offset + c.end).toFixed(3) })) });
  const nChars = [...spoken].filter((c) => !PUNCT.has(c)).length, holds = (line.holds ?? []).reduce((a, [, s]) => a + s, 0);
  console.log(`[voice${draft ? " draft" : ""}] ${line.id} ${dur.toFixed(2)} s, ${nChars} chars, ${(nChars / (dur - holds)).toFixed(2)} 字/s, timed ${(coverage * 100).toFixed(0)} %  ${spoken}`);
  pcmAll.push(take, new Float32Array(Math.round(line.pause * SR)));
  offset += dur + line.pause;
}
const total = pcmAll.reduce((a, s) => a + s.length, 0), voice = new Float32Array(total);
let p = 0;
for (const s of pcmAll) { voice.set(s, p); p += s.length; }
writeWav16(path.join(ROOT, "vo", "voice.wav"), voice, SR);
writeJson(path.join(ROOT, "vo", "alignment.json"), { audio: "vo/voice.wav", draft, sampleRate: SR, rate, duration: +offset.toFixed(3), lines: out });
console.log(`[voice${draft ? " draft" : ""}] total ${offset.toFixed(2)} s`);
// Per-character VIDEO times (audio time + LEAD 0.3 s from common.ts), for anchoring scenes: vo/times.txt (and --times prints it)
const times = (out as Array<{ id: string; chars: Array<{ c: string; start: number }> }>).map((l) => `${l.id} ${l.chars.map((c) => c.c + (c.start + 0.3).toFixed(2)).join(" ")}`).join("\n");
fs.writeFileSync(path.join(ROOT, "vo", "times.txt"), times + "\n", "utf8");
if (process.argv.includes("--times")) console.log(times);
