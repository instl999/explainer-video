// Drawing primitives for the paper-board explainer look: mixed-font text, hand-drawn ink (lines, arrows, rings, strikes),
// marker highlights, rubber stamps, cards, the paper background and a few line icons.
import { createCanvas, type Canvas, type SKRSContext2D } from "@napi-rs/canvas";
import { C, E, H, W, clamp, hash, lerp, prog } from "./common.ts";

export type Ctx = SKRSContext2D;
export type Fam = "Display" | "Sans" | "Num" | "Mono" | "MonoB" | "LCD" | "JP";

// ---------- text ----------
const NUM_CH = /[0-9A-Za-z.,%+\-:\/×$#&@ ]/;
const CJK = /[⺀-￿]/;
export interface TextOpt {
  size: number; fam?: Fam; color?: string; align?: "left" | "center" | "right"; base?: "alphabetic" | "middle" | "top" | "bottom";
  stroke?: string; strokeW?: number; mixNum?: boolean; bold?: number; alpha?: number; shadow?: { color: string; blur: number; dy?: number };
}
interface Glyph { ch: string; fam: Fam; x: number; w: number }
export function layout(ctx: Ctx, s: string, o: TextOpt): { glyphs: Glyph[]; width: number } {
  const fam = o.fam ?? "Sans", glyphs: Glyph[] = [];
  let x = 0;
  // latin-only faces hand CJK to Sans; CJK faces hand digits/latin to the number face unless mixNum is false
  const latinFam = fam === "Num" || fam === "Mono" || fam === "MonoB" || fam === "LCD";
  for (const ch of s) {
    const f: Fam = latinFam ? (CJK.test(ch) ? "Sans" : fam) : o.mixNum !== false && NUM_CH.test(ch) ? "Num" : fam;
    const px = f === "Num" && fam !== "Num" ? o.size * 1.06 : o.size;
    ctx.font = `${px}px ${f}`;
    const w = ctx.measureText(ch).width;
    glyphs.push({ ch, fam: f, x, w }); x += w;
  }
  return { glyphs, width: x };
}
export const measure = (ctx: Ctx, s: string, o: TextOpt) => layout(ctx, s, o).width;
/** Pre-blurred shadow sprite per glyph (blurring every frame is the expensive part of soft text shadows). */
const shadowCache = new Map<string, { c: Canvas; ox: number; oy: number }>();
function glyphShadow(ch: string, fam: Fam, px: number, blur: number, color: string, bold: number) {
  const key = `${ch}|${fam}|${px.toFixed(1)}|${blur}|${color}|${bold}`;
  let s = shadowCache.get(key);
  if (s) return s;
  const pad = Math.ceil(blur * 1.5 + 4), m = createCanvas(4, 4).getContext("2d");
  m.font = `${px}px ${fam}`;
  const w = Math.ceil(m.measureText(ch).width) + 2 * pad, h = Math.ceil(px * 1.5) + 2 * pad, oy = pad + Math.ceil(px * 1.12);
  const c = createCanvas(Math.max(1, w), Math.max(1, h)), x = c.getContext("2d");
  x.filter = `blur(${blur / 2}px)`; x.font = `${px}px ${fam}`; x.fillStyle = color; x.textBaseline = "alphabetic";
  if (bold) { x.strokeStyle = color; x.lineWidth = bold; x.lineJoin = "round"; x.strokeText(ch, pad, oy); }
  x.fillText(ch, pad, oy);
  s = { c, ox: pad, oy };
  shadowCache.set(key, s);
  return s;
}

/** Draws text (digits/latin in the number face unless mixNum is false); per-glyph animation via `fx`. Returns the width. */
export function text(ctx: Ctx, s: string, x: number, y: number, o: TextOpt,
                     fx?: (i: number, n: number) => { a?: number; dy?: number; s?: number; color?: string } | null): number {
  const lay = layout(ctx, s, o), fam = o.fam ?? "Sans";
  const x0 = o.align === "center" ? x - lay.width / 2 : o.align === "right" ? x - lay.width : x;
  ctx.save();
  ctx.textBaseline = o.base ?? "alphabetic"; ctx.textAlign = "left";
  ctx.globalAlpha *= o.alpha ?? 1;
  const n = lay.glyphs.length;
  lay.glyphs.forEach((g, i) => {
    const f = fx ? fx(i, n) : {};
    if (f === null || (f.a ?? 1) <= 0.001) return;
    const px = g.fam === "Num" && fam !== "Num" ? o.size * 1.06 : o.size;
    ctx.save();
    ctx.globalAlpha *= f.a ?? 1;
    const gx = x0 + g.x + g.w / 2, gy = y + (f.dy ?? 0);
    ctx.translate(gx, gy); if (f.s !== undefined && f.s !== 1) ctx.scale(f.s, f.s);
    if (o.shadow && (o.base ?? "alphabetic") === "alphabetic") {
      const sp = glyphShadow(g.ch, g.fam, px, o.shadow.blur, o.shadow.color, o.bold ?? 0);
      ctx.drawImage(sp.c, -g.w / 2 - sp.ox, -sp.oy + (o.shadow.dy ?? 0));
    }
    ctx.font = `${px}px ${g.fam}`;
    if (o.stroke) { ctx.lineJoin = "round"; ctx.strokeStyle = o.stroke; ctx.lineWidth = o.strokeW ?? px * 0.12; ctx.strokeText(g.ch, -g.w / 2, 0); }
    ctx.fillStyle = f.color ?? o.color ?? C.ink;
    if (o.bold) { ctx.lineJoin = "round"; ctx.strokeStyle = f.color ?? o.color ?? C.ink; ctx.lineWidth = o.bold; ctx.strokeText(g.ch, -g.w / 2, 0); }
    ctx.fillText(g.ch, -g.w / 2, 0);
    ctx.restore();
  });
  ctx.restore();
  return lay.width;
}
/** Pop-in reveal: glyphs scale up and settle one after another from t0. */
export function popText(ctx: Ctx, s: string, x: number, y: number, o: TextOpt, t: number, t0: number, stagger = 0.035, dur = 0.28): number {
  return text(ctx, s, x, y, o, (i) => {
    const u = prog(t, t0 + i * stagger, dur);
    if (u <= 0) return null;
    return { a: clamp(u * 2.2), s: 0.55 + 0.45 * E.back(u), dy: (1 - E.out(u)) * o.size * 0.18 };
  });
}
/** Typewriter: glyphs appear at `cps` per second from t0. */
export function typeText(ctx: Ctx, s: string, x: number, y: number, o: TextOpt, t: number, t0: number, cps = 14): number {
  const shown = Math.floor((t - t0) * cps);
  return text(ctx, s, x, y, o, (i) => (i < shown ? {} : null));
}
export function wrapLines(ctx: Ctx, s: string, o: TextOpt, maxW: number): string[] {
  const out: string[] = []; let cur = "";
  for (const ch of s) {
    if (measure(ctx, cur + ch, o) > maxW && cur) { out.push(cur); cur = ch.trim() ? ch : ""; }
    else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

// ---------- ink ----------
const jitter = (seed: number, i: number, amp: number) => (hash(seed, i) - 0.5) * 2 * amp;
/** Hand-drawn polyline drawn up to fraction u of its length. */
export function inkPath(ctx: Ctx, pts: Array<[number, number]>, u: number, o: { color?: string; width?: number; seed?: number; wobble?: number; alpha?: number } = {}) {
  if (u <= 0 || pts.length < 2) return;
  const seed = o.seed ?? 1, wob = o.wobble ?? 1.2;
  const dense: Array<[number, number]> = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const [x1, y1] = pts[k], [x2, y2] = pts[k + 1], L = Math.hypot(x2 - x1, y2 - y1), n = Math.max(2, Math.ceil(L / 14));
    for (let j = 0; j < n; j++) { const v = j / n; dense.push([lerp(x1, x2, v) + jitter(seed, k * 97 + j, wob), lerp(y1, y2, v) + jitter(seed + 7, k * 97 + j, wob)]); }
  }
  dense.push(pts[pts.length - 1]);
  const lens = [0];
  for (let i = 1; i < dense.length; i++) lens.push(lens[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const target = lens[lens.length - 1] * clamp(u);
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.strokeStyle = o.color ?? C.ink; ctx.lineWidth = o.width ?? 6; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(dense[0][0], dense[0][1]);
  for (let i = 1; i < dense.length; i++) {
    if (lens[i] <= target) ctx.lineTo(dense[i][0], dense[i][1]);
    else { const f = (target - lens[i - 1]) / (lens[i] - lens[i - 1]); ctx.lineTo(lerp(dense[i - 1][0], dense[i][0], f), lerp(dense[i - 1][1], dense[i][1], f)); break; }
  }
  ctx.stroke(); ctx.restore();
}
export function arrow(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, u: number, o: { color?: string; width?: number; head?: number; bend?: number; seed?: number } = {}) {
  if (u <= 0) return;
  const bend = o.bend ?? 0, mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= 24; i++) { const v = i / 24; pts.push([(1 - v) ** 2 * x1 + 2 * (1 - v) * v * mx + v * v * x2, (1 - v) ** 2 * y1 + 2 * (1 - v) * v * my + v * v * y2]); }
  const shaft = clamp(u / 0.8);
  inkPath(ctx, pts, shaft, { color: o.color, width: o.width ?? 7, seed: o.seed ?? 3, wobble: 0.8 });
  const hu = clamp((u - 0.75) / 0.25);
  if (hu > 0) {
    const [ax, ay] = pts[pts.length - 1], [bx, by] = pts[pts.length - 3], ang = Math.atan2(ay - by, ax - bx), hl = (o.head ?? 26) * E.back(hu);
    inkPath(ctx, [[ax - Math.cos(ang - 0.5) * hl, ay - Math.sin(ang - 0.5) * hl], [ax, ay], [ax - Math.cos(ang + 0.5) * hl, ay - Math.sin(ang + 0.5) * hl]], 1, { color: o.color, width: o.width ?? 7, seed: 5, wobble: 0.4 });
  }
}
/** Hand-drawn ring (ellipse with an overshooting tail). */
export function ring(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, u: number, o: { color?: string; width?: number; seed?: number; rot?: number } = {}) {
  const pts: Array<[number, number]> = [], seed = o.seed ?? 11, r0 = o.rot ?? -0.15;
  for (let i = 0; i <= 64; i++) {
    const a = -2.2 + (i / 64) * Math.PI * 2.18, k = 1 + (hash(seed, i >> 3) - 0.5) * 0.05 + i * 0.0009;
    const ex = Math.cos(a) * rx * k, ey = Math.sin(a) * ry * k;
    pts.push([cx + ex * Math.cos(r0) - ey * Math.sin(r0), cy + ex * Math.sin(r0) + ey * Math.cos(r0)]);
  }
  inkPath(ctx, pts, E.out(clamp(u)), { color: o.color ?? C.red, width: o.width ?? 7, seed, wobble: 0.6 });
}
export function strike(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, u: number, o: { color?: string; width?: number } = {}) {
  inkPath(ctx, [[x1, y1], [x2, y2]], E.out(clamp(u)), { color: o.color ?? C.red, width: o.width ?? 8, seed: 21, wobble: 1.5 });
}
/** Yellow marker sweep behind text: x..x+w at height h centred on y. */
export function marker(ctx: Ctx, x: number, y: number, w: number, h: number, u: number, color = C.marker, alpha = 0.85) {
  if (u <= 0) return;
  const ww = w * E.out(clamp(u));
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.globalCompositeOperation = "multiply";
  ctx.beginPath();
  ctx.moveTo(x - 6, y - h / 2 + 4);
  for (let i = 0; i <= 8; i++) ctx.lineTo(x + (ww * i) / 8, y - h / 2 + jitter(41, i, 3));
  ctx.lineTo(x + ww + 4, y + h / 2 - 2);
  for (let i = 8; i >= 0; i--) ctx.lineTo(x + (ww * i) / 8, y + h / 2 + jitter(43, i, 3));
  ctx.closePath(); ctx.fill(); ctx.restore();
}

// ---------- shapes ----------
export function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + k, y); ctx.arcTo(x + w, y, x + w, y + h, k); ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k); ctx.arcTo(x, y, x + w, y, k); ctx.closePath();
}
/** Pre-blurred drop shadow for a rounded box, cached by size. */
const boxCache = new Map<string, { c: Canvas; pad: number }>();
function boxShadow(w: number, h: number, r: number, blur: number, color = "rgba(40,30,20,0.28)") {
  const key = `${Math.round(w)}x${Math.round(h)}|${r}|${blur}|${color}`;
  let s = boxCache.get(key);
  if (s) return s;
  const pad = Math.ceil(blur * 1.6 + 4), c = createCanvas(Math.ceil(w) + 2 * pad, Math.ceil(h) + 2 * pad), x = c.getContext("2d");
  x.filter = `blur(${blur / 2}px)`; x.fillStyle = color; rr(x, pad, pad, w, h, r); x.fill();
  s = { c, pad };
  boxCache.set(key, s);
  return s;
}
/** Soft drop shadow under a box at (x, y, w, h), from a cached pre-blurred sprite. */
export function dropShadow(ctx: Ctx, x: number, y: number, w: number, h: number, o: { r?: number; blur?: number; color?: string; dy?: number } = {}) {
  const blur = o.blur ?? 30, sp = boxShadow(w, h, o.r ?? 10, blur, o.color ?? "rgba(0,0,0,0.5)");
  ctx.drawImage(sp.c, x - sp.pad, y - sp.pad + (o.dy ?? blur * 0.35));
}
/** Paper card with a soft shadow; draw content inside `body` in card-local coordinates (origin at the card's top-left). */
export function card(ctx: Ctx, x: number, y: number, w: number, h: number, o: { fill?: string; rot?: number; r?: number; a?: number; s?: number; shadow?: number; border?: string } , body?: () => void) {
  if ((o.a ?? 1) <= 0.001) return;
  ctx.save();
  ctx.globalAlpha *= o.a ?? 1;
  ctx.translate(x + w / 2, y + h / 2); ctx.rotate(o.rot ?? 0); if (o.s !== undefined) ctx.scale(o.s, o.s); ctx.translate(-w / 2, -h / 2);
  const blur = o.shadow ?? 26;
  if (blur > 0) { const sp = boxShadow(w, h, o.r ?? 10, blur); ctx.drawImage(sp.c, -sp.pad, -sp.pad + blur * 0.35); }
  ctx.fillStyle = o.fill ?? "#FBF9F4"; rr(ctx, 0, 0, w, h, o.r ?? 10); ctx.fill();
  if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 3; rr(ctx, 0, 0, w, h, o.r ?? 10); ctx.stroke(); }
  body?.();
  ctx.restore();
}
/** Dark translucent panel for text over footage. */
export function glass(ctx: Ctx, x: number, y: number, w: number, h: number, a = 1, r = 14, fill = "rgba(12,14,16,0.72)") {
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = fill; rr(ctx, x, y, w, h, r); ctx.fill(); ctx.restore();
}

// ---------- stamps ----------
const stampCache = new Map<string, Canvas>();
function stampImage(label: string, size: number, color: string, sub?: string): Canvas {
  const key = `${label}|${size}|${color}|${sub ?? ""}`;
  const hit = stampCache.get(key); if (hit) return hit;
  const m = createCanvas(10, 10).getContext("2d");
  m.font = `${size}px Display`;
  const tw = m.measureText(label).width, pad = size * 0.32, sh = sub ? size * 0.34 : 0;
  const w = Math.ceil(tw + pad * 2 + 12), h = Math.ceil(size * 1.18 + sh + pad + 12);
  const cv = createCanvas(w, h), c = cv.getContext("2d");
  c.strokeStyle = color; c.fillStyle = color;
  c.lineWidth = size * 0.075; rr(c, 6, 6, w - 12, h - 12, size * 0.12); c.stroke();
  c.lineWidth = size * 0.025; rr(c, 6 + size * 0.1, 6 + size * 0.1, w - 12 - size * 0.2, h - 12 - size * 0.2, size * 0.08); c.stroke();
  c.textAlign = "center"; c.textBaseline = "middle"; c.font = `${size}px Display`;
  c.fillText(label, w / 2, 6 + pad * 0.55 + size * 0.56);
  if (sub) { c.font = `${size * 0.26}px Sans`; c.fillText(sub, w / 2, h - 6 - pad * 0.5 - sh * 0.35); }
  // ink texture: knock out speckles so it reads as a rubber stamp
  c.globalCompositeOperation = "destination-out";
  for (let i = 0; i < (w * h) / 260; i++) {
    const r = 0.6 + hash(i, 3) * 2.4;
    c.globalAlpha = 0.35 + hash(i, 4) * 0.65;
    c.beginPath(); c.arc(hash(i, 1) * w, hash(i, 2) * h, r, 0, Math.PI * 2); c.fill();
  }
  stampCache.set(key, cv);
  return cv;
}
/** Rubber stamp slammed at t0: drops from 1.9x with a slight overshoot. */
export function stamp(ctx: Ctx, label: string, cx: number, cy: number, t: number, t0: number, o: { size?: number; color?: string; rot?: number; sub?: string; a?: number } = {}) {
  const u = prog(t, t0, 0.2);
  if (u <= 0) return;
  const img = stampImage(label, o.size ?? 90, o.color ?? C.red, o.sub);
  const s = u < 1 ? lerp(1.9, 0.96, E.in(u)) : 1 - 0.04 * Math.exp(-(t - t0 - 0.2) * 14) * Math.cos((t - t0 - 0.2) * 40);
  ctx.save(); ctx.globalAlpha *= clamp(u * 3) * (o.a ?? 1) * 0.92;
  ctx.translate(cx, cy); ctx.rotate(o.rot ?? -0.12); ctx.scale(s, s);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.restore();
}

// ---------- paper ----------
let grain: Canvas | null = null, vign: Canvas | null = null;
function grainTile(): Canvas {
  if (grain) return grain;
  grain = createCanvas(256, 256);
  const c = grain.getContext("2d"), img = c.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) {
    const v = hash(i, 77), fib = hash(i >> 5, 13);
    img.data[i * 4] = 60; img.data[i * 4 + 1] = 45; img.data[i * 4 + 2] = 30;
    img.data[i * 4 + 3] = Math.floor(v * 16 + (fib > 0.97 ? 14 : 0));
  }
  c.putImageData(img, 0, 0);
  return grain;
}
function vignette(): Canvas {
  if (vign) return vign;
  vign = createCanvas(W, H);
  const c = vign.getContext("2d"), g = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, "rgba(80,60,30,0)"); g.addColorStop(1, "rgba(80,60,30,0.22)");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  return vign;
}
/** Warm paper with a dot grid over the world rect (0, 0, w, h); drawn under the board camera. Rasterised once per size. */
const paperCache = new Map<string, Canvas>();
export function paper(ctx: Ctx, o: { grid?: boolean; tone?: string; w?: number; h?: number } = {}) {
  const pw = o.w ?? W, ph = o.h ?? H, key = `${pw}x${ph}|${o.tone ?? ""}|${o.grid !== false}`;
  let sheet = paperCache.get(key);
  if (!sheet) {
    sheet = createCanvas(pw + 80, ph + 80);
    const c = sheet.getContext("2d");
    c.translate(40, 40);
    c.fillStyle = o.tone ?? C.paper; c.fillRect(-40, -40, pw + 80, ph + 80);
    if (o.grid !== false) {
      c.fillStyle = "rgba(60,50,40,0.16)";
      const g = 44;
      for (let y = g / 2; y < ph; y += g) for (let x = g / 2; x < pw; x += g) c.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
    c.fillStyle = c.createPattern(grainTile(), "repeat")!; c.fillRect(-40, -40, pw + 80, ph + 80);
    paperCache.set(key, sheet);
  }
  ctx.drawImage(sheet, -40, -40);
}
/** Screen-space warm vignette for paper boards. */
export function paperVignette(ctx: Ctx, a = 1) { ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(vignette(), 0, 0); ctx.restore(); }

// ---------- seven-segment digits (calculator LCD) ----------
const SEG: Record<string, string> = { "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg", "-": "g", " ": "" };
export function seg7(ctx: Ctx, s: string, x: number, y: number, h: number, on: string, off: string): number {
  const w = h * 0.5, th = h * 0.11, gap = h * 0.17;
  let cx = x;
  const segPath = (k: string, ox: number) => {
    const L = (x1: number, y1: number, x2: number, y2: number) => {
      const hor = y1 === y2, sk = h * 0.05;
      ctx.beginPath();
      if (hor) { ctx.moveTo(ox + x1 + th * 0.6 - sk * (y1 / h), y + y1); ctx.lineTo(ox + x1 + th * 1.1 - sk * (y1 / h), y + y1 - th / 2); ctx.lineTo(ox + x2 - th * 1.1 - sk * (y1 / h), y + y1 - th / 2); ctx.lineTo(ox + x2 - th * 0.6 - sk * (y1 / h), y + y1); ctx.lineTo(ox + x2 - th * 1.1 - sk * (y1 / h), y + y1 + th / 2); ctx.lineTo(ox + x1 + th * 1.1 - sk * (y1 / h), y + y1 + th / 2); }
      else { const a = sk * (y1 / h), b = sk * (y2 / h); ctx.moveTo(ox + x1 - a, y + y1 + th * 0.6); ctx.lineTo(ox + x1 + th / 2 - a, y + y1 + th * 1.1); ctx.lineTo(ox + x2 + th / 2 - b, y + y2 - th * 1.1); ctx.lineTo(ox + x2 - b, y + y2 - th * 0.6); ctx.lineTo(ox + x2 - th / 2 - b, y + y2 - th * 1.1); ctx.lineTo(ox + x1 - th / 2 - a, y + y1 + th * 1.1); }
      ctx.closePath(); ctx.fill();
    };
    const m = h / 2;
    ({ a: () => L(0, 0, w, 0), b: () => L(w, 0, w, m), c: () => L(w, m, w, h), d: () => L(0, h, w, h), e: () => L(0, m, 0, h), f: () => L(0, 0, 0, m), g: () => L(0, m, w, m) } as Record<string, () => void>)[k]();
  };
  for (const ch of s) {
    if (ch === ".") { ctx.fillStyle = on; ctx.beginPath(); ctx.arc(cx - gap * 0.45 - h * 0.05, y + h - th * 0.1, th * 0.62, 0, Math.PI * 2); ctx.fill(); continue; }
    if (ch === "%") { text(ctx, "%", cx + 4, y + h, { size: h * 0.62, fam: "Num", color: on }); cx += h * 0.55; continue; }
    const lit = SEG[ch] ?? "";
    for (const k of "abcdefg") { ctx.fillStyle = lit.includes(k) ? on : off; segPath(k, cx); }
    cx += w + gap;
  }
  return cx - x;
}

// ---------- icons (ink line art, centred on cx, cy, scaled by s) ----------
export function icon(ctx: Ctx, kind: string, cx: number, cy: number, s: number, o: { color?: string; fill?: string; a?: number; width?: number } = {}) {
  ctx.save(); ctx.globalAlpha *= o.a ?? 1; ctx.translate(cx, cy); ctx.scale(s, s);
  const col = o.color ?? C.ink;
  ctx.strokeStyle = col; ctx.fillStyle = o.fill ?? col; ctx.lineWidth = o.width ?? 5; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const P = () => ctx.beginPath();
  switch (kind) {
    case "person": P(); ctx.arc(0, -22, 13, 0, Math.PI * 2); ctx.fill(); P(); ctx.moveTo(-20, 30); ctx.quadraticCurveTo(-20, -4, 0, -4); ctx.quadraticCurveTo(20, -4, 20, 30); ctx.closePath(); ctx.fill(); break;
    case "pill": ctx.rotate(-0.6); rr(ctx, -30, -13, 60, 26, 13); ctx.stroke(); P(); ctx.moveTo(0, -13); ctx.lineTo(0, 13); ctx.stroke(); ctx.save(); ctx.globalAlpha *= 0.85; rr(ctx, -30, -13, 30, 26, 13); ctx.fill(); ctx.restore(); break;
    case "bottle": rr(ctx, -30, -22, 60, 70, 10); ctx.stroke(); rr(ctx, -22, -42, 44, 20, 5); ctx.stroke(); P(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.moveTo(-30, 28); ctx.lineTo(30, 28); ctx.stroke(); break;
    case "coin": P(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke(); P(); ctx.arc(0, 0, 23, 0, Math.PI * 2); ctx.lineWidth = (o.width ?? 5) * 0.5; ctx.stroke();
      ctx.font = "34px Sans"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("¥", 0, 2); break;
    case "clock": P(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke(); P(); ctx.moveTo(0, 0); ctx.lineTo(0, -18); ctx.moveTo(0, 0); ctx.lineTo(13, 8); ctx.stroke(); break;
    case "heart": P(); ctx.moveTo(0, 26); ctx.bezierCurveTo(-46, -6, -24, -40, 0, -16); ctx.bezierCurveTo(24, -40, 46, -6, 0, 26); ctx.fill(); break;
    case "lens": P(); ctx.arc(-6, -6, 22, 0, Math.PI * 2); ctx.stroke(); P(); ctx.moveTo(10, 10); ctx.lineTo(30, 30); ctx.lineWidth = (o.width ?? 5) * 1.8; ctx.stroke(); break;
    case "bowl": P(); ctx.moveTo(-40, -4); ctx.lineTo(40, -4); ctx.quadraticCurveTo(38, 34, 0, 36); ctx.quadraticCurveTo(-38, 34, -40, -4); ctx.closePath(); ctx.fill();
      ctx.lineWidth = (o.width ?? 5) * 0.8; for (const dx of [-16, 0, 16]) { P(); ctx.moveTo(dx, -14); ctx.bezierCurveTo(dx - 8, -24, dx + 8, -30, dx, -42); ctx.stroke(); } break;
    case "flame": P(); ctx.moveTo(0, 34); ctx.bezierCurveTo(-30, 30, -30, 0, -8, -34); ctx.bezierCurveTo(-4, -12, 14, -14, 10, -30); ctx.bezierCurveTo(30, -6, 30, 30, 0, 34); ctx.fill(); break;
    case "warn": P(); ctx.moveTo(0, -36); ctx.lineTo(38, 30); ctx.lineTo(-38, 30); ctx.closePath(); ctx.lineWidth = (o.width ?? 5) * 1.3; ctx.stroke(); P(); ctx.moveTo(0, -12); ctx.lineTo(0, 10); ctx.stroke(); P(); ctx.arc(0, 20, 3.5, 0, Math.PI * 2); ctx.fill(); break;
    case "star": P(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 14 : 32, a = -Math.PI / 2 + (i * Math.PI) / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); break;
    case "check": P(); ctx.moveTo(-26, 2); ctx.lineTo(-8, 22); ctx.lineTo(28, -20); ctx.lineWidth = (o.width ?? 5) * 1.8; ctx.stroke(); break;
    case "cross": P(); ctx.moveTo(-22, -22); ctx.lineTo(22, 22); ctx.moveTo(22, -22); ctx.lineTo(-22, 22); ctx.lineWidth = (o.width ?? 5) * 1.8; ctx.stroke(); break;
    case "ticket": rr(ctx, -44, -26, 88, 52, 6); ctx.stroke(); P(); ctx.setLineDash([5, 6]); ctx.moveTo(18, -26); ctx.lineTo(18, 26); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < 3; i++) { P(); ctx.arc(-28 + i * 14, -6, 5, 0, Math.PI * 2); ctx.fill(); P(); ctx.arc(-28 + i * 14, 10, 5, 0, Math.PI * 2); ctx.fill(); } break;
    case "doc": rr(ctx, -28, -36, 56, 72, 5); ctx.stroke(); for (let i = 0; i < 4; i++) { P(); ctx.moveTo(-16, -18 + i * 13); ctx.lineTo(i === 3 ? 4 : 16, -18 + i * 13); ctx.stroke(); } break;
    case "bubble": rr(ctx, -40, -28, 80, 48, 12); ctx.stroke(); P(); ctx.moveTo(-14, 20); ctx.lineTo(-22, 34); ctx.lineTo(-2, 20); ctx.stroke(); break;
  }
  ctx.restore();
}

export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
/** Ease a number from a to b over [t0, t0+dur]. */
export const countUp = (t: number, t0: number, dur: number, a: number, b: number) => lerp(a, b, E.out(prog(t, t0, dur)));
