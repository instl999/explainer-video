// Scene painters for 《拼命赚钱却越活越穷》. Every beat is keyed to a spoken phrase through A(line, phrase), so the picture
// follows the voice. Look: footage annotated in white (tags, rings, stamps); the sums and the mechanism are worked on warm
// paper in ink; red = debt / time sold, blue = money kept / time that is yours.
import type { Canvas } from "@napi-rs/canvas";
import { createCanvas } from "@napi-rs/canvas";
import { A, C, E, H, LEAD, W, alignment, charTimes, clamp, hash, lerp, prog } from "./common.ts";
import { arrow, card, countUp, dropShadow, fmtInt, glass, icon, inkPath, marker, measure, popText, ring, rr, stamp, strike, text, type Ctx, type TextOpt } from "./draw.ts";
import type { PaintArgs } from "./model.ts";

/** Cut point between two lines: the middle of the pause before `id`. */
export function gapMid(id: string): number {
  const i = alignment.lines.findIndex((l) => l.id === id);
  if (i < 0) throw new Error(`no line ${id}`);
  return i === 0 ? 0 : LEAD + (alignment.lines[i - 1].end + alignment.lines[i].start) / 2;
}
/** Cut before line `id`: just ahead of its first word, so the previous shot keeps the whole pause for its payoff. */
export const cutAt = (id: string) => Math.max(gapMid(id), A(id) - 0.12);

// ---------- the sums (shown on screen with their assumptions) ----------
export const LOAN = 1_000_000, YEARS = 30, RATE = 0.03, SALARY = 8000;
const r = RATE / 12, n = YEARS * 12;
export const PAYMENT = (LOAN * r) / (1 - (1 + r) ** -n);           // ≈ 4216
export const INTEREST = PAYMENT * n - LOAN;                        // ≈ 51.8万
export const SHARE = PAYMENT / SALARY;                             // ≈ 52.7 %
export const BANK_HOURS = 8 * SHARE;                               // ≈ 4.2 h of an 8-hour day
export const LEFT_100 = 100 / 1.02 ** 10;                          // ≈ 82
export const CAR_MONTHS = 200_000 / SALARY;                        // 25

// ---------- anchors ----------
export const T = {
  // hook: the workday
  day: A("s00", "每天上班"), h8: A("s00", "8小时"), h4: A("s00", "4个多小时"), h4End: A("s00", "4个多小时", { end: true }), you: A("s00", "你可能"),
  bank: A("s00", "替银行打工"), bankEnd: A("s00", "替银行打工", { end: true }),
  cut1: A("s00", "有") - 0.05, cut2: A("s00", "你可能") - 0.08,
  // the sum
  sum: cutAt("s01"), calc: A("s01", "算笔账"), wage: A("s01", "月薪8000"), loan: A("s01", "贷款100万"), house: A("s01", "买房"), y30: A("s01", "30年"),
  pay: A("s02") - 0.12, monthly: A("s02", "4200多"), monthlyEnd: A("s02", "4200多", { end: true }), half: A("s02", "工资一大半"), flow: A("s02", "流走了"),
  // the treadmill
  many: cutAt("s03"), grind: A("s03", "拼命赚钱"), car: A("s03", "买车"), buyHouse: A("s03", "买房"), debt: A("s03", "背贷款"),
  bound: cutAt("s04"), debtW: A("s04", "债务"), tied: A("s04", "捆住"), only: A("s04", "只能继续"), sell: A("s04", "出卖时间"), sellEnd: A("s04", "出卖时间", { end: true }),
  loop: cutAt("s05"), incUp: A("s05", "收入越涨"), loanUp: A("s05", "贷款越大"), wheel: A("s05", "轮子"), faster: A("s05", "转得越快"), noStop: A("s05", "不敢停"),
  rat: cutAt("s06"), book: A("s06", "富爸爸穷爸爸"), race: A("s06", "老鼠赛跑"), raceEnd: A("s06", "老鼠赛跑", { end: true }),
  // what freedom is
  free: cutAt("s07"), freeW: A("s07", "财富自由"), notCash: A("s07", "不是"), cash: A("s07", "花不完的现金"), cashEnd: A("s07", "花不完的现金", { end: true }),
  labor: A("s08") - 0.1, noForce: A("s08", "不用被迫"), work: A("s08", "靠劳动换取收入"),
  chart: cutAt("s09"), passive: A("s09", "不上班的收入"), cover: A("s09", "盖住"), costs: A("s09", "每个月的开销"),
  // money vs time
  print: cutAt("s10"), worth: A("s10", "钱本身其实不值钱"), infl: A("s10", "按") - 0.1, pct: A("s10", "2%"), note100: A("s10", "100块"), y10: A("s10", "放10年"), left82: A("s10", "82块"), power: A("s10", "购买力"),
  sand: cutAt("s11"), timeW: A("s11", "时间"), diff: A("s11", "不一样"), life: A("s11", "人") - 0.1, days: A("s11", "3万天"),
  pair: cutAt("s12"), spent: A("s12", "钱花了"), earn: A("s12", "还能再赚"), te: A("s12", "时间和精力"), used: A("s12", "用掉"), gone: A("s12", "回不来"),
  asset: cutAt("s13"), tf: A("s13", "时间自由"), energy: A("s13", "精力"), most: A("s13", "最值钱的资产"), mostEnd: A("s13", "最值钱的资产", { end: true }),
  // the habit
  price: cutAt("s14"), before: A("s14", "背贷款"), priceW: A("s14", "价格"), toTime: A("s14", "换算成时间"),
  carSum: cutAt("s15"), car20: A("s15", "20万的车"), wage2: A("s15", "月薪8000"), noEat: A("s15", "不吃不喝"), two: A("s15", "两年多"),
  end: cutAt("s16"), worthIt: A("s16", "值不值"), yours: A("s16", "你自己算"), follow: A("s16", "关注我"), redeem: A("s16", "把时间赎回来"),
};

// ---------- shared pieces ----------
const SH = { color: "rgba(0,0,0,0.62)", blur: 18, dy: 3 };
const WT = (size: number, fam: TextOpt["fam"] = "Display"): TextOpt => ({ size, fam, color: "#fff", shadow: SH });
const INK = (size: number, fam: TextOpt["fam"] = "Display", color: string = C.ink): TextOpt => ({ size, fam, color });
const ct = (id: string, phrase: string, nth = 1) => charTimes(id, phrase, nth);
const popS = (t: number, t0: number, d = 0.3) => { const u = prog(t, t0, d); return { u, s: 0.55 + 0.45 * E.back(u), a: clamp(u * 3) }; };
/** Voice-synced pop: glyph i lands as its character is spoken (`times` from charTimes), `lead` seconds early. */
function say(ctx: Ctx, s: string, x: number, y: number, o: TextOpt, times: number[], t: number, lead = 0.1, dur = 0.24): number {
  return text(ctx, s, x, y, o, (i) => {
    const u = prog(t, times[Math.min(i, times.length - 1)] - lead, dur);
    if (u <= 0) return null;
    return { a: clamp(u * 2.4), s: 0.55 + 0.45 * E.back(u), dy: (1 - E.out(u)) * o.size * 0.16 };
  });
}
/** Same, centred on x. */
const sayC = (ctx: Ctx, s: string, x: number, y: number, o: TextOpt, times: number[], t: number, lead = 0.1) => say(ctx, s, x - measure(ctx, s, o) / 2, y, o, times, t, lead);
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
  const g = ctx.createLinearGradient(0, 0, W * to, 0); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W * to, H);
}
function rightShade(ctx: Ctx, a = 0.62, from = 0.4) {
  const g = ctx.createLinearGradient(W * from, 0, W, 0); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(W * from, 0, W * (1 - from), H);
}
function topShade(ctx: Ctx, a = 0.6, to = 0.5) {
  const g = ctx.createLinearGradient(0, 0, 0, H * to); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * to);
}
function foot(ctx: Ctx, s: string, x: number, y: number, t: number, t0: number, onDark = false, align: "left" | "center" = "left") {
  const a = prog(t, t0, 0.4); if (a <= 0) return;
  text(ctx, s, x, y, { size: 28, fam: "Sans", color: onDark ? "rgba(255,255,255,0.82)" : C.ink3, alpha: a, align, shadow: onDark ? { color: "rgba(0,0,0,0.7)", blur: 8 } : undefined });
}
function xMark(ctx: Ctx, cx: number, cy: number, r: number, t: number, t0: number, o: { color?: string; width?: number } = {}) {
  const u1 = prog(t, t0, 0.11), u2 = prog(t, t0 + 0.09, 0.11), col = o.color ?? C.red, w = o.width ?? r * 0.17;
  if (u1 > 0) inkPath(ctx, [[cx - r, cy - r * 0.92], [cx + r, cy + r * 0.92]], E.out(u1), { color: col, width: w, seed: 31, wobble: 1.6 });
  if (u2 > 0) inkPath(ctx, [[cx + r * 0.95, cy - r], [cx - r * 0.95, cy + r]], E.out(u2), { color: col, width: w, seed: 37, wobble: 1.6 });
}
/** Callout: a rounded label whose left edge sits at (x, y) with a leader line from the point (tx, ty). */
function callout(ctx: Ctx, label: string, x: number, y: number, tx: number, ty: number, t: number, t0: number, o: { bg?: string; fg?: string; size?: number; fam?: TextOpt["fam"] } = {}) {
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
function plate(ctx: Ctx, x: number, y: number, w: number, h: number, a: number) { glass(ctx, x, y, w, h, a * 0.82, 26, "rgba(8,8,10,0.62)"); }

// ---------- props ----------
function bankIcon(ctx: Ctx, cx: number, cy: number, s: number, color: string, a = 1) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.scale(s, s); ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(-60, -22); ctx.lineTo(0, -58); ctx.lineTo(60, -22); ctx.closePath(); ctx.fill();
  for (const x of [-44, -16, 12, 40]) ctx.fillRect(x - 6 + 4, -16, 12, 52);
  ctx.fillRect(-62, 40, 124, 12);
  ctx.restore();
}
function clockFace(ctx: Ctx, cx: number, cy: number, rad: number, t: number, speed: number, color: string, a = 1) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy);
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = rad * 0.1; ctx.stroke();
  for (let k = 0; k < 12; k++) { const an = (k / 12) * Math.PI * 2; ctx.lineWidth = rad * 0.05; ctx.beginPath(); ctx.moveTo(Math.sin(an) * rad * 0.72, -Math.cos(an) * rad * 0.72); ctx.lineTo(Math.sin(an) * rad * 0.84, -Math.cos(an) * rad * 0.84); ctx.stroke(); }
  const h = t * speed * 0.08, m = t * speed;
  ctx.lineCap = "round"; ctx.strokeStyle = C.ink;
  ctx.lineWidth = rad * 0.09; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(h) * rad * 0.45, -Math.cos(h) * rad * 0.45); ctx.stroke();
  ctx.lineWidth = rad * 0.06; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(m) * rad * 0.68, -Math.cos(m) * rad * 0.68); ctx.stroke();
  ctx.restore();
}
/** Price tag (hole on the left) with a label, swinging from its string. */
function priceTag(ctx: Ctx, label: string, cx: number, cy: number, s: number, rot: number, color = C.red, a = 1) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(s, s);
  const w = measure(ctx, label, { size: 64, fam: "Display" }) + 120, h = 110;
  dropShadow(ctx, -w / 2, -h / 2, w, h, { r: 10, blur: 22, color: "rgba(0,0,0,0.4)", dy: 6 });
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2 + 44, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2, h / 2); ctx.lineTo(-w / 2 + 44, h / 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-w / 2 + 40, 0, 11, 0, Math.PI * 2); ctx.fill();
  text(ctx, label, 26, 22, { size: 64, fam: "Display", color: "#fff", align: "center" });
  ctx.restore();
}
function carIcon(ctx: Ctx, cx: number, cy: number, s: number, color: string, a = 1) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineJoin = "round"; ctx.lineWidth = 7; ctx.strokeStyle = C.ink;
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-150, 30); ctx.lineTo(-150, -10); ctx.lineTo(-110, -20); ctx.lineTo(-70, -66); ctx.lineTo(60, -66); ctx.lineTo(104, -20); ctx.lineTo(150, -10); ctx.lineTo(150, 30); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#DCEBF6"; ctx.beginPath(); ctx.moveTo(-90, -24); ctx.lineTo(-62, -56); ctx.lineTo(-6, -56); ctx.lineTo(-6, -24); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, -24); ctx.lineTo(8, -56); ctx.lineTo(54, -56); ctx.lineTo(84, -24); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (const wx of [-90, 92]) { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(wx, 32, 30, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#BFBAB0"; ctx.beginPath(); ctx.arc(wx, 32, 12, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
/** Little office worker (tie, briefcase) in a running pose; `ph` is the stride phase. */
function runner(ctx: Ctx, x: number, y: number, s: number, ph: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = C.ink; ctx.lineWidth = 9;
  const a1 = Math.sin(ph) * 0.9, a2 = Math.sin(ph + Math.PI) * 0.9;
  const hip: [number, number] = [0, 10], neck: [number, number] = [8, -70];
  const leg = (an: number) => { const kx = hip[0] + Math.sin(an) * 40, ky = hip[1] + Math.cos(an) * 40, fx = kx + Math.sin(an - 0.6) * 40, fy = ky + Math.cos(an - 0.6) * 42; ctx.beginPath(); ctx.moveTo(...hip); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke(); };
  leg(a1); leg(a2);
  ctx.beginPath(); ctx.moveTo(...hip); ctx.lineTo(...neck); ctx.stroke();
  const arm = (an: number) => { const ex = neck[0] + Math.sin(an) * 34, ey = neck[1] + 12 + Math.cos(an) * 30; ctx.beginPath(); ctx.moveTo(neck[0], neck[1] + 10); ctx.lineTo(ex, ey); ctx.lineTo(ex + Math.sin(an + 1.2) * 28, ey + Math.cos(an + 1.2) * 26); ctx.stroke(); return [ex + Math.sin(an + 1.2) * 28, ey + Math.cos(an + 1.2) * 26]; };
  arm(-a1);
  const [hx, hy] = arm(-a2);
  ctx.fillStyle = "#6B4A2B"; rr(ctx, hx - 20, hy, 40, 30, 4); ctx.fill();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(14, -98, 22, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.red; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(8, -66); ctx.lineTo(22, -36); ctx.stroke();
  ctx.restore();
}
function hourglassIcon(ctx: Ctx, cx: number, cy: number, s: number, color: string, fill: number) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineJoin = "round"; ctx.lineWidth = 6; ctx.strokeStyle = color;
  ctx.beginPath(); ctx.moveTo(-40, -60); ctx.lineTo(40, -60); ctx.lineTo(4, 0); ctx.lineTo(40, 60); ctx.lineTo(-40, 60); ctx.lineTo(-4, 0); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); const tf = 1 - fill; ctx.moveTo(-34 * tf, -52 + 52 * (1 - tf)); ctx.lineTo(34 * tf, -52 + 52 * (1 - tf)); ctx.lineTo(0, -4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-34, 54); ctx.lineTo(34, 54); ctx.lineTo(34 * (1 - fill * 0.8), 54 - 46 * fill); ctx.lineTo(-34 * (1 - fill * 0.8), 54 - 46 * fill); ctx.closePath(); ctx.fill();
  ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-50, -64); ctx.lineTo(50, -64); ctx.moveTo(-50, 64); ctx.lineTo(50, 64); ctx.stroke();
  ctx.restore();
}
function battery(ctx: Ctx, cx: number, cy: number, s: number, level: number, color: string) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineWidth = 7; ctx.strokeStyle = C.ink; ctx.lineJoin = "round";
  rr(ctx, -70, -38, 130, 76, 12); ctx.stroke(); ctx.fillStyle = C.ink; ctx.fillRect(64, -16, 14, 32);
  ctx.fillStyle = color; rr(ctx, -60, -28, 110 * clamp(level), 56, 6); ctx.fill();
  ctx.restore();
}
/** A stylised 100-yuan note; `k` scales its height/width (purchasing power), label shows the value. */
function note(ctx: Ctx, cx: number, cy: number, k: number, value: number, a = 1) {
  if (a <= 0.001) return;
  const w = 620 * k, h = 300 * k;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy);
  dropShadow(ctx, -w / 2, -h / 2, w, h, { r: 12, blur: 26, color: "rgba(40,20,10,0.35)", dy: 10 });
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, "#E86A5E"); g.addColorStop(1, "#C93A31");
  ctx.fillStyle = g; rr(ctx, -w / 2, -h / 2, w, h, 14 * k); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 5 * k; rr(ctx, -w / 2 + 18 * k, -h / 2 + 18 * k, w - 36 * k, h - 36 * k, 10 * k); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.beginPath(); ctx.ellipse(w * 0.22, 0, h * 0.3, h * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  text(ctx, String(Math.round(value)), -w / 2 + 44 * k, h / 2 - 50 * k, { size: 130 * k, fam: "Num", color: "#fff", bold: 3 * k });
  text(ctx, "¥", w * 0.22, h * 0.13, { size: 110 * k, fam: "Num", color: "#fff", align: "center", bold: 2 * k });
  ctx.restore();
}
// 30,000 dots (one per day of a life), rasterised once
let dayGrid: Canvas | null = null;
const DG = { cols: 273, rows: 110, step: 6.4, x: 86, y: 230 };   // 30,030 dots
function dayGridSprite(): Canvas {
  if (dayGrid) return dayGrid;
  dayGrid = createCanvas(Math.ceil(DG.cols * DG.step), Math.ceil(DG.rows * DG.step));
  const x = dayGrid.getContext("2d"); x.fillStyle = C.ink;
  for (let r = 0; r < DG.rows; r++) for (let c = 0; c < DG.cols; c++) { x.beginPath(); x.arc(c * DG.step + DG.step / 2, r * DG.step + DG.step / 2, 2.1, 0, Math.PI * 2); x.fill(); }
  return dayGrid;
}

// ================= HOOK: the workday =================
// Persistent across the first three shots: an 8-hour bar; 4.2 hours of it turn red and go to the bank.
export function dayBar(ctx: Ctx, t: number) {
  const out = prog(t, T.sum - 0.15, 0.25), a = (1 - out) * prog(t, 0.05, 0.2);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  const bx = 300, by = 640, bw = 1320, bh = 120, blk = bw / 8;
  plate(ctx, bx - 40, by - 300, bw + 80, 500, 1);
  say(ctx, "每天上班", bx, by - 190, WT(72), ct("s00", "每天上班"), t, 0.2);
  say(ctx, "8小时", bx + measure(ctx, "每天上班", { size: 72, fam: "Display" }) + 20, by - 190, { ...WT(110), color: C.marker }, ct("s00", "8小时"), t, 0.2);
  clockFace(ctx, bx + bw - 70, by - 210, 62, t, 9, "#fff", prog(t, T.h8 - 0.2, 0.3));
  const red = BANK_HOURS / 8;
  const ru = E.inOut(prog(t, T.h4 - 0.1, 0.55));
  for (let k = 0; k < 8; k++) {
    const u = prog(t, T.h8 - 0.25 + k * 0.035, 0.22); if (u <= 0) continue;
    const x0 = bx + k * blk;
    ctx.save(); ctx.globalAlpha *= clamp(u * 3);
    ctx.fillStyle = "rgba(255,255,255,0.92)"; rr(ctx, x0 + 5, by, blk - 10, bh * (0.5 + 0.5 * E.back(u)), 10); ctx.fill();
    text(ctx, `${k + 1}h`, x0 + blk / 2, by + bh / 2 + 16, { size: 40, fam: "Num", color: C.ink3, align: "center" });
    ctx.restore();
  }
  if (ru > 0) {
    const rw = bw * red * ru;
    ctx.save(); ctx.fillStyle = C.red; ctx.beginPath(); ctx.rect(bx, by, rw, bh); ctx.clip();
    for (let k = 0; k < 8; k++) { rr(ctx, bx + k * blk + 5, by, blk - 10, bh, 10); ctx.fill(); }
    ctx.restore();
    if (ru > 0.6) {
      const nh = BANK_HOURS.toFixed(1);
      text(ctx, `${nh} 小时`, bx + rw / 2, by + bh / 2 + 22, { size: 60, fam: "Num", color: "#fff", align: "center", bold: 2, alpha: prog(ru, 0.6, 0.4) });
      inkPath(ctx, [[bx + 4, by + bh + 26], [bx + rw - 4, by + bh + 26]], prog(ru, 0.6, 0.4), { color: C.red, width: 8, seed: 2 });
    }
  }
  const bu = popS(t, T.bank - 0.15, 0.32);
  if (bu.u > 0) {
    ctx.save(); ctx.globalAlpha *= bu.a; ctx.translate(bx + bw * red / 2, by + bh + 110); ctx.scale(bu.s, bu.s);
    bankIcon(ctx, -150, -6, 0.9, C.red);
    text(ctx, "替银行打工", -80, 22, { ...WT(76), color: "#fff" });
    ctx.restore();
  }
  ctx.restore();
}

// ================= THE SUM =================
export function contractPaint(ctx: Ctx, { t }: PaintArgs) {
  callout(ctx, "贷款 100万", 980, 560, 980, 800, t, T.loan - 0.12, { size: 54, bg: C.red, fg: "#fff" });
  callout(ctx, "分 30 年还", 1230, 690, 1300, 880, t, T.y30 - 0.12, { size: 46, bg: "#fff", fg: C.ink });
  callout(ctx, "买房", 260, 560, 470, 720, t, T.house - 0.12, { size: 48, bg: "#fff", fg: C.ink });
}
export function contractHud(ctx: Ctx, { t }: PaintArgs) {
  topShade(ctx, 0.35, 0.45);
  pill(ctx, "算笔账", 110, 120, t, T.calc - 0.1, { size: 46, bg: C.ink });
  const u = E.out(prog(t, T.wage - 0.15, 0.4));
  if (u > 0) card(ctx, 100, 200, 600, 220, { a: clamp(u * 2), s: 0.9 + 0.1 * u, rot: -0.02, fill: "#FFFDF5" }, () => {
    text(ctx, "月薪", 44, 90, INK(48, "Sans", C.ink3));
    const v = Math.round(countUp(t, T.wage + 0.1, 0.5, 0, SALARY));
    text(ctx, fmtInt(v), 44, 190, { size: 120, fam: "Num", color: C.blue, bold: 3 });
    text(ctx, "元", 44 + measure(ctx, fmtInt(SALARY), { size: 120, fam: "Num" }) + 14, 186, INK(54, "Sans", C.ink2));
  });
}
export function payPaint(ctx: Ctx, { t }: PaintArgs) {
  // monthly payment
  text(ctx, "每个月要还", 160, 230, { ...INK(64, "Sans", C.ink2), alpha: prog(t, T.pay + 0.05, 0.3) });
  const pu = prog(t, T.monthly - 0.12, 0.25);
  if (pu > 0) {
    const v = Math.round(countUp(t, T.monthly - 0.12, 0.7, 0, PAYMENT));
    const w = text(ctx, fmtInt(v), 150, 440, { size: 230, fam: "Num", color: C.red, bold: 5, alpha: clamp(pu * 3) });
    text(ctx, "元", 170 + w, 430, { ...INK(90), alpha: clamp(pu * 3) });
  }
  foot(ctx, `按年利率3%、等额本息估算：30年总利息约${Math.round(INTEREST / 10000)}万`, 160, 520, t, T.monthlyEnd);
  // the salary bar: the red part leaves
  const bx = 160, by = 650, bw = 1600, bh = 140;
  const ku = popS(t, T.half + 0.05, 0.35);
  if (ku.u > 0) {
    ctx.save(); ctx.globalAlpha *= ku.a; ctx.translate(1420, 330); ctx.scale(ku.s, ku.s);
    text(ctx, `${(SHARE * 100).toFixed(1)}%`, 0, 70, { size: 190, fam: "Num", color: C.red, bold: 5, align: "center" });
    text(ctx, "工资一大半", 0, 160, { ...INK(56), align: "center" }); ctx.restore();
  }
  const su = E.out(prog(t, T.half - 0.35, 0.45));
  if (su <= 0) return;
  text(ctx, `月薪 ${fmtInt(SALARY)}`, bx, by - 30, { ...INK(52, "Sans"), alpha: su });
  ctx.save(); ctx.globalAlpha *= su; ctx.fillStyle = C.blue; rr(ctx, bx, by, bw * su, bh, 16); ctx.fill(); ctx.restore();
  const rw = bw * SHARE, flow = E.in(prog(t, T.flow - 0.15, 0.6));
  if (t >= T.half - 0.1) {
    const hu = prog(t, T.half - 0.1, 0.3);
    ctx.save(); ctx.fillStyle = C.paper; ctx.globalAlpha *= flow; rr(ctx, bx, by, rw, bh, 16); ctx.fill(); ctx.restore();
    ctx.save(); ctx.setLineDash([14, 10]); ctx.strokeStyle = C.red; ctx.lineWidth = 4; ctx.globalAlpha *= flow; rr(ctx, bx, by, rw, bh, 16); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(0, flow * 150); ctx.globalAlpha *= clamp(hu * 3) * (1 - flow);
    ctx.fillStyle = C.red; rr(ctx, bx, by, rw, bh, 16); ctx.fill();
    text(ctx, `房贷 ${fmtInt(PAYMENT)}（${(SHARE * 100).toFixed(1)}%）`, bx + rw / 2, by + bh / 2 + 20, { size: 54, fam: "Sans", color: "#fff", align: "center" });
    ctx.restore();
    for (let k = 0; k < 12; k++) { // drips
      const d = prog(t, T.flow - 0.1 + hash(k, 1) * 0.5, 0.6); if (d <= 0 || d >= 1) continue;
      ctx.save(); ctx.globalAlpha *= 1 - d; ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(bx + hash(k, 2) * rw, by + bh + 10 + d * 120, 9, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    const la = prog(t, T.flow + 0.2, 0.3);
    if (la > 0) text(ctx, `剩 ${fmtInt(SALARY - PAYMENT)}`, bx + rw + (bw - rw) / 2, by + bh / 2 + 22, { size: 60, fam: "Num", color: "#fff", align: "center", bold: 2, alpha: la });
  }
}

// ================= THE TREADMILL =================
export function crowdHud(ctx: Ctx, { t }: PaintArgs) {
  topShade(ctx, 0.55, 0.5);
  say(ctx, "很多人就是这样", 110, 190, WT(110), ct("s03", "很多人就是这样"), t);
}
export function keysHud(ctx: Ctx, { t }: PaintArgs) {
  leftShade(ctx, 0.55, 0.6);
  say(ctx, "拼命赚钱", 110, 600, WT(190), ct("s03", "拼命赚钱"), t);
}
export function housePaint(ctx: Ctx, { t }: PaintArgs) {
  stamp(ctx, "买车", 1380, 260, t, T.car - 0.05, { size: 110, rot: -0.12 });
  stamp(ctx, "买房", 1640, 470, t, T.buyHouse - 0.05, { size: 110, rot: 0.1 });
  stamp(ctx, "背贷款", 1390, 720, t, T.debt - 0.05, { size: 130, rot: -0.08 });
}
// ropes tighten across the overdue bills
const ROPES: Array<[number, number, number, number]> = [[-60, 260, 1980, 760], [-60, 820, 1980, 300], [-60, 560, 1980, 520]];
export function overduePaint(ctx: Ctx, { t }: PaintArgs) {
  if (t >= T.debtW - 0.1) ring(ctx, 780, 545, 150, 230, prog(t, T.debtW - 0.05, 0.35), { width: 12, rot: 0.05 });
  ROPES.forEach(([x1, y1, x2, y2], k) => {
    const u = E.out(prog(t, T.tied - 0.25 + k * 0.1, 0.35));
    if (u <= 0) return;
    const sag = (1 - prog(t, T.tied + 0.15, 0.3)) * 60;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= 20; i++) { const v = i / 20; pts.push([lerp(x1, x2, v), lerp(y1, y2, v) + Math.sin(v * Math.PI) * sag]); }
    inkPath(ctx, pts, u, { color: "#3A2A1C", width: 26, seed: 40 + k, wobble: 0.5 });
    inkPath(ctx, pts, u, { color: "#B08A5A", width: 16, seed: 40 + k, wobble: 0.5 });
  });
}
export function overdueHud(ctx: Ctx, { t }: PaintArgs) {
  say(ctx, "被债务捆住", 110, 210, WT(120), ct("s04", "被债务捆住"), t);
}
export function gearsHud(ctx: Ctx, { t }: PaintArgs) {
  leftShade(ctx, 0.6, 0.7);
  say(ctx, "只能继续", 110, 380, WT(90, "Sans"), ct("s04", "只能继续"), t);
  say(ctx, "出卖时间", 110, 590, WT(200), ct("s04", "出卖时间"), t);
  const u = popS(t, T.sell - 0.05, 0.35);
  if (u.u > 0) {
    const sw = Math.sin((t - T.sell) * 7) * 0.12 * Math.exp(-(t - T.sell) * 2.5);
    ctx.save(); ctx.globalAlpha *= u.a; ctx.translate(1010, 470); ctx.rotate(sw); ctx.scale(u.s, u.s);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -150); ctx.lineTo(-30, -48); ctx.stroke();
    priceTag(ctx, "¥ / 小时", 60, 0, 1, 0.12);
    ctx.restore();
  }
}
// the loop drawn around the interchange; it spins faster on "转得越快"
const LOOPC = { x: 1040, y: 650, rx: 560, ry: 360 };
/** Loop phase: the integral of an angular speed that ramps up around "转得越快" (numeric, so any frame renders alone). */
function loopPhase(t: number): number {
  const t0 = T.loop, w0 = 1.4, w1 = 7.5, ta = T.faster - 0.2, tb = T.faster + 0.8;
  const seg = (a: number, b: number, f: (x: number) => number) => { let s = 0; const nn = 40; for (let i = 0; i < nn; i++) s += f(a + ((i + 0.5) / nn) * (b - a)); return (s * (b - a)) / nn; };
  const speed = (x: number) => (x < ta ? w0 : x < tb ? lerp(w0, w1, E.inOut((x - ta) / (tb - ta))) : w1);
  return t <= t0 ? 0 : seg(t0, t, speed);
}
export function loopPaint(ctx: Ctx, { t }: PaintArgs) {
  const a = prog(t, T.loop + 0.05, 0.4);
  if (a <= 0) return;
  const ph = loopPhase(t), { x, y, rx, ry } = LOOPC;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 6; ctx.setLineDash([22, 18]); ctx.lineDashOffset = -ph * 120;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  for (let k = 0; k < 4; k++) { // arrowheads riding the loop
    const an = ph + (k * Math.PI) / 2, px = x + Math.cos(an) * rx, py = y + Math.sin(an) * ry;
    const tx = -Math.sin(an) * rx, ty = Math.cos(an) * ry, tl = Math.hypot(tx, ty), ux = tx / tl, uy = ty / tl;
    ctx.fillStyle = k % 2 ? C.marker : "#fff";
    ctx.beginPath(); ctx.moveTo(px + ux * 34, py + uy * 34); ctx.lineTo(px - ux * 18 - uy * 22, py - uy * 18 + ux * 22); ctx.lineTo(px - ux * 18 + uy * 22, py - uy * 18 - ux * 22); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
export function loopHud(ctx: Ctx, { t }: PaintArgs) {
  const L: Array<[string, number, number, number, string]> = [
    ["收入 ↑", 860, 200, T.incUp, C.blue], ["贷款 ↑", 1500, 470, T.loanUp, C.red], ["继续上班", 100, 650, T.wheel, "#fff"],
  ];
  L.forEach(([s, x, y, t0, col]) => {
    const u = popS(t, t0 - 0.1, 0.3); if (u.u <= 0) return;
    const w = measure(ctx, s, { size: 64, fam: "Display" }) + 60;
    ctx.save(); ctx.globalAlpha *= u.a; ctx.translate(x + w / 2, y); ctx.scale(u.s, u.s);
    ctx.fillStyle = col === "#fff" ? "rgba(255,255,255,0.95)" : col; rr(ctx, -w / 2, -54, w, 108, 54); ctx.fill();
    text(ctx, s, 0, 24, { size: 64, fam: "Display", color: col === "#fff" ? C.ink : "#fff", align: "center" }); ctx.restore();
  });
  say(ctx, "转得越快", 640, 680, { ...WT(120), color: C.marker }, ct("s05", "转得越快"), t);
  stamp(ctx, "不敢停", 1050, 790, t, T.noStop - 0.05, { size: 120, rot: -0.1 });
}
export function ratPaint(ctx: Ctx, { t }: PaintArgs) {
  // hamster wheel on a stand, spinning; the runner never gets anywhere
  const cx = 600, cy = 520, R = 330, spin = (t - T.rat) * 2.8 + Math.max(0, t - T.race) * 2.5;
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = "#6B6862"; ctx.lineWidth = 16;
  ctx.beginPath(); ctx.moveTo(cx - 160, cy + R + 140); ctx.lineTo(cx, cy); ctx.lineTo(cx + 160, cy + R + 140); ctx.stroke();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, R - 34, 0, Math.PI * 2); ctx.stroke();
  for (let k = 0; k < 24; k++) { const an = spin + (k / 24) * Math.PI * 2; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * (R - 34), cy + Math.sin(an) * (R - 34)); ctx.lineTo(cx + Math.cos(an) * R, cy + Math.sin(an) * R); ctx.stroke(); }
  for (let k = 0; k < 6; k++) { const an = spin + (k / 6) * Math.PI * 2; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(an) * (R - 34), cy + Math.sin(an) * (R - 34)); ctx.stroke(); }
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  runner(ctx, cx - 10, cy + R - 110, 1.35, spin * 2.4);
  for (let k = 0; k < 4; k++) { // speed lines
    const u = (t * 3 + k * 0.25) % 1;
    inkPath(ctx, [[cx - 210 - u * 120, cy + 90 + k * 36], [cx - 150 - u * 120, cy + 90 + k * 36]], 1, { color: C.ink3, width: 5, seed: k, alpha: 1 - u });
  }
  // right column: the name
  const bu = popS(t, T.book - 0.15, 0.3);
  if (bu.u > 0) { ctx.save(); ctx.globalAlpha *= bu.a; text(ctx, "《富爸爸穷爸爸》管这叫", 1100, 330, INK(54, "Sans", C.ink2)); ctx.restore(); }
  say(ctx, "老鼠赛跑", 1090, 520, INK(200, "Display", C.red), ct("s06", "老鼠赛跑"), t);
  text(ctx, "Rat Race", 1100, 610, { size: 60, fam: "Num", color: C.ink3, alpha: prog(t, T.race + 0.4, 0.3) });
  const gu = prog(t, T.raceEnd + 0.05, 0.35);
  if (gu > 0) {
    text(ctx, "收入涨 → 开销涨 → 只能接着跑", 1100, 720, { ...INK(46, "Sans", C.ink), alpha: gu });
    rule(ctx, 1100, 750, 1780, gu, "rgba(217,56,43,0.6)", 4);
  }
}

// ================= WHAT FREEDOM IS =================
export function cashHud(ctx: Ctx, { t }: PaintArgs) {
  leftShade(ctx, 0.7, 0.65);
  say(ctx, "真正的财富自由", 110, 300, WT(110), ct("s07", "真正的财富自由"), t);
  const nu = prog(t, T.notCash - 0.1, 0.3);
  if (nu > 0) text(ctx, "≠", 110, 520, { ...WT(140, "Sans"), color: C.red, alpha: clamp(nu * 3) });
  const x = 230;
  say(ctx, "花不完的现金", x, 520, WT(120), ct("s07", "花不完的现金"), t);
  const w = measure(ctx, "花不完的现金", { size: 120, fam: "Display" });
  strike(ctx, x - 10, 480, x + w + 10, 474, prog(t, T.cashEnd - 0.05, 0.25), { width: 16 });
}
export function laborHud(ctx: Ctx, { t }: PaintArgs) {
  rightShade(ctx, 0.75, 0.38);
  const x = 1000;
  const cu = popS(t, T.labor + 0.02, 0.3);
  if (cu.u > 0) { ctx.save(); ctx.globalAlpha *= cu.a; ctx.translate(x + 60, 330); ctx.scale(cu.s, cu.s); ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(0, 0, 58, 0, Math.PI * 2); ctx.fill(); icon(ctx, "check", 0, 4, 1.0, { color: "#fff", width: 6 }); ctx.restore(); }
  say(ctx, "不用被迫", x + 150, 360, { ...WT(110), color: C.marker }, ct("s08", "不用被迫"), t);
  say(ctx, "靠劳动换取收入", x, 540, WT(110), ct("s08", "靠劳动换取收入"), t);
}
export function chartPaint(ctx: Ctx, { t }: PaintArgs) {
  const x0 = 220, x1 = 1700, y0 = 860, y1 = 220;
  inkPath(ctx, [[x0, y1 - 20], [x0, y0], [x1 + 30, y0]], E.out(prog(t, T.chart + 0.05, 0.45)), { width: 6, color: C.ink2, seed: 12 });
  text(ctx, "时间", x1 - 10, y0 + 56, { ...INK(38, "Sans", C.ink3), align: "right", alpha: prog(t, T.chart + 0.3, 0.3) });
  // monthly costs: flat red dashed line
  const yc = 560, cu = prog(t, T.costs - 0.3, 0.5);
  const cw = (x1 - x0) * E.out(prog(t, T.chart + 0.25, 0.6));
  ctx.save(); ctx.setLineDash([20, 14]); ctx.strokeStyle = C.red; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x0, yc); ctx.lineTo(x0 + cw, yc); ctx.stroke(); ctx.restore();
  text(ctx, "每个月的开销", x1, yc - 26, { ...INK(46, "Sans", C.red), align: "right", alpha: Math.max(prog(t, T.chart + 0.5, 0.3), cu) });
  // non-work income rising
  const pu = E.inOut(prog(t, T.passive - 0.1, (T.cover + 0.25) - (T.passive - 0.1)));
  const curve = (v: number) => y0 - 40 - (y0 - 40 - (y1 + 40)) * (v ** 1.8);
  if (pu > 0) {
    const pts: Array<[number, number]> = [];
    const vmax = 0.2 + 0.8 * pu;
    for (let i = 0; i <= 40; i++) { const v = (i / 40) * vmax; pts.push([lerp(x0, x1, v), curve(v)]); }
    inkPath(ctx, pts, 1, { color: C.blue, width: 11, wobble: 0.3, seed: 3 });
    const [ex, ey] = pts[pts.length - 1];
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(ex, ey, 14, 0, Math.PI * 2); ctx.fill();
    say(ctx, "不上班的收入", x0 + 60, 300, INK(76, "Display", C.blue), ct("s09", "不上班的收入"), t);
    text(ctx, "房租 · 利息 · 分红 · 版权……", x0 + 64, 356, { ...INK(34, "Sans", C.ink3), alpha: prog(t, T.passive + 0.5, 0.3) });
  }
  // crossing point: the costs are covered
  const vc = (((y0 - 40 - yc) / (y0 - 40 - (y1 + 40))) ** (1 / 1.8)), xc = lerp(x0, x1, vc);
  const fu = popS(t, T.cover + 0.05, 0.35);
  if (fu.u > 0) {
    ctx.save(); ctx.globalAlpha *= fu.a * 0.18; ctx.fillStyle = C.blue; ctx.fillRect(xc, y1 - 20, x1 + 30 - xc, y0 - y1 + 20); ctx.restore();
    ctx.save(); ctx.globalAlpha *= fu.a; ctx.translate(xc, yc); ctx.scale(fu.s, fu.s);
    ctx.fillStyle = C.marker; ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, -190); ctx.stroke();
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.moveTo(0, -190); ctx.lineTo(170, -160); ctx.lineTo(0, -130); ctx.closePath(); ctx.fill();
    ctx.restore();
    text(ctx, "财富自由", xc + 20, yc - 210, { ...INK(70, "Display", C.blue), alpha: fu.a });
    text(ctx, "时间归你", xc + 120, y1 + 30, { ...INK(44, "Sans", C.blue), alpha: prog(t, T.cover + 0.4, 0.3) });
  }
}

// ================= MONEY VS TIME =================
export function printHud(ctx: Ctx, { t }: PaintArgs) {
  ctx.fillStyle = "rgba(0,0,0,0.38)"; ctx.fillRect(0, 0, W, H);
  sayC(ctx, "钱本身其实不值钱", W / 2, 580, WT(150), ct("s10", "钱本身其实不值钱"), t);
}
export function inflPaint(ctx: Ctx, { t }: PaintArgs) {
  const pu = popS(t, T.pct - 0.15, 0.3);
  if (pu.u > 0) { ctx.save(); ctx.globalAlpha *= pu.a; ctx.translate(330, 190); ctx.scale(pu.s, pu.s); ctx.fillStyle = C.red; rr(ctx, -170, -70, 520, 140, 70); ctx.fill(); text(ctx, "通胀 2%/年", 90, 26, { size: 72, fam: "Display", color: "#fff", align: "center" }); ctx.restore(); }
  // year axis
  const ax0 = 200, ax1 = 1720, ay = 860;
  const yu = prog(t, T.y10 - 0.4, 0.9);
  inkPath(ctx, [[ax0, ay], [ax1, ay]], E.out(prog(t, T.note100 - 0.2, 0.4)), { width: 6, color: C.ink2, seed: 22 });
  for (let k = 0; k <= 10; k++) {
    const a = prog(yu, k / 11, 0.1); if (a <= 0) continue;
    const x = lerp(ax0, ax1, k / 10);
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = C.ink2; ctx.fillRect(x - 2, ay - 14, 4, 28); ctx.restore();
    text(ctx, k === 0 ? "今天" : `${k}年`, x, ay + 52, { size: 30, fam: "Sans", color: C.ink3, align: "center", alpha: a });
  }
  // the note shrinks to its purchasing power
  const nu = prog(t, T.infl + 0.12, 0.35);
  const sh = E.inOut(prog(t, T.y10, T.left82 + 0.5 - T.y10));
  const val = lerp(100, LEFT_100, sh), k = Math.sqrt(val / 100);
  const cx = lerp(560, 1000, E.inOut(yu));
  note(ctx, cx, 500, k * (0.6 + 0.4 * E.back(nu)), val, clamp(nu * 3));
  if (sh > 0.02) { // ghost of the original size
    ctx.save(); ctx.setLineDash([16, 12]); ctx.strokeStyle = "rgba(26,26,26,0.35)"; ctx.lineWidth = 4; rr(ctx, cx - 310, 350, 620, 300, 14); ctx.stroke(); ctx.restore();
  }
  const lu = prog(t, T.left82 + 0.2, 0.3);
  if (lu > 0) {
    text(ctx, "只剩", 1720, 400, { ...INK(56, "Sans", C.ink2), align: "right", alpha: lu });
    text(ctx, `${Math.round(LEFT_100)}`, 1720, 600, { size: 220, fam: "Num", color: C.red, bold: 5, align: "right", alpha: lu });
    text(ctx, "块的购买力", 1720, 690, { ...INK(56, "Sans", C.ink2), align: "right", alpha: prog(t, T.power - 0.1, 0.3) });
  }
  foot(ctx, `按每年通胀2%估算：100 ÷ 1.02¹⁰ ≈ ${Math.round(LEFT_100)}`, 200, 960, t, T.left82 + 0.4);
}
export function sandHud(ctx: Ctx, { t }: PaintArgs) {
  rightShade(ctx, 0.55, 0.45);
  say(ctx, "时间", 1300, 520, WT(220), ct("s11", "时间"), t);
  say(ctx, "不一样", 1310, 700, { ...WT(120), color: C.marker }, ct("s11", "不一样"), t);
}
export function daysPaint(ctx: Ctx, { t }: PaintArgs) {
  // starts on single days you can count, then pulls back to all 30,000 as "3万天" is said
  const gx = DG.x, gy = DG.y, gw = DG.cols * DG.step, gh = DG.rows * DG.step;
  const u = prog(t, T.life + 0.02, 0.25);
  const z = lerp(9, 1, E.inOut(prog(t, T.life + 0.75, T.days + 0.3 - (T.life + 0.75))));
  if (u > 0) {
    ctx.save(); ctx.globalAlpha *= clamp(u * 3) * 0.88;
    ctx.beginPath(); ctx.rect(gx - 6, gy - 6, gw + 12, gh + 12); ctx.clip();
    ctx.translate(gx, gy); ctx.scale(z, z);
    if (z < 2.2) ctx.drawImage(dayGridSprite(), 0, 0);
    else {
      ctx.fillStyle = C.ink;
      const nc = Math.min(DG.cols, Math.ceil(gw / (DG.step * z)) + 1), nr = Math.min(DG.rows, Math.ceil(gh / (DG.step * z)) + 1);
      for (let rr2 = 0; rr2 < nr; rr2++) for (let c = 0; c < nc; c++) { ctx.beginPath(); ctx.arc(c * DG.step + DG.step / 2, rr2 * DG.step + DG.step / 2, 2.1, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
    const la = clamp((z - 3) / 2) * prog(t, T.life + 0.05, 0.2);
    if (la > 0) {
      const dx = gx + (DG.step / 2) * z, dy = gy + (DG.step / 2) * z;
      ctx.save(); ctx.globalAlpha *= la; ctx.strokeStyle = C.red; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(dx, dy, DG.step * z * 0.45, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      text(ctx, "← 1天", dx + DG.step * z * 0.6, dy + 22, { size: 60, fam: "Display", color: C.red, alpha: la });
    }
  }
  say(ctx, "人这一辈子", gx, 190, INK(70, "Sans", C.ink2), ct("s11", "人这一辈子"), t);
  const du = prog(t, T.days - 0.1, 0.3);
  if (du > 0) {
    const v = Math.round(countUp(t, T.days - 0.1, 0.55, 0, 30000) / 100) * 100;
    glass(ctx, 1080, 360, 700, 300, clamp(du * 3) * 0.95, 30, "rgba(251,248,241,0.96)");
    text(ctx, fmtInt(v), 1430, 540, { size: 170, fam: "Num", color: C.red, bold: 5, align: "center", alpha: clamp(du * 3) });
    text(ctx, "天左右", 1430, 625, { ...INK(60), align: "center", alpha: clamp(du * 3) });
  }
  const fa = prog(t, T.days + 0.4, 0.4);
  if (fa > 0) text(ctx, "每个点 = 1天，共3万个（按人均寿命约80岁：80 × 365 ≈ 2.9万）", DG.x + DG.cols * DG.step, 190, { size: 28, fam: "Sans", color: C.ink3, align: "right", alpha: fa });
}
export function pairPaint(ctx: Ctx, { t }: PaintArgs) {
  inkPath(ctx, [[960, 170], [960, 900]], E.out(prog(t, T.pair + 0.02, 0.4)), { width: 5, color: C.ink3, seed: 6 });
  // money: comes back round
  const mu = popS(t, T.spent - 0.1, 0.3);
  if (mu.u > 0) {
    ctx.save(); ctx.globalAlpha *= mu.a; ctx.translate(480, 470); ctx.scale(mu.s, mu.s);
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#8F6A1E"; ctx.lineWidth = 12; ctx.stroke();
    text(ctx, "¥", 0, 48, { size: 140, fam: "Num", color: "#8F6A1E", align: "center", bold: 3 });
    ctx.restore();
  }
  const ru = prog(t, T.earn - 0.2, 0.7);
  if (ru > 0) {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= 40; i++) { const an = -Math.PI * 0.3 + (i / 40) * Math.PI * 1.7; pts.push([480 + Math.cos(an) * 200, 470 + Math.sin(an) * 200]); }
    inkPath(ctx, pts, E.out(ru), { color: C.blue, width: 10, seed: 4 });
    if (ru > 0.95) { const [ax, ay] = pts[pts.length - 1]; arrow(ctx, ax - 30, ay + 26, ax + 4, ay - 4, 1, { color: C.blue, width: 10, head: 30 }); }
  }
  sayC(ctx, "钱花了", 480, 210, INK(80), ct("s12", "钱花了"), t);
  sayC(ctx, "还能再赚", 480, 790, INK(80, "Display", C.blue), ct("s12", "还能再赚"), t);
  // time and energy: one way only
  const tu = popS(t, T.te - 0.1, 0.3);
  if (tu.u > 0) {
    ctx.save(); ctx.globalAlpha *= tu.a; ctx.translate(1440, 470); ctx.scale(tu.s, tu.s);
    hourglassIcon(ctx, -110, 0, 1.4, C.ink, clamp((t - T.te) / 2.2));
    battery(ctx, 120, 0, 1.2, 1 - clamp((t - T.used) / 1.2) * 0.85, C.green);
    ctx.restore();
  }
  sayC(ctx, "时间和精力", 1440, 210, INK(80), ct("s12", "时间和精力"), t);
  const au = prog(t, T.used - 0.1, 0.45);
  if (au > 0) arrow(ctx, 1220, 680, 1660, 680, au, { color: C.red, width: 10, head: 32 });
  sayC(ctx, "用掉就回不来", 1440, 790, INK(80, "Display", C.red), ct("s12", "用掉就回不来"), t);
}
const ASSETS = [
  { name: "时间自由", v: 1.0, col: C.blue, t: () => T.tf },
  { name: "精力", v: 0.86, col: C.blue, t: () => T.energy },
  { name: "钱", v: 0.36, col: "#B9B3A8", t: () => T.most - 0.25, note: "花了还能再赚" },
];
export function assetPaint(ctx: Ctx, { t }: PaintArgs) {
  const title = "一个人最值钱的资产", tw = measure(ctx, title, { size: 96, fam: "Display" });
  marker(ctx, 210 + measure(ctx, "一个人", { size: 96, fam: "Display" }) - 8, 196, tw - measure(ctx, "一个人", { size: 96, fam: "Display" }) + 16, 92, prog(t, T.most, 0.5));
  text(ctx, title, 210, 230, { ...INK(96), alpha: prog(t, T.asset + 0.05, 0.3) });
  const bx = 520, bw = 1180;
  ASSETS.forEach((a, k) => {
    const t0 = a.t() - 0.12, u = prog(t, t0, 0.3);
    if (u <= 0) return;
    const y = 400 + k * 190;
    text(ctx, a.name, bx - 40, y + 30, { ...INK(k === 2 ? 64 : 84, "Display", k === 2 ? C.ink3 : C.ink), align: "right", alpha: clamp(u * 3) });
    ctx.save(); ctx.fillStyle = "rgba(26,26,26,0.08)"; rr(ctx, bx, y - 40, bw, 90, 14); ctx.fill(); ctx.restore();
    ctx.save(); ctx.fillStyle = a.col; rr(ctx, bx, y - 40, Math.max(14, bw * a.v * E.out(prog(t, t0 + 0.05, 0.6))), 90, 14); ctx.fill(); ctx.restore();
    if (a.note) text(ctx, a.note, bx + bw * a.v + 30, y + 18, { ...INK(40, "Sans", C.ink3), alpha: prog(t, t0 + 0.4, 0.3) });
  });
  const su = popS(t, T.mostEnd - 0.1, 0.35);
  if (su.u > 0) { ctx.save(); ctx.globalAlpha *= su.a; ctx.translate(bx + bw - 60, 400); ctx.scale(su.s, su.s); icon(ctx, "star", 0, 0, 1.6, { color: C.marker }); ctx.restore(); }
}

// ================= THE HABIT =================
export function billsHud(ctx: Ctx, { t }: PaintArgs) {
  topShade(ctx, 0.62, 0.55);
  say(ctx, "背贷款之前", 110, 170, WT(70, "Sans"), ct("s14", "背贷款之前"), t);
  const pu = popS(t, T.priceW - 0.12, 0.3);
  if (pu.u > 0) { ctx.save(); ctx.globalAlpha *= pu.a; ctx.translate(330, 330); ctx.scale(pu.s, pu.s); priceTag(ctx, "价格", 0, 0, 1, -0.06); ctx.restore(); }
  const au = prog(t, T.toTime - 0.12, 0.3);
  if (au > 0) arrow(ctx, 560, 330, 760, 330, au, { color: "#fff", width: 12, head: 32 });
  const cu = popS(t, T.toTime + 0.1, 0.3);
  if (cu.u > 0) { ctx.save(); ctx.globalAlpha *= cu.a; ctx.translate(880, 330); ctx.scale(cu.s, cu.s); clockFace(ctx, 0, 0, 90, t, 4, C.blue); ctx.restore();
    text(ctx, "时间", 1010, 360, { ...WT(110), color: C.marker, alpha: cu.a }); }
}
export function carPaint(ctx: Ctx, { t }: PaintArgs) {
  const cu = popS(t, T.car20 - 0.15, 0.35);
  if (cu.u > 0) { ctx.save(); ctx.globalAlpha *= cu.a; ctx.translate(380, 300); ctx.scale(cu.s, cu.s); carIcon(ctx, 0, 0, 1.25, "#7FA7D9"); ctx.restore(); }
  if (cu.u > 0) priceTag(ctx, "¥200,000", 400, 470, 0.8, -0.05, C.red, cu.a);
  const wu = prog(t, T.wage2 - 0.12, 0.3);
  if (wu > 0) { text(ctx, "÷", 760, 330, { ...INK(110, "Sans", C.ink2), alpha: wu }); text(ctx, "月薪 8,000", 860, 330, { ...INK(76), alpha: wu }); }
  // 25 months, filled one by one
  const gx = 860, gy = 430, cw = 150, chh = 92, cols = 6;
  const fu = prog(t, T.noEat - 0.25, 1.2);
  for (let m = 0; m < CAR_MONTHS; m++) {
    const a = prog(t, T.wage2 + 0.3 + m * 0.02, 0.2); if (a <= 0) continue;
    const x = gx + (m % cols) * (cw + 12), y = gy + Math.floor(m / cols) * (chh + 12);
    const filled = fu * CAR_MONTHS > m;
    ctx.save(); ctx.globalAlpha *= clamp(a * 3);
    ctx.fillStyle = filled ? C.red : "rgba(26,26,26,0.08)"; rr(ctx, x, y, cw, chh, 10); ctx.fill();
    text(ctx, `${m + 1}月`, x + cw / 2, y + chh / 2 + 14, { size: 36, fam: "Sans", color: filled ? "#fff" : C.ink3, align: "center" });
    ctx.restore();
  }
  const tu = prog(t, T.two - 0.12, 0.3);
  if (tu > 0) {
    ctx.save(); ctx.globalAlpha *= tu; glass(ctx, 160, 640, 560, 260, 1, 26, "rgba(251,248,241,0.97)"); ctx.restore();
    text(ctx, "不吃不喝", 200, 720, { ...INK(46, "Sans", C.ink3), alpha: tu });
    say(ctx, "两年多", 196, 860, INK(150, "Display", C.red), ct("s15", "两年多"), t);
  }
  foot(ctx, "200,000 ÷ 8,000 = 25 个月", 860, 990, t, T.two + 0.2);
}
export function endHud(ctx: Ctx, { t }: PaintArgs) {
  topShade(ctx, 0.5, 0.55);
  const out = E.inOut(prog(t, T.follow - 0.3, 0.3));
  if (out < 1) {
    ctx.save(); ctx.globalAlpha *= 1 - out;
    sayC(ctx, "值不值", W / 2, 260, WT(130), ct("s16", "值不值"), t);
    sayC(ctx, "你自己算", W / 2, 400, { ...WT(110), color: C.marker }, ct("s16", "你自己算"), t);
    ctx.restore();
  }
  pill(ctx, "关注我", W / 2, 170, t, T.follow - 0.1, { size: 46, center: true, bg: C.red });
  sayC(ctx, "把时间赎回来", W / 2, 360, WT(160), ct("s16", "把时间赎回来"), t);
}
