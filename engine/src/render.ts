// Frame compositor. Each active shot renders into its own canvas (footage through the camera and grade, or a paper board,
// plus its world/screen paint); shots meet in transitions centred on the cut; impacts shake/punch/flash the picture;
// overlays and captions go on top. Frames stream to libx264.
// Usage:
//   node src/render.ts --sheet=0.5,2,4.1     preview stills (accurate seeks) → review/sheet_*.jpg
//   node src/render.ts --sheet-every=1.5     contact sheets of the whole cut
//   node src/render.ts --from=0 --to=25 --out=review/hook.mp4 [--fast]
//   node src/render.ts --jobs=4              full render in parallel parts → out/video.mp4
//   node src/render.ts --jobs=4 --clean      same without burned-in captions → out/video_clean.mp4 (for src/vertical.ts)
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createCanvas, ImageData, type Canvas } from "@napi-rs/canvas";
import { FPS, H, PROJECT, W, clamp, E, hash, registerFonts } from "./common.ts";
import { paper, paperVignette, type Ctx } from "./draw.ts";
import { CLIPS, FrameReader, grab } from "./footage.ts";
import { applyCam, camAt, type Impact, type Overlay, type Shot, type Trans } from "./model.ts";
import { ensureDir, ffmpegBin } from "./lib/util.ts";

registerFonts();
const { shots, overlays, impacts, END } = (await import("./timeline.ts")) as { shots: Shot[]; overlays: Overlay[]; impacts: Impact[]; END: number };

// ---------- validation ----------
for (let i = 0; i < shots.length; i++) {
  const s = shots[i];
  if (!(s.t1 > s.t0)) throw new Error(`shot ${s.id} has t1 <= t0`);
  if (i > 0 && Math.abs(shots[i - 1].t1 - s.t0) > 1e-6) throw new Error(`gap/overlap between ${shots[i - 1].id} and ${s.id}`);
  if (s.tin && s.tin.kind !== "cut") {
    const half = s.tin.d / 2;
    if (half > (s.t1 - s.t0) / 2 || (i > 0 && half > (shots[i - 1].t1 - shots[i - 1].t0) / 2)) throw new Error(`transition into ${s.id} longer than a shot half`);
  }
}

// ---------- canvases ----------
const out = createCanvas(W, H), octx = out.getContext("2d");
const layers = [0, 1].map(() => { const c = createCanvas(W, H); return { c, x: c.getContext("2d") }; });
const feet = [0, 1].map(() => { const c = createCanvas(W, H); return { c, x: c.getContext("2d"), img: new ImageData(W, H) }; });
for (const l of [octx, ...layers.map((l) => l.x), ...feet.map((f) => f.x)]) { l.imageSmoothingEnabled = true; l.imageSmoothingQuality = "medium"; }

// ---------- footage ----------
const srcTime = (s: Shot, t: number) => { const [a, b] = CLIPS[s.clip!]; return clamp(s.src! + (t - s.t0) * (s.speed ?? 1), a, b - 1 / FPS); };
const transOut = (i: number) => (shots[i + 1]?.tin && shots[i + 1].tin!.kind !== "cut" ? shots[i + 1].tin!.d / 2 : 0);
const transIn = (i: number) => (shots[i].tin && shots[i].tin!.kind !== "cut" ? shots[i].tin!.d / 2 : 0);
let preview = false;
const readers = new Map<string, { r: FrameReader; a: number }>();
async function footFrame(i: number, t: number, slot: number): Promise<Canvas> {
  const s = shots[i], f = feet[slot];
  let buf: Buffer;
  const vf = s.grade?.blur ? `gblur=sigma=${s.grade.blur}` : "";
  if (preview) buf = grab(srcTime(s, t), vf);
  else {
    let e = readers.get(s.id);
    if (!e) { const a = srcTime(s, t); e = { r: new FrameReader(a, srcTime(s, s.t1 + transOut(i) + 0.1), s.speed ?? 1, vf), a }; readers.set(s.id, e); }
    buf = await e.r.frame(Math.max(0, Math.round(((srcTime(s, t) - e.a) / (s.speed ?? 1)) * FPS)));
  }
  f.img.data.set(buf);
  f.x.putImageData(f.img, 0, 0);
  return f.c;
}
function closeFinished(t: number) {
  for (const [id, e] of readers) {
    const i = shots.findIndex((s) => s.id === id);
    if (t > shots[i].t1 + transOut(i) + 0.05) { e.r.close(); readers.delete(id); }
  }
}

// ---------- shots ----------
function grade(x: Ctx, s: Shot) {
  const g = s.grade; if (!g) return;
  if (g.sat !== undefined && g.sat < 1) { x.save(); x.globalCompositeOperation = "saturation"; x.globalAlpha = 1 - g.sat; x.fillStyle = "#808080"; x.fillRect(0, 0, W, H); x.restore(); }
  if (g.tint) { x.save(); x.globalCompositeOperation = "soft-light"; x.globalAlpha = g.tintA ?? 0.3; x.fillStyle = g.tint; x.fillRect(0, 0, W, H); x.restore(); }
  if (g.bright) { x.save(); x.globalCompositeOperation = "screen"; x.globalAlpha = g.bright; x.fillStyle = "#ffffff"; x.fillRect(0, 0, W, H); x.restore(); }
  if (g.dark) { x.save(); x.fillStyle = `rgba(0,0,0,${g.dark})`; x.fillRect(0, 0, W, H); x.restore(); }
  if (g.vignette) {
    x.save();
    const v = x.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 1.0);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, `rgba(0,0,0,${g.vignette})`);
    x.fillStyle = v; x.fillRect(0, 0, W, H); x.restore();
  }
}
async function renderShot(i: number, t: number, slot: number): Promise<Canvas> {
  const s = shots[i], L = layers[slot], x = L.x;
  const foot = s.clip ? await footFrame(i, t, slot) : null;
  const world = s.world ?? [W, H], cam = camAt(s.cam, t, world);
  x.save();
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.fillStyle = "#000"; x.fillRect(0, 0, W, H);
  if (foot && s.full !== false) {
    x.save(); applyCam(x, cam);
    x.drawImage(foot, 0, 0);
    x.restore();
    grade(x, s);
    if (s.paint) { x.save(); applyCam(x, cam); s.paint(x, { t, shot: s, foot }); x.restore(); }
  } else {
    x.save(); applyCam(x, cam);
    paper(x, { grid: s.board?.grid, tone: s.board?.tone, w: world[0], h: world[1] });
    s.paint?.(x, { t, shot: s, foot });
    x.restore();
    paperVignette(x, 0.9);
  }
  s.hud?.(x, { t, shot: s, foot });
  x.restore();
  return L.c;
}

// ---------- transitions ----------
function drawLayer(x: Ctx, c: Canvas, dx = 0, dy = 0, s = 1, a = 1) {
  if (a <= 0.001) return;
  x.save(); x.globalAlpha = a;
  if (s !== 1) { x.translate(W / 2 + dx, H / 2 + dy); x.scale(s, s); x.drawImage(c, -W / 2, -H / 2); }
  else x.drawImage(c, dx, dy);
  x.restore();
}
function smear(x: Ctx, c: Canvas, dx: number, vel: number) {
  const n = Math.min(7, Math.max(1, Math.round(Math.abs(vel) / 14)));
  if (n === 1) { drawLayer(x, c, dx); return; }
  drawLayer(x, c, dx);
  for (let k = 1; k <= n; k++) drawLayer(x, c, dx - (vel * k) / n, 0, 1, 0.5 / k + 0.08);
}
function composite(x: Ctx, A: Canvas, B: Canvas, tr: Trans, u: number, frameNo: number) {
  const dir = tr.dir ?? 1;
  switch (tr.kind) {
    case "fade": drawLayer(x, A); drawLayer(x, B, 0, 0, 1, E.sine(u)); break;
    case "dip": {
      const col = tr.color ?? "#000";
      if (u < 0.5) drawLayer(x, A); else drawLayer(x, B);
      x.save(); x.globalAlpha = 1 - Math.abs(u - 0.5) * 2; x.fillStyle = col; x.fillRect(0, 0, W, H); x.restore();
      break;
    }
    case "flash": {
      if (u < 0.5) drawLayer(x, A); else drawLayer(x, B);
      x.save(); x.globalAlpha = 0.85 * (1 - Math.abs(u - 0.5) * 2) ** 1.6; x.fillStyle = "#fff"; x.fillRect(0, 0, W, H); x.restore();
      break;
    }
    case "push": {
      const e = E.inOut(u);
      drawLayer(x, A, -dir * W * e); drawLayer(x, B, dir * W * (1 - e));
      break;
    }
    case "whip": {
      // sine velocity, fastest at the cut; both layers always drawn so they tile edge to edge, each smeared along the motion
      const e = 0.5 - 0.5 * Math.cos(Math.PI * u), vel = dir * W * 0.5 * Math.PI * Math.sin(Math.PI * u) / (FPS * tr.d) * 1.6;
      smear(x, A, -dir * W * e, -vel); smear(x, B, dir * W * (1 - e), -vel);
      break;
    }
    case "slide": {
      // the next sheet slides up over the current one
      const e = E.out5(u);
      drawLayer(x, A);
      x.save(); x.fillStyle = `rgba(0,0,0,${0.35 * e})`; x.fillRect(0, 0, W, H); x.restore();
      const y = H * (1 - e);
      const sg = x.createLinearGradient(0, y - 70, 0, y); sg.addColorStop(0, "rgba(0,0,0,0)"); sg.addColorStop(1, "rgba(0,0,0,0.42)");
      x.save(); x.fillStyle = sg; x.fillRect(0, y - 70, W, 70); x.restore();
      drawLayer(x, B, 0, y);
      break;
    }
    case "zoom": {
      const a = clamp(u / 0.65), b = clamp((u - 0.35) / 0.65);
      drawLayer(x, A, 0, 0, 1 + 0.5 * E.in(a), 1 - E.in(a));
      drawLayer(x, B, 0, 0, 1.25 - 0.25 * E.out(b), E.out(b));
      break;
    }
    case "glitch": {
      const cur = u < 0.5 ? A : B, k = clamp(1 - Math.abs(u - 0.5) / 0.38);
      drawLayer(x, cur);
      if (k > 0) {
        const bands = 14;
        for (let b = 0; b < bands; b++) {
          if (hash(frameNo, b, 3) > 0.55 * k + 0.15) continue;
          const y0 = Math.floor(hash(frameNo, b, 1) * H), h = Math.floor(10 + hash(frameNo, b, 2) * 90), dx = (hash(frameNo, b, 4) - 0.5) * 220 * k;
          x.drawImage(hash(frameNo, b, 5) > 0.7 ? (cur === A ? B : A) : cur, 0, y0, W, h, dx, y0, W, h);
        }
        x.save();
        for (let b = 0; b < 5; b++) {
          if (hash(frameNo, b, 7) > k) continue;
          x.globalAlpha = 0.55 * k; x.fillStyle = ["#3CF59B", "#FF3B5C", "#2F7BFF", "#FFFFFF"][b % 4];
          x.fillRect(0, hash(frameNo, b, 8) * H, W, 2 + hash(frameNo, b, 9) * 10);
        }
        x.restore();
      }
      break;
    }
    default: drawLayer(x, u < 0.5 ? A : B);
  }
}

// ---------- frame ----------
function impactAt(t: number) {
  let shake = 0, punch = 0, flash = 0;
  for (const m of impacts) {
    const dt = t - m.t;
    if (dt < 0 || dt > (m.dur ?? 0.6)) continue;
    shake += (m.shake ?? 0) * Math.exp(-dt * 11);
    punch += (m.punch ?? 0) * Math.exp(-dt * 9) * clamp(dt / 0.03);
    flash += (m.flash ?? 0) * Math.exp(-dt * 14);
  }
  return { shake, punch, flash };
}
export async function renderFrame(t: number, frameNo: number): Promise<Canvas> {
  let i = shots.findIndex((s) => t >= s.t0 && t < s.t1);
  if (i < 0) i = t < shots[0].t0 ? 0 : shots.length - 1;
  let A = -1, B = i, u = 1, tr: Trans | undefined;
  if (transIn(i) > 0 && t < shots[i].t0 + transIn(i) && i > 0) { A = i - 1; tr = shots[i].tin; u = (t - (shots[i].t0 - transIn(i))) / tr!.d; }
  else if (transOut(i) > 0 && t >= shots[i].t1 - transOut(i) && i + 1 < shots.length) { A = i; B = i + 1; tr = shots[i + 1].tin; u = (t - (shots[i].t1 - transOut(i))) / tr!.d; }
  const im = impactAt(t);
  const sx = im.shake * (hash(frameNo, 91) - 0.5) * 2, sy = im.shake * (hash(frameNo, 92) - 0.5) * 2, sc = 1 + im.punch + im.shake / 420;
  octx.save();
  octx.setTransform(1, 0, 0, 1, 0, 0);
  octx.fillStyle = "#000"; octx.fillRect(0, 0, W, H);
  octx.translate(W / 2 + sx, H / 2 + sy); octx.scale(sc, sc); octx.translate(-W / 2, -H / 2);
  if (A >= 0 && tr) {
    const ca = await renderShot(A, t, 0), cb = await renderShot(B, t, 1);
    composite(octx, ca, cb, tr, clamp(u), frameNo);
  } else drawLayer(octx, await renderShot(B, t, 0));
  const live = overlays.filter((o) => t >= o.t0 && t < o.t1).sort((a, b) => (a.z ?? 10) - (b.z ?? 10));
  for (const o of live) if ((o.z ?? 10) < 50) { octx.save(); o.paint(octx, t); octx.restore(); }
  octx.restore();
  if (im.flash > 0.002) { octx.save(); octx.globalAlpha = clamp(im.flash); octx.fillStyle = "#fff"; octx.fillRect(0, 0, W, H); octx.restore(); }
  for (const o of live) if ((o.z ?? 10) >= 50) { octx.save(); o.paint(octx, t); octx.restore(); }
  return out;
}

// ---------- outputs ----------
const ffmpeg = ffmpegBin("ffmpeg");
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const flag = (k: string) => process.argv.includes(`--${k}`);
const FRAMES = Math.ceil(END * FPS);
if (flag("clean")) process.env.NO_CAPTIONS = "1";

async function encode(f0: number, f1: number, file: string, fast: boolean) {
  ensureDir(path.dirname(file));
  const enc = spawn(ffmpeg, ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-r", String(FPS), "-i", "-",
    "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-c:v", "libx264", "-preset", fast ? "veryfast" : "medium", "-crf", fast ? "22" : "16",
    "-tune", "film", "-g", "60", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", "-movflags", "+faststart", file],
    { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise<void>((ok, bad) => enc.on("close", (c) => (c === 0 ? ok() : bad(new Error(`encoder exited ${c}`)))));
  const t0 = performance.now();
  for (let f = f0; f < f1; f++) {
    const t = f / FPS;
    const c = await renderFrame(t, f);
    if (!enc.stdin.write(c.data())) await new Promise((ok) => enc.stdin.once("drain", ok));
    closeFinished(t);
    if ((f - f0) % 150 === 0) process.stderr.write(`[render ${path.basename(file)}] ${t.toFixed(1)} s  ${(((performance.now() - t0) / Math.max(1, f - f0))).toFixed(0)} ms/frame\n`);
  }
  enc.stdin.end();
  await done;
  for (const e of readers.values()) e.r.close();
}

async function sheets(times: number[], tag: string) {
  preview = true;
  const dir = ensureDir(path.join(PROJECT, "review"));
  const cols = 4, tw = 480, th = 270, perSheet = 16;
  for (let p = 0; p * perSheet < times.length; p++) {
    const chunk = times.slice(p * perSheet, (p + 1) * perSheet), rows = Math.ceil(chunk.length / cols);
    const sheet = createCanvas(cols * tw, rows * th), sx = sheet.getContext("2d");
    sx.fillStyle = "#111"; sx.fillRect(0, 0, sheet.width, sheet.height);
    for (let k = 0; k < chunk.length; k++) {
      const t = chunk[k], c = await renderFrame(t, Math.round(t * FPS));
      sx.drawImage(c, (k % cols) * tw, Math.floor(k / cols) * th, tw, th);
      sx.fillStyle = "rgba(0,0,0,0.6)"; sx.fillRect((k % cols) * tw, Math.floor(k / cols) * th, 92, 26);
      sx.fillStyle = "#ff0"; sx.font = "20px Mono"; sx.fillText(t.toFixed(2), (k % cols) * tw + 6, Math.floor(k / cols) * th + 19);
    }
    const file = path.join(dir, `${tag}_${p + 1}.jpg`);
    fs.writeFileSync(file, await sheet.encode("jpeg", 82));
    console.log(file);
  }
}
async function stills(times: number[]) {
  preview = true;
  const dir = ensureDir(path.join(PROJECT, "review", "stills"));
  for (const t of times) { const c = await renderFrame(t, Math.round(t * FPS)); const f = path.join(dir, `t${t.toFixed(2)}.jpg`); fs.writeFileSync(f, await c.encode("jpeg", 90)); console.log(f); }
}

if (flag("bench-only")) { /* imported for benchmarking */ }
else if (arg("sheet")) await sheets(arg("sheet")!.split(",").map(Number), arg("tag") ?? "sheet");
else if (arg("sheet-every")) { const step = Number(arg("sheet-every")), ts: number[] = []; for (let t = Number(arg("from") ?? 0.2); t < Math.min(END, Number(arg("to") ?? END)); t += step) ts.push(+t.toFixed(2)); await sheets(ts, arg("tag") ?? "sheet"); }
else if (arg("stills")) await stills(arg("stills")!.split(",").map(Number));
else if (arg("part")) {
  const [k, n] = arg("part")!.split("/").map(Number), f0 = Math.floor((k * FRAMES) / n), f1 = Math.floor(((k + 1) * FRAMES) / n);
  await encode(f0, f1, path.join(PROJECT, "out", "parts", `part_${k}.mp4`), flag("fast"));
} else if (arg("jobs")) {
  const n = Number(arg("jobs")), t0 = performance.now();
  await Promise.all(Array.from({ length: n }, (_, k) => new Promise<void>((ok, bad) => {
    const p = spawn(process.execPath, [process.argv[1], `--part=${k}/${n}`, ...(flag("fast") ? ["--fast"] : []), ...(flag("clean") ? ["--clean"] : [])], { stdio: ["ignore", "inherit", "inherit"] });
    p.on("close", (c) => (c === 0 ? ok() : bad(new Error(`part ${k} exited ${c}`))));
  })));
  const list = path.join(PROJECT, "out", "parts", "list.txt");
  fs.writeFileSync(list, Array.from({ length: n }, (_, k) => `file 'part_${k}.mp4'`).join("\n"));
  const name = flag("clean") ? "video_clean.mp4" : "video.mp4";
  const r = spawnSync(ffmpeg, ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", path.join(PROJECT, "out", name)], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("concat failed");
  console.log(`[render] out/${name}  ${FRAMES} frames, ${END.toFixed(2)} s, ${((performance.now() - t0) / 1000).toFixed(0)} s wall`);
} else {
  const from = Number(arg("from") ?? 0), to = Math.min(END, Number(arg("to") ?? END));
  await encode(Math.floor(from * FPS), Math.ceil(to * FPS), path.join(PROJECT, arg("out") ?? "out/video.mp4"), flag("fast"));
}
