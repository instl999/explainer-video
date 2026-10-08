// Scene painters for 《存不下钱，看看你的房间》. Every beat is keyed to a spoken phrase through A(line, phrase), so the
// picture follows the voice. Look: footage annotated in white (tags, rings, stamps); the explaining happens on warm paper
// in ink; red = waste, blue = money kept / needs, ice blue for the freezer test.
import type { Canvas } from "@napi-rs/canvas";
import { A, C, E, H, LEAD, W, alignment, charTimes, clamp, hash, lerp, prog } from "./common.ts";
import { arrow, card, countUp, dropShadow, glass, icon, inkPath, marker, measure, popText, ring, rr, stamp, strike, text, type Ctx, type TextOpt } from "./draw.ts";
import { still } from "./footage.ts";
import type { PaintArgs } from "./model.ts";

/** Cut point between two lines: the middle of the pause before `id`. */
export function gapMid(id: string): number {
  const i = alignment.lines.findIndex((l) => l.id === id);
  if (i < 0) throw new Error(`no line ${id}`);
  return i === 0 ? 0 : LEAD + (alignment.lines[i - 1].end + alignment.lines[i].start) / 2;
}
/** Cut before line `id`: just ahead of its first word, so the previous shot keeps the whole pause for its payoff. */
export const cutAt = (id: string) => Math.max(gapMid(id), A(id) - 0.12);

// ---------- anchors ----------
export const T = {
  // hook
  zan: A("s00", "攒不下钱"), not: A("s00", "根本不是"), wage: A("s00", "工资低"), wageEnd: A("s00", "工资低", { end: true }),
  room: cutAt("s01"), q: A("s01", "问题"), inRoom: A("s01", "出在"), roomW: A("s01", "房间"), roomEnd: A("s01", "房间", { end: true }),
  desk: cutAt("s02"), jp: A("s02", "日本"), fp: A("s02", "理财师"), name: A("s02", "黑田尚子"), y25: A("s02", "25年"), consult: A("s02", "家庭理财咨询"),
  found: A("s02", "发现"), rule: A("s02", "扎心规律"),
  grid: cutAt("s03"), poor: A("s03", "存不下钱"), home: A("s03", "家里"), mess: A("s03", "乱糟糟"), messEnd: A("s03", "乱糟糟", { end: true }),
  myth: A("s04"), mythW: A("s04", "玄学"), mythEnd: A("s04", "玄学", { end: true }),
  // test 1: the freezer
  frz: cutAt("s05"), dare: A("s05", "不信"), open: A("s05", "打开"), freezer: A("s05", "冷冻室"),
  cake: A("s06", "蛋糕"), buy: A("s06"), sweet: A("s06", "甜点"), gift: A("s06", "送的冰袋"), pile: A("s06", "攒了一大堆"),
  n30: A("s07", "30个"), is30: A("s07", "就是"), times30: A("s07", "30次"), treat: A("s07", "犒劳自己"), treatEnd: A("s07", "犒劳自己", { end: true }),
  // test 2: the wardrobe
  closet: cutAt("s08"), wardrobe: A("s08", "衣柜"), style: A("s08", "款式"), pantsW: A("s08", "黑裤子"), have: A("s08", "已经有"), three: A("s08", "3条"),
  she: A("s09", "她说"), over3: A("s09", "3条以上"), care: A("s09", "当心"), careEnd: A("s09", "当心", { end: true }), forget: A("s09", "记不清"), what: A("s09", "有什么"),
  // the mechanism
  same: cutAt("s10"), tidy: A("s10", "整理房间"), save: A("s10", "攒钱"), essence: A("s10", "本质上"), one: A("s10", "同一件事"),
  nw: cutAt("s11"), split: A("s11", "分清"), need: A("s11", "需要"), want: A("s11", "想要"),
  bill: cutAt("s12"), junk: A("s12", "没用的杂物"), billW: A("s12", "账单"), spend: A("s12", "没用的开支"), spendEnd: A("s12", "开支", { end: true }),
  leak: cutAt("s13"), small: A("s13", "小钱"), year: A("s13", "一年下来"), k: A("s13", "好几千"),
  // the fix
  step: cutAt("s14"), wantSave: A("s14", "想攒钱"), first: A("s14", "第一步"), notW: A("s14", "不是"), rush: A("s14", "急着省钱"), rushEnd: A("s14", "省钱", { end: true }),
  but: A("s14", "而是"), tidyFirst: A("s14", "先整理房间"), tidyEnd: A("s14", "整理房间", { end: true }),
  clear: cutAt("s15"), junk2: A("s15", "没用的东西"), out: A("s15", "清出去"), sort: A("s15", "理清") - 0.1, real: A("s15", "真正需要"),
  calm: cutAt("s16"), noSpend: A("s16", "不会乱花钱"),
  // call to action
  cta: cutAt("s17"), book: A("s17", "这本书"), notes: A("s17", "核心笔记"), done: A("s17", "整理好了"), box: A("s17", "评论区"), kou: A("s17", "整理", { nth: 2 }), send: A("s17", "直接发你"),
  end: cutAt("s18"), moon: A("s18", "月光族"), read: A("s18", "读一读"), detour: A("s18", "少走10年弯路"),
};

// ---------- shared pieces ----------
const SH = { color: "rgba(0,0,0,0.62)", blur: 18, dy: 3 };
const WT = (size: number, fam: TextOpt["fam"] = "Display"): TextOpt => ({ size, fam, color: "#fff", shadow: SH });
const INK = (size: number, fam: TextOpt["fam"] = "Display", color: string = C.ink): TextOpt => ({ size, fam, color });
const fadeWin = (t: number, t0: number, t1: number, fin = 0.2, fout = 0.25) => Math.min(prog(t, t0, fin), 1 - prog(t, t1 - fout, fout));
const ct = (id: string, phrase: string, nth = 1) => charTimes(id, phrase, nth);

/** Voice-synced pop: glyph i lands as its character is spoken (`times` from charTimes), `lead` seconds early. */
function say(ctx: Ctx, s: string, x: number, y: number, o: TextOpt, times: number[], t: number, lead = 0.1, dur = 0.24): number {
  return text(ctx, s, x, y, o, (i) => {
    const u = prog(t, times[Math.min(i, times.length - 1)] - lead, dur);
    if (u <= 0) return null;
    return { a: clamp(u * 2.4), s: 0.55 + 0.45 * E.back(u), dy: (1 - E.out(u)) * o.size * 0.16 };
  });
}
/** Pill tag that pops in at t0. */
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
const rule = (ctx: Ctx, x1: number, y: number, x2: number, u: number, color = "rgba(26,26,26,0.25)", w = 3) =>
  inkPath(ctx, [[x1, y], [x2, y]], E.out(clamp(u)), { color, width: w, wobble: 0.6, seed: Math.round(y) });
function leftShade(ctx: Ctx, a = 0.65, to = 0.62) {
  const g = ctx.createLinearGradient(0, 0, W * to, 0);
  g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W * to, H);
}
function rightShade(ctx: Ctx, a = 0.62, from = 0.4) {
  const g = ctx.createLinearGradient(W * from, 0, W, 0);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(W * from, 0, W * (1 - from), H);
}
function foot(ctx: Ctx, s: string, x: number, y: number, t: number, t0: number, onDark = false, align: "left" | "center" = "left") {
  const a = prog(t, t0, 0.4); if (a <= 0) return;
  text(ctx, s, x, y, { size: 26, fam: "Sans", color: onDark ? "rgba(255,255,255,0.8)" : C.ink3, alpha: a, align, shadow: onDark ? { color: "rgba(0,0,0,0.7)", blur: 8 } : undefined });
}
/** Hand-drawn X: two strokes from t0. */
function xMark(ctx: Ctx, cx: number, cy: number, r: number, t: number, t0: number, o: { color?: string; width?: number } = {}) {
  const u1 = prog(t, t0, 0.11), u2 = prog(t, t0 + 0.09, 0.11), col = o.color ?? C.red, w = o.width ?? r * 0.17;
  if (u1 > 0) inkPath(ctx, [[cx - r, cy - r * 0.92], [cx + r, cy + r * 0.92]], E.out(u1), { color: col, width: w, seed: 31, wobble: 1.6 });
  if (u2 > 0) inkPath(ctx, [[cx + r * 0.95, cy - r], [cx - r * 0.95, cy + r]], E.out(u2), { color: col, width: w, seed: 37, wobble: 1.6 });
}
/** Callout: a rounded label whose left edge sits at (x, y) with a leader line from the point (tx, ty). */
function callout(ctx: Ctx, label: string, x: number, y: number, tx: number, ty: number, t: number, t0: number, o: { bg?: string; fg?: string; size?: number; fam?: TextOpt["fam"]; right?: boolean } = {}) {
  const u = prog(t, t0, 0.3); if (u <= 0) return;
  const size = o.size ?? 40, w = measure(ctx, label, { size, fam: o.fam ?? "Sans" }) + size * 1.0, h = size * 1.6, bg = o.bg ?? "#fff";
  const lx = o.right ? x - w : x, ax = o.right ? x : x;
  ctx.save(); ctx.globalAlpha *= clamp(u * 3);
  const lu = E.out(clamp(u * 1.5));
  ctx.strokeStyle = bg; ctx.lineWidth = 4; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(lerp(tx, ax, lu), lerp(ty, y, lu)); ctx.stroke();
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(tx, ty, 10, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 2; ctx.stroke();
  const s = 0.6 + 0.4 * E.back(u);
  ctx.translate(lx + w / 2, y); ctx.scale(s, s);
  dropShadow(ctx, -w / 2, -h / 2, w, h, { r: h / 2, blur: 16, color: "rgba(0,0,0,0.4)", dy: 4 });
  ctx.fillStyle = bg; rr(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fill();
  text(ctx, label, 0, size * 0.36, { size, fam: o.fam ?? "Sans", color: o.fg ?? C.ink, align: "center" });
  ctx.restore();
}
/** Polaroid-style photo pinned on a board. */
function photo(ctx: Ctx, img: Canvas, cx: number, cy: number, w: number, rot: number, o: { a?: number; s?: number; flash?: number } = {}) {
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
/** Pop scale for an element arriving at t0. */
const popS = (t: number, t0: number, d = 0.3) => { const u = prog(t, t0, d); return { u, s: 0.55 + 0.45 * E.back(u), a: clamp(u * 3) }; };

// ---------- props (ink line art with flat fills) ----------
function icePack(ctx: Ctx, x: number, y: number, w: number, h: number, rot: number, o: { a?: number; sx?: number; glow?: number } = {}) {
  if ((o.a ?? 1) <= 0.001 || (o.sx ?? 1) <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= o.a ?? 1; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(o.sx ?? 1, 1);
  ctx.lineJoin = "round"; ctx.strokeStyle = C.iceLine; ctx.lineWidth = 3.5;
  const sw = w * 0.1;
  ctx.fillStyle = "#D9EEF9";
  ctx.fillRect(-w / 2, -h / 2 + 3, sw, h - 6); ctx.strokeRect(-w / 2, -h / 2 + 3, sw, h - 6);
  ctx.fillRect(w / 2 - sw, -h / 2 + 3, sw, h - 6); ctx.strokeRect(w / 2 - sw, -h / 2 + 3, sw, h - 6);
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, "#C6E8FA"); g.addColorStop(1, "#6DB5E4");
  ctx.fillStyle = g; rr(ctx, -w / 2 + sw * 0.8, -h / 2, w - sw * 1.6, h, h * 0.28); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 4.5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-w * 0.26, -h * 0.2); ctx.lineTo(w * 0.04, -h * 0.2); ctx.stroke();
  ctx.fillStyle = "rgba(44,110,158,0.55)"; ctx.font = `${Math.round(h * 0.34)}px Sans`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("保冷", 0, h * 0.12);
  if (o.glow) { ctx.globalAlpha *= o.glow; ctx.fillStyle = "#fff"; rr(ctx, -w / 2, -h / 2, w, h, h * 0.28); ctx.fill(); }
  ctx.restore();
}
/** A slice of strawberry shortcake. */
function cake(ctx: Ctx, cx: number, cy: number, s: number, a = 1) {
  if (a <= 0.001 || s <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.lineJoin = "round"; ctx.lineWidth = 4; ctx.strokeStyle = C.ink;
  ctx.fillStyle = "#FFF6E6"; ctx.beginPath(); ctx.moveTo(-58, -6); ctx.lineTo(34, -40); ctx.lineTo(58, -22); ctx.lineTo(-30, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#F3D29B"; ctx.beginPath(); ctx.moveTo(-58, -6); ctx.lineTo(-30, 14); ctx.lineTo(-30, 58); ctx.lineTo(-58, 34); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-30, 14); ctx.lineTo(58, -22); ctx.lineTo(58, 22); ctx.lineTo(-30, 58); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#FFF6E6"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-27, 36); ctx.lineTo(55, 1); ctx.stroke();
  ctx.fillStyle = "#E8473C"; ctx.beginPath(); ctx.moveTo(2, -66); ctx.quadraticCurveTo(26, -60, 20, -40); ctx.quadraticCurveTo(10, -26, 0, -28); ctx.quadraticCurveTo(-14, -30, -16, -44); ctx.quadraticCurveTo(-18, -62, 2, -66); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; ctx.stroke();
  ctx.fillStyle = C.green; ctx.beginPath(); ctx.moveTo(-6, -66); ctx.lineTo(2, -58); ctx.lineTo(12, -68); ctx.lineTo(3, -74); ctx.closePath(); ctx.fill();
  ctx.restore();
}
/** A cup of custard pudding. */
function pudding(ctx: Ctx, cx: number, cy: number, s: number, a = 1) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.lineJoin = "round"; ctx.lineWidth = 4; ctx.strokeStyle = C.ink;
  ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.ellipse(0, 52, 74, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#F5C963"; ctx.beginPath(); ctx.moveTo(-50, 48); ctx.lineTo(-36, -22); ctx.lineTo(36, -22); ctx.lineTo(50, 48); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#8A4A1C"; ctx.beginPath(); ctx.moveTo(-37, -18); ctx.quadraticCurveTo(-30, -4, -24, -14); ctx.quadraticCurveTo(-14, 0, -6, -12); ctx.quadraticCurveTo(4, 2, 12, -12); ctx.quadraticCurveTo(22, 0, 28, -14); ctx.quadraticCurveTo(34, -4, 37, -18);
  ctx.lineTo(36, -24); ctx.quadraticCurveTo(0, -36, -36, -24); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#E8473C"; ctx.beginPath(); ctx.arc(0, -36, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
/** Black trousers on a hanger; (cx, top) is where the hook sits on the rail. */
function pants(ctx: Ctx, cx: number, top: number, s: number, o: { a?: number; fog?: number; rot?: number } = {}) {
  if ((o.a ?? 1) <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= o.a ?? 1; ctx.translate(cx, top); ctx.rotate(o.rot ?? 0); ctx.scale(s, s);
  ctx.strokeStyle = "#6B6862"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.arc(0, 2, 12, Math.PI * 1.05, Math.PI * 2.1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(12, 6); ctx.lineTo(0, 26); ctx.lineTo(-86, 56); ctx.lineTo(86, 56); ctx.lineTo(0, 26); ctx.stroke();
  const fog = o.fog ?? 0;
  ctx.beginPath(); ctx.moveTo(-80, 56); ctx.lineTo(80, 56); ctx.lineTo(96, 480); ctx.lineTo(18, 480); ctx.lineTo(0, 150); ctx.lineTo(-18, 480); ctx.lineTo(-96, 480); ctx.closePath();
  ctx.fillStyle = `rgba(30,30,34,${1 - 0.78 * fog})`; ctx.fill();
  if (fog > 0.02) { ctx.setLineDash([14, 11]); ctx.strokeStyle = `rgba(26,26,26,${0.7 * fog})`; ctx.lineWidth = 5; ctx.stroke(); ctx.setLineDash([]); }
  ctx.strokeStyle = `rgba(255,255,255,${0.16 * (1 - fog)})`; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-78, 90); ctx.lineTo(78, 90); ctx.moveTo(-54, 120); ctx.lineTo(-57, 470); ctx.moveTo(54, 120); ctx.lineTo(57, 470); ctx.stroke();
  ctx.restore();
}
function crystal(ctx: Ctx, cx: number, cy: number, s: number, t: number, a = 1) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.lineJoin = "round"; ctx.lineWidth = 5; ctx.strokeStyle = "#F2EDF8";
  ctx.fillStyle = "#3C2A55"; ctx.beginPath(); ctx.moveTo(-70, 120); ctx.lineTo(-48, 76); ctx.lineTo(48, 76); ctx.lineTo(70, 120); ctx.closePath(); ctx.fill(); ctx.stroke();
  const g = ctx.createRadialGradient(-28, -30, 10, 0, 0, 96); g.addColorStop(0, "#F4ECFF"); g.addColorStop(0.45, "#A98BE0"); g.addColorStop(1, "#4A2D86");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 92, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  for (let k = 0; k < 5; k++) {
    const ang = t * 1.6 + k * 1.26, r = 56 + 10 * Math.sin(t * 3 + k), sx = Math.cos(ang) * r, sy = Math.sin(ang) * r * 0.6, ss = 6 + 4 * Math.sin(t * 7 + k * 2);
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.beginPath(); ctx.moveTo(sx, sy - ss); ctx.lineTo(sx + ss * 0.3, sy); ctx.lineTo(sx, sy + ss); ctx.lineTo(sx - ss * 0.3, sy); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function piggy(ctx: Ctx, cx: number, cy: number, s: number, color: string, a = 1) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.lineWidth = 6; ctx.strokeStyle = C.ink; ctx.fillStyle = color;
  for (const lx of [-46, -16, 22, 50]) { ctx.beginPath(); rr(ctx, lx - 11, 40, 22, 40, 6); ctx.fill(); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(0, 4, 96, 70, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-50, -48); ctx.lineTo(-34, -86); ctx.lineTo(-14, -60); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-96, 14, 18, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(-100, 8, 3.5, 0, Math.PI * 2); ctx.arc(-92, 20, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-58, -12, 6, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-18, -62); ctx.lineTo(26, -62); ctx.stroke();
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(94, -6); ctx.bezierCurveTo(124, -24, 120, 10, 104, 4); ctx.stroke();
  ctx.restore();
}
/** Open storage box with neatly folded clothes (the "tidy" icon). */
function tidyBox(ctx: Ctx, cx: number, cy: number, s: number, a = 1) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.lineJoin = "round"; ctx.lineWidth = 6; ctx.strokeStyle = C.ink;
  const cols = ["#7FA7D9", "#E9C46A", "#D9382B", "#9BC59D"];
  cols.forEach((c, k) => { ctx.fillStyle = c; ctx.beginPath(); rr(ctx, -92 + k * 46, -64, 42, 70, 8); ctx.fill(); ctx.stroke(); });
  ctx.fillStyle = "#F6F2EA"; ctx.beginPath(); ctx.moveTo(-110, -6); ctx.lineTo(110, -6); ctx.lineTo(96, 86); ctx.lineTo(-96, 86); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-40, 34); ctx.lineTo(40, 34); ctx.stroke();
  ctx.restore();
}
function umbrella(ctx: Ctx, cx: number, cy: number, s: number, color: string) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.lineWidth = 5; ctx.strokeStyle = C.ink;
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-70, 0); ctx.quadraticCurveTo(-66, -62, 0, -66); ctx.quadraticCurveTo(66, -62, 70, 0);
  ctx.quadraticCurveTo(58, -14, 46, 0); ctx.quadraticCurveTo(34, -14, 22, 0); ctx.quadraticCurveTo(10, -14, 0, 0); ctx.quadraticCurveTo(-10, -14, -22, 0); ctx.quadraticCurveTo(-34, -14, -46, 0); ctx.quadraticCurveTo(-58, -14, -70, 0); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, 62); ctx.arc(-12, 62, 12, 0, Math.PI); ctx.stroke();
  ctx.restore();
}
function shopBag(ctx: Ctx, cx: number, cy: number, s: number, color: string) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineJoin = "round"; ctx.lineWidth = 5; ctx.strokeStyle = C.ink;
  ctx.beginPath(); ctx.arc(0, -40, 24, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-54, -40); ctx.lineTo(54, -40); ctx.lineTo(62, 60); ctx.lineTo(-62, 60); ctx.closePath(); ctx.fill(); ctx.stroke();
  text(ctx, "SALE", 0, 22, { size: 30, fam: "Num", color: "#fff", align: "center", bold: 1 });
  ctx.restore();
}
/** Basket (bin) with slats, centred on (cx, cy). */
function basket(ctx: Ctx, cx: number, cy: number, w: number, h: number, color: string, a = 1) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.lineJoin = "round"; ctx.lineWidth = 7; ctx.strokeStyle = color;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2 - 34, h / 2); ctx.lineTo(-w / 2 + 34, h / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 4;
  for (let k = 1; k < 6; k++) { const u = k / 6, xt = lerp(-w / 2, w / 2, u), xb = lerp(-w / 2 + 34, w / 2 - 34, u); ctx.beginPath(); ctx.moveTo(xt, -h / 2 + 4); ctx.lineTo(xb, h / 2 - 4); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-w / 2 + 17, 0); ctx.lineTo(w / 2 - 17, 0); ctx.stroke();
  ctx.restore();
}
/** Gold coin seen from the side (ellipse), for stacks. */
function coinFlat(ctx: Ctx, cx: number, cy: number, r: number, color = C.gold) {
  ctx.fillStyle = "#B8862A"; ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.18, r, r * 0.36, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.36, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(26,26,26,0.55)"; ctx.lineWidth = 2; ctx.stroke();
}
function coinFace(ctx: Ctx, cx: number, cy: number, r: number, color = C.gold) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#8F6A1E"; ctx.lineWidth = r * 0.12; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2); ctx.lineWidth = r * 0.06; ctx.stroke();
  text(ctx, "¥", cx, cy + r * 0.36, { size: r * 1.05, fam: "Num", color: "#8F6A1E", align: "center", bold: 1 });
}

// ================= HOOK =================
// h1 · 0 s: the empty wallet. Huge white words over a dark right side.
export function walletHud(ctx: Ctx, { t }: PaintArgs) {
  rightShade(ctx, 0.78, 0.38);
  say(ctx, "攒不下钱", 1010, 610, WT(200), ct("s00", "攒不下钱"), t, 0.24);
}
// h2 · "根本不是工资低": a paper tag on the salary envelope, crossed out.
export function salaryHud(ctx: Ctx, { t }: PaintArgs) {
  leftShade(ctx, 0.35, 0.55);
  say(ctx, "根本不是", 150, 168, WT(60, "Sans"), ct("s00", "根本不是"), t, 0.12);
  const u = E.out(prog(t, T.wage - 0.18, 0.3));
  if (u <= 0) return;
  card(ctx, 130, 200, 680, 260, { rot: -0.035, a: clamp(u * 2), s: 0.85 + 0.15 * E.back(prog(t, T.wage - 0.18, 0.3)), fill: "#FFFDF5", shadow: 30 }, () => {
    say(ctx, "工资低？", 70, 196, INK(160), [...ct("s00", "工资低"), T.wageEnd - 0.05], t, 0.12);
    xMark(ctx, 305, 130, 160, t, T.wageEnd - 0.2, { width: 24 });
  });
}
// h3 · "问题，出在你的房间": the rubbish room, ringed.
export function hoardPaint(ctx: Ctx, { t }: PaintArgs) {
  if (t >= T.roomW - 0.05) ring(ctx, 1420, 690, 400, 300, prog(t, T.roomW + 0.02, 0.4), { width: 14, rot: -0.08 });
}
export function hoardHud(ctx: Ctx, { t }: PaintArgs) {
  leftShade(ctx, 0.72, 0.6);
  pill(ctx, "问题", 112, 330, t, T.q - 0.08, { size: 52 });
  say(ctx, "出在", 112, 520, WT(120), ct("s01", "出在"), t);
  const w0 = measure(ctx, "你的", { size: 200, fam: "Display" }), w1 = measure(ctx, "你的房间", { size: 200, fam: "Display" });
  const mu = prog(t, T.roomW + 0.05, 0.3);
  if (mu > 0) inkPath(ctx, [[112 + w0, 752], [112 + lerp(w0, w1, E.out(mu)), 748]], 1, { color: C.red, width: 18, seed: 5, wobble: 1.4 });
  say(ctx, "你的房间", 112, 720, WT(200), ct("s01", "你的房间"), t);
}

// ================= WHO / THE RULE =================
// a1 · the planner. Footage stands in (labelled as illustration); her file card slides in.
export function deskHud(ctx: Ctx, { t }: PaintArgs) {
  glass(ctx, 36, 30, 186, 46, 0.55, 23, "rgba(0,0,0,0.45)");
  text(ctx, "示意画面", 129, 62, { size: 24, fam: "Sans", color: "rgba(255,255,255,0.85)", align: "center" });
  const u = E.out(prog(t, T.desk + 0.02, 0.45)), x = 1080 + (1 - u) * 900;
  card(ctx, x, 140, 760, 660, { rot: 0.012, fill: "#FBF8F1", shadow: 34 }, () => {
    text(ctx, "理财师档案", 704, 92, { size: 30, fam: "Sans", color: C.ink3, align: "right" });
    const a1 = prog(t, T.jp - 0.1, 0.25);
    if (a1 > 0) { ctx.save(); ctx.globalAlpha *= a1; ctx.fillStyle = C.red; rr(ctx, 56, 52, 360, 58, 29); ctx.fill(); ctx.restore(); text(ctx, "日本 · 理财规划师", 236, 93, { size: 34, fam: "Sans", color: "#fff", align: "center", alpha: a1 }); }
    say(ctx, "黑田尚子", 52, 268, INK(140), ct("s02", "黑田尚子"), t, 0.2);
    text(ctx, "Kuroda Naoko · CFP", 58, 326, { size: 34, fam: "Num", color: C.ink3, alpha: prog(t, T.name + 0.35, 0.3) });
    rule(ctx, 56, 366, 704, prog(t, T.name + 0.3, 0.35));
    const nu = prog(t, T.y25 - 0.12, 0.25);
    if (nu > 0) {
      const v = Math.round(countUp(t, T.y25 - 0.12, 0.45, 0, 25));
      const nw = text(ctx, String(v), 52, 572, { size: 230, fam: "Num", color: C.ink, bold: 4, alpha: clamp(nu * 3) });
      text(ctx, "年+", 52 + nw + 14, 566, { ...INK(96), alpha: clamp(nu * 3) });
    }
    say(ctx, "家庭理财咨询", 58, 636, INK(52, "Sans", C.ink2), ct("s02", "家庭理财咨询"), t, 0.1);
  });
  stamp(ctx, "扎心规律", 470, 250, t, T.rule + 0.08, { size: 92, rot: -0.12 });
}
// a2 · the rule: four messy homes slam onto the board, then the banner.
const GRID: Array<{ s: number; x: number; y: number; rot: number }> = [
  { s: 17.6, x: 500, y: 290, rot: -0.05 }, { s: 28.6, x: 1420, y: 280, rot: 0.045 },
  { s: 37.7, x: 520, y: 800, rot: 0.04 }, { s: 41.6, x: 1400, y: 795, rot: -0.05 },
];
export function gridPaint(ctx: Ctx, { t }: PaintArgs) {
  GRID.forEach((g, k) => {
    const t0 = T.grid + 0.02 + k * 0.2, u = prog(t, t0, 0.2);
    if (u <= 0) return;
    photo(ctx, still(g.s, 760), g.x, g.y, 700, g.rot, { a: clamp(u * 3), s: lerp(1.5, 1, E.out(u)), flash: 0.85 * (1 - prog(t, t0 + 0.08, 0.3)) });
  });
  // banner across the middle
  const bu = E.out(prog(t, T.poor - 0.12, 0.3));
  if (bu > 0) {
    ctx.save(); ctx.translate(960, 545); ctx.rotate(-0.015);
    const bw = 1560 * bu, bh = 150;
    dropShadow(ctx, -bw / 2, -bh / 2, bw, bh, { r: 4, blur: 30, color: "rgba(40,30,20,0.45)", dy: 10 });
    ctx.fillStyle = "#FFFDF6"; ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.fillStyle = C.red; ctx.fillRect(-bw / 2, -bh / 2, 16, bh);
    if (bu > 0.6) {
      const x0 = -720;
      const w1 = say(ctx, "存不下钱的人", x0, 34, INK(92), ct("s03", "存不下钱的人"), t);
      arrow(ctx, x0 + w1 + 24, 2, x0 + w1 + 124, 2, prog(t, T.home - 0.3, 0.25), { width: 8, head: 22 });
      const w2x = x0 + w1 + 150;
      say(ctx, "家里往往", w2x, 34, INK(92), ct("s03", "家里往往"), t);
      const w3x = w2x + measure(ctx, "家里往往", { size: 92, fam: "Display" });
      say(ctx, "乱糟糟", w3x, 34, INK(92, "Display", C.red), ct("s03", "乱糟糟"), t);
      if (t >= T.messEnd - 0.05) ring(ctx, w3x + measure(ctx, "乱糟糟", { size: 92, fam: "Display" }) / 2, 2, 175, 72, prog(t, T.messEnd - 0.02, 0.32), { width: 10 });
    }
    ctx.restore();
  }
}
export function gridHud(ctx: Ctx, { t }: PaintArgs) {
  // "这不是玄学": the board dims, a crystal ball appears and is crossed out
  const d = prog(t, T.myth - 0.1, 0.25);
  if (d <= 0) return;
  ctx.fillStyle = `rgba(16,14,20,${0.62 * d})`; ctx.fillRect(0, 0, W, H);
  const p = popS(t, T.myth - 0.05, 0.32);
  crystal(ctx, 960, 430, 1.45 * p.s, t, p.a);
  say(ctx, "玄学", 960, 760, { ...WT(130), align: "center" }, ct("s04", "玄学"), t, 0.25);
  xMark(ctx, 960, 520, 230, t, T.mythEnd - 0.04, { width: 30 });
}

// ================= TEST 1 · THE FREEZER =================
// World is two screens wide: the fridge (left) and, after the dive through the drawer, the drawer seen from above (right).
const FR = { x: 330, y: 120, w: 440, h: 840, split: 540 };
export const frzCam = () => [
  { t: T.frz, s: 1, x: 960, y: 540 },
  { t: T.open + 0.22, s: 1.04, x: 940, y: 560, ease: "linear" as const },
  { t: T.open + 0.6, s: 3.1, x: FR.x + FR.w / 2, y: 640, ease: "in" as const },
  { t: T.open + 0.601, s: 1.32, x: 2880, y: 540 },
  { t: T.open + 1.05, s: 1.0, x: 2880, y: 540, ease: "out" as const },
  { t: T.pile - 0.05, s: 1.01, x: 2880, y: 540, ease: "linear" as const },
  { t: T.pile + 0.4, s: 1.07, x: 2800, y: 560, ease: "out" as const },
  { t: T.n30 - 0.15, s: 1.0, x: 2880, y: 540, ease: "inOut" as const },
  { t: T.treatEnd + 0.5, s: 1.05, x: 2880, y: 540, ease: "linear" as const },
];
// 30 packs on a jittered grid inside the drawer (x 2030..3130, y 200..880); the last ones heap over the rim
const PACKS = Array.from({ length: 30 }, (_, k) => {
  const r = Math.floor(k / 6), c = k % 6;
  return { x: 2110 + c * 182 + (hash(k, 1) - 0.5) * 50, y: 250 + r * 146 + (hash(k, 2) - 0.5) * 40, rot: (hash(k, 3) - 0.5) * 0.7, order: hash(k, 4) };
});
const packOrder = PACKS.map((_, k) => k).sort((a, b) => PACKS[a].order - PACKS[b].order);
const packRank = new Map(packOrder.map((k, i) => [k, i]));
function packArrive(k: number): number {
  const i = packRank.get(k)!;
  return i < 8 ? T.open + 0.66 + i * 0.05 : T.pile - 0.05 + (i - 8) * 0.025;
}
export function frzPaint(ctx: Ctx, { t }: PaintArgs) {
  // ---- panel 1: the fridge
  const open = E.out(prog(t, T.open - 0.04, 0.4));
  const { x, y, w, h, split } = FR;
  dropShadow(ctx, x, y, w, h, { r: 30, blur: 40, color: "rgba(40,30,20,0.35)", dy: 18 });
  ctx.save(); ctx.lineJoin = "round"; ctx.lineWidth = 7; ctx.strokeStyle = C.ink;
  ctx.fillStyle = "#F7F5F0"; rr(ctx, x, y, w, h, 30); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + split); ctx.lineTo(x + w, y + split); ctx.stroke();
  ctx.lineWidth = 12; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x + w - 46, y + 190); ctx.lineTo(x + w - 46, y + 330); ctx.stroke();
  ctx.restore();
  text(ctx, "冷藏", x + w / 2 - 40, y + 120, { size: 40, fam: "Sans", color: C.ink3, align: "center" });
  // drawer: the inside rises into view above the front as it slides out
  const fy = y + split + 24 + open * 70, fh = h - split - 40;
  if (open > 0.01) {
    const inTop = y + split + 20 - 210 * open, inBot = fy + 4;
    ctx.save();
    const g = ctx.createLinearGradient(0, inTop, 0, inBot); g.addColorStop(0, "#BFD7E6"); g.addColorStop(1, "#E7F1F7");
    ctx.fillStyle = g; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(x + 52, inTop); ctx.lineTo(x + w - 52, inTop); ctx.lineTo(x + w - 12, inBot); ctx.lineTo(x + 12, inBot); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (let k = 0; k < 9; k++) {
      const px = lerp(x + 80, x + w - 80, (k % 3) / 2) + (hash(k, 5) - 0.5) * 30, py = lerp(inTop + 40, inBot - 30, Math.floor(k / 3) / 2);
      icePack(ctx, px, py, 112, 54 * open, (hash(k, 6) - 0.5) * 0.6, { a: open });
    }
    ctx.restore();
  }
  ctx.save(); ctx.lineJoin = "round"; ctx.lineWidth = 7; ctx.strokeStyle = C.ink;
  const fx = x + 10 - open * 26, fw = w - 20 + open * 52;
  ctx.fillStyle = "#EEF4F8"; rr(ctx, fx, fy, fw, fh + open * 30, 22); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 12; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(fx + fw * 0.28, fy + 52); ctx.lineTo(fx + fw * 0.72, fy + 52); ctx.stroke();
  ctx.restore();
  text(ctx, "冷冻室", fx + fw / 2, fy + 190 + open * 14, { size: 62, fam: "Display", color: C.iceLine, align: "center" });
  for (let k = 0; k < 6; k++) { // frost puffs when it opens
    const fu = prog(t, T.open + 0.05 + k * 0.03, 0.7);
    if (fu <= 0 || fu >= 1) continue;
    ctx.save(); ctx.globalAlpha *= (1 - fu) * 0.75; ctx.fillStyle = "#FFFFFF";
    ctx.beginPath(); ctx.arc(x + 40 + k * 70 + (hash(k, 7) - 0.5) * 30, fy - 30 - fu * 120, 26 + fu * 46, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  // panel 1 text: the dare
  const fade1 = 1 - prog(t, T.open + 0.25, 0.25);
  if (fade1 > 0) {
    ctx.save(); ctx.globalAlpha *= fade1;
    pill(ctx, "不信？", 900, 330, t, T.dare - 0.08, { size: 54 });
    say(ctx, "现在就去打开", 900, 520, INK(96), ct("s05", "现在就去打开"), t);
    say(ctx, "你家冷冻室", 900, 690, INK(150, "Display", C.iceLine), ct("s05", "你家冷冻室"), t);
    ctx.restore();
  }

  // ---- panel 2: inside the drawer, from above
  const X = W;
  ctx.save(); ctx.lineJoin = "round";
  dropShadow(ctx, X + 70, 150, 1180, 780, { r: 40, blur: 40, color: "rgba(40,30,20,0.35)", dy: 14 });
  ctx.fillStyle = "#F4F7F9"; ctx.strokeStyle = C.ink; ctx.lineWidth = 8; rr(ctx, X + 70, 150, 1180, 780, 40); ctx.fill(); ctx.stroke();
  const g2 = ctx.createLinearGradient(0, 190, 0, 890); g2.addColorStop(0, "#C5DCEA"); g2.addColorStop(1, "#E3EEF5");
  ctx.fillStyle = g2; ctx.lineWidth = 5; rr(ctx, X + 108, 188, 1104, 704, 26); ctx.fill(); ctx.stroke();
  ctx.restore();
  for (let k = 0; k < 26; k++) { ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.arc(X + 130 + hash(k, 8) * 1060, 210 + hash(k, 9) * 660, 2 + hash(k, 10) * 3, 0, Math.PI * 2); ctx.fill(); }
  const flipT = (k: number) => T.is30 + 0.05 + ((PACKS[k].x - 2110) / 910) * 0.55;
  PACKS.forEach((p, k) => {
    const ta = packArrive(k), u = prog(t, ta, 0.32);
    if (u <= 0) return;
    const dy = (1 - E.out(u)) * -520, bounce = Math.sin(clamp(u) * Math.PI) * 0.06;
    const ft = flipT(k), f = prog(t, ft, 0.28);
    const glow = t >= T.n30 - 0.1 && t < T.is30 ? Math.max(0, 1 - Math.abs(t - (T.n30 + packRank.get(k)! * 0.016)) / 0.12) * 0.6 : 0;
    if (f < 0.5) icePack(ctx, p.x, p.y + dy, 168, 112, p.rot + bounce, { a: clamp(u * 4), sx: f > 0 ? 1 - f * 2 : 1, glow });
    else cake(ctx, p.x, p.y, 0.95 * (0.3 + 0.7 * E.back((f - 0.5) * 2)) * Math.min(1, (f - 0.5) * 3), 1);
  });
}
export function frzHud(ctx: Ctx, { t }: PaintArgs) {
  if (t < T.open + 0.6) return;
  // right column: where the ice packs come from
  const leave = E.inOut(prog(t, T.n30 - 0.35, 0.3));
  if (leave < 1) {
    ctx.save(); ctx.globalAlpha *= 1 - leave;
    const c1 = popS(t, T.buy - 0.1, 0.32), c2 = popS(t, T.sweet - 0.08, 0.32);
    glass(ctx, 1520, 120, 360, 640, Math.max(c1.a, c2.a) * 0.92, 28, "rgba(251,248,241,0.96)");
    cake(ctx, 1700, 260, 1.5 * c1.s, c1.a);
    text(ctx, "买蛋糕", 1700, 400, { ...INK(56), align: "center", alpha: c1.a });
    pudding(ctx, 1700, 545, 1.25 * c2.s, c2.a);
    text(ctx, "买甜点", 1700, 690, { ...INK(56), align: "center", alpha: c2.a });
    const gu = prog(t, T.gift - 0.1, 0.4);
    if (gu > 0) {
      arrow(ctx, 1560, 470, 1290, 560, gu, { color: C.red, width: 10, head: 30, bend: 0.22 });
      text(ctx, "送", 1420, 470, { ...INK(84, "Display", C.red), alpha: clamp(gu * 3), align: "center" });
    }
    const pu = prog(t, T.pile - 0.05, 0.3);
    if (pu > 0) say(ctx, "一大堆？", 1530, 880, INK(96, "Display", C.red), ct("s06", "一大堆"), t, 0.15);
    ctx.restore();
  }
  // the count, then what the count really is
  const cu = prog(t, T.n30 - 0.25, 0.3);
  if (cu > 0) {
    glass(ctx, 1470, 170, 420, 720, clamp(cu * 2) * 0.94, 30, "rgba(251,248,241,0.97)");
    const n = Math.round(countUp(t, T.n30 - 0.12, 0.55, 0, 30));
    text(ctx, String(n), 1680, 440, { size: 240, fam: "Num", color: t >= T.times30 ? C.red : C.iceLine, bold: 5, alpha: clamp(cu * 3), align: "center" });
    const unitA = 1 - prog(t, T.times30 - 0.2, 0.15);
    if (unitA > 0) text(ctx, "个冰袋", 1680, 560, { ...INK(84, "Display", C.iceLine), alpha: clamp(cu * 3) * unitA, align: "center" });
    if (t >= T.times30 - 0.1) popText(ctx, "次", 1680, 570, { ...INK(110, "Display", C.red), align: "center" }, t, T.times30 + 0.12);
    const tu = prog(t, T.treat - 0.1, 0.3);
    if (tu > 0) {
      marker(ctx, 1500, 660, 360, 80, prog(t, T.treat, 0.5));
      say(ctx, "“犒劳自己”", 1680, 688, { ...INK(64), align: "center" }, [T.treat - 0.02, ...ct("s07", "犒劳自己"), T.treatEnd], t, 0.12);
    }
    const nu = prog(t, T.treatEnd + 0.1, 0.35);
    if (nu > 0) { text(ctx, "每个冰袋背后，", 1680, 790, { ...INK(36, "Sans", C.ink2), align: "center", alpha: nu }); text(ctx, "都是一次买甜点", 1680, 842, { ...INK(36, "Sans", C.ink2), align: "center", alpha: nu }); }
  }
}

// ================= TEST 2 · THE WARDROBE =================
export function closetPaint(ctx: Ctx, { t }: PaintArgs) {
  if (t >= T.wardrobe - 0.1) ring(ctx, 1010, 560, 260, 470, prog(t, T.wardrobe - 0.05, 0.45), { width: 13, rot: 0.03 });
}
export function closetHud(ctx: Ctx, { t }: PaintArgs) {
  leftShade(ctx, 0.62, 0.5);
  pill(ctx, "再拉开", 112, 380, t, T.closet + 0.05, { size: 52, bg: "#fff", fg: C.ink });
  say(ctx, "衣柜", 112, 620, WT(220), ct("s08", "衣柜"), t);
}
const RAIL = { x0: 200, x1: 1130, y: 236 };
const PANTS = [{ x: 420, t: () => T.style - 0.06 }, { x: 670, t: () => T.pantsW - 0.12 }, { x: 920, t: () => T.three - 0.12 }];
export function pantsPaint(ctx: Ctx, { t }: PaintArgs) {
  // rail with wall brackets
  inkPath(ctx, [[RAIL.x0, RAIL.y], [RAIL.x1, RAIL.y]], E.out(prog(t, T.closet + 1.0, 0.35)), { width: 12, color: "#6B6862", seed: 3, wobble: 0.3 });
  for (const bx of [RAIL.x0 + 20, RAIL.x1 - 20]) inkPath(ctx, [[bx, RAIL.y - 70], [bx, RAIL.y]], prog(t, T.closet + 1.0, 0.3), { width: 10, color: "#6B6862", seed: 4 });
  say(ctx, "款式差不多的黑裤子", 200, 140, INK(76), ct("s08", "款式差不多的黑裤子"), t);
  const fog = E.inOut(prog(t, T.forget - 0.1, 0.5));
  PANTS.forEach((p, k) => {
    const u = prog(t, p.t(), 0.4);
    if (u <= 0) return;
    const sw = Math.exp(-(t - p.t()) * 3.2) * Math.sin((t - p.t()) * 11) * 0.12;
    pants(ctx, p.x + (1 - E.out(u)) * 900, RAIL.y, 1.06, { a: clamp(u * 3), rot: sw * (u >= 1 ? 1 : 0.4), fog });
    const qu = prog(t, T.forget - 0.25 + k * 0.17, 0.3);
    if (qu > 0) {
      ctx.save(); ctx.globalAlpha *= clamp(qu * 3); ctx.translate(p.x + 10, 520 + Math.sin(t * 5 + k) * 8); const s = 0.5 + 0.5 * E.back(qu); ctx.scale(s, s);
      ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(0, 0, 62, 0, Math.PI * 2); ctx.fill();
      text(ctx, "?", 0, 34, { size: 100, fam: "Num", color: "#fff", align: "center", bold: 3 }); ctx.restore();
    }
  });
  // the count, then her rule
  const cu = popS(t, T.three - 0.05, 0.3);
  if (cu.u > 0) {
    ctx.save(); ctx.globalAlpha *= cu.a; ctx.translate(1290, 400); ctx.scale(cu.s, cu.s);
    text(ctx, "×3", 0, 0, { size: 220, fam: "Num", color: C.red, bold: 5 });
    text(ctx, "？", 290, -6, { ...INK(150, "Display", C.red), alpha: prog(t, T.three + 0.25, 0.25) });
    ctx.restore();
  }
  const qa = E.out(prog(t, T.she - 0.15, 0.4));
  if (qa > 0) card(ctx, 1190, 470, 650, 420, { rot: 0.018, a: clamp(qa * 2), s: 0.9 + 0.1 * qa, fill: "#FFFDF5" }, () => {
    text(ctx, "黑田尚子在书里写：", 44, 70, INK(36, "Sans", C.ink3));
    text(ctx, "「黒いパンツが3本以上ある人は要注意」", 44, 128, { size: 29, fam: "JP", color: C.ink2, mixNum: false });
    rule(ctx, 44, 162, 606, prog(t, T.she + 0.25, 0.3));
    say(ctx, "黑裤子3条以上，", 44, 260, INK(70), [T.over3 - 0.3, T.over3 - 0.2, T.over3 - 0.1, ...ct("s09", "3条以上"), T.over3 + 0.6], t, 0.1);
    say(ctx, "就要当心！", 44, 360, INK(84, "Display", C.red), [...ct("s09", "就要当心"), T.careEnd], t, 0.1);
  });
  stamp(ctx, "要当心", 670, 390, t, T.careEnd + 0.04, { size: 110, rot: -0.12 });
}

// ================= THE MECHANISM =================
export function samePaint(ctx: Ctx, { t }: PaintArgs) {
  const L = popS(t, T.tidy - 0.12, 0.35), R = popS(t, T.save - 0.12, 0.35);
  const lean = Math.sin(t * 2.2) * 0.012;
  if (L.u > 0) card(ctx, 250, 150, 560, 520, { a: L.a, s: L.s, rot: -0.03 + lean }, () => {
    tidyBox(ctx, 280, 200, 1.5);
    say(ctx, "整理房间", 280, 430, { ...INK(100), align: "center" }, ct("s10", "整理房间"), t);
  });
  if (R.u > 0) card(ctx, 1110, 150, 560, 520, { a: R.a, s: R.s, rot: 0.03 - lean }, () => {
    piggy(ctx, 290, 190, 1.3, "#7FA7D9");
    say(ctx, "攒钱", 280, 430, { ...INK(100, "Display", C.blue), align: "center" }, ct("s10", "攒钱"), t);
  });
  const eu = prog(t, T.essence - 0.05, 0.3);
  if (eu > 0) {
    inkPath(ctx, [[905, 380], [1015, 380]], E.out(eu), { width: 16, seed: 8 });
    inkPath(ctx, [[905, 440], [1015, 440]], E.out(prog(t, T.essence + 0.08, 0.3)), { width: 16, seed: 9 });
  }
  const bu = prog(t, T.one - 0.15, 0.3);
  if (bu > 0) {
    const s = "本质上是同一件事", w = measure(ctx, s, { size: 104, fam: "Display" });
    marker(ctx, 960 - w / 2 + measure(ctx, "本质上是", { size: 104, fam: "Display" }) - 10, 790, measure(ctx, "同一件事", { size: 104, fam: "Display" }) + 20, 100, prog(t, T.one, 0.45));
    say(ctx, s, 960 - w / 2, 826, INK(104), ct("s10", "本质上是同一件事"), t);
  }
}
const NEED = [{ k: "bowl", label: "吃饭" }, { k: "umbrella", label: "一把伞" }, { k: "pants", label: "一条裤子" }];
const WANT = [{ k: "cake", label: "又一块蛋糕" }, { k: "bag", label: "打折囤货" }, { k: "pants3", label: "第3条黑裤子" }];
function nwItem(ctx: Ctx, k: string, cx: number, cy: number, s: number) {
  if (k === "bowl") icon(ctx, "bowl", cx, cy, 1.5 * s, { color: C.blue });
  else if (k === "umbrella") umbrella(ctx, cx, cy, 0.95 * s, "#7FA7D9");
  else if (k === "pants") pants(ctx, cx, cy - 70 * s, 0.3 * s);
  else if (k === "cake") cake(ctx, cx, cy, 0.95 * s);
  else if (k === "bag") shopBag(ctx, cx, cy, 0.85 * s, C.red);
  else if (k === "pants3") { for (let j = 0; j < 3; j++) pants(ctx, cx - 34 + j * 34, cy - 70 * s, 0.26 * s, { rot: (j - 1) * 0.1 }); }
}
export function nwPaint(ctx: Ctx, { t }: PaintArgs) {
  inkPath(ctx, [[960, 130], [960, 930]], E.out(prog(t, T.split - 0.05, 0.4)), { width: 5, color: C.ink3, seed: 6 });
  const bins = [{ x: 480, col: C.blue, t0: T.need, list: NEED, head: "需要", gloss: "没它，日子过不下去" }, { x: 1440, col: C.red, t0: T.want, list: WANT, head: "想要", gloss: "没它，也一样过" }];
  bins.forEach((b, bi) => {
    const hu = popS(t, b.t0 - 0.1, 0.32);
    basket(ctx, b.x, 735, 680, 300, b.col, clamp(prog(t, T.split - 0.05 + bi * 0.1, 0.3) * 3));
    if (hu.u > 0) {
      ctx.save(); ctx.globalAlpha *= hu.a; ctx.translate(b.x, 250); ctx.scale(hu.s, hu.s);
      text(ctx, b.head, 0, 0, { ...INK(150, "Display", b.col), align: "center" }); ctx.restore();
      text(ctx, b.gloss, b.x, 345, { ...INK(46, "Sans", C.ink2), align: "center", alpha: prog(t, b.t0 + 0.25, 0.3) });
    }
    b.list.forEach((it, k) => {
      const t0 = b.t0 + 0.02 + k * 0.13, u = prog(t, t0, 0.42);
      if (u <= 0) return;
      const ix = b.x + (k - 1) * 200, iy = lerp(330, 660, E.out(u)) - Math.sin(clamp(u) * Math.PI) * 30;
      ctx.save(); ctx.globalAlpha *= clamp(u * 4); nwItem(ctx, it.k, ix, iy, 1.35); ctx.restore();
    });
  });
}
const RECEIPT = [
  { s: "甜点（送的冰袋）", n: "×30" }, { s: "差不多的黑裤子", n: "×3" }, { s: "打折囤的日用品", n: "" }, { s: "顺手买的小玩意", n: "" }, { s: "……", n: "" },
];
export function billPaint(ctx: Ctx, { t }: PaintArgs) {
  // left: the room as a photo, with price tags on the clutter
  const pu = prog(t, T.bill + 0.02, 0.3);
  if (pu > 0) photo(ctx, still(25.6, 900), 560, 450, 820, -0.025, { a: clamp(pu * 3), s: lerp(1.15, 1, E.out(pu)) });
  const TAGS = [[860, 470], [610, 620], [930, 300], [330, 560]] as const;
  TAGS.forEach(([tx, ty], k) => {
    const u = popS(t, T.junk + k * 0.1, 0.3);
    if (u.u <= 0) return;
    ctx.save(); ctx.globalAlpha *= u.a; ctx.translate(tx, ty); ctx.rotate(-0.25 + k * 0.17); ctx.scale(u.s, u.s);
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.moveTo(-36, -26); ctx.lineTo(34, -26); ctx.lineTo(56, 0); ctx.lineTo(34, 26); ctx.lineTo(-36, 26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(38, 0, 6, 0, Math.PI * 2); ctx.fill();
    text(ctx, "¥", -2, 17, { size: 44, fam: "Num", color: "#fff", align: "center", bold: 2 });
    ctx.restore();
  });
  say(ctx, "没用的杂物", 560, 840, { ...INK(80), align: "center" }, ct("s12", "没用的杂物"), t);
  // right: the bill prints, a line per pile
  const ru = prog(t, T.junk + 0.2, 0.3);
  if (ru <= 0) return;
  const rx = 1110, ry = 80, rw = 690, lineH = 96;
  const shown = clamp((t - (T.billW + 0.1)) / (T.spend - 0.1 - (T.billW + 0.1))) * RECEIPT.length;
  const hgt = 210 + Math.min(RECEIPT.length, Math.ceil(shown)) * lineH + (t >= T.spend - 0.1 ? 150 : 0);
  ctx.save(); ctx.globalAlpha *= clamp(ru * 3);
  dropShadow(ctx, rx, ry, rw, hgt, { r: 2, blur: 26, color: "rgba(40,30,20,0.35)", dy: 10 });
  ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + rw, ry); ctx.lineTo(rx + rw, ry + hgt);
  for (let k = 0; k <= 20; k++) ctx.lineTo(rx + rw - (rw * k) / 20, ry + hgt + (k % 2 ? 14 : 0));
  ctx.closePath(); ctx.fill();
  text(ctx, "账单", rx + rw / 2, ry + 100, { ...INK(76), align: "center" }, (i) => { const u = prog(t, Math.min(T.billW, T.junk + 0.35) - 0.1 + i * 0.06, 0.24); return u <= 0 ? null : { a: clamp(u * 2.4), s: 0.55 + 0.45 * E.back(u) }; });
  ctx.save(); ctx.setLineDash([8, 8]); ctx.strokeStyle = C.ink3; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(rx + 40, ry + 150); ctx.lineTo(rx + rw - 40, ry + 150); ctx.stroke(); ctx.restore();
  RECEIPT.forEach((r, k) => {
    const a = clamp((shown - k) * 2.5);
    if (a <= 0) return;
    const yy = ry + 230 + k * lineH;
    text(ctx, r.s, rx + 44, yy, { size: 48, fam: "Sans", color: C.ink, alpha: a });
    if (r.n) text(ctx, r.n, rx + rw - 44, yy, { size: 54, fam: "Num", color: C.red, align: "right", alpha: a, bold: 1 });
  });
  if (t >= T.spend - 0.1) {
    const yy = ry + 230 + RECEIPT.length * lineH + 40;
    ctx.save(); ctx.setLineDash([8, 8]); ctx.strokeStyle = C.ink3; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(rx + 40, yy - 70); ctx.lineTo(rx + rw - 40, yy - 70); ctx.stroke(); ctx.restore();
    say(ctx, "没用的开支", rx + 44, yy + 20, INK(84, "Display", C.red), ct("s12", "没用的开支"), t);
    if (t >= T.spendEnd - 0.05) ring(ctx, rx + 250, yy - 8, 270, 78, prog(t, T.spendEnd - 0.02, 0.35), { width: 10 });
  }
  ctx.restore();
  // dotted links from the tags to the bill
  const lu = prog(t, T.billW + 0.05, 0.6);
  if (lu > 0) TAGS.slice(0, 2).forEach(([tx, ty], k) => {
    ctx.save(); ctx.setLineDash([10, 10]); ctx.strokeStyle = "rgba(217,56,43,0.75)"; ctx.lineWidth = 4;
    const ex = rx + 30, ey = ry + 216 + k * lineH, u = E.out(clamp(lu * 1.3 - k * 0.2));
    ctx.beginPath(); ctx.moveTo(tx + 50, ty); ctx.lineTo(lerp(tx + 50, ex, u), lerp(ty, ey, u)); ctx.stroke(); ctx.restore();
  });
}
// coins: small amounts every month, stacked; a year of them adds up to one tall bar
const MONTH = Array.from({ length: 12 }, (_, k) => 4 + Math.floor(hash(k, 21) * 5));
export function leakPaint(ctx: Ctx, { t }: PaintArgs) {
  say(ctx, "不起眼的小钱", 140, 210, INK(100), ct("s13", "不起眼的小钱"), t);
  const base = 830, x0 = 170, dx = 92;
  inkPath(ctx, [[120, base + 8], [1800, base + 8]], E.out(prog(t, T.leak + 0.05, 0.4)), { width: 5, color: C.ink2, seed: 14 });
  // month 1 fills coin by coin while "小钱" is said; the rest sweep in with "一年下来"
  for (let m = 0; m < 12; m++) {
    const mt = m === 0 ? T.small - 0.5 : T.year + (m - 1) * 0.065;
    const lu = prog(t, mt, 0.25);
    if (lu > 0) text(ctx, `${m + 1}月`, x0 + m * dx, base + 56, { size: 28, fam: "Sans", color: C.ink3, align: "center", alpha: clamp(lu * 3) });
    for (let c = 0; c < MONTH[m]; c++) {
      const ct0 = mt + c * (m === 0 ? 0.13 : 0.03), u = prog(t, ct0, 0.22);
      if (u <= 0) continue;
      const y = lerp(base - 420, base - 10 - c * 15, E.out(u) ** 0.7);
      coinFlat(ctx, x0 + m * dx, y, 32);
    }
  }
  // the year's total as one bar
  const bx = 1440, bw = 300, maxH = 620, yu = prog(t, T.year + 0.1, 0.9);
  if (yu > 0) {
    const hgt = maxH * E.out(yu);
    ctx.save(); ctx.fillStyle = C.red; rr(ctx, bx, base - hgt, bw, hgt, 10); ctx.fill(); ctx.restore();
    text(ctx, "一年", bx + bw / 2, base + 56, { ...INK(44, "Sans", C.ink2), align: "center", alpha: clamp(yu * 3) });
    arrow(ctx, 1260, base - 300, 1410, base - 380, prog(t, T.year + 0.4, 0.4), { color: C.ink2, width: 6, bend: -0.2 });
  }
  const ku = prog(t, T.k - 0.1, 0.3);
  if (ku > 0) say(ctx, "好几千", bx + bw / 2, base - maxH - 40, { ...INK(130, "Display", C.red), align: "center" }, ct("s13", "好几千"), t);
}

// ================= THE FIX =================
export function stepPaint(ctx: Ctx, { t }: PaintArgs) {
  say(ctx, "想攒钱，", 160, 250, INK(110), ct("s14", "想攒钱"), t);
  const cu = E.out(prog(t, T.first - 0.15, 0.4));
  if (cu <= 0) return;
  card(ctx, 360, 340, 1200, 470, { a: clamp(cu * 2), s: 0.9 + 0.1 * cu, rot: -0.01 }, () => {
    ctx.save(); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(150, 235, 104, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    text(ctx, "1", 150, 300, { size: 180, fam: "Num", color: "#fff", align: "center", bold: 4 });
    say(ctx, "第一步", 310, 120, INK(56, "Sans", C.ink3), ct("s14", "第一步"), t);
    say(ctx, "不是", 310 + measure(ctx, "第一步", { size: 56, fam: "Sans" }) + 24, 120, INK(56, "Sans", C.red), ct("s14", "不是"), t);
    say(ctx, "急着省钱", 300, 360, INK(170), ct("s14", "急着省钱"), t);
    const sw = measure(ctx, "急着省钱", { size: 170, fam: "Display" });
    strike(ctx, 290, 302, 310 + sw, 296, prog(t, T.rush + 0.22, 0.22), { width: 18 });
  });
}
export function kitchenHud(ctx: Ctx, { t }: PaintArgs) {
  leftShade(ctx, 0.55, 0.62);
  const before = 1 - prog(t, T.tidyFirst - 0.05, 0.2), after = prog(t, T.tidyFirst + 0.35, 0.25);
  if (before > 0) pill(ctx, "整理前", 112, 120, t, T.but - 0.05, { size: 40, bg: "rgba(0,0,0,0.6)", a: before });
  if (after > 0) pill(ctx, "整理后", 112, 120, t, T.tidyFirst + 0.35, { size: 40, bg: C.blue });
  say(ctx, "而是", 112, 330, WT(80, "Sans"), ct("s14", "而是"), t);
  say(ctx, "先整理房间", 112, 520, WT(170), ct("s14", "先整理房间"), t);
  const cu = popS(t, T.tidyEnd + 0.02, 0.3);
  if (cu.u > 0) { ctx.save(); ctx.globalAlpha *= cu.a; ctx.translate(112 + measure(ctx, "先整理房间", { size: 170, fam: "Display" }) + 90, 460); ctx.scale(cu.s, cu.s);
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(0, 0, 72, 0, Math.PI * 2); ctx.fill(); icon(ctx, "check", 0, 4, 1.25, { color: "#fff", width: 6 }); ctx.restore(); }
}
export function crewPaint(ctx: Ctx, { t }: PaintArgs) {
  callout(ctx, "用不上", 330, 250, 190, 420, t, T.junk2 - 0.05, { size: 38, bg: C.red, fg: "#fff" });
  callout(ctx, "用不上", 1010, 760, 870, 600, t, T.junk2 + 0.12, { size: 38, bg: C.red, fg: "#fff" });
}
export function crewHud(ctx: Ctx, { t }: PaintArgs) {
  const u = prog(t, T.out - 0.12, 0.3);
  if (u <= 0) return;
  glass(ctx, 1170, 330, 650, 250, clamp(u * 3) * 0.85, 30, "rgba(10,10,10,0.6)");
  say(ctx, "清出去", 1220, 505, WT(150), ct("s15", "清出去"), t);
  const au = prog(t, T.out + 0.15, 0.35);
  if (au > 0) arrow(ctx, 1640, 455, 1640 + 150 * E.out(au), 455, 1, { color: "#fff", width: 14, head: 34 });
}
const DRAWER_TAGS = [
  { label: "湿巾", x: 1010, y: 150, tx: 900, ty: 62 },
  { label: "环保袋", x: 1000, y: 330, tx: 905, ty: 240 },
  { label: "红包 · 信封", x: 1010, y: 760, tx: 900, ty: 725 },
];
export function drawersPaint(ctx: Ctx, { t }: PaintArgs) {
  DRAWER_TAGS.forEach((d, k) => callout(ctx, d.label, d.x, d.y, d.tx, d.ty, t, T.sort + 0.12 + k * 0.16, { size: 36, bg: C.blue, fg: "#fff" }));
}
export function drawersHud(ctx: Ctx, { t }: PaintArgs) {
  const u = prog(t, T.sort + 0.05, 0.3);
  if (u <= 0) return;
  glass(ctx, 70, 760, 700, 150, clamp(u * 3) * 0.8, 26, "rgba(10,10,10,0.62)");
  say(ctx, "真正需要什么", 110, 865, WT(92), ct("s15", "真正需要什么"), t);
  text(ctx, "每样东西放哪，一清二楚", 110, 720, { ...WT(44, "Sans"), alpha: prog(t, T.real + 0.25, 0.3) });
}
export function calmHud(ctx: Ctx, { t }: PaintArgs) {
  leftShade(ctx, 0.6, 0.62);
  say(ctx, "自然就", 112, 400, WT(80, "Sans"), ct("s16", "自然就"), t);
  say(ctx, "不会乱花钱", 112, 600, WT(176), ct("s16", "不会乱花钱"), t);
  const cu = popS(t, T.noSpend + 0.55, 0.3);
  if (cu.u > 0) { ctx.save(); ctx.globalAlpha *= cu.a; ctx.translate(200, 750); ctx.scale(cu.s, cu.s);
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(0, 0, 58, 0, Math.PI * 2); ctx.fill(); icon(ctx, "check", 0, 4, 1.0, { color: "#fff", width: 6 }); ctx.restore();
    text(ctx, "钱，留得住了", 290, 770, { ...WT(64), alpha: cu.a }); }
}

// ================= CALL TO ACTION =================
const NOTES = ["冰袋测试：小钱漏在哪", "黑裤子：3条以上就要当心", "分清“需要”和“想要”", "先整理房间，再谈省钱"];
export function ctaPaint(ctx: Ctx, { t }: PaintArgs) {
  // the book (Japanese original), the notes, then the comment box
  const bu = E.out(prog(t, T.cta - 0.1, 0.45));
  if (bu > 0) {
    ctx.save(); ctx.translate(430, 470); ctx.rotate(-0.04); const s = 0.85 + 0.15 * bu; ctx.scale(s, s); ctx.globalAlpha *= clamp(bu * 2);
    dropShadow(ctx, -230, -320, 460, 640, { r: 6, blur: 34, color: "rgba(40,30,20,0.45)", dy: 14 });
    ctx.fillStyle = "#F4EFE2"; rr(ctx, -230, -320, 460, 640, 6); ctx.fill();
    ctx.fillStyle = "#2F5D8C"; ctx.fillRect(-230, 150, 460, 70);
    ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(-230, -320, 18, 640);
    text(ctx, "お金が貯まる人は、", -190, -200, { size: 44, fam: "JP", color: C.ink, mixNum: false });
    text(ctx, "なぜ部屋が", -190, -130, { size: 58, fam: "JP", color: C.ink, mixNum: false });
    text(ctx, "きれいなのか", -190, -60, { size: 58, fam: "JP", color: C.red, mixNum: false });
    text(ctx, "「自然に貯まる人」がやっている50の行動", -190, 10, { size: 21, fam: "JP", color: C.ink2, mixNum: false });
    text(ctx, "黒田尚子", -190, 120, { size: 40, fam: "JP", color: C.ink, mixNum: false });
    text(ctx, "日本経済新聞出版", 0, 196, { size: 26, fam: "JP", color: "#fff", align: "center", mixNum: false });
    ctx.restore();
    text(ctx, "书名直译：存得下钱的人，为什么房间都很干净？", 430, 880, { size: 30, fam: "Sans", color: C.ink3, align: "center", alpha: prog(t, T.book + 0.4, 0.4) });
  }
  const nu = E.out(prog(t, T.notes - 0.2, 0.4));
  if (nu > 0) card(ctx, 790, 130, 980, 600, { a: clamp(nu * 2), s: 0.92 + 0.08 * nu, rot: 0.012, fill: "#FFFDF5" }, () => {
    say(ctx, "核心笔记", 56, 104, INK(80), ct("s17", "核心笔记"), t);
    pill(ctx, "已整理", 410, 74, t, T.done + 0.1, { size: 32, bg: C.blue });
    rule(ctx, 56, 150, 924, prog(t, T.notes + 0.2, 0.3));
    for (let y = 230; y < 580; y += 100) rule(ctx, 56, y + 30, 924, 1, "rgba(26,26,26,0.08)", 2);
    NOTES.forEach((s, k) => {
      const t0 = T.notes + 0.45 + k * 0.28, a = prog(t, t0, 0.25);
      if (a <= 0) return;
      icon(ctx, "check", 90, 230 + k * 100 - 16, 0.75, { color: C.blue, a, width: 6 });
      text(ctx, s, 140, 230 + k * 100, { size: 46, fam: "Sans", color: C.ink, alpha: a });
    });
  });
}
export function ctaHud(ctx: Ctx, { t }: PaintArgs) {
  const bu = E.out(prog(t, T.box - 0.3, 0.45));
  if (bu <= 0) return;
  const bw = 1000, bh = 120, bx = 840, by = 790 + (1 - bu) * 120;
  ctx.save(); ctx.globalAlpha *= clamp(bu * 2);
  dropShadow(ctx, bx, by, bw, bh, { r: 60, blur: 30, color: "rgba(0,0,0,0.45)", dy: 6 });
  ctx.fillStyle = "#fff"; rr(ctx, bx, by, bw, bh, 60); ctx.fill();
  ctx.strokeStyle = "rgba(26,26,26,0.15)"; ctx.lineWidth = 3; rr(ctx, bx, by, bw, bh, 60); ctx.stroke();
  icon(ctx, "bubble", bx + 74, by + 58, 0.75, { color: C.ink3 });
  const typed = t < T.kou ? "" : "整理".slice(0, Math.min(2, 1 + Math.floor((t - T.kou) / 0.16)));
  text(ctx, typed || "评论区扣……", bx + 140, by + 78, { size: 52, fam: "Sans", color: typed ? C.ink : C.ink3 });
  if (typed && Math.floor(t * 2.2) % 2 === 0) { ctx.fillStyle = C.ink; ctx.fillRect(bx + 140 + measure(ctx, typed, { size: 52, fam: "Sans" }) + 6, by + 30, 4, 60); }
  const ready = typed.length === 2, sent = t >= T.kou + 0.45;
  const sp = sent ? 1 + 0.1 * Math.max(0, Math.sin((t - T.kou - 0.45) * 12)) * Math.exp(-(t - T.kou - 0.45) * 3) : 1;
  ctx.save(); ctx.translate(bx + bw - 110, by + bh / 2); ctx.scale(sp, sp);
  ctx.fillStyle = ready ? C.red : "rgba(26,26,26,0.15)"; rr(ctx, -80, -38, 160, 76, 38); ctx.fill();
  text(ctx, sent ? "已发送" : "发送", 0, 15, { size: 36, fam: "Sans", color: ready ? "#fff" : C.ink3, align: "center" }); ctx.restore();
  ctx.restore();
}
export function endHud(ctx: Ctx, { t }: PaintArgs) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(0,0,0,0.25)"); g.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const out = E.inOut(prog(t, T.detour - 0.3, 0.3));
  if (out < 1) {
    ctx.save(); ctx.globalAlpha *= 1 - out; ctx.translate(0, -120 * out);
    const c = (s: string, size: number) => W / 2 - measure(ctx, s, { size, fam: "Display" }) / 2;
    say(ctx, "真心建议", c("真心建议", 76), 330, WT(76), ct("s18", "真心建议"), t);
    const mw = measure(ctx, "每个月光族", { size: 170, fam: "Display" });
    marker(ctx, W / 2 - mw / 2 + measure(ctx, "每个", { size: 170, fam: "Display" }) - 6, 466, mw - measure(ctx, "每个", { size: 170, fam: "Display" }) + 12, 120, prog(t, T.moon, 0.45), C.marker, 0.55);
    say(ctx, "每个月光族", W / 2 - mw / 2, 530, WT(170), ct("s18", "每个月光族"), t);
    say(ctx, "都去读一读", c("都去读一读", 96), 680, WT(96), ct("s18", "都去读一读"), t);
    ctx.restore();
  }
  say(ctx, "少走10年弯路", W / 2 - measure(ctx, "少走10年弯路", { size: 170, fam: "Display" }) / 2, 560, WT(170), ct("s18", "少走10年弯路"), t);
  const ca = prog(t, T.detour + 1.0, 0.5);
  if (ca > 0) text(ctx, "参考：黑田尚子《お金が貯まる人は、なぜ部屋がきれいなのか》（日本经济新闻出版，2022）", W / 2, 680, { size: 30, fam: "Sans", color: "rgba(255,255,255,0.88)", align: "center", alpha: ca, shadow: SH });
}
/** Small source chip (top right) while her two tests are on screen. */
export function credit(ctx: Ctx, t: number) {
  const a = fadeWin(t, T.frz + 0.6, T.same, 0.4, 0.3);
  if (a <= 0) return;
  const s = "例子出自：黑田尚子《お金が貯まる人は、なぜ部屋がきれいなのか》", w = measure(ctx, s, { size: 22, fam: "Sans" });
  glass(ctx, W - 36 - w - 30, 26, w + 30, 44, a * 0.8, 22, "rgba(20,20,20,0.5)");
  text(ctx, s, W - 36 - 15, 56, { size: 22, fam: "Sans", color: "rgba(255,255,255,0.92)", align: "right", alpha: a });
}
