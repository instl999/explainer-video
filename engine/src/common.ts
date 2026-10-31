// Shared constants, palette, fonts, easing and voice anchors for the 16:9 explainer.
import fs from "node:fs";
import path from "node:path";
import { GlobalFonts } from "@napi-rs/canvas";
import { ROOT } from "./lib/util.ts";
import { CONFIG } from "./lib/config.ts";

export const PROJECT = ROOT;
/** script.json carries the title, the source footage path and the narration lines. */
export const SCRIPT = JSON.parse(fs.readFileSync(path.join(PROJECT, "script.json"), "utf8")) as { title: string; footage: string; [k: string]: unknown };
export const FOOTAGE = SCRIPT.footage;
if (!FOOTAGE || !fs.existsSync(FOOTAGE)) console.warn(`[common] footage not found: ${FOOTAGE} (set "footage" in script.json)`);
export const W = 1920, H = 1080, FPS = 30;
export const LEAD = 0.3;

// Paper boards for the explaining, annotated footage for the story; one red for loss/danger/alarm, one blue for money kept /
// calm / choice, a yellow marker. Extra colours are for props (ice, gold coins, the green "go" tick).
export const C = {
  paper: "#EEEAE1", ink: "#1A1A1A", ink2: "#55524C", ink3: "#8C877E",
  red: "#D9382B", redDeep: "#A42319", blue: "#2457A4", marker: "#FFD447",
  up: "#D9382B", down: "#22955A", white: "#FFFFFF", neon: "#3CF59B", neonDim: "rgba(60,245,155,0.35)", hud: "rgba(8,14,12,0.82)",
  gold: "#E8B33C", silver: "#9AA3AE", bronze: "#B5774A",
  ice: "#9ED3F0", iceDeep: "#3E86BF", iceLine: "#2C6E9E", frost: "#DCEAF2", green: "#22955A",
};

const FONTS: Array<[string, string]> = [
  [path.join(PROJECT, "fonts", "SmileySans-Oblique.ttf"), "Display"],
  [path.join(PROJECT, "fonts", "NotoSansSC-Bold.otf"), "Sans"],
  ["C:/Windows/Fonts/bahnschrift.ttf", "Num"],
  ["C:/Windows/Fonts/consola.ttf", "Mono"],
  ["C:/Windows/Fonts/consolab.ttf", "MonoB"],
  [path.join(PROJECT, "fonts", "DSEG7Classic-Bold.ttf"), "LCD"],
  [CONFIG.jpFont, "JP"],
  [CONFIG.serifFont, "Serif"],
];
let fontsDone = false;
export function registerFonts(): void {
  if (fontsDone) return;
  for (const [file, family] of FONTS) if (fs.existsSync(file)) GlobalFonts.registerFromPath(file, family);
    else console.warn(`[fonts] missing ${file} (${family}); text in that family falls back to a default face`);
  fontsDone = true;
}

export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const prog = (t: number, t0: number, dur: number) => clamp((t - t0) / Math.max(1e-6, dur));
export const E = {
  out: (u: number) => 1 - (1 - u) ** 3,
  out5: (u: number) => 1 - (1 - u) ** 5,
  in: (u: number) => u * u * u,
  inOut: (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2),
  sine: (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * u),
  back: (u: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2; },
};
export function hash(...k: number[]): number {
  let h = 2166136261;
  for (const v of k) { h ^= Math.floor(v * 9973) | 0; h = Math.imul(h, 16777619); h ^= h >>> 13; }
  return ((h >>> 0) % 100000) / 100000;
}

// ---------- voice anchors ----------
interface AChar { d: number; c: string; start: number; end: number }
interface ALine { id: string; text: string; start: number; end: number; chars: AChar[] }
export interface Alignment { duration: number; draft?: boolean; lines: ALine[] }
export const alignment = JSON.parse(fs.readFileSync(path.join(PROJECT, "vo", "alignment.json"), "utf8")) as Alignment;
const lineById = new Map(alignment.lines.map((l) => [l.id, l]));
export const line = (id: string): ALine => { const l = lineById.get(id); if (!l) throw new Error(`no line ${id}`); return l; };

/** Video time of a phrase in a line: its first character's start, or (end) its last character's end. */
export function A(id: string, phrase?: string, opt: { end?: boolean; nth?: number } = {}): number {
  const l = line(id);
  if (!phrase) return LEAD + (opt.end ? l.chars[l.chars.length - 1].end : l.chars[0].start);
  let at = -1;
  for (let k = 0; k < (opt.nth ?? 1); k++) { at = l.text.indexOf(phrase, at + 1); if (at < 0) throw new Error(`"${phrase}" not in ${id}`); }
  const inside = l.chars.filter((c) => c.d >= at && c.d < at + phrase.length);
  if (!inside.length) throw new Error(`"${phrase}" in ${id} has no timed characters`);
  return LEAD + (opt.end ? inside[inside.length - 1].end : inside[0].start);
}
export function charTimes(id: string, phrase: string, nth = 1): number[] {
  const l = line(id);
  let at = -1;
  for (let k = 0; k < nth; k++) { at = l.text.indexOf(phrase, at + 1); if (at < 0) throw new Error(`"${phrase}" not in ${id}`); }
  const out: number[] = [];
  for (let d = at; d < at + phrase.length; d++) {
    const c = l.chars.find((x) => x.d === d);
    out.push(c ? LEAD + c.start : out.length ? out[out.length - 1] + 0.1 : LEAD + l.chars[0].start);
  }
  return out;
}
export const VOICE_END = LEAD + alignment.lines[alignment.lines.length - 1].end;
