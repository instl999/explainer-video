// Cover images (封面) for delivery: a landscape 1920×1080 and a portrait 1080×1920 JPEG built from one source frame and the
// title. Defaults: the title is split at its first "：" into headline (white) and hook (yellow); the frame is the opening
// shot's footage. script.json may override any of it with "cover": { "lines": ["标题第一行", …], "hook": "钩子问句",
// "tag": "小标签", "frame": <source seconds>, "focus": <0..1, where the portrait crop centres across the frame>,
// "font": "Display" (得意黑, default, outlined) | "Serif" (heavy 宋体, no outline — finance/commentary look) | "Sans" }.
// Usage: node src/cover.ts   (npm run deliver also runs it unless --no-covers)  → out/cover_16x9.jpg, out/cover_9x16.jpg
import fs from "node:fs";
import path from "node:path";
import { createCanvas, ImageData, type Canvas } from "@napi-rs/canvas";
import { C, H, PROJECT, SCRIPT, W, clamp, registerFonts } from "./common.ts";
import { measure, rr, text, type Ctx, type TextOpt } from "./draw.ts";
import { grab } from "./footage.ts";
import { ensureDir } from "./lib/util.ts";

export interface CoverSpec { lines?: string[]; hook?: string; tag?: string; frame?: number; focus?: number; font?: "Display" | "Serif" | "Sans" }
const SH = { color: "rgba(0,0,0,0.7)", blur: 26, dy: 4 };
let FAM: TextOpt["fam"] = "Display";
const HEAD = (size: number): TextOpt => ({ size, fam: FAM, color: "#fff", stroke: FAM === "Display" ? "rgba(0,0,0,0.55)" : undefined, strokeW: size * 0.08, shadow: SH, bold: FAM === "Display" ? 2 : 0, mixNum: FAM !== "Serif" });
const HOOK = (size: number): TextOpt => ({ ...HEAD(size), color: C.marker });

/** Largest size ≤ cap at which `s` fits in maxW. */
const fit = (ctx: Ctx, s: string, o: (n: number) => TextOpt, maxW: number, cap: number) => Math.min(cap, (cap * maxW) / measure(ctx, s, o(cap)));
/** One line if it fits at ≥ 80 % of cap, else split at the punctuation nearest the middle (kept on the first half). */
function splitHook(ctx: Ctx, s: string, maxW: number, cap: number): string[] {
  if (!s || fit(ctx, s, HOOK, maxW, cap) >= cap * 0.8) return s ? [s] : [];
  let best = -1;
  [...s].forEach((ch, i) => { if ("，,、；;：:".includes(ch) && i < s.length - 2 && (best < 0 || Math.abs(i - s.length / 2) < Math.abs(best - s.length / 2))) best = i; });
  const k = best >= 0 ? best + 1 : Math.ceil(s.length / 2);
  return [s.slice(0, k), s.slice(k)];
}
function tagPill(ctx: Ctx, label: string, x: number, y: number, size: number, center = false) {
  const w = measure(ctx, label, { size, fam: "Sans" }) + size * 1.2, h = size * 1.7, x0 = center ? x - w / 2 : x;
  ctx.fillStyle = C.red; rr(ctx, x0, y - h / 2, w, h, h / 2); ctx.fill();
  text(ctx, label, x0 + w / 2, y + size * 0.36, { size, fam: "Sans", color: "#fff", align: "center" });
}
/** Draws the headline lines then the hook lines, each fitted to maxW, as one block whose top is at `top`. */
function titleBlock(ctx: Ctx, lines: string[], hook: string[], x: number, top: number, maxW: number, headCap: number, hookCap: number, align: "left" | "center") {
  const hs = Math.min(...lines.map((l) => fit(ctx, l, HEAD, maxW, headCap)));
  const ks = hook.length ? Math.min(...hook.map((l) => fit(ctx, l, HOOK, maxW, hookCap))) : 0;
  let y = top;
  for (const l of lines) { y += hs; text(ctx, l, x, y, { ...HEAD(hs), align }); y += hs * 0.22; }
  if (hook.length) {
    y += ks * 0.25;
    for (const l of hook) { y += ks; text(ctx, l, x, y, { ...HOOK(ks), align }); y += ks * 0.2; }
  }
  return y - top;
}
/** Height the block will take (same maths as titleBlock, nothing drawn). */
function blockHeight(ctx: Ctx, lines: string[], hook: string[], maxW: number, headCap: number, hookCap: number) {
  const hs = Math.min(...lines.map((l) => fit(ctx, l, HEAD, maxW, headCap)));
  const ks = hook.length ? Math.min(...hook.map((l) => fit(ctx, l, HOOK, maxW, hookCap))) : 0;
  return lines.length * hs * 1.22 + (hook.length ? ks * 0.25 + hook.length * ks * 1.2 : 0);
}

async function defaultFrame(): Promise<number> {
  const { shots } = (await import("./timeline.ts")) as { shots: Array<{ clip?: string; src?: number }> };
  const s = shots.find((x) => x.clip && x.src !== undefined);
  if (!s) throw new Error('no footage shot to take a cover frame from; set script.json "cover": { "frame": <source seconds> }');
  return s.src! + 0.4;
}

export async function makeCovers(): Promise<string[]> {
  registerFonts();
  const spec = ((SCRIPT as { cover?: CoverSpec }).cover ?? {}) as CoverSpec;
  FAM = spec.font ?? "Display";
  const [head, ...rest] = SCRIPT.title.split(/[：:]/);
  const lines = spec.lines?.length ? spec.lines : [head.trim()];
  const hookText = spec.hook ?? rest.join("：").trim();
  const img = new ImageData(W, H); img.data.set(grab(spec.frame ?? (await defaultFrame())));
  const frame: Canvas = createCanvas(W, H); frame.getContext("2d").putImageData(img, 0, 0);
  const outDir = ensureDir(path.join(PROJECT, "out")), files: string[] = [];

  // ---- landscape 16:9: footage full-bleed. Subject on the right (focus ≥ 0.58): title block on a left shade; otherwise
  // (subjects are usually central) a low title band so the face stays clear.
  {
    const c = createCanvas(1920, 1080), x = c.getContext("2d");
    x.drawImage(frame, 0, 0);
    x.fillStyle = "rgba(0,0,0,0.18)"; x.fillRect(0, 0, 1920, 1080);
    const side = (spec.focus ?? 0.5) >= 0.58;
    if (side) {
      const g = x.createLinearGradient(0, 0, 1920 * 0.72, 0); g.addColorStop(0, "rgba(0,0,0,0.85)"); g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g; x.fillRect(0, 0, 1920, 1080);
    } else {
      const g = x.createLinearGradient(0, 1080 * 0.42, 0, 1080); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.55, "rgba(0,0,0,0.75)"); g.addColorStop(1, "rgba(0,0,0,0.9)");
      x.fillStyle = g; x.fillRect(0, 1080 * 0.42, 1920, 1080 * 0.58);
    }
    const maxW = side ? 1150 : 1600, headCap = side ? 160 : 120, hookCap = side ? 150 : 130;
    const hook = splitHook(x, hookText, maxW, hookCap), bh = blockHeight(x, lines, hook, maxW, headCap, hookCap);
    const y0 = side ? 540 - bh / 2 : 1010 - bh;
    if (spec.tag) tagPill(x, spec.tag, 110, y0 - 70, 40);
    titleBlock(x, lines, hook, 110, y0, maxW, headCap, hookCap, "left");
    const f = path.join(outDir, "cover_16x9.jpg"); fs.writeFileSync(f, await c.encode("jpeg", 92)); files.push(f);
  }
  // ---- portrait 9:16: the frame cropped around `focus`, title block in the lower middle (clear of platform UI)
  {
    const PW = 1080, PH = 1920, c = createCanvas(PW, PH), x = c.getContext("2d");
    const cropW = (H * PW) / PH;   // source width that maps onto the portrait at full height
    const sx = clamp((spec.focus ?? 0.5) * W - cropW / 2, 0, W - cropW);
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
    x.drawImage(frame, sx, 0, cropW, H, 0, 0, PW, PH);
    const top = x.createLinearGradient(0, 0, 0, PH * 0.3); top.addColorStop(0, "rgba(0,0,0,0.6)"); top.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = top; x.fillRect(0, 0, PW, PH * 0.3);
    const bot = x.createLinearGradient(0, PH * 0.38, 0, PH); bot.addColorStop(0, "rgba(0,0,0,0)"); bot.addColorStop(0.45, "rgba(0,0,0,0.78)"); bot.addColorStop(1, "rgba(0,0,0,0.92)");
    x.fillStyle = bot; x.fillRect(0, PH * 0.38, PW, PH * 0.62);
    const maxW = 960, hook = splitHook(x, hookText, maxW, 140);
    const bh = blockHeight(x, lines, hook, maxW, 150, 140), y0 = Math.min(1180, 1640 - bh);
    if (spec.tag) tagPill(x, spec.tag, PW / 2, y0 - 70, 40, true);
    titleBlock(x, lines, hook, PW / 2, y0, maxW, 150, 140, "center");
    const f = path.join(outDir, "cover_9x16.jpg"); fs.writeFileSync(f, await c.encode("jpeg", 92)); files.push(f);
  }
  return files;
}

if (process.argv[1]?.endsWith("cover.ts")) for (const f of await makeCovers()) console.log(`[cover] ${f}`);
