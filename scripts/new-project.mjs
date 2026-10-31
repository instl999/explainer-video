#!/usr/bin/env node
// Make a new video project from the skill: copy the engine and the per-video template, point script.json at the
// footage, make sure the user-level settings file exists, and install the one dependency.
// Usage: node new-project.mjs <projectDir> "<footage.mp4>" [--title=视频标题] [--no-install]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2), pos = args.filter((a) => !a.startsWith("--"));
const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
if (pos.length < 2) {
  console.error('usage: node new-project.mjs <projectDir> "<footage.mp4>" [--title=视频标题] [--no-install]');
  process.exit(1);
}
const dir = path.resolve(pos[0]), footage = path.resolve(pos[1]);
if (!fs.existsSync(footage)) { console.error(`footage not found: ${footage}`); process.exit(1); }
if (fs.existsSync(path.join(dir, "script.json"))) { console.error(`${dir} already holds a project (script.json exists); pick another folder`); process.exit(1); }

const copy = (from, to, skip = new Set()) => {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copy(a, b, skip); else fs.copyFileSync(a, b);
  }
};
copy(path.join(SKILL, "engine"), dir, new Set(["node_modules"]));
copy(path.join(SKILL, "template"), dir);
for (const d of ["out", "review", "vo", "assets"]) fs.mkdirSync(path.join(dir, d), { recursive: true });

const sp = path.join(dir, "script.json"), script = JSON.parse(fs.readFileSync(sp, "utf8"));
script.footage = footage.replace(/\\/g, "/");
script.title = opt("title") ?? path.basename(footage, path.extname(footage)).replace(/[_\s]+/g, "").slice(0, 24);
fs.writeFileSync(sp, JSON.stringify(script, null, 2) + "\n", "utf8");

const userEnv = path.join(os.homedir(), ".explainer-video", ".env");
if (!fs.existsSync(userEnv)) {
  fs.mkdirSync(path.dirname(userEnv), { recursive: true });
  const home = os.homedir().replace(/\\/g, "/");
  const tpl = fs.readFileSync(path.join(SKILL, ".env.example"), "utf8").replace(/C:\/Users\/<you>/g, home);
  fs.writeFileSync(userEnv, tpl, "utf8");
  console.log(`created ${userEnv} — open it and fill in VOLC_TTS_API_KEY (and check BGM_DIR / SFX_DIR)`);
}

if (!args.includes("--no-install")) {
  const r = spawnSync("npm install --no-audit --no-fund", { cwd: dir, stdio: "inherit", shell: true });
  if (r.status !== 0) console.error("npm install failed; run it yourself in the project folder");
}
console.log(`\nproject ready: ${dir}
next:  cd "${dir}"
       npm run check          # machine + settings check (add -- --tts to test the key with a tiny paid call)
       npm run scan           # cut list + contact sheets of the footage → review/
then write script.json, src/clips.ts, src/scenes.ts, src/timeline.ts (see the skill's SKILL.md).`);
