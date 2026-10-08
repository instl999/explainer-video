// Scene painters for 《越追求性价比越存不下钱》. Every beat is keyed to a spoken phrase through A(line, phrase), so the picture
// follows the voice. Look: footage annotated in white (tags, rings, stamps); the twist, the sums and the rule are worked on
// warm paper in ink; red = waste / loss, blue = money kept / real value.
import { A, C, E, H, LEAD, W, alignment, charTimes, clamp, lerp, prog } from "./common.ts";
import { arrow, card, countUp, dropShadow, glass, icon, inkPath, marker, measure, ring, rr, stamp, strike, text, type Ctx, type TextOpt } from "./draw.ts";
import type { CamKey, PaintArgs } from "./model.ts";

/** Cut point between two lines: the middle of the pause before `id`. */
export function gapMid(id: string): number {
  const i = alignment.lines.findIndex((l) => l.id === id);
  if (i < 0) throw new Error(`no line ${id}`);
  return i === 0 ? 0 : LEAD + (alignment.lines[i - 1].end + alignment.lines[i].start) / 2;
}
/** Cut before line `id`: just ahead of its first word, so the previous shot keeps the whole pause for its payoff. */
export const cutAt = (id: string) => Math.max(gapMid(id), A(id) - 0.12);

// ---------- the sums (illustrative prices, labelled 示意 on screen) ----------
export const MASK = { single: 40, pack: 6, packPrice: 180, used: 4 };
export const PER = MASK.packPrice / MASK.pack;                                   // 30 a box in the pack
export const SEEMS_SAVED = (MASK.single - PER) * MASK.pack;                      // 60
export const NEEDED = MASK.single * MASK.used;                                   // 160
export const OVERPAID = MASK.packPrice - NEEDED;                                 // 20

// ---------- anchors ----------
export const T = {
  // hook: the belief
  you: A("s00", "你是不是"), chase: A("s00", "越追求"), cpr: A("s00", "性价比"), c1: A("s00", "就越能") - 0.06, save: A("s00", "攒下钱"), saveEnd: A("s00", "攒下钱", { end: true }),
  desk: cutAt("s01"), jp: A("s01", "日本"), name: A("s01", "黑田尚子"), opp: A("s01", "恰恰相反"), oppEnd: A("s01", "恰恰相反", { end: true }),
  flip: A("s01", "恰恰相反") - 0.06,
  too: A("s02", "太在意"), cpr2: A("s02", "性价比"), asset: A("s02", "资产"), hurt: A("s02", "受损"), hurtEnd: A("s02", "受损", { end: true }),
  // the chapter title
  book: cutAt("s03"), her: A("s03", "她的书里"), chap: A("s03", "有一章"), title: A("s03", "标题就叫"),
  chapter: cutAt("s04"), jiu: A("s04", "酒"), cvs: A("s04", "便利店"), rather: A("s04", "反而"), saved: A("s04", "攒得下钱"), savedEnd: A("s04", "攒得下钱", { end: true }),
  store: cutAt("s05"), cvs2: A("s05", "便利店"), pricier: A("s05", "更贵"), q: A("s05", "吗"),
  one: cutAt("s06"), dear: A("s06", "贵一点"), only: A("s06", "只会买"), tonight: A("s06", "今晚"), can1: A("s06", "那一罐"), can1End: A("s06", "那一罐", { end: true }),
  cans: cutAt("s07"), cheap: A("s07", "图便宜"), box: A("s07", "整箱"), home: A("s07", "搬回家"), drink: A("s07", "喝得"), more: A("s07", "更多"), moreEnd: A("s07", "更多", { end: true }),
  // stockpiling
  cart: cutAt("s08"), deal: A("s08", "优惠"), crazy: A("s08", "疯狂"), hoardW: A("s08", "囤货"), cart2: A("s08", "为了低价") - 0.06, low: A("s08", "低价"), pileW: A("s08", "一堆闲置"), idle1: A("s08", "闲置"),
  hoard: cutAt("s09"), pile: A("s09", "堆在家里"), space: A("s09", "占用空间"), messy: A("s09", "最后") - 0.06, exp: A("s09", "过期"), idle: A("s09", "闲置"), toss: A("s09", "丢弃"), tossEnd: A("s09", "丢弃", { end: true }),
  // the sum
  calc: cutAt("s10"), sumW: A("s10", "算笔账"), mask: A("s10", "面膜"), single: A("s10", "单买"), p40: A("s10", "40"), stock: A("s10", "囤6盒"), p180: A("s10", "180"),
  look: A("s10", "看着"), s60: A("s10", "60"), s60End: A("s10", "60", { end: true }),
  deal2: A("s10", "单买") - 0.26,
  waste: cutAt("s11"), used4: A("s11", "用掉4盒"), left2: A("s11", "剩下两盒"), expire: A("s11", "过期"), buy4: A("s11", "单买4盒"), p160: A("s11", "160"), p160End: A("s11", "160", { end: true }),
  loss: cutAt("s12"), diff: A("s12", "差价"), white: A("s12", "白白浪费"), whiteEnd: A("s12", "白白浪费", { end: true }), back: A("s12", "倒贴"), p20: A("s12", "20"), p20End: A("s12", "20", { end: true }),
  // the rule
  quote: cutAt("s13"), says: A("s13", "书里说"), never: A("s13", "过去未曾拥有的"), mostly: A("s13", "多半"), unneeded: A("s13", "不需要的"), quoteEnd: A("s13", "不需要的", { end: true }),
  neq: cutAt("s14"), cheapW: A("s14", "便宜"), neq1: A("s14", "不等于"), worth: A("s14", "值得买"), dealW: A("s14", "优惠"), neq2: A("s14", "不等于", { nth: 2 }), need: A("s14", "你需要"), needEnd: A("s14", "你需要", { end: true }),
  rule: cutAt("s15"), dearW: A("s15", "贵"), freq: A("s15", "高频使用"), worthIt: A("s15", "划算"), cheapR: A("s15", "再便宜"), unused: A("s15", "用不上"), pure: A("s15", "纯亏损"), pureEnd: A("s15", "纯亏损", { end: true }),
  perUse: cutAt("s16"), shoe: A("s16", "500的鞋"), wear: A("s16", "穿500次"), once1: A("s16", "一次1块"), shirt: A("s16", "50的衣服"), never0: A("s16", "一次没穿"), all: A("s16", "50全亏"), allEnd: A("s16", "全亏", { end: true }),
  // the fix
  write: cutAt("s17"), monk: A("s17", "苦行僧式抠门"), monkEnd: A("s17", "抠门", { end: true }), value: A("s17", "而是") - 0.1, learn: A("s17", "学会区分"), priceW: A("s17", "价格"), valueW: A("s17", "价值"), valueEnd: A("s17", "价值", { end: true }),
  off: cutAt("s18"), offW: A("s18", "关掉"), blind: A("s18", "盲目囤货"), habitEnd: A("s18", "习惯", { end: true }), yours: A("s18", "你的存款"), slow: A("s18", "慢慢"), rise: A("s18", "涨起来"), riseEnd: A("s18", "涨起来", { end: true }),
  end: cutAt("s19"), like: A("s19", "点赞"), fix: A("s19", "改掉"), leak: A("s19", "消费漏洞"), leakEnd: A("s19", "漏洞", { end: true }),
};
/** The source's white flash between the cluttered and the bare bedroom (FLIP clip), placed on "你的存款". */
export const FLIP_SRC = 21.56, FLASH_SRC = 22.97;

// ---------- shared pieces ----------
const SH = { color: "rgba(0,0,0,0.62)", blur: 18, dy: 3 };
const WT = (size: number, fam: TextOpt["fam"] = "Display"): TextOpt => ({ size, fam, color: "#fff", shadow: SH });
const INK = (size: number, fam: TextOpt["fam"] = "Display", color: string = C.ink): TextOpt => ({ size, fam, color });
const ct = (id: string, phrase: string, nth = 1) => charTimes(id, phrase, nth);
const popS = (t: number, t0: number, d = 0.3) => { const u = prog(t, t0, d); return { u, s: 0.55 + 0.45 * E.back(u), a: clamp(u * 3) }; };
const fadeWin = (t: number, t0: number, t1: number, fin = 0.2, fout = 0.25) => Math.min(prog(t, t0, fin), 1 - prog(t, t1 - fout, fout));
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
/** Whole word pops at t0 (for words that are not spoken in this order). */
function popWord(ctx: Ctx, s: string, x: number, y: number, o: TextOpt, t: number, t0: number, align: "left" | "center" = "left") {
  const p = popS(t, t0, 0.3); if (p.u <= 0) return;
  const w = measure(ctx, s, o), cx = align === "center" ? x : x + w / 2;
  ctx.save(); ctx.globalAlpha *= p.a; ctx.translate(cx, y); ctx.scale(p.s, p.s);
  text(ctx, s, 0, 0, { ...o, align: "center" }); ctx.restore();
}
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
function topShade(ctx: Ctx, a = 0.6, to = 0.5) {
  const g = ctx.createLinearGradient(0, 0, 0, H * to); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * to);
}
function foot(ctx: Ctx, s: string, x: number, y: number, t: number, t0: number, onDark = false, align: "left" | "center" = "left") {
  const a = prog(t, t0, 0.4); if (a <= 0) return;
  text(ctx, s, x, y, { size: 26, fam: "Sans", color: onDark ? "rgba(255,255,255,0.82)" : C.ink3, alpha: a, align, shadow: onDark ? { color: "rgba(0,0,0,0.7)", blur: 8 } : undefined });
}
function xMark(ctx: Ctx, cx: number, cy: number, r: number, t: number, t0: number, o: { color?: string; width?: number } = {}) {
  const u1 = prog(t, t0, 0.11), u2 = prog(t, t0 + 0.09, 0.11), col = o.color ?? C.red, w = o.width ?? r * 0.17;
  if (u1 > 0) inkPath(ctx, [[cx - r, cy - r * 0.92], [cx + r, cy + r * 0.92]], E.out(u1), { color: col, width: w, seed: 31, wobble: 1.6 });
  if (u2 > 0) inkPath(ctx, [[cx + r * 0.95, cy - r], [cx - r * 0.95, cy + r]], E.out(u2), { color: col, width: w, seed: 37, wobble: 1.6 });
}
function tick(ctx: Ctx, cx: number, cy: number, r: number, t: number, t0: number, color = C.blue) {
  const u = prog(t, t0, 0.2); if (u <= 0) return;
  inkPath(ctx, [[cx - r, cy], [cx - r * 0.3, cy + r * 0.7], [cx + r, cy - r * 0.8]], E.out(u), { color, width: r * 0.3, seed: 41, wobble: 0.8 });
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
/** "示意画面" chip for stand-in footage. */
function standIn(ctx: Ctx, label = "示意画面") {
  const w = measure(ctx, label, { size: 24, fam: "Sans" }) + 44;
  glass(ctx, 36, 30, w, 46, 0.55, 23, "rgba(0,0,0,0.45)");
  text(ctx, label, 36 + w / 2, 62, { size: 24, fam: "Sans", color: "rgba(255,255,255,0.85)", align: "center" });
}
/** Hand-drawn up/down arrow (dir −1 = up). */
function vArrow(ctx: Ctx, cx: number, cy: number, len: number, dir: 1 | -1, u: number, color: string, w = 10) {
  if (u <= 0) return;
  arrow(ctx, cx, cy - (dir * len) / 2, cx, cy + (dir * len) / 2, u, { color, width: w, head: len * 0.32, seed: 7 });
}
/** Price tag on a string (footage annotations). */
function tag(ctx: Ctx, label: string, cx: number, cy: number, t: number, t0: number, o: { rot?: number; color?: string; size?: number } = {}) {
  const p = popS(t, t0, 0.3); if (p.u <= 0) return;
  const size = o.size ?? 44, w = measure(ctx, label, { size, fam: "Sans" }) + size * 1.3, h = size * 1.55;
  ctx.save(); ctx.globalAlpha *= p.a; ctx.translate(cx, cy);
  ctx.rotate((o.rot ?? -0.08) + Math.sin((t - t0) * 7) * 0.05 * Math.exp(-(t - t0) * 2.5)); ctx.scale(p.s, p.s);
  ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-w / 2 - 34, -h * 0.9); ctx.lineTo(-w / 2 + 14, 0); ctx.stroke();
  dropShadow(ctx, -w / 2, -h / 2, w, h, { r: 8, blur: 18, color: "rgba(0,0,0,0.45)", dy: 5 });
  ctx.fillStyle = o.color ?? C.red;
  ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2 + h * 0.36, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2, h / 2); ctx.lineTo(-w / 2 + h * 0.36, h / 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-w / 2 + h * 0.36, 0, size * 0.13, 0, Math.PI * 2); ctx.fill();
  text(ctx, label, h * 0.18, size * 0.36, { size, fam: "Sans", color: "#fff", align: "center" });
  ctx.restore();
}

// ---------- props ----------
function can(ctx: Ctx, cx: number, cy: number, s: number, o: { a?: number; empty?: number; rot?: number } = {}) {
  if ((o.a ?? 1) <= 0.001) return;
  const e = o.empty ?? 0;
  ctx.save(); ctx.globalAlpha *= o.a ?? 1; ctx.translate(cx, cy); ctx.rotate(o.rot ?? 0); ctx.scale(s, s);
  const body = e > 0 ? `rgba(160,150,140,${0.6 + 0.4 * (1 - e)})` : "#E2A93A";
  ctx.fillStyle = body; rr(ctx, -30, -50, 60, 100, 10); ctx.fill();
  ctx.fillStyle = e > 0 ? "rgba(255,255,255,0.5)" : "#FFF6E2"; ctx.fillRect(-30, -12, 60, 30);
  ctx.fillStyle = e > 0 ? "rgba(120,110,100,0.8)" : C.red; ctx.fillRect(-30, -4, 60, 8);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 4; rr(ctx, -30, -50, 60, 100, 10); ctx.stroke();
  ctx.fillStyle = "#C9CDD2"; ctx.beginPath(); ctx.ellipse(0, -50, 26, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (e > 0) { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(6, -50, 7, 3, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function maskBox(ctx: Ctx, cx: number, cy: number, s: number, o: { a?: number; dead?: number } = {}) {
  if ((o.a ?? 1) <= 0.001) return;
  const d = o.dead ?? 0;
  ctx.save(); ctx.globalAlpha *= o.a ?? 1; ctx.translate(cx, cy); ctx.scale(s, s);
  dropShadow(ctx, -60, -80, 120, 160, { r: 8, blur: 16, color: "rgba(40,30,20,0.35)", dy: 6 });
  ctx.fillStyle = d > 0 ? `rgb(${Math.round(lerp(244, 214, d))},${Math.round(lerp(214, 190, d))},${Math.round(lerp(220, 180, d))})` : "#F4D6DC";
  rr(ctx, -60, -80, 120, 160, 8); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 4; rr(ctx, -60, -80, 120, 160, 8); ctx.stroke();
  // a sheet mask: oval face with eye and mouth holes
  ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.ellipse(0, -14, 36, 44, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(26,26,26,0.5)"; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = "rgba(26,26,26,0.55)";
  for (const ex of [-13, 13]) { ctx.beginPath(); ctx.ellipse(ex, -24, 7, 4, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(0, 6, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
  text(ctx, "面膜", 0, 60, { size: 26, fam: "Sans", color: C.ink2, align: "center" });
  ctx.restore();
}
function shopFront(ctx: Ctx, cx: number, cy: number, s: number, kind: "cvs" | "bulk", a = 1) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.scale(s, s);
  const w = kind === "cvs" ? 300 : 420, h = kind === "cvs" ? 230 : 250;
  ctx.fillStyle = "#FBF9F4"; rr(ctx, -w / 2, -h / 2, w, h, 6); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 5; rr(ctx, -w / 2, -h / 2, w, h, 6); ctx.stroke();
  // awning stripes
  const stripes = kind === "cvs" ? 6 : 8, sw = w / stripes;
  for (let k = 0; k < stripes; k++) { ctx.fillStyle = k % 2 ? "#FBF9F4" : kind === "cvs" ? C.blue : C.red; ctx.fillRect(-w / 2 + k * sw, -h / 2, sw, 46); }
  ctx.strokeRect(-w / 2, -h / 2, w, 46);
  // door and window
  ctx.strokeRect(-w / 2 + 26, -h / 2 + 76, w * 0.42, h - 100);
  ctx.strokeRect(w * 0.06, -h / 2 + 76, w * 0.36, h - 76);
  if (kind === "bulk") for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) { ctx.fillStyle = "#E2A93A"; ctx.fillRect(-w / 2 + 40 + k * 46, -h / 2 + 100 + j * 50, 34, 38); ctx.strokeRect(-w / 2 + 40 + k * 46, -h / 2 + 100 + j * 50, 34, 38); }
  else { can(ctx, -w / 2 + 26 + w * 0.21, 10, 0.75); }
  ctx.restore();
}
function shoe(ctx: Ctx, cx: number, cy: number, s: number, color: string, a = 1) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.fillStyle = color; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(-90, 30); ctx.lineTo(-90, -30); ctx.quadraticCurveTo(-80, -50, -50, -48); ctx.lineTo(-20, -40); ctx.quadraticCurveTo(10, -10, 50, -2); ctx.quadraticCurveTo(95, 4, 95, 30); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#FBF9F4"; ctx.fillRect(-92, 24, 189, 16); ctx.strokeRect(-92, 24, 189, 16);
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-34 + k * 16, -30 + k * 8); ctx.lineTo(-18 + k * 16, -38 + k * 8); ctx.stroke(); }
  ctx.restore();
}
function shirt(ctx: Ctx, cx: number, cy: number, s: number, color: string, a = 1) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.fillStyle = color; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(-30, -70); ctx.quadraticCurveTo(0, -48, 30, -70); ctx.lineTo(84, -44); ctx.lineTo(64, -6); ctx.lineTo(46, -16); ctx.lineTo(46, 74); ctx.lineTo(-46, 74); ctx.lineTo(-46, -16); ctx.lineTo(-64, -6); ctx.lineTo(-84, -44); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function bookCover(ctx: Ctx, cx: number, cy: number, s: number, rot: number, a = 1) {
  if (a <= 0.001) return;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(s, s); ctx.globalAlpha *= a;
  dropShadow(ctx, -230, -320, 460, 640, { r: 6, blur: 34, color: "rgba(40,30,20,0.45)", dy: 14 });
  ctx.fillStyle = "#F4EFE2"; rr(ctx, -230, -320, 460, 640, 6); ctx.fill();
  ctx.fillStyle = "#2F5D8C"; ctx.fillRect(-230, 150, 460, 70);
  ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(-230, -320, 18, 640);
  const J = (size: number, color: string = C.ink): TextOpt => ({ size, fam: "JP", color, mixNum: false });
  text(ctx, "お金が貯まる人は、", -190, -200, J(44));
  text(ctx, "なぜ部屋が", -190, -130, J(58));
  text(ctx, "きれいなのか", -190, -60, J(58, C.red));
  text(ctx, "「自然に貯まる人」がやっている50の行動", -190, 10, J(21, C.ink2));
  text(ctx, "黒田尚子", -190, 120, J(40));
  text(ctx, "日本経済新聞出版", 0, 196, { ...J(26, "#fff"), align: "center" });
  ctx.restore();
}
const SRC_LINE = "黑田尚子《お金が貯まる人は、なぜ部屋がきれいなのか》（日本经济新闻出版，2022）";

// ================= HOOK =================
// h1 · the belief, over a shopper weighing up a price
export function shopHud(ctx: Ctx, { t }: PaintArgs) {
  topShade(ctx, 0.5, 0.55);
  say(ctx, "你是不是总以为", 110, 170, WT(92), ct("s00", "你是不是总以为"), t);
  say(ctx, "越追求", 104, 330, WT(120), ct("s00", "越追求"), t);
  const x2 = 104 + measure(ctx, "越追求", { size: 120, fam: "Display" }) + 20;
  marker(ctx, x2 - 6, 278, measure(ctx, "性价比", { size: 150, fam: "Display" }) + 18, 92, prog(t, T.cpr + 0.15, 0.3), C.marker, 0.75);
  say(ctx, "性价比", x2, 330, { ...WT(150), color: "#fff" }, ct("s00", "性价比"), t);
  tag(ctx, "特价", 1220, 600, t, T.cpr + 0.05, { rot: 0.1 });
}
// h2 · ... the more you save? (calculator)
export function calc1Hud(ctx: Ctx, { t }: PaintArgs) {
  leftShade(ctx, 0.55, 0.7);
  say(ctx, "就越能", 110, 270, WT(96), ct("s00", "就越能"), t);
  say(ctx, "攒下钱", 104, 520, WT(230), ct("s00", "攒下钱"), t);
  const w = measure(ctx, "攒下钱", { size: 230, fam: "Display" });
  const p = popS(t, T.saveEnd - 0.05, 0.3);
  if (p.u > 0) { ctx.save(); ctx.globalAlpha *= p.a; ctx.translate(140 + w + 60, 440); ctx.rotate(0.12); ctx.scale(p.s, p.s); text(ctx, "？", 0, 80, { size: 260, fam: "Display", color: C.marker, align: "center", shadow: SH }); ctx.restore(); }
}
// h3 · who says so (stand-in footage, labelled)
export function deskHud(ctx: Ctx, { t }: PaintArgs) {
  standIn(ctx);
  const u = E.out(prog(t, T.desk - 0.02, 0.4)), x = 90 - (1 - u) * 800;
  card(ctx, x, 170, 720, 520, { rot: -0.012, fill: "#FBF8F1", shadow: 34 }, () => {
    pill(ctx, "日本 · 理财规划师（FP）", 52, 92, t, T.jp - 0.1, { size: 34, bg: C.red });
    say(ctx, "黑田尚子", 48, 290, INK(150), ct("s01", "黑田尚子"), t, 0.15);
    text(ctx, "Kuroda Naoko", 56, 352, { size: 36, fam: "Num", color: C.ink3, alpha: prog(t, T.name + 0.35, 0.3) });
    rule(ctx, 52, 392, 668, prog(t, T.name + 0.3, 0.35));
    text(ctx, "著有《お金が貯まる人は、", 56, 452, { size: 32, fam: "JP", color: C.ink2, alpha: prog(t, T.name + 0.45, 0.3), mixNum: false });
    text(ctx, "なぜ部屋がきれいなのか》", 56, 496, { size: 32, fam: "JP", color: C.ink2, alpha: prog(t, T.name + 0.55, 0.3), mixNum: false });
  });
}
// h4 · the flip: what you thought vs what she says
function box(ctx: Ctx, label: string, cx: number, cy: number, t: number, t0: number, o: { size?: number; color?: string; fill?: string; border?: string; w?: number } = {}) {
  const p = popS(t, t0, 0.3); if (p.u <= 0) return;
  const size = o.size ?? 84, w = o.w ?? measure(ctx, label, { size, fam: "Display" }) + size * 0.9, h = size * 1.6;
  ctx.save(); ctx.globalAlpha *= p.a; ctx.translate(cx, cy); ctx.scale(p.s, p.s);
  dropShadow(ctx, -w / 2, -h / 2, w, h, { r: 14, blur: 22, color: "rgba(40,30,20,0.3)", dy: 8 });
  ctx.fillStyle = o.fill ?? "#FFFDF5"; rr(ctx, -w / 2, -h / 2, w, h, 14); ctx.fill();
  ctx.strokeStyle = o.border ?? C.ink; ctx.lineWidth = 5; rr(ctx, -w / 2, -h / 2, w, h, 14); ctx.stroke();
  text(ctx, label, 0, size * 0.36, { size, fam: "Display", color: o.color ?? C.ink, align: "center" });
  ctx.restore();
}
export function flipCam(): CamKey[] {
  return [{ t: T.flip, s: 1.0, x: 960, y: 520 }, { t: T.too - 0.13, s: 1.03, x: 960, y: 520, ease: "linear" },
          { t: T.too - 0.12, s: 1.12, x: 960, y: 590, ease: "linear" }, { t: T.book, s: 1.17, x: 960, y: 600, ease: "linear" }];
}
export function flipPaint(ctx: Ctx, { t }: PaintArgs) {
  // row 1: the belief (already said), struck on "恰恰相反"
  const r1 = 320, a1 = 1 - 0.45 * prog(t, T.opp + 0.3, 0.4);
  ctx.save(); ctx.globalAlpha *= a1;
  text(ctx, "你以为", 170, r1 - 105, { ...INK(44, "Sans", C.ink3), alpha: prog(t, T.flip, 0.2) });
  box(ctx, "追求性价比", 520, r1, t, T.flip - 0.3);
  arrow(ctx, 790, r1, 1040, r1, prog(t, T.flip - 0.15, 0.3), { color: C.ink2, width: 8 });
  box(ctx, "存款", 1270, r1, t, T.flip - 0.05, { color: C.blue, border: C.blue });
  vArrow(ctx, 1430, r1, 110, -1, prog(t, T.flip + 0.05, 0.3), C.blue, 11);
  ctx.restore();
  strike(ctx, 330, r1 + 6, 1500, r1 - 10, prog(t, T.opp + 0.12, 0.3), { color: C.red, width: 12 });
  stamp(ctx, "恰恰相反", 1530, 300, t, T.opp + 0.05, { size: 92, rot: 0.1 });
  // row 2: what she says
  const r2 = 680;
  text(ctx, "黑田尚子说", 170, r2 - 130, { ...INK(44, "Sans", C.red), alpha: prog(t, T.too - 0.15, 0.2) });
  box(ctx, "太在意性价比", 560, r2, t, T.too - 0.08, { w: 640 });
  marker(ctx, 302, r2 + 46, 262, 26, prog(t, T.too + 0.05, 0.3), C.marker, 0.8);
  arrow(ctx, 900, r2, 1110, r2, prog(t, T.cpr2 + 0.15, 0.3), { color: C.red, width: 9 });
  box(ctx, "资产", 1300, r2, t, T.asset - 0.08, { color: C.red, border: C.red });
  vArrow(ctx, 1455, r2, 110, 1, prog(t, T.asset + 0.2, 0.3), C.red, 11);
  stamp(ctx, "受损", 1300, r2 + 150, t, T.hurt - 0.02, { size: 84, rot: -0.1 });
}
// h5 · her book has a chapter titled...
export function bookPaint(ctx: Ctx, { t }: PaintArgs) {
  const bu = E.out(prog(t, T.book - 0.15, 0.45));
  bookCover(ctx, 600, 480, 0.85 + 0.15 * bu, -0.05, clamp(bu * 2));
  // a red bookmark tab pokes out of the pages on "有一章"
  const mu = E.back(prog(t, T.chap - 0.05, 0.3));
  if (mu > 0) {
    ctx.save(); ctx.translate(600, 480); ctx.rotate(-0.05);
    ctx.fillStyle = C.red; const tx = 195, ty = -260, tw = 70 + 70 * mu;
    rr(ctx, tx, ty, tw, 96, 8); ctx.fill();
    text(ctx, "第2章", tx + tw - 64, ty + 62, { size: 36, fam: "Sans", color: "#fff", align: "center", alpha: clamp(mu) });
    ctx.restore();
  }
  say(ctx, "她的书里", 1030, 330, INK(80), ct("s03", "她的书里"), t);
  say(ctx, "有一章的", 1030, 470, INK(110), ct("s03", "有一章的"), t);
  say(ctx, "标题就叫：", 1030, 620, INK(110, "Display", C.red), ct("s03", "标题就叫"), t);
  foot(ctx, SRC_LINE, 310, 900, t, T.book + 0.2);
}
// h6 · the chapter title, in the original and in Chinese
export function chapterPaint(ctx: Ctx, { t }: PaintArgs) {
  const cu = E.out(prog(t, T.chapter - 0.1, 0.35));
  card(ctx, 200, 110, 1520, 760, { a: clamp(cu * 2), s: 0.94 + 0.06 * cu, rot: -0.006, fill: "#FFFDF5" }, () => {
    pill(ctx, "第2章", 70, 80, t, T.chapter, { size: 36, bg: C.red });
    // the original title types itself out as the Chinese is read
    const jp1 = "お酒はコンビニで買えば", jp2 = "お金が貯まる", n1 = [...jp1].length, n2 = [...jp2].length;
    const k = Math.floor((t - T.chapter - 0.05) / 0.045);
    const J = (size: number, color: string = C.ink): TextOpt => ({ size, fam: "JP", color, mixNum: false });
    text(ctx, jp1, 70, 230, J(64, C.ink2), (i) => (i < k ? {} : null));
    text(ctx, jp2, 70, 320, J(64, C.ink2), (i) => (i + n1 < k ? {} : null));
    if (k > n1 + n2 + 2) text(ctx, "（原文）", 70 + measure(ctx, jp2, J(64)) + 20, 316, { size: 30, fam: "Sans", color: C.ink3 });
    rule(ctx, 70, 384, 1450, prog(t, T.jiu - 0.2, 0.4));
    say(ctx, "酒去便利店买，", 64, 540, INK(124), ct("s04", "酒去便利店买"), t);
    const mw = measure(ctx, "反而攒得下钱", { size: 150, fam: "Display" });
    marker(ctx, 60, 650, mw + 16, 96, prog(t, T.saved + 0.1, 0.35), C.marker, 0.8);
    say(ctx, "反而攒得下钱", 64, 700, INK(150, "Display", C.red), ct("s04", "反而攒得下钱"), t);
  });
  stamp(ctx, "反常识", 1530, 300, t, T.savedEnd - 0.12, { size: 96, rot: 0.12 });
  foot(ctx, "出自：" + SRC_LINE, 210, 930, t, T.chapter + 0.4);
}
// h7 · "isn't the convenience store dearer?"
export function storePaint(ctx: Ctx, { t }: PaintArgs) {
  const a = prog(t, T.store - 0.05, 0.25), b = prog(t, T.store + 0.15, 0.25);
  shopFront(ctx, 540, 450, 1.75, "cvs", a);
  sayC(ctx, "便利店", 540, 790, INK(96), ct("s05", "便利店"), t);
  shopFront(ctx, 1400, 450, 1.45, "bulk", b * 0.9);
  text(ctx, "折扣店 · 整箱", 1400, 790, { ...INK(64, "Display", C.ink2), align: "center", alpha: b * 0.9 });
  tag(ctx, "更贵", 860, 210, t, T.pricier - 0.08, { rot: 0.1, size: 54 });
  tag(ctx, "便宜", 1750, 210, t, T.pricier + 0.1, { rot: -0.08, color: C.blue, size: 54 });
  const p = popS(t, T.q - 0.08, 0.3);
  if (p.u > 0) { ctx.save(); ctx.globalAlpha *= p.a; ctx.translate(960, 470); ctx.scale(p.s, p.s); text(ctx, "？", 0, 90, { size: 300, fam: "Display", color: C.red, align: "center" }); ctx.restore(); }
}
// h8 · dearer, so you buy only tonight's can
export function onePaint(ctx: Ctx, { t }: PaintArgs) {
  say(ctx, "贵一点", 160, 260, INK(110), ct("s06", "贵一点"), t);
  say(ctx, "你只会买", 160, 440, INK(96, "Display", C.ink2), ct("s06", "你只会买"), t);
  say(ctx, "今晚要喝的", 160, 580, INK(96, "Display", C.ink2), ct("s06", "今晚要喝的"), t);
  say(ctx, "那一罐", 160, 760, INK(150, "Display", C.blue), ct("s06", "那一罐"), t);
  const p = popS(t, T.only - 0.05, 0.35);
  if (p.u > 0) can(ctx, 1320, 520, 3.4 * p.s, { a: p.a, rot: 0.06 });
  ring(ctx, 1320, 520, 210, 280, prog(t, T.can1 - 0.05, 0.4), { color: C.blue, width: 9 });
  const n = popS(t, T.can1End + 0.02, 0.3);
  if (n.u > 0) { ctx.save(); ctx.globalAlpha *= n.a; ctx.translate(1640, 280); ctx.scale(n.s, n.s); text(ctx, "×1", 0, 50, { size: 140, fam: "Num", color: C.blue, bold: 4, align: "center" }); ctx.restore(); }
}
// h9 · cheap by the case → you drink more
const CASE = { x: 260, y: 300, cols: 6, rows: 4, dx: 118, dy: 140 };
export function cansPaint(ctx: Ctx, { t }: PaintArgs) {
  say(ctx, "图便宜", 260, 190, INK(96), ct("s07", "图便宜"), t);
  pill(ctx, "整箱 ×24", 640, 158, t, T.box - 0.05, { size: 44, bg: C.ink });
  // the case
  const bu = prog(t, T.box - 0.15, 0.3);
  if (bu > 0) {
    const bw = CASE.cols * CASE.dx + 40, bh = CASE.rows * CASE.dy + 40;
    ctx.save(); ctx.globalAlpha *= clamp(bu * 3);
    ctx.fillStyle = "#D9B98A"; rr(ctx, CASE.x - 20, CASE.y - 20, bw, bh, 10); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 6; rr(ctx, CASE.x - 20, CASE.y - 20, bw, bh, 10); ctx.stroke();
    ctx.restore();
  }
  let drunk = 0;
  for (let r = 0; r < CASE.rows; r++) for (let c = 0; c < CASE.cols; c++) {
    const k = r * CASE.cols + c, t0 = T.box + k * 0.022, p = popS(t, t0, 0.22);
    if (p.u <= 0) continue;
    const ord = (k * 7) % 24, te = T.drink - 0.05 + ord * 0.045, e = clamp(prog(t, te, 0.12));
    if (ord < 15 && e > 0) drunk++;
    can(ctx, CASE.x + 40 + c * CASE.dx, CASE.y + 60 + r * CASE.dy, 1.0 * p.s, { a: p.a, empty: ord < 15 ? e : 0 });
  }
  // the count of what got drunk
  const cu = prog(t, T.drink - 0.1, 0.25);
  if (cu > 0) {
    text(ctx, "喝掉", 1290, 420, { ...INK(64, "Sans", C.ink2), alpha: clamp(cu * 3) });
    const w = text(ctx, String(drunk), 1290, 640, { size: 230, fam: "Num", color: C.red, bold: 5, alpha: clamp(cu * 3) });
    text(ctx, "罐", 1300 + w, 630, { ...INK(90), alpha: clamp(cu * 3) });
  }
  say(ctx, "喝得更多", 1290, 800, INK(110, "Display", C.red), [...ct("s07", "喝得"), ...ct("s07", "更多")], t);
  vArrow(ctx, 1770, 720, 150, -1, prog(t, T.more + 0.05, 0.3), C.red, 12);
  foot(ctx, "示意：一箱以24罐计", 260, 900, t, T.box + 0.5);
}

// ================= STOCKPILING =================
export function cartHud(ctx: Ctx, { t }: PaintArgs) {
  standIn(ctx);
  tag(ctx, "限时特价", 330, 300, t, T.deal - 0.08, { rot: -0.1 });
  tag(ctx, "第2件半价", 470, 520, t, T.crazy - 0.08, { rot: 0.08 });
  tag(ctx, "满199减30", 260, 720, t, T.crazy + 0.18, { rot: -0.06 });
  stamp(ctx, "囤货", 1420, 460, t, T.hoardW - 0.05, { size: 150, rot: -0.12, color: "#FFFFFF" });
}
export function cart2Hud(ctx: Ctx, { t }: PaintArgs) {
  standIn(ctx);
  tag(ctx, "买一送一", 420, 330, t, T.low - 0.08, { rot: -0.08 });
  callout(ctx, "一堆闲置", 1220, 560, 900, 700, t, T.pileW - 0.08, { size: 54, bg: "#fff", fg: C.red });
  stamp(ctx, "闲置", 1460, 330, t, T.idle1 - 0.05, { size: 130, rot: 0.1, color: "#FFFFFF" });
}
export function hoardHud(ctx: Ctx, { t }: PaintArgs) {
  topShade(ctx, 0.45, 0.4);
  standIn(ctx);
  say(ctx, "东西堆在家里", 110, 200, WT(96), ct("s09", "东西堆在家里"), t);
  // the floor space it takes: a dashed outline drawn round the pile
  const u = E.out(prog(t, T.space - 0.15, 0.45));
  if (u > 0) {
    ctx.save(); ctx.setLineDash([22, 14]); ctx.lineDashOffset = -t * 60; ctx.strokeStyle = C.marker; ctx.lineWidth = 8; ctx.globalAlpha *= clamp(u * 2);
    ctx.beginPath(); ctx.ellipse(1000, 640, 700 * u, 330 * u, -0.05, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.globalAlpha *= 0.18 * u; ctx.fillStyle = C.marker; ctx.beginPath(); ctx.ellipse(1000, 640, 700 * u, 330 * u, -0.05, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  callout(ctx, "占用空间", 1380, 290, 1260, 420, t, T.space - 0.05, { size: 56, bg: C.marker, fg: C.ink });
}
export function messyHud(ctx: Ctx, { t }: PaintArgs) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(0,0,0,0.15)"); g.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  standIn(ctx);
  stamp(ctx, "过期", 460, 330, t, T.exp - 0.05, { size: 130, rot: -0.14 });
  stamp(ctx, "闲置", 960, 540, t, T.idle - 0.05, { size: 150, rot: 0.08 });
  stamp(ctx, "丢弃", 1460, 330, t, T.toss - 0.05, { size: 170, rot: -0.1 });
}

// ================= THE SUM =================
export function calc2Hud(ctx: Ctx, { t }: PaintArgs) {
  leftShade(ctx, 0.5, 0.6);
  pill(ctx, "算笔账", 110, 160, t, T.sumW - 0.1, { size: 60, bg: C.ink });
  say(ctx, "面膜", 110, 420, WT(200), ct("s10", "面膜"), t);
}
export function dealPaint(ctx: Ctx, { t }: PaintArgs) {
  text(ctx, "举个例子：面膜", 160, 150, { ...INK(56, "Sans", C.ink2), alpha: prog(t, T.deal2, 0.25) });
  pill(ctx, "示意价格", 560, 132, t, T.deal2 + 0.1, { size: 28, bg: C.ink3 });
  // row A: one box
  const ra = 330;
  say(ctx, "单买", 160, ra + 30, INK(72), ct("s10", "单买"), t);
  const pa = popS(t, T.single, 0.3);
  if (pa.u > 0) maskBox(ctx, 430, ra, 1.0 * pa.s, { a: pa.a });
  const ua = prog(t, T.p40 - 0.1, 0.25);
  if (ua > 0) {
    const w = text(ctx, `¥${Math.round(countUp(t, T.p40 - 0.1, 0.35, 0, MASK.single))}`, 560, ra + 50, { size: 120, fam: "Num", color: C.ink, bold: 3, alpha: clamp(ua * 3) });
    text(ctx, "/ 盒", 576 + w, ra + 46, { ...INK(48, "Sans", C.ink3), alpha: clamp(ua * 3) });
  }
  rule(ctx, 150, 470, 1120, prog(t, T.stock - 0.3, 0.4), "rgba(26,26,26,0.15)");
  // row B: six boxes
  const rb = 640;
  say(ctx, "囤6盒", 160, rb - 110, INK(72), ct("s10", "囤6盒"), t);
  for (let k = 0; k < MASK.pack; k++) { const p = popS(t, T.stock + 0.1 + k * 0.06, 0.25); if (p.u > 0) maskBox(ctx, 220 + k * 135, rb + 60, 0.8 * p.s, { a: p.a }); }
  const ub = prog(t, T.p180 - 0.1, 0.25);
  if (ub > 0) {
    const w = text(ctx, `¥${Math.round(countUp(t, T.p180 - 0.1, 0.5, 0, MASK.packPrice))}`, 990, rb + 90, { size: 120, fam: "Num", color: C.ink, bold: 3, alpha: clamp(ub * 3) });
    text(ctx, `= ¥${PER} / 盒`, 1000, rb + 160, { ...INK(42, "Sans", C.ink3), alpha: prog(t, T.p180 + 0.4, 0.3) });
    void w;
  }
  // right: "looks like you saved 60"
  const ru = E.out(prog(t, T.look - 0.15, 0.35));
  if (ru > 0) card(ctx, 1290, 230, 500, 560, { a: clamp(ru * 2), s: 0.9 + 0.1 * ru, rot: 0.015, fill: "#FFFDF5" }, () => {
    say(ctx, "看着省了", 44, 110, INK(72), ct("s10", "看着省了"), t);
    const vu = prog(t, T.s60 - 0.12, 0.25);
    if (vu > 0) {
      marker(ctx, 34, 300, 380, 120, prog(t, T.s60End, 0.35), C.marker, 0.7);
      text(ctx, `¥${Math.round(countUp(t, T.s60 - 0.12, 0.4, 0, SEEMS_SAVED))}`, 44, 350, { size: 200, fam: "Num", color: C.blue, bold: 5, alpha: clamp(vu * 3) });
    }
    text(ctx, `(${MASK.single} − ${PER}) × ${MASK.pack} = ${SEEMS_SAVED}`, 46, 470, { size: 38, fam: "Num", color: C.ink3, alpha: prog(t, T.s60End + 0.1, 0.3) });
  });
}
export function wastePaint(ctx: Ctx, { t }: PaintArgs) {
  const y = 330, x0 = 260, dx = 240;
  for (let k = 0; k < MASK.pack; k++) {
    const isLeft = k >= MASK.used, dead = isLeft ? E.out(prog(t, T.expire - 0.05, 0.4)) : 0;
    const shift = isLeft ? 70 * E.inOut(prog(t, T.left2 - 0.1, 0.4)) : 0;
    maskBox(ctx, x0 + k * dx + shift, y, 1.05, { a: prog(t, T.waste - 0.1 + k * 0.03, 0.2), dead });
    if (!isLeft) tick(ctx, x0 + k * dx, y - 10, 46, t, T.used4 + k * 0.1);
  }
  const lu = prog(t, T.used4 + 0.3, 0.3);
  if (lu > 0) { rule(ctx, x0 - 70, 470, x0 + 3 * dx + 70, lu, C.blue, 5); text(ctx, "用掉 4 盒", x0 + 1.5 * dx, 540, { ...INK(60, "Sans", C.blue), align: "center", alpha: lu }); }
  const ru = prog(t, T.left2 - 0.05, 0.3);
  if (ru > 0) { rule(ctx, x0 + 4 * dx, 470, x0 + 5 * dx + 140, ru, C.red, 5); text(ctx, "剩 2 盒", x0 + 4.5 * dx + 70, 540, { ...INK(60, "Sans", C.red), align: "center", alpha: ru }); }
  stamp(ctx, "过期", x0 + 4.5 * dx + 70, y - 10, t, T.expire - 0.05, { size: 110, rot: -0.12 });
  // what you actually needed
  const bu = E.out(prog(t, T.buy4 - 0.15, 0.35));
  if (bu > 0) card(ctx, 200, 640, 1520, 200, { a: clamp(bu * 2), s: 0.95 + 0.05 * bu, fill: "#FFFDF5" }, () => {
    say(ctx, "单买4盒", 48, 128, INK(80), ct("s11", "单买4盒"), t);
    text(ctx, `${MASK.used} × ${MASK.single} =`, 420, 128, { size: 76, fam: "Num", color: C.ink2, alpha: prog(t, T.buy4 + 0.3, 0.3) });
    say(ctx, "才", 790, 128, INK(80, "Display", C.ink2), ct("s11", "才"), t);
    const vu = prog(t, T.p160 - 0.12, 0.25);
    if (vu > 0) text(ctx, `¥${Math.round(countUp(t, T.p160 - 0.12, 0.4, 0, NEEDED))}`, 900, 140, { size: 150, fam: "Num", color: C.blue, bold: 4, alpha: clamp(vu * 3) });
    text(ctx, "就够用", 1250, 128, { ...INK(64, "Sans", C.ink3), alpha: prog(t, T.p160End + 0.1, 0.3) });
  });
}
export function lossHud(ctx: Ctx, { t }: PaintArgs) {
  const u = E.out(prog(t, T.loss - 0.1, 0.4));
  card(ctx, 940, 110, 860, 760, { a: clamp(u * 2), s: 0.92 + 0.08 * u, rot: 0.012, fill: "#FFFDF5", shadow: 40 }, () => {
    text(ctx, "实付", 60, 120, INK(56, "Sans", C.ink3));
    text(ctx, `¥${MASK.packPrice}`, 220, 126, { size: 96, fam: "Num", color: C.ink, bold: 3 });
    text(ctx, "够用只需", 60, 250, INK(56, "Sans", C.ink3));
    text(ctx, `¥${NEEDED}`, 330, 256, { size: 96, fam: "Num", color: C.blue, bold: 3 });
    rule(ctx, 50, 310, 800, 1, "rgba(26,26,26,0.2)");
    // the "saving" that never was
    const su = prog(t, T.diff - 0.1, 0.3);
    if (su > 0) {
      text(ctx, "省下的差价", 60, 410, { ...INK(52, "Sans", C.ink2), alpha: su });
      text(ctx, `¥${SEEMS_SAVED}`, 380, 416, { size: 96, fam: "Num", color: C.blue, bold: 3, alpha: su });
      strike(ctx, 50, 400, 600, 370, prog(t, T.white - 0.05, 0.3), { color: C.red, width: 12 });
    }
    stamp(ctx, "白白浪费", 640, 380, t, T.white + 0.1, { size: 64, rot: 0.12 });
    const bu = prog(t, T.back - 0.1, 0.25);
    if (bu > 0) {
      text(ctx, "还倒贴", 60, 600, { ...INK(80, "Display", C.red), alpha: clamp(bu * 3) });
      text(ctx, `¥${Math.round(countUp(t, T.p20 - 0.1, 0.4, 0, OVERPAID))}`, 330, 620, { size: 190, fam: "Num", color: C.red, bold: 6, alpha: clamp(bu * 3) });
      text(ctx, `${MASK.packPrice} − ${NEEDED} = ${OVERPAID}`, 64, 700, { size: 40, fam: "Num", color: C.ink3, alpha: prog(t, T.p20End, 0.3) });
    }
  });
}

// ================= THE RULE =================
export function quotePaint(ctx: Ctx, { t }: PaintArgs) {
  const u = E.out(prog(t, T.quote - 0.1, 0.4));
  card(ctx, 180, 120, 1560, 720, { a: clamp(u * 2), s: 0.95 + 0.05 * u, rot: -0.008, fill: "#FFFDF5" }, () => {
    say(ctx, "书里说：", 70, 110, INK(64, "Display", C.ink3), ct("s13", "书里说"), t);
    const J: TextOpt = { size: 52, fam: "JP", color: C.ink2, mixNum: false };
    const a = prog(t, T.says + 0.2, 0.4);
    text(ctx, "「今まで持っていなかったものの", 70, 230, { ...J, alpha: a });
    text(ctx, "大半は実はいらないものである」", 96, 310, { ...J, alpha: a });
    rule(ctx, 70, 370, 1490, prog(t, T.never - 0.2, 0.4));
    say(ctx, "过去未曾拥有的，", 64, 510, INK(110), ct("s13", "过去未曾拥有的"), t);
    const mw = measure(ctx, "多半是不需要的", { size: 130, fam: "Display" });
    marker(ctx, 60, 610, mw + 16, 86, prog(t, T.unneeded, 0.4), C.marker, 0.8);
    say(ctx, "多半是不需要的", 64, 655, INK(130, "Display", C.red), ct("s13", "多半是不需要的"), t);
  });
  foot(ctx, "出自：" + SRC_LINE + " 内容简介", 190, 900, t, T.quote + 0.4);
}
export function neqHud(ctx: Ctx, { t }: PaintArgs) {
  leftShade(ctx, 0.78, 0.85);
  tag(ctx, "特价", 1380, 300, t, T.cheapW - 0.1, { rot: 0.12 });
  tag(ctx, "清仓", 1640, 560, t, T.dealW - 0.1, { rot: -0.1 });
  const row = (s1: string, s2: string, y: number, t1: number, tn: number, t2: number, times2: number[]) => {
    popWord(ctx, s1, 120, y, WT(140), t, t1 - 0.1);
    const w1 = measure(ctx, s1, { size: 140, fam: "Display" });
    popWord(ctx, "≠", 120 + w1 + 40, y, { ...WT(150, "Sans"), color: C.red }, t, tn - 0.08);
    const x2 = 120 + w1 + 40 + measure(ctx, "≠", { size: 150, fam: "Sans" }) + 40;
    say(ctx, s2, x2, y, WT(140), times2, t);
    void t2;
  };
  row("便宜", "值得买", 400, T.cheapW, T.neq1, T.worth, ct("s14", "值得买"));
  row("优惠", "你需要", 680, T.dealW, T.neq2, T.need, ct("s14", "你需要"));
}
export function rulePaint(ctx: Ctx, { t }: PaintArgs) {
  const side = (x: number, color: string, t0: number) => E.out(prog(t, t0 - 0.15, 0.35));
  const lu = side(160, C.blue, T.dearW), ru = side(1000, C.red, T.cheapR);
  if (lu > 0) card(ctx, 140, 150, 760, 660, { a: clamp(lu * 2), s: 0.93 + 0.07 * lu, rot: -0.012, fill: "#FFFDF5", border: "rgba(36,87,164,0.35)" }, () => {
    say(ctx, "贵", 60, 170, INK(130), ct("s15", "贵"), t);
    text(ctx, "+", 220, 160, { size: 90, fam: "Num", color: C.ink3, alpha: prog(t, T.freq - 0.1, 0.2) });
    say(ctx, "高频使用", 300, 170, INK(100, "Display", C.blue), ct("s15", "高频使用"), t);
    rule(ctx, 50, 260, 710, prog(t, T.freq + 0.3, 0.35));
    say(ctx, "划算", 60, 480, INK(200, "Display", C.blue), ct("s15", "划算"), t);
    tick(ctx, 590, 400, 90, t, T.worthIt + 0.2);
  });
  if (ru > 0) card(ctx, 1020, 150, 760, 660, { a: clamp(ru * 2), s: 0.93 + 0.07 * ru, rot: 0.012, fill: "#FFFDF5", border: "rgba(217,56,43,0.35)" }, () => {
    say(ctx, "再便宜", 60, 170, INK(110), ct("s15", "再便宜"), t);
    text(ctx, "+", 400, 160, { size: 90, fam: "Num", color: C.ink3, alpha: prog(t, T.unused - 0.1, 0.2) });
    say(ctx, "用不上", 470, 170, INK(100, "Display", C.red), ct("s15", "用不上"), t);
    rule(ctx, 50, 260, 710, prog(t, T.unused + 0.3, 0.35));
    say(ctx, "纯亏损", 60, 480, INK(180, "Display", C.red), ct("s15", "纯亏损"), t);
    xMark(ctx, 640, 400, 70, t, T.pureEnd - 0.05);
  });
}
export function perUsePaint(ctx: Ctx, { t }: PaintArgs) {
  const hu = prog(t, T.perUse + 0.05, 0.3);
  text(ctx, "每次使用成本 = 价格 ÷ 使用次数", W / 2, 140, { ...INK(52, "Sans", C.ink2), align: "center", alpha: hu });
  rule(ctx, 380, 180, 1540, hu);
  inkPath(ctx, [[960, 240], [960, 840]], E.out(prog(t, T.shirt - 0.3, 0.4)), { color: "rgba(26,26,26,0.2)", width: 4, seed: 9 });
  // left: the shoe
  const s1 = popS(t, T.shoe - 0.1, 0.35);
  if (s1.u > 0) shoe(ctx, 320, 400, 1.5 * s1.s, C.blue, s1.a);
  if (s1.u > 0) text(ctx, "¥500", 560, 420, { size: 110, fam: "Num", color: C.ink, bold: 3, alpha: s1.a });
  const wu = prog(t, T.wear - 0.1, 0.25);
  if (wu > 0) {
    text(ctx, "穿", 180, 620, { ...INK(70, "Sans", C.ink2), alpha: clamp(wu * 3) });
    const n = Math.round(countUp(t, T.wear - 0.05, 0.55, 0, 500));
    const w = text(ctx, String(n), 270, 630, { size: 120, fam: "Num", color: C.ink, bold: 3, alpha: clamp(wu * 3) });
    text(ctx, "次", 284 + w, 620, { ...INK(70, "Sans", C.ink2), alpha: clamp(wu * 3) });
  }
  const ou = popS(t, T.once1 - 0.1, 0.3);
  if (ou.u > 0) { ctx.save(); ctx.globalAlpha *= ou.a; ctx.translate(500, 790); ctx.scale(ou.s, ou.s); text(ctx, "每次 ¥1", 0, 0, { size: 120, fam: "Display", color: C.blue, align: "center" }); ctx.restore(); }
  tick(ctx, 830, 740, 60, t, T.once1 + 0.3);
  // right: the shirt never worn
  const s2 = popS(t, T.shirt - 0.1, 0.35);
  if (s2.u > 0) { shirt(ctx, 1240, 410, 1.35 * s2.s, "#C9D3DC", s2.a); tag(ctx, "¥50", 1380, 300, t, T.shirt + 0.05, { rot: 0.15, size: 46 }); }
  if (s2.u > 0) text(ctx, "¥50", 1460, 450, { size: 110, fam: "Num", color: C.ink, bold: 3, alpha: s2.a });
  const nu = prog(t, T.never0 - 0.1, 0.25);
  if (nu > 0) {
    text(ctx, "穿", 1080, 620, { ...INK(70, "Sans", C.ink2), alpha: clamp(nu * 3) });
    const w = text(ctx, "0", 1170, 630, { size: 120, fam: "Num", color: C.red, bold: 3, alpha: clamp(nu * 3) });
    text(ctx, "次", 1184 + w, 620, { ...INK(70, "Sans", C.ink2), alpha: clamp(nu * 3) });
  }
  const au = popS(t, T.all - 0.1, 0.3);
  if (au.u > 0) { ctx.save(); ctx.globalAlpha *= au.a; ctx.translate(1420, 790); ctx.scale(au.s, au.s); text(ctx, "¥50 全亏", 0, 0, { size: 120, fam: "Display", color: C.red, align: "center" }); ctx.restore(); }
  stamp(ctx, "纯亏损", 1640, 560, t, T.allEnd - 0.05, { size: 80, rot: 0.14 });
}

// ================= THE FIX =================
export function writeHud(ctx: Ctx, { t }: PaintArgs) {
  leftShade(ctx, 0.62, 0.7);
  say(ctx, "存钱", 110, 330, WT(120), ct("s17", "存钱"), t);
  say(ctx, "不是", 110 + measure(ctx, "存钱", { size: 120, fam: "Display" }) + 30, 330, { ...WT(120), color: C.marker }, ct("s17", "不是"), t);
  say(ctx, "苦行僧式抠门", 110, 560, WT(150), ct("s17", "苦行僧式抠门"), t);
  const w = measure(ctx, "苦行僧式抠门", { size: 150, fam: "Display" });
  strike(ctx, 100, 520, 110 + w + 10, 500, prog(t, T.monkEnd + 0.05, 0.25), { color: C.red, width: 16 });
}
export function valuePaint(ctx: Ctx, { t }: PaintArgs) {
  say(ctx, "而是学会区分", 960 - measure(ctx, "而是学会区分", { size: 80, fam: "Display" }) / 2, 190, INK(80, "Display", C.ink2), ct("s17", "而是学会区分"), t);
  inkPath(ctx, [[960, 290], [960, 820]], E.out(prog(t, T.learn + 0.1, 0.4)), { color: C.ink, width: 6, seed: 4 });
  // price
  const pu = popS(t, T.priceW - 0.1, 0.3);
  if (pu.u > 0) {
    ctx.save(); ctx.globalAlpha *= pu.a; ctx.translate(500, 470); ctx.scale(pu.s, pu.s);
    text(ctx, "价格", 0, 0, { size: 200, fam: "Display", color: C.ink, align: "center" });
    ctx.restore();
    tag(ctx, "¥", 760, 300, t, T.priceW, { rot: 0.15, size: 48, color: C.ink2 });
  }
  text(ctx, "标签上的数字", 500, 640, { ...INK(60, "Sans", C.ink2), align: "center", alpha: prog(t, T.priceW + 0.25, 0.3) });
  // value
  const vu = popS(t, T.valueW - 0.1, 0.3);
  if (vu.u > 0) {
    ctx.save(); ctx.globalAlpha *= vu.a; ctx.translate(1420, 470); ctx.scale(vu.s, vu.s);
    text(ctx, "价值", 0, 0, { size: 200, fam: "Display", color: C.blue, align: "center" });
    ctx.restore();
  }
  text(ctx, "你真正用上的程度", 1420, 640, { ...INK(60, "Sans", C.blue), align: "center", alpha: prog(t, T.valueW + 0.2, 0.3) });
  marker(ctx, 1420 - 220, 610, 440, 30, prog(t, T.valueEnd + 0.05, 0.4), C.marker, 0.7);
}
/** Cluttered room → the source's white flash → bare room: switch the habit off, then savings climb on the empty wall. */
export function flip2Hud(ctx: Ctx, { t }: PaintArgs) {
  // before the flash: the switch
  const fa = 1 - prog(t, T.yours - 0.35, 0.25);
  if (fa > 0) {
    ctx.save(); ctx.globalAlpha *= fa;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(0,0,0,0.35)"); g.addColorStop(1, "rgba(0,0,0,0.15)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const su = prog(t, T.offW - 0.05, 0.25);
    if (su > 0) {
      const off = E.inOut(prog(t, T.offW + 0.1, 0.2));
      ctx.save(); ctx.globalAlpha *= clamp(su * 3); ctx.translate(330, 300);
      ctx.fillStyle = lerp(1, 0, off) > 0.5 ? C.red : "#6E6A64"; rr(ctx, -110, -55, 220, 110, 55); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(lerp(55, -55, off), 0, 44, 0, Math.PI * 2); ctx.fill();
      text(ctx, off > 0.5 ? "OFF" : "ON", lerp(-40, 40, off), 16, { size: 42, fam: "Num", color: "#fff", align: "center" });
      ctx.restore();
      say(ctx, "关掉", 490, 335, WT(110), ct("s18", "关掉"), t);
    }
    say(ctx, "盲目囤货", 180, 520, WT(150), ct("s18", "盲目囤货"), t);
    const w = measure(ctx, "盲目囤货", { size: 150, fam: "Display" });
    strike(ctx, 170, 480, 190 + w, 470, prog(t, T.habitEnd - 0.1, 0.25), { color: C.red, width: 16 });
    ctx.restore();
  }
  // after the flash: savings rise on the bare wall
  const ca = prog(t, T.yours - 0.05, 0.3) * (1 - prog(t, T.end - 0.2, 0.3));
  if (ca > 0) card(ctx, 110, 150, 760, 560, { a: ca, fill: "rgba(251,249,244,0.95)", rot: -0.01 }, () => {
    say(ctx, "你的存款", 50, 110, INK(84), ct("s18", "你的存款"), t);
    const ox = 60, oy = 480, gw = 620, gh = 300;
    inkPath(ctx, [[ox, oy - gh - 10], [ox, oy], [ox + gw + 20, oy]], 1, { color: C.ink3, width: 4, seed: 3 });
    const gu = prog(t, T.slow - 0.1, T.riseEnd - T.slow + 0.6);
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= 40; i++) { const v = i / 40; pts.push([ox + 10 + v * gw, oy - 20 - gh * (0.05 + 0.9 * v ** 1.4) + Math.sin(v * 13) * 6]); }
    inkPath(ctx, pts, gu, { color: C.blue, width: 9, seed: 6, wobble: 0.5 });
    if (gu > 0.98) vArrow(ctx, ox + gw + 10, oy - gh - 10, 70, -1, prog(t, T.riseEnd, 0.3), C.blue, 9);
  });
  // the ending
  const eu = prog(t, T.end - 0.1, 0.3);
  if (eu > 0) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(0,0,0,0.2)"); g.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.save(); ctx.globalAlpha *= eu; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    const lp = popS(t, T.like - 0.1, 0.3);
    if (lp.u > 0) {
      ctx.save(); ctx.globalAlpha *= lp.a; ctx.translate(W / 2, 300); ctx.scale(lp.s, lp.s);
      ctx.fillStyle = C.red; rr(ctx, -210, -62, 420, 124, 62); ctx.fill();
      icon(ctx, "heart", -120, 4, 1.1, { color: "#fff", fill: "#fff" });
      text(ctx, "点赞", 40, 30, { size: 76, fam: "Display", color: "#fff", align: "center" });
      ctx.restore();
    }
    say(ctx, "听懂的", W / 2 - measure(ctx, "听懂的", { size: 70, fam: "Display" }) / 2, 170, WT(70), ct("s19", "听懂的"), t);
    sayC(ctx, "改掉你的", W / 2, 520, WT(96), ct("s19", "改掉你的"), t);
    const mw = measure(ctx, "消费漏洞", { size: 190, fam: "Display" });
    marker(ctx, W / 2 - mw / 2 - 10, 650, mw + 20, 110, prog(t, T.leak + 0.15, 0.4), C.red, 0.55);
    sayC(ctx, "消费漏洞", W / 2, 720, WT(190), ct("s19", "消费漏洞"), t);
    const ca2 = prog(t, T.leakEnd + 0.5, 0.5);
    if (ca2 > 0) text(ctx, "参考：" + SRC_LINE, W / 2, 860, { size: 28, fam: "Sans", color: "rgba(255,255,255,0.88)", align: "center", alpha: ca2, shadow: SH });
  }
}
