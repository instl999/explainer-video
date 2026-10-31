// 9:16 safe-area version (Douyin / 视频号 / 小红书), built from the captionless 16:9 render (out/video_clean.mp4, made by
// `render.ts --clean`) and the final mix (out/mix.wav). Layout on 1080×1920:
//   - a blurred, darkened copy of the frame fills the canvas;
//   - the sharp 16:9 picture sits at y 562–1261, 15 % larger than full width with 81 px trimmed each side — in 16:9
//     terms only x < 125 and x > 1795 are lost, so keep every scene's text inside x 140–1700 when 9:16 is the goal;
//   - a fixed title block above it, below the app's top bar: script.json cover.lines / cover.hook (default: the title
//     split at its first "："), in cover.font;
//   - captions in the shared caption style under the picture, inside x 135–945, clear of the right-hand button column
//     and the bottom description area.
// Usage: npm run vertical  (= render.ts --jobs=4 --clean, then this)  → out/final_9x16.mp4; `npm run deliver` copies it.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createCanvas, ImageData } from "@napi-rs/canvas";
import { C, PROJECT, SCRIPT, registerFonts } from "./common.ts";
import { drawCaption } from "./captions.ts";
import { measure, text, type TextOpt } from "./draw.ts";
import type { CoverSpec } from "./cover.ts";
import { ffmpegBin } from "./lib/util.ts";

registerFonts();
const VW = 1080, VH = 1920, FY = 562, FPS = 30, FRAME = VW * VH * 4;
const FW = 1242, CROP = (FW - VW) / 2;
const out = path.join(PROJECT, "out");
for (const f of ["video_clean.mp4", "mix.wav"]) if (!fs.existsSync(path.join(out, f))) { console.error(`[vertical] missing out/${f} — run npm run vertical (it renders the clean pass) after npm run mix`); process.exit(1); }

const spec = ((SCRIPT as { cover?: CoverSpec }).cover ?? {}) as CoverSpec;
const [head, ...rest] = SCRIPT.title.split(/[：:]/);
const headText = spec.lines?.length ? spec.lines.join("") : head.trim(), hookText = spec.hook ?? rest.join("：").trim();
const fam = spec.font ?? "Display";
const STYLE = (size: number, color: string): TextOpt => ({ size, fam, color, align: "center", mixNum: fam !== "Serif", shadow: { color: "rgba(0,0,0,0.7)", blur: 20, dy: 3 },
  ...(fam === "Display" ? { stroke: "rgba(0,0,0,0.55)", strokeW: size * 0.08 } : {}) });

const dec = spawn(ffmpegBin("ffmpeg"), ["-v", "error", "-i", path.join(out, "video_clean.mp4"), "-filter_complex",
  `[0:v]split=2[a][b];[a]scale=-2:${VH},crop=${VW}:${VH},gblur=sigma=36,eq=brightness=-0.22:saturation=0.75[bg];[b]scale=${FW}:-2:flags=lanczos,crop=${VW}:ih:${CROP}:0[fg];[bg][fg]overlay=0:${FY},format=rgba`,
  "-f", "rawvideo", "-"], { stdio: ["ignore", "pipe", "inherit"] });
const enc = spawn(ffmpegBin("ffmpeg"), ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${VW}x${VH}`, "-r", String(FPS), "-i", "-",
  "-i", path.join(out, "mix.wav"), "-map", "0:v", "-map", "1:a",
  "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-g", "60",
  "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
  "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", path.join(out, "final_9x16.mp4")], { stdio: ["pipe", "inherit", "inherit"] });
const done = new Promise<void>((ok, bad) => enc.on("close", (c) => (c === 0 ? ok() : bad(new Error(`encoder exited ${c}`)))));

// the fixed title block, drawn once
const title = createCanvas(VW, 560), tx = title.getContext("2d");
{
  const hs = Math.min(96, (96 * 900) / measure(tx, headText, STYLE(96, "#fff")));
  text(tx, headText, VW / 2, 330, STYLE(hs, "#fff"));
  tx.fillStyle = C.marker; tx.fillRect(VW / 2 - 60, 368, 120, 6);
  if (hookText) { const ks = Math.min(60, (60 * 900) / measure(tx, hookText, STYLE(60, C.marker))); text(tx, hookText, VW / 2, 470, STYLE(ks, C.marker)); }
}

const c = createCanvas(VW, VH), x = c.getContext("2d"), img = new ImageData(VW, VH);
const buf = Buffer.allocUnsafe(FRAME);
let fill = 0, n = 0;
const t0 = performance.now();
for await (const chunk of dec.stdout!) {
  let off = 0;
  while (off < chunk.length) {
    const k = Math.min(chunk.length - off, FRAME - fill);
    (chunk as Buffer).copy(buf, fill, off, off + k); fill += k; off += k;
    if (fill < FRAME) break;
    img.data.set(buf); x.putImageData(img, 0, 0);
    x.drawImage(title, 0, 0);
    drawCaption(x, n / FPS, VW / 2, 1372, 54);
    if (!enc.stdin.write(Buffer.from(c.data()))) await new Promise((ok) => enc.stdin.once("drain", ok));
    fill = 0; n++;
    if (n % 600 === 0) process.stderr.write(`[vertical] ${(n / FPS).toFixed(0)} s\n`);
  }
}
enc.stdin.end();
await done;
console.log(`[vertical] out/final_9x16.mp4  ${n} frames, ${((performance.now() - t0) / 1000).toFixed(0)} s`);
