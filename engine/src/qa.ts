// Delivery checks on out/final.mp4: format, loudness/true peak, black or frozen stretches, voice over background
// (from the stems) and a contact sheet of the finished cut.
// Usage: node src/qa.ts [file]
import { spawnSync } from "node:child_process";
import path from "node:path";
import { PROJECT, alignment } from "./common.ts";
import { readWav16 } from "./lib/wav.ts";
import { ffmpegBin } from "./lib/util.ts";

const file = process.argv[2] ?? path.join(PROJECT, "out", "final.mp4");
const run = (bin: "ffmpeg" | "ffprobe", args: string[]) => spawnSync(ffmpegBin(bin), args, { encoding: "utf8", maxBuffer: 1 << 28 });
const problems: string[] = [];

const probe = JSON.parse(run("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt,sample_rate,channels:format=duration", "-of", "json", file]).stdout);
const vs = probe.streams.find((s: { codec_type: string }) => s.codec_type === "video"), as = probe.streams.find((s: { codec_type: string }) => s.codec_type === "audio");
console.log(`[qa] ${path.basename(file)}  ${Number(probe.format.duration).toFixed(2)} s`);
console.log(`[qa] video ${vs?.codec_name} ${vs?.width}x${vs?.height} ${vs?.r_frame_rate} ${vs?.pix_fmt}`);
console.log(`[qa] audio ${as?.codec_name ?? "none"} ${as?.sample_rate ?? ""} Hz ${as?.channels ?? ""} ch`);
if (vs?.width !== 1920 || vs?.height !== 1080) problems.push("not 1920x1080");
if (vs?.r_frame_rate !== "30/1") problems.push(`frame rate ${vs?.r_frame_rate}`);
if (!as) problems.push("no audio stream");

if (as) {
  const e = run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-filter_complex", "ebur128=peak=true", "-f", "null", "-"]).stderr;
  const I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(e.slice(e.lastIndexOf("Summary")))?.[1]), TP = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(e.slice(e.lastIndexOf("Summary")))?.[1]);
  console.log(`[qa] loudness ${I} LUFS, true peak ${TP} dBTP`);
  // with a draft (silent) voice the mix is music + effects only, normalised up ~10 dB: level and peak mean nothing yet
  if (alignment.draft) console.log("[qa] draft voice: loudness and true peak are not meaningful until the real voice is in");
  else {
    if (Math.abs(I + 14) > 1) problems.push(`loudness ${I} LUFS (target −14)`);
    if (TP > -1) problems.push(`true peak ${TP} dBTP`);
  }
}
const bd = run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-vf", "blackdetect=d=0.25:pix_th=0.06,freezedetect=n=0.002:d=2", "-an", "-f", "null", "-"]).stderr;
const blacks = [...bd.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => `${m[1]}–${m[2]}`);
const freezes = [...bd.matchAll(/freeze_start: ([\d.]+)[\s\S]*?freeze_end: ([\d.]+)/g)].map((m) => `${(+m[1]).toFixed(1)}–${(+m[2]).toFixed(1)}`);
console.log(`[qa] black: ${blacks.join(", ") || "none"}`);
console.log(`[qa] frozen ≥2 s: ${freezes.join(", ") || "none"}`);
for (const b of blacks) { const [a] = b.split("–").map(Number); if (a < Number(probe.format.duration) - 1.2) problems.push(`black at ${b}`); }

// voice over background, in 100 ms windows where the narration is speaking
try {
  const v = readWav16(path.join(PROJECT, "out", "stem_voice.wav")).samples, b = readWav16(path.join(PROJECT, "out", "stem_bg.wav")).samples;
  const w = 4800 * 2, diffs: number[] = [];
  for (let i = 0; i + w <= Math.min(v.length, b.length); i += w) {
    let sv = 0, sb = 0; for (let k = i; k < i + w; k++) { sv += v[k] * v[k]; sb += b[k] * b[k]; }
    const dv = 10 * Math.log10(sv / w + 1e-12), dbg = 10 * Math.log10(sb / w + 1e-12);
    if (dv > -32) diffs.push(dv - dbg);
  }
  diffs.sort((x, y) => x - y);
  if (diffs.length) {
    const med = diffs[Math.floor(diffs.length / 2)], p10 = diffs[Math.floor(diffs.length * 0.1)];
    console.log(`[qa] voice over background: median ${med.toFixed(1)} dB, worst 10% ${p10.toFixed(1)} dB (${diffs.length} speech windows)`);
    if (med < 12) problems.push(`voice only ${med.toFixed(1)} dB over background`);
  } else console.log("[qa] voice stem is silent (draft voice)");
} catch { console.log("[qa] stems missing; run src/audio.ts"); }

const sheet = path.join(PROJECT, "review", "final_sheet.jpg");
run("ffmpeg", ["-y", "-v", "error", "-i", file, "-vf", "fps=1/4,scale=384:-1,tile=6x6", "-frames:v", "1", sheet]);
console.log(`[qa] sheet ${sheet}`);
console.log(problems.length ? `[qa] PROBLEMS:\n  - ${problems.join("\n  - ")}` : "[qa] all checks passed");
