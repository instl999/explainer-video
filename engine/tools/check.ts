// Is this machine (and project) ready? Node, ffmpeg/ffprobe, the canvas module, fonts, settings, the music and effect
// libraries and the Ark key (reported as present/absent only — never printed). `--tts` also makes one tiny paid TTS call
// (two characters, far under ¥0.01) to prove the key and the Agent Plan subscription work.
// Usage: node tools/check.ts [--tts]
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { CONFIG, ENV_FILES, ROOT, USER_DIR, arkKey, setting } from "../src/lib/config.ts";
import { ffmpegBin } from "../src/lib/util.ts";

let bad = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const no = (m: string, fix: string) => { bad++; console.log(`  ✗ ${m}\n      → ${fix}`); };
console.log(`project: ${ROOT}`);

const [maj, min] = process.versions.node.split(".").map(Number);
if (maj > 22 || (maj === 22 && min >= 18)) ok(`Node ${process.versions.node} (runs .ts files directly)`);
else no(`Node ${process.versions.node} cannot run .ts files`, "install Node 24 LTS:  winget install OpenJS.NodeJS.LTS");

for (const b of ["ffmpeg", "ffprobe"] as const) {
  const r = spawnSync(ffmpegBin(b), ["-version"], { encoding: "utf8" });
  if (r.status === 0) ok(`${b}: ${r.stdout.split("\n")[0].slice(0, 60)}`);
  else no(`${b} not found`, "winget install Gyan.FFmpeg   (or set FFMPEG_DIR in .env to the folder holding ffmpeg.exe)");
}
try { await import("@napi-rs/canvas"); ok("@napi-rs/canvas loads"); }
catch { no("@napi-rs/canvas is missing", `run  npm install  in ${ROOT}`); }

for (const f of ["SmileySans-Oblique.ttf", "NotoSansSC-Bold.otf", "DSEG7Classic-Bold.ttf"]) {
  if (fs.existsSync(path.join(ROOT, "fonts", f))) ok(`font ${f}`);
  else no(`font ${f} missing`, "copy engine/fonts from the skill folder into this project");
}
for (const f of ["C:/Windows/Fonts/bahnschrift.ttf", "C:/Windows/Fonts/consola.ttf", "C:/Windows/Fonts/consolab.ttf", CONFIG.jpFont]) {
  if (fs.existsSync(f)) ok(`system font ${path.basename(f)}`);
  else no(`system font ${f} missing`, "Windows 10/11 ships these; elsewhere set JP_FONT and expect fallback faces for numbers/mono");
}

const found = ENV_FILES.filter((f) => fs.existsSync(f));
if (found.length) ok(`settings file(s): ${found.join("  ,  ")}`);
else no("no .env found", `create ${path.join(USER_DIR, ".env")} from .env.example in the skill folder`);
if (setting("ARK_API_KEY")) ok("ARK_API_KEY is set (value not shown)");
else no("ARK_API_KEY is not set", `add a line ARK_API_KEY=... to ${path.join(USER_DIR, ".env")}`);

const count = (d: string, rx: RegExp) => { try { return fs.readdirSync(d).filter((f) => rx.test(f)).length; } catch { return -1; } };
const nb = count(CONFIG.bgmDir, /\.(mp3|wav|m4a|flac)$/i);
if (nb > 0) ok(`BGM_DIR ${CONFIG.bgmDir} (${nb} tracks)`);
else no(`BGM_DIR ${CONFIG.bgmDir} is missing or empty`, "copy the bgm folder over and/or set BGM_DIR");
const ns = count(CONFIG.sfxDir, /./);
if (ns > 0) {
  ok(`SFX_DIR ${CONFIG.sfxDir} (${ns} entries)`);
  const { SFX_ROLES } = await import("../src/sfx-roles.ts");
  const missing = Object.entries(SFX_ROLES).filter(([, r]) => !fs.existsSync(path.join(CONFIG.sfxDir, r.file))).map(([k]) => k);
  if (missing.length) no(`${missing.length} sound roles point at missing files: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? " …" : ""}`, "fix the paths in src/sfx-roles.ts or restore the library");
  else ok(`all ${Object.keys(SFX_ROLES).length} sound roles resolve`);
} else no(`SFX_DIR ${CONFIG.sfxDir} is missing`, "copy 布斯的音效库 over and/or set SFX_DIR");

try { fs.mkdirSync(CONFIG.cacheDir, { recursive: true }); fs.accessSync(CONFIG.cacheDir, fs.constants.W_OK); ok(`cache ${CONFIG.cacheDir}`); }
catch { no(`cache ${CONFIG.cacheDir} is not writable`, "set CACHE_DIR to a writable folder"); }

if (process.argv.includes("--tts") && setting("ARK_API_KEY")) {
  const { synthesize } = await import("../src/lib/tts.ts");
  try {
    const r = await synthesize(arkKey(), { text: "你好", speaker: CONFIG.speaker, rate: 10, sectionId: "00000000-0000-0000-0000-000000000000", pauseMs: 0, sampleRate: 24000 }, 1);
    ok(`TTS works (${CONFIG.speaker}): ${(r.pcm.length / 48000).toFixed(2)} s of audio, ${r.words.length} timed characters`);
  } catch (e) {
    no(`TTS call failed: ${String(e).slice(0, 160)}`, "check the key; HTTP 400 InvalidSubscription means the Agent Plan subscription has lapsed (renewal is the user's job)");
  }
}
console.log(bad ? `\n${bad} problem(s): fix them before making a video.` : "\nall good.");
process.exit(bad ? 1 : 0);
