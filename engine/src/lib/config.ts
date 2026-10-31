// Settings for this machine, read once. Precedence: process environment → this project's .env → the user-level
// ~/.explainer-video/.env → built-in defaults. Files are UTF-8 `KEY=value` lines (quotes optional, # comments).
// TTS credentials (VOLC_TTS_API_KEY, VOLC_TTS_APP_ID/VOLC_TTS_ACCESS_TOKEN, ARK_API_KEY) are secrets: they are only ever
// handed to the TTS request, never logged.
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
  /** A heavy CJK serif for the "Serif" family (covers/titles with cover.font "Serif"). Best: 思源宋体 Heavy
   *  (Source Han Serif SC Heavy .otf). Default: the first system serif found (macOS Songti SC Black, Windows SimSun). */
  serifFont: setting("SERIF_FONT", ["/System/Library/Fonts/Supplemental/Songti.ttc", "C:/Windows/Fonts/simsun.ttc"].find((f) => fs.existsSync(f)) ?? ""),
};

/** Where and how the TTS request goes. Default: Doubao Speech Synthesis 2.0 (豆包语音合成模型2.0, Volcano Engine speech
 *  console), authenticated either way the console offers:
 *  - new console:     VOLC_TTS_API_KEY=...                           → X-Api-Key
 *  - classic console: VOLC_TTS_APP_ID=... + VOLC_TTS_ACCESS_TOKEN=... → X-Api-App-Id + X-Api-Access-Key
 *  Fallback when only ARK_API_KEY is set: the Volcano Ark Agent Plan TTS endpoint (same voices, same request body). */
export interface TtsAuth { provider: "doubao" | "agentplan"; url: string; headers: Record<string, string> }
const DOUBAO_URL = "https://openspeech.bytedance.com/api/v3/tts/unidirectional";
const AGENTPLAN_URL = "https://openspeech.bytedance.com/api/v3/plan/tts/unidirectional";
export function ttsAuth(): TtsAuth {
  const key = setting("VOLC_TTS_API_KEY"), app = setting("VOLC_TTS_APP_ID"), tok = setting("VOLC_TTS_ACCESS_TOKEN"), ark = setting("ARK_API_KEY");
  if (key) return { provider: "doubao", url: DOUBAO_URL, headers: { "X-Api-Key": key } };
  if (app && tok) return { provider: "doubao", url: DOUBAO_URL, headers: { "X-Api-App-Id": app, "X-Api-Access-Key": tok } };
  if (ark) return { provider: "agentplan", url: AGENTPLAN_URL, headers: { "X-Api-Key": ark } };
  throw new Error(`TTS credentials not found. Put VOLC_TTS_API_KEY=... (or VOLC_TTS_APP_ID=... and VOLC_TTS_ACCESS_TOKEN=...) in ${path.join(USER_DIR, ".env")} (or this project's .env, or the environment). See .env.example in the skill folder.`);
}
/** Which TTS service the settings select, or null when no credentials are set (values are never returned). */
export function ttsProvider(): TtsAuth["provider"] | null {
  if (setting("VOLC_TTS_API_KEY") || (setting("VOLC_TTS_APP_ID") && setting("VOLC_TTS_ACCESS_TOKEN"))) return "doubao";
  return setting("ARK_API_KEY") ? "agentplan" : null;
}
