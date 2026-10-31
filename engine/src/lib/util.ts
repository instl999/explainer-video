// Shared utilities: hashing, the paid-result cache, the cost ledger, FFmpeg lookup, two-pass loudness and the Ark key.
// Machine settings (paths, the key) live in config.ts.
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CONFIG, ROOT, ttsAuth } from "./config.ts";

export { ROOT };
export const CACHE_DIR = CONFIG.cacheDir;
export const sha256 = (data: string | Uint8Array): string => crypto.createHash("sha256").update(data).digest("hex");
export const stableHash = (value: unknown): string => sha256(JSON.stringify(value));
export const ensureDir = (dir: string): string => { fs.mkdirSync(dir, { recursive: true }); return dir; };
export function writeJson(file: string, data: unknown) { ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(data, null, 1)); }

export const cachePath = (key: string, ext: string) => path.join(CACHE_DIR, key.slice(0, 2), `${key}${ext}`);
export function cacheGet(key: string, ext: string): Buffer | null { const p = cachePath(key, ext); return fs.existsSync(p) ? fs.readFileSync(p) : null; }
export function cachePut(key: string, ext: string, data: Uint8Array | string) { const p = cachePath(key, ext); ensureDir(path.dirname(p)); fs.writeFileSync(p, data); }

/** Paid calls, appended to out/cost.json (AFP units; 1 AFP = ¥0.002). */
export function ledger(e: { stage: string; item: string; model: string; units: number; unit: string; afp: number; cached: boolean }) {
  const file = path.join(ROOT, "out", "cost.json");
  const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { entries: [], totals: { afp: 0, yuan: 0 } };
  data.entries.push({ ...e, at: new Date().toISOString() });
  const afp = data.entries.reduce((s: number, x: { afp: number }) => s + x.afp, 0);
  data.totals = { afp: Math.round(afp * 10) / 10, yuan: Math.round(afp * 0.002 * 100) / 100 };
  writeJson(file, data);
}

/** TTS endpoint and credentials (see config.ts for where they are read from). Never logged. */
export const loadKey = ttsAuth;

/** ffmpeg / ffprobe: FFMPEG_DIR if set, else WinGet's Gyan.FFmpeg install, else whatever is on PATH. */
export function ffmpegBin(name: "ffmpeg" | "ffprobe"): string {
  const la = process.env.LOCALAPPDATA || "", pk = path.join(la, "Microsoft", "WinGet", "Packages");
  const cands: string[] = [];
  if (CONFIG.ffmpegDir) cands.push(path.join(CONFIG.ffmpegDir, `${name}.exe`), path.join(CONFIG.ffmpegDir, name));
  cands.push(path.join(la, "Microsoft", "WinGet", "Links", `${name}.exe`));
  if (fs.existsSync(pk)) for (const d of fs.readdirSync(pk)) if (d.startsWith("Gyan.FFmpeg")) for (const e of fs.readdirSync(path.join(pk, d))) cands.push(path.join(pk, d, e, "bin", `${name}.exe`));
  return cands.find((p) => fs.existsSync(p)) ?? name;
}

/** Two-pass EBU R128 loudness to −14 LUFS, −1.5 dBTP; returns the first-pass measurement. */
export function loudnorm(input: string, output: string): { i: number; tp: number } {
  const LN = "loudnorm=I=-14:TP=-1.5:LRA=11";
  const p1 = spawnSync(ffmpegBin("ffmpeg"), ["-hide_banner", "-i", input, "-af", `${LN}:print_format=json`, "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 26 });
  const txt = p1.stderr, j = JSON.parse(txt.slice(txt.lastIndexOf("{"), txt.lastIndexOf("}") + 1));
  const p2 = spawnSync(ffmpegBin("ffmpeg"), ["-y", "-hide_banner", "-loglevel", "error", "-i", input, "-af",
    `${LN}:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`, "-ar", "48000", output]);
  if (p2.status !== 0) throw new Error("loudnorm pass 2 failed");
  return { i: Number(j.input_i), tp: Number(j.input_tp) };
}
