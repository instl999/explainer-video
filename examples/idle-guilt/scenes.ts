// Scene painters for 《一闲下来就心慌》. Every beat is keyed to a spoken phrase through A(line, phrase), so the picture
// follows the voice. Look: footage annotated in white; the experiment, the "inertia program" loop and the brain are drawn on
// warm paper in ink; red = alarm / guilt, blue = calm / choice, amber = the idling brain.
import { A, C, E, H, LEAD, W, alignment, charTimes, clamp, hash, lerp, prog } from "./common.ts";
import { arrow, card, countUp, dropShadow, glass, icon, inkPath, marker, measure, popText, ring, rr, stamp, strike, text, type Ctx, type TextOpt } from "./draw.ts";
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
  // hook: the experiment
  zap: A("s00", "电击"), notIdle: A("s00", "也不愿意") - 0.08, idle: A("s00", "闲着"), m15: A("s00", "15分钟"),
  exp: cutAt("s01"), year: A("s01", "2014年"), sci: A("s01", "科学"), alone: A("s01", "独处15分钟") - 0.12, nothing: A("s01", "什么都不许干"),
  button: A("s02") - 0.12, btnW: A("s02", "电击按钮"), result: A("s02", "结果") - 0.1, men: A("s02", "三分之二的男性"), third: A("s02", "三分之二"),
  women: A("s02", "四分之一的女性"), pressed: A("s02", "都按了下去"),
  you: cutAt("s03"), panic: A("s03", "一闲下来就心慌"), waste: A("s03", "浪费人生"),
  // the mechanism
  pushed: cutAt("s04"), school: A("s04", "上学"), work: A("s04", "工作"), marry: A("s04", "结婚"), kid: A("s04", "生子"), family: A("s04", "养家"), old: A("s04", "养老"),
  guilt: cutAt("s05"), noStop: A("s05", "不敢停"), sin: A("s05", "休息就是罪过"), sinEnd: A("s05", "罪过", { end: true }),
  why: cutAt("s06"), env: A("s06", "而是") - 0.1, program: A("s06", "惯性程序"), progEnd: A("s06", "惯性程序", { end: true }),
  loop: cutAt("s07"), idle2: A("s07", "一闲下来"), alarm: A("s07", "警报就响"), busy: A("s07", "找点事做"), relief: A("s07", "心里一松"),
  each: A("s08", "每靠忙止住一次慌"), fortify: A("s08", "加固"), fortifyEnd: A("s08", "加固一次", { end: true }),
  puppet: cutAt("s09"), self: A("s09", "自主性"), selfEnd: A("s09", "自主性", { end: true }),
  // the fix
  two: cutAt("s10"), twoW: A("s10", "两件事"),
  see: cutAt("s11"), seeW: A("s11", "看见"), source: A("s11", "看懂这份恐慌从哪来"), loosen: A("s11", "松动"),
  blank: cutAt("s12"), afternoon: A("s12", "找个下午"), noGoal: A("s12", "什么目标都不定"), sun: A("s12", "晒晒太阳"), daze: A("s12", "发发呆"),
  brain: cutAt("s13"), dazeW: A("s13", "发呆时"), dmn: A("s13", "默认模式网络"), active: A("s13", "更活跃"),
  uneasy: cutAt("s14"), oldAlarm: A("s14", "旧警报"),
  calm: cutAt("s15"), sky: A("s15", "天不会塌"),
  walk: cutAt("s16"), fearEnd: A("s16", "被恐惧驱使的人生", { end: true }), choose: A("s16", "你自己选的人生"),
  end: cutAt("s17"), luxury: A("s17", "奢侈品"), right: A("s17", "与生俱来的权利"),
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
function bolt(ctx: Ctx, x: number, y: number, s: number, rot: number, a = 1, color = C.marker) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(14, -80); ctx.lineTo(-34, 8); ctx.lineTo(-2, 8); ctx.lineTo(-16, 80); ctx.lineTo(36, -14); ctx.lineTo(4, -14); ctx.closePath();
  ctx.fillStyle = color; ctx.fill(); ctx.lineJoin = "round"; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.stroke();
  ctx.restore();
}
function phoneIcon(ctx: Ctx, cx: number, cy: number, s: number) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineWidth = 6; ctx.strokeStyle = "#fff"; ctx.lineJoin = "round";
  rr(ctx, -26, -46, 52, 92, 10); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 34, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function bookIcon(ctx: Ctx, cx: number, cy: number, s: number) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineWidth = 6; ctx.strokeStyle = "#fff"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(0, -30); ctx.quadraticCurveTo(-26, -42, -50, -34); ctx.lineTo(-50, 36); ctx.quadraticCurveTo(-26, 28, 0, 40); ctx.quadraticCurveTo(26, 28, 50, 36); ctx.lineTo(50, -34); ctx.quadraticCurveTo(26, -42, 0, -30); ctx.lineTo(0, 40); ctx.stroke(); ctx.restore();
}
function penIcon(ctx: Ctx, cx: number, cy: number, s: number) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.8); ctx.scale(s, s); ctx.lineWidth = 6; ctx.strokeStyle = "#fff"; ctx.lineJoin = "round";
  rr(ctx, -10, -50, 20, 80, 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-10, 30); ctx.lineTo(0, 52); ctx.lineTo(10, 30); ctx.stroke(); ctx.restore();
}
/** The big red push-button; `press` 0..1 pushes the dome down. */
function button3d(ctx: Ctx, cx: number, cy: number, s: number, press: number) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineJoin = "round"; ctx.lineWidth = 7; ctx.strokeStyle = C.ink;
  ctx.fillStyle = "#3A3A3E"; ctx.beginPath(); ctx.ellipse(0, 60, 230, 66, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#55555A"; ctx.fillRect(-230, 20, 460, 40); ctx.beginPath(); ctx.ellipse(0, 20, 230, 66, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const d = press * 34;
  ctx.fillStyle = C.redDeep; ctx.beginPath(); ctx.moveTo(-150, 10); ctx.lineTo(-150, -40 + d); ctx.ellipse(0, -40 + d, 150, 44, 0, Math.PI, 0); ctx.lineTo(150, 10); ctx.ellipse(0, 10, 150, 44, 0, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
  const g = ctx.createRadialGradient(-50, -70 + d, 10, 0, -40 + d, 160); g.addColorStop(0, "#FF7A6E"); g.addColorStop(1, C.red);
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -40 + d, 150, 44, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
/** Heart-trace line across [x0, x1] at y; beats come faster with `rate`. */
function ecg(ctx: Ctx, x0: number, x1: number, y: number, t: number, rate: number, amp: number, color: string, a = 1) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = color; ctx.lineWidth = 7; ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.shadowColor = color; ctx.shadowBlur = 0;
  ctx.beginPath();
  const period = 380 / rate, scroll = (t * 520) % period;
  for (let x = x0; x <= x1; x += 4) {
    const p = (((x - x0 + scroll) % period) + period) % period, q = p / period;
    let v = 0;
    if (q > 0.42 && q < 0.46) v = -0.25; else if (q >= 0.46 && q < 0.5) v = 1; else if (q >= 0.5 && q < 0.55) v = -0.55; else if (q > 0.7 && q < 0.8) v = -0.18 * Math.sin(((q - 0.7) / 0.1) * Math.PI);
    if (x === x0) ctx.moveTo(x, y - v * amp); else ctx.lineTo(x, y - v * amp);
  }
  ctx.stroke(); ctx.restore();
}
function bell(ctx: Ctx, cx: number, cy: number, s: number, shake: number, color: string, a = 1) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.rotate(shake); ctx.scale(s, s); ctx.lineJoin = "round"; ctx.lineWidth = 6; ctx.strokeStyle = C.ink;
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-46, 30); ctx.quadraticCurveTo(-40, -50, 0, -54); ctx.quadraticCurveTo(40, -50, 46, 30); ctx.lineTo(56, 42); ctx.lineTo(-56, 42); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0, 52, 12, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(0, -60, 8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (Math.abs(shake) > 0.05) for (const sg of [-1, 1]) { ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = color; ctx.lineWidth = 5 * s; ctx.lineCap = "round";
    for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.arc(cx, cy - 6 * s, (74 + k * 22) * s, sg < 0 ? Math.PI * 0.85 : -Math.PI * 0.15, sg < 0 ? Math.PI * 1.15 : Math.PI * 0.15); ctx.stroke(); } ctx.restore(); }
}
function lockIcon(ctx: Ctx, cx: number, cy: number, s: number, a = 1) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineWidth = 10; ctx.strokeStyle = C.ink; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(0, -20, 30, Math.PI, 0); ctx.lineTo(30, 0); ctx.moveTo(-30, -20); ctx.lineTo(-30, 0); ctx.stroke();
  ctx.fillStyle = C.red; rr(ctx, -46, -4, 92, 70, 10); ctx.fill(); ctx.lineWidth = 6; rr(ctx, -46, -4, 92, 70, 10); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 26, 9, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function eyeIcon(ctx: Ctx, cx: number, cy: number, s: number, open: number, look: number) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineWidth = 10; ctx.strokeStyle = C.ink; ctx.lineJoin = "round";
  const h = 70 * open;
  ctx.beginPath(); ctx.moveTo(-130, 0); ctx.quadraticCurveTo(0, -h * 1.6, 130, 0); ctx.quadraticCurveTo(0, h * 1.6, -130, 0); ctx.closePath();
  ctx.fillStyle = "#fff"; ctx.fill(); ctx.stroke();
  if (open > 0.15) {
    ctx.save(); ctx.clip();
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(look * 40, 0, 52, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(look * 40, 0, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(look * 40 - 14, -16, 9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
/** Schematic brain, side view, facing left; `glow` lights the default-mode regions. */
function brain(ctx: Ctx, cx: number, cy: number, s: number, glow: number, t: number) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineJoin = "round"; ctx.lineCap = "round";
  const outline = () => { ctx.beginPath(); ctx.moveTo(-250, 40); ctx.bezierCurveTo(-290, -60, -230, -190, -90, -210); ctx.bezierCurveTo(30, -235, 190, -200, 250, -110);
    ctx.bezierCurveTo(300, -40, 290, 60, 220, 100); ctx.bezierCurveTo(170, 130, 90, 120, 40, 130); ctx.bezierCurveTo(-40, 150, -150, 150, -210, 110); ctx.bezierCurveTo(-240, 90, -250, 70, -250, 40); ctx.closePath(); };
  ctx.fillStyle = "#F4E3DE"; ctx.strokeStyle = C.ink; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.ellipse(170, 150, 90, 56, 0.2, 0, Math.PI * 2); ctx.fillStyle = "#EBD3CC"; ctx.fill(); ctx.stroke();       // cerebellum
  ctx.beginPath(); ctx.moveTo(90, 150); ctx.quadraticCurveTo(100, 220, 80, 270); ctx.lineTo(130, 270); ctx.quadraticCurveTo(140, 210, 150, 160); ctx.fillStyle = "#EBD3CC"; ctx.fill(); ctx.stroke(); // stem
  outline(); ctx.fillStyle = "#F4E3DE"; ctx.fill();
  if (glow > 0.01) {
    ctx.save(); outline(); ctx.clip();
    const pulse = 0.85 + 0.15 * Math.sin(t * 5);
    for (const [gx, gy, gr] of [[-190, -40, 120], [150, -120, 120], [200, 10, 100], [20, 60, 90]] as const) {
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr * pulse);
      g.addColorStop(0, `rgba(255,190,40,${0.95 * glow})`); g.addColorStop(0.55, `rgba(255,140,40,${0.55 * glow})`); g.addColorStop(1, "rgba(255,140,40,0)");
      ctx.fillStyle = g; ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    }
    ctx.restore();
  }
  ctx.strokeStyle = "rgba(26,26,26,0.45)"; ctx.lineWidth = 6;
  for (const pts of [[[-200, -100], [-150, -60], [-170, 0], [-120, 30]], [[-60, -190], [-40, -120], [-80, -60], [-30, 0], [-60, 60]], [[60, -200], [70, -140], [30, -90], [80, -40]], [[160, -170], [130, -110], [180, -60]], [[-150, 90], [-60, 70], [20, 100]]] as Array<Array<[number, number]>>) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.quadraticCurveTo(pts[i - 1][0] + 20, pts[i - 1][1] + 10, pts[i][0], pts[i][1]); ctx.stroke();
  }
  outline(); ctx.strokeStyle = C.ink; ctx.lineWidth = 9; ctx.stroke();
  ctx.restore();
}
/** Loop of four steps (the "inertia program"); `u` per node reveal, `thick` grows as it is reinforced, `crack` 0..1 breaks it. */
const LOOPN: Array<{ label: string; col: string }> = [{ label: "闲下来", col: C.ink }, { label: "警报响", col: C.red }, { label: "找点事做", col: "#6B6862" }, { label: "心里一松", col: C.blue }];
function loopDiagram(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, t: number, o: { show: number[]; thick: number; spin: number; crack: number; s?: number; alarmT?: number }) {
  ctx.save(); ctx.translate(cx, cy); if (o.s) ctx.scale(o.s, o.s);
  const pos = (k: number) => { const an = -Math.PI / 2 + (k * Math.PI) / 2; return [Math.cos(an) * rx, Math.sin(an) * ry] as const; };
  for (let k = 0; k < 4; k++) { // arcs between nodes, clockwise
    const u = o.show[(k + 1) % 4] ?? 0; if (u <= 0) continue;
    const a0 = -Math.PI / 2 + (k * Math.PI) / 2 + 0.38, a1 = a0 + Math.PI / 2 - 0.76, pts: Array<[number, number]> = [];
    for (let i = 0; i <= 24; i++) { const an = lerp(a0, a1, i / 24); pts.push([Math.cos(an) * rx, Math.sin(an) * ry]); }
    const segU = E.out(clamp(u * 1.5));
    if (o.crack > 0) { // gaps open up in the middle of each arc
      const g = 0.5 * o.crack;
      inkPath(ctx, pts.slice(0, Math.max(2, Math.round(24 * (0.5 - g / 2)) + 1)), segU, { color: C.ink2, width: 8 + o.thick * 6, seed: 50 + k, wobble: 0.5 });
      inkPath(ctx, pts.slice(Math.round(24 * (0.5 + g / 2))), segU, { color: C.ink2, width: 8 + o.thick * 6, seed: 60 + k, wobble: 0.5 });
    } else inkPath(ctx, pts, segU, { color: o.thick > 0.5 ? C.redDeep : C.ink2, width: 8 + o.thick * 6, seed: 50 + k, wobble: 0.5 });
    if (segU > 0.95 && o.crack < 0.5) { const [ax, ay] = pts[pts.length - 1], [bx, by] = pts[pts.length - 3]; const an = Math.atan2(ay - by, ax - bx), hl = 26 + o.thick * 8;
      ctx.fillStyle = o.thick > 0.5 ? C.redDeep : C.ink2; ctx.beginPath(); ctx.moveTo(ax + Math.cos(an) * 8, ay + Math.sin(an) * 8); ctx.lineTo(ax - Math.cos(an - 0.5) * hl, ay - Math.sin(an - 0.5) * hl); ctx.lineTo(ax - Math.cos(an + 0.5) * hl, ay - Math.sin(an + 0.5) * hl); ctx.closePath(); ctx.fill(); }
  }
  if (o.spin > 0) { // a runner dot going round the loop
    const an = -Math.PI / 2 + o.spin * Math.PI * 2;
    ctx.fillStyle = C.marker; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(Math.cos(an) * rx, Math.sin(an) * ry, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  LOOPN.forEach((n, k) => {
    const u = o.show[k] ?? 0; if (u <= 0) return;
    const [x, y] = pos(k), w = measure(ctx, n.label, { size: 56, fam: "Display" }) + 70, s = 0.55 + 0.45 * E.back(clamp(u));
    ctx.save(); ctx.globalAlpha *= clamp(u * 3); ctx.translate(x, y); ctx.scale(s, s);
    dropShadow(ctx, -w / 2, -48, w, 96, { r: 48, blur: 18, color: "rgba(40,30,20,0.3)", dy: 6 });
    ctx.fillStyle = k === 0 ? "#FFFDF5" : n.col; rr(ctx, -w / 2, -48, w, 96, 48); ctx.fill();
    if (k === 0) { ctx.strokeStyle = C.ink; ctx.lineWidth = 4; rr(ctx, -w / 2, -48, w, 96, 48); ctx.stroke(); }
    text(ctx, n.label, 0, 20, { size: 56, fam: "Display", color: k === 0 ? C.ink : "#fff", align: "center" });
    ctx.restore();
    if (k === 1 && o.alarmT !== undefined) { const sh = Math.sin((t - o.alarmT) * 30) * 0.3 * Math.exp(-Math.max(0, t - o.alarmT) * 1.2); bell(ctx, x + w / 2 + 70, y, 0.8, sh, C.marker, clamp(u * 3)); }
  });
  ctx.restore();
}

// ================= HOOK =================
export function zapHud(ctx: Ctx, { t }: PaintArgs) {
  rightShade(ctx, 0.5, 0.45);
  say(ctx, "有人宁可", 1000, 380, WT(80, "Sans"), ct("s00", "有人宁可"), t, 0.2);
  say(ctx, "电击自己", 990, 600, { ...WT(200), color: C.marker }, ct("s00", "电击自己"), t, 0.15);
  const zu = prog(t, T.zap - 0.05, 0.25);
  if (zu > 0) {
    const fl = hash(Math.floor(t * 24), 3) > 0.45 ? 1 : 0.35;
    bolt(ctx, 960 + 860, 470, 1.5, 0.2, clamp(zu * 3) * fl);
    bolt(ctx, 950, 330, 0.9, -0.35, clamp(zu * 3) * (1 - fl * 0.5));
  }
}
export function timerPaint(ctx: Ctx, { t }: PaintArgs) {
  say(ctx, "也不愿意闲着", W / 2 - measure(ctx, "也不愿意闲着", { size: 110, fam: "Display" }) / 2, 280, INK(110), ct("s00", "也不愿意闲着"), t);
  const u = popS(t, T.m15 - 0.25, 0.3);
  if (u.u <= 0) return;
  const run = Math.max(0, t - (T.m15 + 0.35)), secs = Math.max(0, 900 - Math.floor(run * 14));
  const s = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  ctx.save(); ctx.globalAlpha *= u.a; ctx.translate(W / 2, 640); ctx.scale(u.s, u.s);
  glass(ctx, -520, -200, 1040, 340, 1, 40, "#1B1F22");
  text(ctx, "88:88", 0, 80, { size: 250, fam: "LCD", color: "rgba(255,80,60,0.1)", align: "center" });
  text(ctx, s, 0, 80, { size: 250, fam: "LCD", color: "#FF5A44", align: "center" });
  ctx.restore();
  text(ctx, "什么都不做", W / 2, 900, { ...INK(52, "Sans", C.ink3), align: "center", alpha: prog(t, T.m15 + 0.3, 0.3) });
}
export function sciencePaint(ctx: Ctx, { t }: PaintArgs) {
  const yu = popS(t, T.year - 0.15, 0.32);
  if (yu.u > 0) { ctx.save(); ctx.globalAlpha *= yu.a; ctx.translate(560, 470); ctx.scale(yu.s, yu.s); text(ctx, "2014", 0, 0, { size: 300, fam: "Num", color: C.ink, bold: 6, align: "center" }); ctx.restore(); }
  const cu = E.out(prog(t, T.sci - 0.2, 0.45));
  if (cu > 0) card(ctx, 1000, 220, 760, 560, { a: clamp(cu * 2), s: 0.9 + 0.1 * cu, rot: 0.025, fill: "#FFFDF5" }, () => {
    ctx.fillStyle = C.red; ctx.fillRect(0, 0, 760, 110);
    text(ctx, "《科学》Science", 50, 76, { size: 56, fam: "Display", color: "#fff" });
    text(ctx, "Vol. 345 · 2014年7月", 52, 170, INK(34, "Sans", C.ink3));
    text(ctx, "Just think:", 52, 270, { size: 58, fam: "Num", color: C.ink, bold: 1 });
    text(ctx, "The challenges of the", 52, 340, { size: 48, fam: "Num", color: C.ink });
    text(ctx, "disengaged mind", 52, 404, { size: 48, fam: "Num", color: C.ink });
    text(ctx, "Wilson 等（弗吉尼亚大学）", 52, 490, INK(34, "Sans", C.ink2));
  });
  stamp(ctx, "实验", 1660, 760, t, A("s01", "实验") - 0.05, { size: 90, rot: -0.12, color: C.blue });
}
export function aloneHud(ctx: Ctx, { t }: PaintArgs) {
  rightShade(ctx, 0.62, 0.42);
  say(ctx, "独处15分钟", 1010, 400, WT(120), ct("s01", "独处15分钟"), t);
  const items: Array<[(c: Ctx, x: number, y: number, s: number) => void, string]> = [[phoneIcon, "手机"], [bookIcon, "书"], [penIcon, "纸笔"]];
  items.forEach(([fn, label], k) => {
    const t0 = T.nothing - 0.15 + k * 0.17, u = popS(t, t0, 0.3);
    if (u.u <= 0) return;
    const x = 1120 + k * 250, y = 600;
    ctx.save(); ctx.globalAlpha *= u.a; ctx.translate(x, y); ctx.scale(u.s, u.s); fn(ctx, 0, 0, 1.2); ctx.restore();
    text(ctx, label, x, y + 110, { ...WT(40, "Sans"), align: "center", alpha: u.a });
    xMark(ctx, x, y, 70, t, t0 + 0.2, { width: 12 });
  });
  text(ctx, "什么都不许干", 1010, 820, { ...WT(64), color: C.marker, alpha: prog(t, T.nothing + 0.3, 0.3) });
}
export function buttonPaint(ctx: Ctx, { t }: PaintArgs) {
  say(ctx, "身边只有一个", 200, 260, INK(70, "Sans", C.ink2), ct("s02", "身边只有一个"), t);
  say(ctx, "电击按钮", 200, 420, INK(150, "Display", C.red), ct("s02", "电击按钮"), t);
  const u = popS(t, T.btnW - 0.1, 0.35);
  if (u.u > 0) {
    ctx.save(); ctx.globalAlpha *= u.a; ctx.translate(1340, 560); ctx.scale(u.s, u.s); button3d(ctx, 0, 0, 1.2, 0); ctx.restore();
    for (let k = 0; k < 5; k++) { const an = -Math.PI / 2 + (k - 2) * 0.45, fl = hash(Math.floor(t * 12), k) > 0.5 ? 1 : 0.4;
      bolt(ctx, 1340 + Math.cos(an) * 330, 520 + Math.sin(an) * 230, 0.5, an + Math.PI / 2, u.a * fl); }
  }
  const nu = prog(t, T.btnW + 0.4, 0.35);
  if (nu > 0) card(ctx, 200, 560, 620, 250, { a: nu, fill: "#FFF1B5", rot: -0.015 }, () => {
    text(ctx, "实验前，每个人都先", 40, 80, INK(40, "Sans"));
    text(ctx, "试过一次这个电击，", 40, 140, INK(40, "Sans"));
    text(ctx, "并说愿意花钱避免再挨。", 40, 200, INK(40, "Sans", C.red));
  });
}
function crowd(ctx: Ctx, x0: number, y0: number, cols: number, n: number, hit: number, t: number, tHit: number, color: string) {
  for (let k = 0; k < n; k++) {
    const c = k % cols, r = Math.floor(k / cols), x = x0 + c * 86, y = y0 + r * 120;
    const pu = prog(t, T.result + 0.05 + k * 0.012, 0.25); if (pu <= 0) continue;
    const order = (k * 7) % n, on = order < hit ? prog(t, tHit + order * 0.05, 0.2) : 0;
    icon(ctx, "person", x, y, 1.15 * (0.6 + 0.4 * E.back(pu)), { color: on > 0 ? (on > 0.5 ? color : C.ink2) : C.ink2, a: clamp(pu * 3) });
    if (on > 0) bolt(ctx, x + 26, y - 30, 0.32, 0.2, on);
  }
}
export function resultPaint(ctx: Ctx, { t }: PaintArgs) {
  pill(ctx, "结果", W / 2, 120, t, T.result - 0.05, { size: 50, center: true, bg: C.ink });
  text(ctx, "男性 18人", 200, 270, { ...INK(46, "Sans", C.ink2), alpha: prog(t, T.result + 0.1, 0.3) });
  text(ctx, "女性 24人", 1010, 270, { ...INK(46, "Sans", C.ink2), alpha: prog(t, T.result + 0.2, 0.3) });
  crowd(ctx, 230, 360, 6, 18, 12, t, T.men, C.red);
  crowd(ctx, 1040, 360, 8, 24, 6, t, T.women, C.red);
  const mu = popS(t, T.men + 0.1, 0.35);
  if (mu.u > 0) { ctx.save(); ctx.globalAlpha *= mu.a; ctx.translate(430, 790); ctx.scale(mu.s, mu.s); text(ctx, "12人按了 · 三分之二", 0, 0, { ...INK(56, "Display", C.red), align: "center" }); ctx.restore(); }
  const wu = popS(t, T.women + 0.1, 0.35);
  if (wu.u > 0) { ctx.save(); ctx.globalAlpha *= wu.a; ctx.translate(1340, 790); ctx.scale(wu.s, wu.s); text(ctx, "6人按了 · 四分之一", 0, 0, { ...INK(56, "Display", C.red), align: "center" }); ctx.restore(); }
  stamp(ctx, "宁可挨电", 1640, 180, t, T.pressed - 0.05, { size: 84, rot: 0.1 });
  text(ctx, "Wilson 等，Science 2014；该结论在学界仍有讨论", 1820, 900, { size: 28, fam: "Sans", color: C.ink3, align: "right", alpha: prog(t, T.pressed + 0.3, 0.4) });
}
export function panicHud(ctx: Ctx, { t }: PaintArgs) {
  rightShade(ctx, 0.7, 0.4);
  const qa = 1 - prog(t, A("s03", "一闲下来") - 0.25, 0.25);
  if (qa > 0) { ctx.save(); ctx.globalAlpha *= qa; say(ctx, "你是不是也一样？", 1040, 520, { ...WT(110), color: "#fff" }, ct("s03", "你是不是也一样").concat([A("s03", "一样", { end: true })]), t); ctx.restore(); }
  say(ctx, "一闲下来", 1040, 330, WT(90, "Sans"), ct("s03", "一闲下来"), t);
  say(ctx, "就心慌", 1030, 520, { ...WT(180), color: C.marker }, ct("s03", "就心慌"), t);
  const rate = 1 + 2.2 * prog(t, A("s03", "心慌") - 0.2, 0.6);
  ecg(ctx, 980, 1860, 690, t, rate, 90, "#FF5A44", prog(t, T.panic, 0.4));
  say(ctx, "浪费人生？", 1040, 880, WT(84), ct("s03", "浪费人生"), t);
}

// ================= THE MECHANISM =================
const STOPS: Array<[string, () => number]> = [["上学", () => T.school], ["工作", () => T.work], ["结婚", () => T.marry], ["生子", () => T.kid], ["养家", () => T.family], ["养老", () => T.old]];
export function rushHud(ctx: Ctx, { t }: PaintArgs) {
  topShade(ctx, 0.6, 0.45);
  say(ctx, "我们被推着往前跑", 110, 190, WT(110), ct("s04", "我们被推着往前跑"), t);
  const au = prog(t, T.school - 0.4, 0.4);
  if (au <= 0) return;
  const x0 = 170, x1 = 1750, y = 800;
  plate(ctx, 110, 650, 1700, 260, au);
  inkPath(ctx, [[x0, y], [x1, y]], E.out(au), { color: "#fff", width: 8, seed: 2, wobble: 0.3 });
  ctx.save(); ctx.globalAlpha *= au; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(x1 + 30, y); ctx.lineTo(x1 - 6, y - 22); ctx.lineTo(x1 - 6, y + 22); ctx.closePath(); ctx.fill(); ctx.restore();
  let lastX = x0;
  STOPS.forEach(([label, tf], k) => {
    const x = lerp(x0 + 120, x1 - 120, k / (STOPS.length - 1)), u = popS(t, tf() - 0.1, 0.3);
    if (u.u <= 0) return;
    lastX = x;
    ctx.save(); ctx.globalAlpha *= u.a; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 80); ctx.stroke();
    ctx.fillStyle = k >= 4 ? C.red : C.marker; ctx.beginPath(); ctx.moveTo(x, y - 80); ctx.lineTo(x + 54, y - 66); ctx.lineTo(x, y - 52); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalAlpha *= u.a; ctx.translate(x, y + 60); ctx.scale(u.s, u.s); text(ctx, label, 0, 0, { ...WT(48), align: "center" }); ctx.restore();
  });
  // the runner, pushed from behind
  const rx = lerp(x0 + 40, lastX, 1);
  icon(ctx, "person", rx - 40, y - 60, 1.0, { color: "#fff" });
  arrow(ctx, rx - 210, y - 60, rx - 90, y - 60, 1, { color: C.red, width: 10, head: 24 });
}
export function sinHud(ctx: Ctx, { t }: PaintArgs) {
  leftShade(ctx, 0.75, 0.62);
  say(ctx, "不敢停", 110, 430, WT(170), ct("s05", "不敢停"), t);
  const u = prog(t, T.sin - 0.1, 0.3);
  if (u > 0) {
    text(ctx, "休息", 110, 650, { ...WT(110), alpha: clamp(u * 3) });
    text(ctx, "=", 360, 646, { ...WT(110, "Sans"), alpha: clamp(u * 3) });
  }
  stamp(ctx, "罪过？", 640, 610, t, A("s05", "罪过") - 0.2, { size: 120, rot: -0.1 });
}
export function strongHud(ctx: Ctx, { t }: PaintArgs) {
  rightShade(ctx, 0.0, 0.4); leftShade(ctx, 0.7, 0.6);
  say(ctx, "这种焦虑", 110, 360, WT(84, "Sans"), ct("s06", "这种焦虑"), t);
  say(ctx, "不是你", 110, 520, WT(100), ct("s06", "不是你"), t);
  const x = 110 + measure(ctx, "不是你", { size: 100, fam: "Display" }) + 10;
  say(ctx, "天生要强", x, 520, { ...WT(140), color: C.marker }, ct("s06", "天生要强"), t);
  const w = measure(ctx, "天生要强", { size: 140, fam: "Display" });
  strike(ctx, x - 10, 476, x + w + 10, 470, prog(t, A("s06", "天生要强", { end: true }) - 0.05, 0.22), { width: 18 });
}
export function programPaint(ctx: Ctx, { t }: PaintArgs) {
  const wx = 560, wy = 200, ww = 800, wh = 480;
  const wu = E.out(prog(t, T.env - 0.05, 0.35));
  if (wu <= 0) return;
  ctx.save(); ctx.globalAlpha *= clamp(wu * 2);
  dropShadow(ctx, wx, wy, ww, wh, { r: 16, blur: 36, color: "rgba(0,0,0,0.45)", dy: 14 });
  ctx.fillStyle = "#1E2226"; rr(ctx, wx, wy, ww, wh, 16); ctx.fill();
  ctx.fillStyle = "#33393F"; rr(ctx, wx, wy, ww, 70, 16); ctx.fill(); ctx.fillRect(wx, wy + 40, ww, 30);
  for (const [k, col] of [[0, "#FF5F57"], [1, "#FEBC2E"], [2, "#28C840"]] as const) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(wx + 40 + k * 34, wy + 35, 11, 0, Math.PI * 2); ctx.fill(); }
  text(ctx, "惯性程序.exe", wx + ww / 2, wy + 48, { size: 34, fam: "MonoB", color: "#E8E8E8", align: "center" });
  const pu = prog(t, A("s06", "环境") - 0.1, (T.progEnd - (A("s06", "环境") - 0.1)));
  text(ctx, "正在安装……", wx + 50, wy + 160, { size: 40, fam: "Sans", color: "#E8E8E8" });
  ctx.fillStyle = "#3A4148"; rr(ctx, wx + 50, wy + 200, ww - 100, 46, 10); ctx.fill();
  ctx.fillStyle = "#3CF59B"; rr(ctx, wx + 50, wy + 200, Math.max(10, (ww - 100) * E.inOut(pu)), 46, 10); ctx.fill();
  text(ctx, `${Math.round(pu * 100)}%`, wx + ww - 50, wy + 160, { size: 40, fam: "Mono", color: "#3CF59B", align: "right" });
  const lines = ["if (闲下来) 警报响();", "while (警报) 找点事做();", "休息 = 罪过;"];
  lines.forEach((l, k) => text(ctx, l, wx + 50, wy + 320 + k * 52, { size: 36, fam: "Mono", color: k === 2 ? "#FF8A7A" : "#9FB3C8", alpha: prog(t, A("s06", "环境") + 0.3 + k * 0.25, 0.25) }));
  ctx.restore();
  // what installs it
  const SRC = [["环境", 260, 300], ["责任", 230, 520], ["他人的期待", 1660, 420]] as const;
  SRC.forEach(([s, x, y], k) => {
    const u = popS(t, A("s06", "环境") - 0.05 + k * 0.18, 0.3); if (u.u <= 0) return;
    ctx.save(); ctx.globalAlpha *= u.a; ctx.translate(x, y); ctx.scale(u.s, u.s);
    const w = measure(ctx, s, { size: 48, fam: "Display" }) + 60; ctx.fillStyle = C.ink; rr(ctx, -w / 2, -40, w, 80, 40); ctx.fill();
    text(ctx, s, 0, 17, { size: 48, fam: "Display", color: "#fff", align: "center" }); ctx.restore();
    const tx = x < W / 2 ? wx - 10 : wx + ww + 10;
    arrow(ctx, x + (x < W / 2 ? 90 : -150), y, tx, wy + 240, prog(t, A("s06", "环境") + 0.1 + k * 0.18, 0.3), { color: C.ink3, width: 6, head: 20, bend: 0.1 });
  });
  const tu = popS(t, T.program - 0.1, 0.35);
  if (tu.u > 0) { ctx.save(); ctx.globalAlpha *= tu.a; ctx.translate(W / 2, 830); ctx.scale(tu.s, tu.s); text(ctx, "一套惯性程序", 0, 0, { ...INK(110, "Display", C.red), align: "center" }); ctx.restore(); }
}
export function loopPaint(ctx: Ctx, { t }: PaintArgs) {
  text(ctx, "惯性程序", 140, 150, { ...INK(56, "Display", C.ink3), alpha: prog(t, T.loop + 0.05, 0.3) });
  const show = [prog(t, T.idle2 - 0.1, 0.3), prog(t, T.alarm - 0.1, 0.3), prog(t, T.busy - 0.1, 0.3), prog(t, T.relief - 0.1, 0.3)];
  const laps = clamp((t - T.each) / (T.fortifyEnd - T.each)) * 3;
  const thick = Math.min(3, Math.floor(laps)) / 3 + prog(t, T.fortify, 0.4) * 0.3;
  loopDiagram(ctx, 900, 540, 470, 300, t, { show, thick, spin: t >= T.each ? laps : 0, crack: 0, alarmT: T.alarm });
  if (t >= T.each) {
    const n = Math.min(3, Math.floor(laps) + 1);
    glass(ctx, 1480, 130, 330, 150, 0.95, 24, "rgba(251,248,241,0.97)");
    text(ctx, "加固", 1520, 222, INK(56, "Sans", C.ink2));
    text(ctx, `×${n}`, 1650, 230, { size: 96, fam: "Num", color: C.red, bold: 4 });
  }
  const lu = popS(t, T.fortify + 0.05, 0.35);
  if (lu.u > 0) { ctx.save(); ctx.globalAlpha *= lu.a; ctx.translate(900, 540); ctx.scale(lu.s, lu.s); lockIcon(ctx, 0, 0, 1.6); ctx.restore(); }
}
export function puppetPaint(ctx: Ctx, { t }: PaintArgs) {
  say(ctx, "久而久之", 140, 180, INK(64, "Sans", C.ink2), ct("s09", "久而久之"), t);
  const cx = 820, jig = Math.sin(t * 3.1) * 0.12, bar = 170;
  // control bar
  ctx.save(); ctx.translate(cx, bar); ctx.rotate(jig * 0.5); ctx.strokeStyle = "#6B4A2B"; ctx.lineWidth = 18; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-260, 0); ctx.lineTo(260, 0); ctx.moveTo(0, -50); ctx.lineTo(0, 60); ctx.stroke(); ctx.restore();
  // figure
  const fy = 560 + Math.sin(t * 6.2) * 14, la = Math.sin(t * 3.1) * 0.5, ra = -Math.sin(t * 3.1 + 1) * 0.5;
  const head: [number, number] = [cx, fy - 170], lh: [number, number] = [cx - 150 + la * 60, fy - 60 - la * 40], rh: [number, number] = [cx + 150 + ra * 60, fy - 60 + ra * 40];
  const lf: [number, number] = [cx - 70, fy + 200 + la * 30], rf: [number, number] = [cx + 70, fy + 200 - la * 30];
  ctx.save(); ctx.strokeStyle = "rgba(26,26,26,0.55)"; ctx.lineWidth = 3;
  const ends: Array<[number, number]> = [[cx - 250, bar], [cx, bar - 40], [cx + 250, bar]];
  [[ends[0], lh], [ends[1], head], [ends[2], rh]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); });
  ctx.restore();
  ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 14; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(cx, fy - 130); ctx.lineTo(cx, fy + 60); ctx.moveTo(lh[0], lh[1]); ctx.lineTo(cx, fy - 100); ctx.lineTo(rh[0], rh[1]);
  ctx.moveTo(lf[0], lf[1]); ctx.lineTo(cx, fy + 60); ctx.lineTo(rf[0], rf[1]); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(head[0], head[1], 44, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  // string labels
  const L: Array<[string, number, number]> = [["责任", (ends[0][0] + lh[0]) / 2 - 60, (ends[0][1] + lh[1]) / 2], ["期待", cx + 30, (bar + head[1]) / 2], ["惯性", (ends[2][0] + rh[0]) / 2 + 60, (ends[2][1] + rh[1]) / 2]];
  L.forEach(([s, x, y], k) => { const u = popS(t, T.puppet + 0.1 + k * 0.2, 0.3); if (u.u <= 0) return;
    ctx.save(); ctx.globalAlpha *= u.a; ctx.translate(x, y); ctx.scale(u.s, u.s); const w = measure(ctx, s, { size: 44, fam: "Display" }) + 50;
    ctx.fillStyle = C.red; rr(ctx, -w / 2, -36, w, 72, 36); ctx.fill(); text(ctx, s, 0, 15, { size: 44, fam: "Display", color: "#fff", align: "center" }); ctx.restore(); });
  // what is lost
  const su = popS(t, T.self - 0.1, 0.35);
  if (su.u > 0) {
    const fade = prog(t, T.selfEnd + 0.15, 0.5);
    ctx.save(); ctx.globalAlpha *= su.a * (1 - 0.55 * fade); ctx.translate(1450, 560); ctx.scale(su.s, su.s);
    text(ctx, "你丢掉的是", 0, -150, { ...INK(52, "Sans", C.ink2), align: "center" });
    text(ctx, "自主性", 0, 40, { ...INK(170, "Display", fade > 0.3 ? C.ink3 : C.blue), align: "center" });
    ctx.restore();
    if (fade > 0) inkPath(ctx, [[1250, 470], [1380, 540], [1340, 590], [1500, 640], [1620, 600]], fade, { color: C.red, width: 8, seed: 7, wobble: 0.4 });
  }
}

// ================= THE FIX =================
export function twoHud(ctx: Ctx, { t }: PaintArgs) {
  plate(ctx, 70, 230, 820, 560, prog(t, T.two + 0.05, 0.3));
  say(ctx, "想找回自在", 120, 380, WT(110), ct("s10", "想找回自在"), t);
  say(ctx, "做好两件事", 120, 520, { ...WT(84), color: C.marker }, ct("s10", "做好两件事"), t);
  [["① 看见", 0], ["② 放空", 1]].forEach(([s, k]) => pill(ctx, s as string, 120 + (k as number) * 330, 680, t, T.twoW + 0.15 + (k as number) * 0.2, { size: 54, bg: k ? C.blue : "#fff", fg: k ? "#fff" : C.ink }));
}
export function seePaint(ctx: Ctx, { t }: PaintArgs) {
  say(ctx, "① 看见", 140, 230, INK(130), ct("s11", "第一").concat(ct("s11", "看见")), t);
  const eu = prog(t, T.seeW - 0.15, 0.45);
  if (eu > 0) {
    const look = clamp((t - T.source) / 1.0) * 2 - 1;
    eyeIcon(ctx, 420, 560, 1.4, E.out(eu), t >= T.source ? Math.sin((t - T.source) * 2.2) : 0);
    if (t >= T.source) { // gaze sweeps the program
      const gx = lerp(1000, 1500, (look + 1) / 2);
      ctx.save(); ctx.globalAlpha *= 0.22; ctx.fillStyle = C.marker; ctx.beginPath(); ctx.moveTo(560, 540); ctx.lineTo(gx, 300); ctx.lineTo(gx + 180, 820); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  const crack = E.out(prog(t, T.loosen - 0.1, 0.5));
  const spin = t >= T.loop ? ((t - T.see) * 0.5 * (1 - crack)) % 1 : 0;
  loopDiagram(ctx, 1320, 560, 330, 240, t, { show: [1, 1, 1, 1], thick: 0.6 * (1 - crack), spin: crack > 0.95 ? 0 : spin, crack, s: 0.95 });
  for (let k = 0; k < 6; k++) { // bolts falling out
    const f = prog(t, T.loosen + k * 0.08, 0.7); if (f <= 0 || f >= 1) continue;
    ctx.save(); ctx.globalAlpha *= 1 - f; ctx.fillStyle = "#8C877E"; ctx.beginPath(); ctx.arc(1100 + hash(k, 3) * 440, 400 + f * f * 500 + hash(k, 4) * 200, 12, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  const lu = popS(t, T.loosen, 0.35);
  if (lu.u > 0) { ctx.save(); ctx.globalAlpha *= lu.a; ctx.translate(1320, 900); ctx.scale(lu.s, lu.s); text(ctx, "程序开始松动", 0, 0, { ...INK(76, "Display", C.blue), align: "center" }); ctx.restore(); }
}
export function blankHud(ctx: Ctx, { t }: PaintArgs) {
  plate(ctx, 70, 120, 860, 170, prog(t, T.blank + 0.05, 0.3));
  say(ctx, "② 允许自己放空", 110, 240, WT(96), ct("s12", "第二").concat(ct("s12", "允许自己放空")), t);
  const cu = E.out(prog(t, T.afternoon - 0.2, 0.4));
  if (cu <= 0) return;
  card(ctx, 110, 360, 640, 470, { a: clamp(cu * 2), s: 0.9 + 0.1 * cu, rot: -0.02, fill: "#FFFDF5" }, () => {
    text(ctx, "今天下午的目标：", 44, 80, INK(46, "Sans", C.ink2));
    rule(ctx, 44, 112, 596, prog(t, T.afternoon, 0.3));
    const nu = prog(t, T.noGoal - 0.05, 0.3);
    if (nu > 0) text(ctx, "（无）", 44, 200, { ...INK(70, "Display", C.ink3), alpha: nu });
    const items: Array<[string, number]> = [["晒晒太阳", T.sun], ["发发呆", T.daze]];
    items.forEach(([s, t0], k) => {
      const a = prog(t, t0 - 0.1, 0.3); if (a <= 0) return;
      const y = 300 + k * 100;
      icon(ctx, "check", 70, y - 16, 0.9, { color: C.blue, a, width: 6 });
      text(ctx, s, 130, y, { ...INK(64), alpha: a });
    });
  });
  const su = popS(t, T.sun - 0.1, 0.4);
  if (su.u > 0) { // a sun in the sky of the shot
    ctx.save(); ctx.globalAlpha *= su.a * 0.9; ctx.translate(1700, 170); ctx.rotate(t * 0.4); ctx.scale(su.s, su.s);
    ctx.strokeStyle = C.marker; ctx.lineWidth = 8; ctx.lineCap = "round";
    for (let k = 0; k < 12; k++) { const an = (k / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(an) * 70, Math.sin(an) * 70); ctx.lineTo(Math.cos(an) * 100, Math.sin(an) * 100); ctx.stroke(); }
    ctx.fillStyle = C.marker; ctx.beginPath(); ctx.arc(0, 0, 54, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}
export function brainPaint(ctx: Ctx, { t }: PaintArgs) {
  say(ctx, "发呆时，大脑也没闲着", 140, 200, INK(84), ct("s13", "发呆时").concat([T.dazeW + 0.45], ct("s13", "大脑也没闲着")), t);
  const bu = popS(t, T.brain + 0.05, 0.35);
  const glow = prog(t, T.dmn - 0.2, 0.6);
  if (bu.u > 0) { ctx.save(); ctx.globalAlpha *= bu.a; ctx.translate(700, 560); ctx.scale(bu.s, bu.s); brain(ctx, 0, 0, 1.15, glow, t); ctx.restore(); }
  const lu = popS(t, T.dmn - 0.1, 0.35);
  if (lu.u > 0) {
    ctx.save(); ctx.globalAlpha *= lu.a;
    for (const [px, py] of [[700 - 190 * 1.15, 560 - 40 * 1.15], [700 + 150 * 1.15, 560 - 120 * 1.15], [700 + 200 * 1.15, 560 + 10 * 1.15]] as const) {
      ctx.strokeStyle = C.ink2; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(1180, 470); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.save(); ctx.globalAlpha *= lu.a; ctx.translate(1180, 470); ctx.scale(lu.s, lu.s);
    const w = measure(ctx, "默认模式网络", { size: 72, fam: "Display" }) + 80;
    ctx.fillStyle = "#FFB43C"; rr(ctx, 0, -60, w, 120, 60); ctx.fill(); text(ctx, "默认模式网络", 40, 25, { size: 72, fam: "Display", color: C.ink }); ctx.restore();
  }
  // activity: focused vs. daydreaming
  const au = prog(t, T.active - 0.2, 0.5);
  if (au > 0) {
    const bx = 1200, by = 640;
    text(ctx, "专注做事", bx, by + 40, { ...INK(40, "Sans", C.ink2), alpha: clamp(au * 3) });
    text(ctx, "发呆时", bx, by + 140, { ...INK(40, "Sans", C.ink2), alpha: clamp(au * 3) });
    ctx.save(); ctx.globalAlpha *= clamp(au * 3);
    ctx.fillStyle = "rgba(26,26,26,0.15)"; rr(ctx, bx + 190, by + 8, 420 * 0.35, 44, 10); ctx.fill();
    ctx.fillStyle = "#FFB43C"; rr(ctx, bx + 190, by + 108, 420 * E.out(au), 44, 10); ctx.fill(); ctx.restore();
    text(ctx, "更活跃 ↑", bx + 190 + 420 * E.out(au) - 10, by + 210, { ...INK(56, "Display", C.red), align: "right", alpha: prog(t, T.active + 0.1, 0.3) });
  }
  foot(ctx, "默认模式网络：Raichle 等，《美国国家科学院院刊》2001；示意图", 140, 930, t, T.active + 0.4);
}
export function uneasyHud(ctx: Ctx, { t }: PaintArgs) {
  rightShade(ctx, 0.72, 0.42);
  say(ctx, "刚开始会不安", 1020, 380, WT(96), ct("s14", "刚开始会不安"), t);
  const bu = popS(t, T.oldAlarm - 0.15, 0.3);
  if (bu.u > 0) {
    const sh = Math.sin((t - T.oldAlarm) * 26) * 0.22;
    ctx.save(); ctx.globalAlpha *= bu.a; ctx.translate(1120, 600); ctx.scale(bu.s, bu.s); bell(ctx, 0, 0, 1.1, sh, "#C9C3B8"); ctx.restore();
    say(ctx, "旧警报", 1240, 630, { ...WT(110), color: "#D8D2C6" }, ct("s14", "旧警报"), t);
    text(ctx, "在响", 1240 + measure(ctx, "旧警报", { size: 110, fam: "Display" }) + 16, 630, { ...WT(70, "Sans"), alpha: prog(t, A("s14", "在响") - 0.1, 0.3) });
  }
}
export function calmHud(ctx: Ctx, { t }: PaintArgs) {
  topShade(ctx, 0.62, 0.6);
  sayC(ctx, "停下来，天不会塌", W / 2, 260, WT(140), ct("s15", "停下来").concat([T.sky - 0.05], ct("s15", "天不会塌")), t);
  sayC(ctx, "没有人会抛弃你", W / 2, 420, { ...WT(84), color: C.marker }, ct("s15", "没有人会抛弃你"), t);
}
export function walkHud(ctx: Ctx, { t }: PaintArgs) {
  plate(ctx, 70, 170, 1100, 520, prog(t, T.walk + 0.05, 0.3));
  say(ctx, "反复练习", 120, 300, WT(76, "Sans"), ct("s16", "反复练习"), t);
  say(ctx, "被恐惧驱使的人生", 120, 450, WT(96), ct("s16", "被恐惧驱使的人生"), t);
  const w = measure(ctx, "被恐惧驱使的人生", { size: 96, fam: "Display" });
  strike(ctx, 110, 418, 130 + w, 412, prog(t, T.fearEnd - 0.05, 0.25), { width: 14 });
  const cu = prog(t, T.choose - 0.3, 0.3);
  if (cu > 0) arrow(ctx, 130, 520, 230, 600, cu, { color: C.marker, width: 10, head: 26, bend: 0.3 });
  say(ctx, "你自己选的人生", 260, 630, { ...WT(110), color: C.marker }, ct("s16", "你自己选的人生"), t);
}
export function endHud(ctx: Ctx, { t }: PaintArgs) {
  topShade(ctx, 0.45, 0.6);
  sayC(ctx, "自在地活着", W / 2, 260, WT(150), ct("s17", "自在地活着"), t);
  const lu = prog(t, T.luxury - 0.3, 0.3);
  if (lu > 0) {
    const s = "不是奢侈品", w = measure(ctx, s, { size: 84, fam: "Display" });
    text(ctx, s, W / 2, 400, { ...WT(84), align: "center", alpha: lu });
    strike(ctx, W / 2 - w / 2 + measure(ctx, "不是", { size: 84, fam: "Display" }) - 6, 372, W / 2 + w / 2 + 8, 368, prog(t, A("s17", "奢侈品", { end: true }), 0.25), { width: 10, color: "rgba(255,255,255,0.85)" });
  }
  sayC(ctx, "是你与生俱来的权利", W / 2, 540, { ...WT(110), color: C.marker }, ct("s17", "是你与生俱来的权利"), t);
  const ca = prog(t, T.right + 1.4, 0.5);
  if (ca > 0) text(ctx, "参考：Wilson 等，Science 2014；Raichle 等，PNAS 2001", W / 2, 640, { size: 28, fam: "Sans", color: "rgba(255,255,255,0.85)", align: "center", alpha: ca, shadow: SH });
}
