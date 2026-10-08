// Reusable props, drawn in ink with flat fills (the paper-board look). Each takes a centre, a scale and usually an alpha.
// Collected from finished videos; add new ones here when they are generic enough to reuse.
import { C, E, clamp, hash, lerp } from "./common.ts";
import { dropShadow, icon, measure, rr, text, type Ctx } from "./draw.ts";

export function bolt(ctx: Ctx, x: number, y: number, s: number, rot: number, a = 1, color = C.marker) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(14, -80); ctx.lineTo(-34, 8); ctx.lineTo(-2, 8); ctx.lineTo(-16, 80); ctx.lineTo(36, -14); ctx.lineTo(4, -14); ctx.closePath();
  ctx.fillStyle = color; ctx.fill(); ctx.lineJoin = "round"; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.stroke();
  ctx.restore();
}

export function phoneIcon(ctx: Ctx, cx: number, cy: number, s: number) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineWidth = 6; ctx.strokeStyle = "#fff"; ctx.lineJoin = "round";
  rr(ctx, -26, -46, 52, 92, 10); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 34, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

export function bookIcon(ctx: Ctx, cx: number, cy: number, s: number) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineWidth = 6; ctx.strokeStyle = "#fff"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(0, -30); ctx.quadraticCurveTo(-26, -42, -50, -34); ctx.lineTo(-50, 36); ctx.quadraticCurveTo(-26, 28, 0, 40); ctx.quadraticCurveTo(26, 28, 50, 36); ctx.lineTo(50, -34); ctx.quadraticCurveTo(26, -42, 0, -30); ctx.lineTo(0, 40); ctx.stroke(); ctx.restore();
}

export function penIcon(ctx: Ctx, cx: number, cy: number, s: number) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.8); ctx.scale(s, s); ctx.lineWidth = 6; ctx.strokeStyle = "#fff"; ctx.lineJoin = "round";
  rr(ctx, -10, -50, 20, 80, 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-10, 30); ctx.lineTo(0, 52); ctx.lineTo(10, 30); ctx.stroke(); ctx.restore();
}

/** The big red push-button; `press` 0..1 pushes the dome down. */
export function button3d(ctx: Ctx, cx: number, cy: number, s: number, press: number) {
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
export function ecg(ctx: Ctx, x0: number, x1: number, y: number, t: number, rate: number, amp: number, color: string, a = 1) {
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

export function bell(ctx: Ctx, cx: number, cy: number, s: number, shake: number, color: string, a = 1) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.rotate(shake); ctx.scale(s, s); ctx.lineJoin = "round"; ctx.lineWidth = 6; ctx.strokeStyle = C.ink;
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-46, 30); ctx.quadraticCurveTo(-40, -50, 0, -54); ctx.quadraticCurveTo(40, -50, 46, 30); ctx.lineTo(56, 42); ctx.lineTo(-56, 42); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0, 52, 12, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(0, -60, 8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (Math.abs(shake) > 0.05) for (const sg of [-1, 1]) { ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = color; ctx.lineWidth = 5 * s; ctx.lineCap = "round";
    for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.arc(cx, cy - 6 * s, (74 + k * 22) * s, sg < 0 ? Math.PI * 0.85 : -Math.PI * 0.15, sg < 0 ? Math.PI * 1.15 : Math.PI * 0.15); ctx.stroke(); } ctx.restore(); }
}

export function lockIcon(ctx: Ctx, cx: number, cy: number, s: number, a = 1) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineWidth = 10; ctx.strokeStyle = C.ink; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(0, -20, 30, Math.PI, 0); ctx.lineTo(30, 0); ctx.moveTo(-30, -20); ctx.lineTo(-30, 0); ctx.stroke();
  ctx.fillStyle = C.red; rr(ctx, -46, -4, 92, 70, 10); ctx.fill(); ctx.lineWidth = 6; rr(ctx, -46, -4, 92, 70, 10); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 26, 9, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

export function eyeIcon(ctx: Ctx, cx: number, cy: number, s: number, open: number, look: number) {
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
export function brain(ctx: Ctx, cx: number, cy: number, s: number, glow: number, t: number) {
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

export function bankIcon(ctx: Ctx, cx: number, cy: number, s: number, color: string, a = 1) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.scale(s, s); ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(-60, -22); ctx.lineTo(0, -58); ctx.lineTo(60, -22); ctx.closePath(); ctx.fill();
  for (const x of [-44, -16, 12, 40]) ctx.fillRect(x - 6 + 4, -16, 12, 52);
  ctx.fillRect(-62, 40, 124, 12);
  ctx.restore();
}

export function clockFace(ctx: Ctx, cx: number, cy: number, rad: number, t: number, speed: number, color: string, a = 1) {
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
export function priceTag(ctx: Ctx, label: string, cx: number, cy: number, s: number, rot: number, color = C.red, a = 1) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(s, s);
  const w = measure(ctx, label, { size: 64, fam: "Display" }) + 120, h = 110;
  dropShadow(ctx, -w / 2, -h / 2, w, h, { r: 10, blur: 22, color: "rgba(0,0,0,0.4)", dy: 6 });
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2 + 44, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2, h / 2); ctx.lineTo(-w / 2 + 44, h / 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-w / 2 + 40, 0, 11, 0, Math.PI * 2); ctx.fill();
  text(ctx, label, 26, 22, { size: 64, fam: "Display", color: "#fff", align: "center" });
  ctx.restore();
}

export function carIcon(ctx: Ctx, cx: number, cy: number, s: number, color: string, a = 1) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineJoin = "round"; ctx.lineWidth = 7; ctx.strokeStyle = C.ink;
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-150, 30); ctx.lineTo(-150, -10); ctx.lineTo(-110, -20); ctx.lineTo(-70, -66); ctx.lineTo(60, -66); ctx.lineTo(104, -20); ctx.lineTo(150, -10); ctx.lineTo(150, 30); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#DCEBF6"; ctx.beginPath(); ctx.moveTo(-90, -24); ctx.lineTo(-62, -56); ctx.lineTo(-6, -56); ctx.lineTo(-6, -24); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, -24); ctx.lineTo(8, -56); ctx.lineTo(54, -56); ctx.lineTo(84, -24); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (const wx of [-90, 92]) { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(wx, 32, 30, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#BFBAB0"; ctx.beginPath(); ctx.arc(wx, 32, 12, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

/** Little office worker (tie, briefcase) in a running pose; `ph` is the stride phase. */
export function runner(ctx: Ctx, x: number, y: number, s: number, ph: number) {
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

export function hourglassIcon(ctx: Ctx, cx: number, cy: number, s: number, color: string, fill: number) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineJoin = "round"; ctx.lineWidth = 6; ctx.strokeStyle = color;
  ctx.beginPath(); ctx.moveTo(-40, -60); ctx.lineTo(40, -60); ctx.lineTo(4, 0); ctx.lineTo(40, 60); ctx.lineTo(-40, 60); ctx.lineTo(-4, 0); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); const tf = 1 - fill; ctx.moveTo(-34 * tf, -52 + 52 * (1 - tf)); ctx.lineTo(34 * tf, -52 + 52 * (1 - tf)); ctx.lineTo(0, -4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-34, 54); ctx.lineTo(34, 54); ctx.lineTo(34 * (1 - fill * 0.8), 54 - 46 * fill); ctx.lineTo(-34 * (1 - fill * 0.8), 54 - 46 * fill); ctx.closePath(); ctx.fill();
  ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-50, -64); ctx.lineTo(50, -64); ctx.moveTo(-50, 64); ctx.lineTo(50, 64); ctx.stroke();
  ctx.restore();
}

export function battery(ctx: Ctx, cx: number, cy: number, s: number, level: number, color: string) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineWidth = 7; ctx.strokeStyle = C.ink; ctx.lineJoin = "round";
  rr(ctx, -70, -38, 130, 76, 12); ctx.stroke(); ctx.fillStyle = C.ink; ctx.fillRect(64, -16, 14, 32);
  ctx.fillStyle = color; rr(ctx, -60, -28, 110 * clamp(level), 56, 6); ctx.fill();
  ctx.restore();
}

/** A stylised 100-yuan note; `k` scales its height/width (purchasing power), label shows the value. */
export function banknote(ctx: Ctx, cx: number, cy: number, k: number, value: number, a = 1) {
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

/** A slice of strawberry shortcake. */
export function cake(ctx: Ctx, cx: number, cy: number, s: number, a = 1) {
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
export function pudding(ctx: Ctx, cx: number, cy: number, s: number, a = 1) {
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
export function pants(ctx: Ctx, cx: number, top: number, s: number, o: { a?: number; fog?: number; rot?: number } = {}) {
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

export function crystal(ctx: Ctx, cx: number, cy: number, s: number, t: number, a = 1) {
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

export function piggy(ctx: Ctx, cx: number, cy: number, s: number, color: string, a = 1) {
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
export function tidyBox(ctx: Ctx, cx: number, cy: number, s: number, a = 1) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.lineJoin = "round"; ctx.lineWidth = 6; ctx.strokeStyle = C.ink;
  const cols = ["#7FA7D9", "#E9C46A", "#D9382B", "#9BC59D"];
  cols.forEach((c, k) => { ctx.fillStyle = c; ctx.beginPath(); rr(ctx, -92 + k * 46, -64, 42, 70, 8); ctx.fill(); ctx.stroke(); });
  ctx.fillStyle = "#F6F2EA"; ctx.beginPath(); ctx.moveTo(-110, -6); ctx.lineTo(110, -6); ctx.lineTo(96, 86); ctx.lineTo(-96, 86); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-40, 34); ctx.lineTo(40, 34); ctx.stroke();
  ctx.restore();
}

export function umbrella(ctx: Ctx, cx: number, cy: number, s: number, color: string) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.lineWidth = 5; ctx.strokeStyle = C.ink;
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-70, 0); ctx.quadraticCurveTo(-66, -62, 0, -66); ctx.quadraticCurveTo(66, -62, 70, 0);
  ctx.quadraticCurveTo(58, -14, 46, 0); ctx.quadraticCurveTo(34, -14, 22, 0); ctx.quadraticCurveTo(10, -14, 0, 0); ctx.quadraticCurveTo(-10, -14, -22, 0); ctx.quadraticCurveTo(-34, -14, -46, 0); ctx.quadraticCurveTo(-58, -14, -70, 0); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, 62); ctx.arc(-12, 62, 12, 0, Math.PI); ctx.stroke();
  ctx.restore();
}

export function shopBag(ctx: Ctx, cx: number, cy: number, s: number, color: string) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineJoin = "round"; ctx.lineWidth = 5; ctx.strokeStyle = C.ink;
  ctx.beginPath(); ctx.arc(0, -40, 24, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-54, -40); ctx.lineTo(54, -40); ctx.lineTo(62, 60); ctx.lineTo(-62, 60); ctx.closePath(); ctx.fill(); ctx.stroke();
  text(ctx, "SALE", 0, 22, { size: 30, fam: "Num", color: "#fff", align: "center", bold: 1 });
  ctx.restore();
}

/** Basket (bin) with slats, centred on (cx, cy). */
export function basket(ctx: Ctx, cx: number, cy: number, w: number, h: number, color: string, a = 1) {
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
export function coinFlat(ctx: Ctx, cx: number, cy: number, r: number, color = C.gold) {
  ctx.fillStyle = "#B8862A"; ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.18, r, r * 0.36, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.36, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(26,26,26,0.55)"; ctx.lineWidth = 2; ctx.stroke();
}

export function coinFace(ctx: Ctx, cx: number, cy: number, r: number, color = C.gold) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#8F6A1E"; ctx.lineWidth = r * 0.12; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2); ctx.lineWidth = r * 0.06; ctx.stroke();
  text(ctx, "¥", cx, cy + r * 0.36, { size: r * 1.05, fam: "Num", color: "#8F6A1E", align: "center", bold: 1 });
}

export function icePack(ctx: Ctx, x: number, y: number, w: number, h: number, rot: number, o: { a?: number; sx?: number; glow?: number } = {}) {
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
