// Contact sheets of the finished cut for the final review (6×6 tiles, each tile labelled with its absolute time).
// Usage: node tools/sheet.ts [--file=out/final.mp4] [--fps=2.5] [--from=0] [--to=end]   → review/final_00.jpg …
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT } from "../src/lib/config.ts";
import { ensureDir, ffmpegBin } from "../src/lib/util.ts";

const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const file = path.resolve(ROOT, arg("file") ?? "out/final.mp4"), fps = Number(arg("fps") ?? 2.5);
if (!fs.existsSync(file)) { console.error(`missing ${file}`); process.exit(1); }
const dur = Number(spawnSync(ffmpegBin("ffprobe"), ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }).stdout);
const from = Number(arg("from") ?? 0), to = Math.min(dur, Number(arg("to") ?? dur)), per = 36 / fps;
const rev = ensureDir(path.join(ROOT, "review"));
for (let k = 0, t0 = from; t0 < to - 0.05; k++, t0 += per) {
  const out = path.join(rev, `final_${String(k).padStart(2, "0")}.jpg`);
  spawnSync(ffmpegBin("ffmpeg"), ["-v", "error", "-y", "-ss", t0.toFixed(2), "-t", Math.min(per, to - t0).toFixed(2), "-i", file, "-vf",
    `fps=${fps},scale=320:-1,drawtext=fontfile=fonts/NotoSansSC-Bold.otf:text='%{eif\\:t*100+${Math.round(t0 * 100)}\\:d}':x=4:y=4:fontsize=16:fontcolor=yellow:box=1:boxcolor=black@0.6,tile=6x6`,
    "-frames:v", "1", out], { cwd: ROOT });
  console.log(`${out}   ${t0.toFixed(1)}–${Math.min(to, t0 + per).toFixed(1)} s (tile labels are centiseconds)`);
}
