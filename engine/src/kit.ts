// Shared scene helpers: cut points between narration lines, voice-synced kinetic type, pills, callouts, ✗ marks, shades
// and plates for type over footage, and pinned photos. Import what you need in scenes.ts.
import type { Canvas } from "@napi-rs/canvas";
import { A, C, E, H, LEAD, W, alignment, charTimes, clamp, lerp, prog } from "./common.ts";
import { dropShadow, glass, inkPath, measure, rr, text, type Ctx, type TextOpt } from "./draw.ts";

/** Cut point between two lines: the middle of the pause before `id`. */
export function gapMid(id: string): number {
  const i = alignment.lines.findIndex((l) => l.id === id);
  if (i < 0) throw new Error(`no line ${id}`);
  return i === 0 ? 0 : LEAD + (alignment.lines[i - 1].end + alignment.lines[i].start) / 2;
}
/** Cut before line `id`: just ahead of its first word, so the previous shot keeps the whole pause for its payoff. */
export const cutAt = (id: string) => Math.max(gapMid(id), A(id) - 0.12);

// ---------- shared pieces ----------
export const SH = { color: "rgba(0,0,0,0.62)", blur: 18, dy: 3 };
export const WT = (size: number, fam: TextOpt["fam"] = "Display"): TextOpt => ({ size, fam, color: "#fff", shadow: SH });
export const INK = (size: number, fam: TextOpt["fam"] = "Display", color: string = C.ink): TextOpt => ({ size, fam, color });
export const ct = (id: string, phrase: string, nth = 1) => charTimes(id, phrase, nth);
export const popS = (t: number, t0: number, d = 0.3) => { const u = prog(t, t0, d); return { u, s: 0.55 + 0.45 * E.back(u), a: clamp(u * 3) }; };
/** Voice-synced pop: glyph i lands as its character is spoken (`times` from charTimes), `lead` seconds early. */
export function say(ctx: Ctx, s: string, x: number, y: number, o: TextOpt, times: number[], t: number, lead = 0.1, dur = 0.24): number {
  return text(ctx, s, x, y, o, (i) => {
    const u = prog(t, times[Math.min(i, times.length - 1)] - lead, dur);
    if (u <= 0) return null;
    return { a: clamp(u * 2.4), s: 0.55 + 0.45 * E.back(u), dy: (1 - E.out(u)) * o.size * 0.16 };
  });
}
/** Same, centred on x. */
export const sayC = (ctx: Ctx, s: string, x: number, y: number, o: TextOpt, times: number[], t: number, lead = 0.1) => say(ctx, s, x - measure(ctx, s, o) / 2, y, o, times, t, lead);
export function pill(ctx: Ctx, label: string, x: number, y: number, t: number, t0: number, o: { bg?: string; fg?: string; size?: number; a?: number; fam?: TextOpt["fam"]; center?: boolean } = {}) {
  const u = prog(t, t0, 0.28); if (u <= 0) return 0;
  const size = o.size ?? 32, tw = measure(ctx, label, { size, fam: o.fam ?? "Sans" }), w = tw + size * 1.1, h = size * 1.6;
  ctx.save(); ctx.globalAlpha *= clamp(u * 3) * (o.a ?? 1);
  ctx.translate(o.center ? x : x + w / 2, y); ctx.scale(0.6 + 0.4 * E.back(u), 0.6 + 0.4 * E.back(u));
  ctx.fillStyle = o.bg ?? C.red; rr(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fill();
  text(ctx, label, 0, size * 0.36, { size, fam: o.fam ?? "Sans", color: o.fg ?? "#fff", align: "center" });
  ctx.restore();
  return w;
}
export const rule = (ctx: Ctx, x1: number, y: number, x2: number, u: number, color = "rgba(26,26,26,0.25)", w = 3) =>
  inkPath(ctx, [[x1, y], [x2, y]], E.out(clamp(u)), { color, width: w, wobble: 0.6, seed: Math.round(y) });
export function leftShade(ctx: Ctx, a = 0.65, to = 0.62) {
  const g = ctx.createLinearGradient(0, 0, W * to, 0); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W * to, H);
}
export function rightShade(ctx: Ctx, a = 0.62, from = 0.4) {
  const g = ctx.createLinearGradient(W * from, 0, W, 0); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(W * from, 0, W * (1 - from), H);
}
export function topShade(ctx: Ctx, a = 0.6, to = 0.5) {
  const g = ctx.createLinearGradient(0, 0, 0, H * to); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * to);
}
export function foot(ctx: Ctx, s: string, x: number, y: number, t: number, t0: number, onDark = false, align: "left" | "center" = "left") {
  const a = prog(t, t0, 0.4); if (a <= 0) return;
  text(ctx, s, x, y, { size: 28, fam: "Sans", color: onDark ? "rgba(255,255,255,0.82)" : C.ink3, alpha: a, align, shadow: onDark ? { color: "rgba(0,0,0,0.7)", blur: 8 } : undefined });
}
export function xMark(ctx: Ctx, cx: number, cy: number, r: number, t: number, t0: number, o: { color?: string; width?: number } = {}) {
  const u1 = prog(t, t0, 0.11), u2 = prog(t, t0 + 0.09, 0.11), col = o.color ?? C.red, w = o.width ?? r * 0.17;
  if (u1 > 0) inkPath(ctx, [[cx - r, cy - r * 0.92], [cx + r, cy + r * 0.92]], E.out(u1), { color: col, width: w, seed: 31, wobble: 1.6 });
  if (u2 > 0) inkPath(ctx, [[cx + r * 0.95, cy - r], [cx - r * 0.95, cy + r]], E.out(u2), { color: col, width: w, seed: 37, wobble: 1.6 });
}
/** Callout: a rounded label whose left edge sits at (x, y) with a leader line from the point (tx, ty). */
export function callout(ctx: Ctx, label: string, x: number, y: number, tx: number, ty: number, t: number, t0: number, o: { bg?: string; fg?: string; size?: number; fam?: TextOpt["fam"] } = {}) {
  const u = prog(t, t0, 0.3); if (u <= 0) return;
  const size = o.size ?? 40, w = measure(ctx, label, { size, fam: o.fam ?? "Sans" }) + size * 1.0, h = size * 1.6, bg = o.bg ?? "#fff";
  ctx.save(); ctx.globalAlpha *= clamp(u * 3);
  const lu = E.out(clamp(u * 1.5));
  ctx.strokeStyle = bg; ctx.lineWidth = 4; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(lerp(tx, x, lu), lerp(ty, y, lu)); ctx.stroke();
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(tx, ty, 10, 0, Math.PI * 2); ctx.fill();
  const s = 0.6 + 0.4 * E.back(u);
  ctx.translate(x + w / 2, y); ctx.scale(s, s);
  dropShadow(ctx, -w / 2, -h / 2, w, h, { r: h / 2, blur: 16, color: "rgba(0,0,0,0.4)", dy: 4 });
  ctx.fillStyle = bg; rr(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fill();
  text(ctx, label, 0, size * 0.36, { size, fam: o.fam ?? "Sans", color: o.fg ?? C.ink, align: "center" });
  ctx.restore();
}
/** Dark panel with white type, for words over busy footage. */
export function plate(ctx: Ctx, x: number, y: number, w: number, h: number, a: number) { glass(ctx, x, y, w, h, a * 0.82, 26, "rgba(8,8,10,0.62)"); }


/** Polaroid-style photo pinned on a board. */
export function photo(ctx: Ctx, img: Canvas, cx: number, cy: number, w: number, rot: number, o: { a?: number; s?: number; flash?: number } = {}) {
  if ((o.a ?? 1) <= 0.001) return;
  const h = (w * img.height) / img.width, b = 16;
  ctx.save(); ctx.globalAlpha *= o.a ?? 1;
  ctx.translate(cx, cy); ctx.rotate(rot); if (o.s !== undefined && o.s !== 1) ctx.scale(o.s, o.s);
  dropShadow(ctx, -w / 2 - b, -h / 2 - b, w + 2 * b, h + 2 * b, { r: 3, blur: 28, color: "rgba(40,30,20,0.42)", dy: 12 });
  ctx.fillStyle = "#FDFCF8"; ctx.fillRect(-w / 2 - b, -h / 2 - b, w + 2 * b, h + 2 * b);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  if (o.flash && o.flash > 0.01) { ctx.fillStyle = `rgba(255,255,255,${o.flash})`; ctx.fillRect(-w / 2, -h / 2, w, h); }
  ctx.restore();
}
