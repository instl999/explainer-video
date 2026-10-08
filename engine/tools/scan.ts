// Study the source footage before planning: probe, cut list (hard cuts, soft dissolves) and 1-fps contact sheets with
// timestamps, so every usable stretch can go into src/clips.ts. Look at every sheet: burned-in subtitles, watermarks,
// ghosting dissolves inside a clip and off-topic shots must be left out or cropped by the camera.
// Usage: node tools/scan.ts [footage]              → review/scan.txt, review/src_00.jpg … (70 s per sheet)
//        node tools/scan.ts --frames=1.5,8,26.5    → review/frames_0.jpg … (full-size frames, 2×2 per sheet, for placing graphics)
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT } from "../src/lib/config.ts";
import { ensureDir, ffmpegBin } from "../src/lib/util.ts";

const SCRIPT = JSON.parse(fs.readFileSync(path.join(ROOT, "script.json"), "utf8"));
const src: string = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? SCRIPT.footage;
const frames = process.argv.find((a) => a.startsWith("--frames="))?.slice(9);
const rev = ensureDir(path.join(ROOT, "review"));
const FONT = "fonts/NotoSansSC-Bold.otf";   // relative: ffmpeg's drawtext chokes on the colon in "C:/..."
const ff = (args: string[]) => spawnSync(ffmpegBin("ffmpeg"), ["-v", "error", "-y", ...args], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 });

if (frames) {
  const ts = frames.split(",").map(Number), files: string[] = [];
  ts.forEach((t, i) => {
    const f = path.join(rev, `_f${i}.png`);
    ff(["-ss", String(t), "-i", src, "-frames:v", "1", "-vf", `scale=960:-1,drawtext=fontfile=${FONT}:text='${t}':x=10:y=8:fontsize=34:fontcolor=yellow:box=1:boxcolor=black@0.6`, f]);
    files.push(f);
  });
  for (let s = 0; s * 4 < files.length; s++) {
    const group = files.slice(s * 4, s * 4 + 4);
    while (group.length < 4) group.push(group[group.length - 1]);
    const out = path.join(rev, `frames_${s}.jpg`);
    ff([...group.flatMap((f) => ["-i", f]), "-filter_complex", "[0][1][2][3]xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0", out]);
    console.log(out);
  }
  for (const f of files) fs.rmSync(f, { force: true });
  process.exit(0);
}

const probe = JSON.parse(spawnSync(ffmpegBin("ffprobe"), ["-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration", "-of", "json", src], { encoding: "utf8" }).stdout);
const dur = Number(probe.format.duration);
const v = probe.streams.find((s: { codec_type: string }) => s.codec_type === "video");
const hasAudio = probe.streams.some((s: { codec_type: string }) => s.codec_type === "audio");
const lines = [src, `${dur.toFixed(2)} s, ${v.width}x${v.height} @ ${v.r_frame_rate}, audio: ${hasAudio ? "yes (ignored; the mix is rebuilt)" : "none"}`];
ff(["-i", src, "-vf", "scale=320:-1,scdet=threshold=0,metadata=print:key=lavfi.scd.score:file=review/scd.txt", "-an", "-f", "null", "-"]);
const rows: Array<[number, number]> = [];
let t = 0;
for (const l of fs.readFileSync(path.join(rev, "scd.txt"), "utf8").split(/\r?\n/)) {
  const m = l.match(/pts_time:([\d.]+)/);
  if (m) { t = Number(m[1]); continue; }
  const s = l.match(/lavfi\.scd\.score=([\d.]+)/);
  if (s) rows.push([t, Number(s[1])]);
}
const hard = rows.filter(([, s]) => s > 12).map(([x]) => x.toFixed(2));
const soft: string[] = [];
let run: [number, number] | null = null;
for (const [x, s] of rows) {
  if (s <= 3 || s > 12) continue;
  if (run && x - run[1] < 0.15) run[1] = x;
  else { if (run && run[1] - run[0] > 0.2) soft.push(`${run[0].toFixed(2)}–${run[1].toFixed(2)}`); run = [x, x]; }
}
if (run && run[1] - run[0] > 0.2) soft.push(`${run[0].toFixed(2)}–${run[1].toFixed(2)}`);
lines.push(`hard cuts: ${hard.join(" ")}`, `soft transitions / heavy motion: ${soft.join(" ") || "none"}`,
  "note: dark or slow dissolves can hide from the detector; trust the sheets.");
fs.writeFileSync(path.join(rev, "scan.txt"), lines.join("\n") + "\n", "utf8");
console.log(lines.join("\n"));
const per = 70;
for (let k = 0; k * per < dur; k++) {
  const out = path.join(rev, `src_${String(k).padStart(2, "0")}.jpg`);
  ff(["-ss", String(k * per), "-t", String(per), "-i", src, "-vf",
    `fps=1,scale=320:-1,drawtext=fontfile=${FONT}:text='%{eif\\:t+${k * per}\\:d}':x=6:y=4:fontsize=24:fontcolor=yellow:box=1:boxcolor=black@0.6,tile=10x7`, "-frames:v", "1", out]);
  console.log(out);
}
