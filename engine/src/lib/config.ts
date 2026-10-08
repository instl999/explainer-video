// Settings for this machine, read once. Precedence: process environment → this project's .env → the user-level
// ~/.explainer-video/.env → built-in defaults. Files are UTF-8 `KEY=value` lines (quotes optional, # comments).
// ARK_API_KEY is a secret: it is only ever handed to the TTS request, never logged.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const USER_DIR = path.join(os.homedir(), ".explainer-video");
export const ENV_FILES = [path.join(ROOT, ".env"), path.join(USER_DIR, ".env")];

function parse(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}
const fromFiles: Record<string, string> = {};
for (const f of [...ENV_FILES].reverse()) Object.assign(fromFiles, parse(f));   // the project file wins over the user file

/** A setting by name (environment first), or `fallback` when unset or empty. */
export function setting(key: string, fallback = ""): string {
  const v = process.env[key] ?? fromFiles[key];
  return v !== undefined && v.trim() !== "" ? v.trim() : fallback;
}

const desktop = path.join(os.homedir(), "Desktop");
export const CONFIG = {
  /** Mood-labelled music library (file names start with 开头紧张 / 解释 / 结尾升华 …). */
  bgmDir: setting("BGM_DIR", path.join(desktop, "bgm")),
  /** Sound-effect library; role files in src/sfx-roles.ts are relative to this folder. */
  sfxDir: setting("SFX_DIR", path.join(desktop, "布斯的音效库")),
  /** Paid TTS results, keyed by request hash, so re-runs are free. */
  cacheDir: setting("CACHE_DIR", path.join(USER_DIR, "cache")),
  /** Where `npm run deliver` copies the finished video and subtitles (default: the folder holding the project). */
  outputDir: setting("OUTPUT_DIR", path.dirname(ROOT)),
  /** Default voice; script.json "speaker" overrides it. 解说小明 2.0. */
  speaker: setting("TTS_SPEAKER", "zh_male_jieshuoxiaoming_uranus_bigtts"),
  /** Resource id for TTS 2.0 voices (the *_uranus_* speakers). */
  ttsResource: setting("TTS_RESOURCE_ID", "seed-tts-2.0"),
  /** Folder holding ffmpeg(.exe) and ffprobe(.exe); empty = look in WinGet's Gyan.FFmpeg install, then PATH. */
  ffmpegDir: setting("FFMPEG_DIR", ""),
  /** A font with Japanese kana/kanji for book titles etc. (SmileySans lacks 貯/黒 and silently draws a wrong glyph). */
  jpFont: setting("JP_FONT", "C:/Windows/Fonts/YuGothB.ttc"),
};

/** The Volcano Ark Agent Plan key (sent as X-Api-Key to the TTS endpoint). */
export function arkKey(): string {
  const k = setting("ARK_API_KEY");
  if (!k) throw new Error(`ARK_API_KEY not found. Put a line ARK_API_KEY=... in ${path.join(USER_DIR, ".env")} (or this project's .env, or the environment). See .env.example in the skill folder.`);
  return k;
}
