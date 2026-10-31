// Burned-in captions and the .srt, both cut from the voice alignment: phrases split at punctuation (long ones halved),
// each shown from its first spoken character until the next phrase starts. Numbers are picked out in yellow.
import fs from "node:fs";
import { C, H, LEAD, W, alignment, prog } from "./common.ts";
import { text, type Ctx } from "./draw.ts";
import type { Overlay } from "./model.ts";

const BREAK = new Set([..."，。！？；：、"]);
const DROP = /[，。！？；：、]/g;
interface Cue { t0: number; t1: number; s: string; line: string }

function phrases(textStr: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let a = 0;
  for (let i = 0; i <= textStr.length; i++) {
    if (i === textStr.length || BREAK.has(textStr[i])) { if (i > a) out.push([a, i]); a = i + 1; }
  }
  // halve long phrases near the middle, preferring a break after 的/了/是/在/和
  const res: Array<[number, number]> = [];
  for (const [p0, p1] of out) {
    if (p1 - p0 <= 15) { res.push([p0, p1]); continue; }
    const mid = (p0 + p1) / 2;
    let best = Math.round(mid), score = 1e9;
    for (let k = p0 + 5; k <= p1 - 5; k++) { const s = Math.abs(k - mid) - ("的了是在和".includes(textStr[k - 1]) ? 2.5 : 0) + (/[0-9.%A-Za-z]/.test(textStr[k - 1] + textStr[k]) && /[0-9.%A-Za-z]/.test(textStr[k]) ? 9 : 0); if (s < score) { score = s; best = k; } }
    res.push([p0, best], [best, p1]);
  }
  return res;
}
export function cues(): Cue[] {
  const out: Cue[] = [];
  alignment.lines.forEach((l, li) => {
    const ps = phrases(l.text);
    const starts = ps.map(([p0, p1]) => { const c = l.chars.find((x) => x.d >= p0 && x.d < p1); return c ? LEAD + c.start : null; });
    ps.forEach(([p0, p1], k) => {
      const t0 = starts[k]; if (t0 === null) return;
      const last = l.chars.filter((x) => x.d >= p0 && x.d < p1).pop()!;
      const nextLine = alignment.lines[li + 1];
      const nextStart = starts.slice(k + 1).find((s) => s !== null);
      let t1 = nextStart != null ? nextStart - 0.04 : LEAD + last.end + 0.35;
      if (nextLine) t1 = Math.min(t1, LEAD + nextLine.chars[0].start - 0.06);
      out.push({ t0: t0 - 0.04, t1, s: l.text.slice(p0, p1).replace(DROP, ""), line: l.id });
    });
  });
  return out;
}
const CUES = cues();

/** Draws the caption phrase active at time t centred at (x, y) in the one caption style; false when none is active.
 *  Shared by the 16:9 overlay and the 9:16 composer (src/vertical.ts), so both versions look the same. */
export function drawCaption(ctx: Ctx, t: number, x: number, y: number, size = 56): boolean {
  const c = CUES.find((q) => t >= q.t0 && t < q.t1);
  if (!c) return false;
  const a = Math.min(1, prog(t, c.t0, 0.08) + 0.4);
  const yellow = new Set<number>();
  [...c.s].forEach((ch, i) => { if (/[0-9.%]/.test(ch)) yellow.add(i); });
  text(ctx, c.s, x, y, { size, fam: "Sans", color: "#fff", align: "center", stroke: "rgba(0,0,0,0.88)", strokeW: size * 0.18, alpha: a },
    (i) => (yellow.has(i) ? { color: C.marker } : {}));
  return true;
}
export function captionOverlay(hide: Array<[number, number]>): Overlay {
  return {
    id: "captions", t0: 0, t1: 1e9, z: 60,
    paint(ctx: Ctx, t: number) {
      // NO_CAPTIONS (set by `render.ts --clean`) renders the captionless pass the 9:16 composer builds on
      if (process.env.NO_CAPTIONS || hide.some(([a, b]) => t >= a && t < b)) return;
      drawCaption(ctx, t, W / 2, H - 76, 56);
    },
  };
}
const ts = (s: number) => { const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, ss = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`; };
export function writeSrt(file: string) {
  fs.writeFileSync(file, CUES.map((c, i) => `${i + 1}\n${ts(Math.max(0, c.t0))} --> ${ts(c.t1)}\n${c.s}\n`).join("\n"), "utf8");
}
