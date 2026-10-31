# Setting up a new computer

The skill folder is self-contained: copy `explainer-video\` into `%USERPROFILE%\.claude\skills\` on the new machine.
Everything machine-specific lives in one settings file, `%USERPROFILE%\.explainer-video\.env`.

## 1. Install the tools (Windows 10/11)
```
winget install OpenJS.NodeJS.LTS      # Node 24+ (runs .ts files directly; no build step)
winget install Gyan.FFmpeg            # ffmpeg + ffprobe (found automatically from the WinGet install)
```
Python is not needed. Open a new terminal afterwards so PATH updates.

## 2. Bring the libraries
Copy the user's music folder (`bgm`, files named by mood: 开头紧张…, 解释…, 结尾升华…) and the effect library
(`布斯的音效库`) onto the machine. Default locations are `%USERPROFILE%\Desktop\bgm` and
`%USERPROFILE%\Desktop\布斯的音效库`; anywhere else works if the `.env` says so.

## 3. The settings file
Location: **`%USERPROFILE%\.explainer-video\.env`** (e.g. `C:/Users/<you>/.explainer-video/.env`).
`scripts/new-project.mjs` creates it from `.env.example` the first time (with your user folder filled in); then fill in
the key. Precedence: environment variable > the project's own `.env` > this user file > built-in default.
Save as UTF-8; use forward slashes in paths.

| Key | Required | Default | What it is |
|---|---|---|---|
| `VOLC_TTS_API_KEY` | yes* | — | **Doubao Speech Synthesis 2.0** (豆包语音合成模型2.0) API Key from the Volcano Engine speech console (new console). Sent as `X-Api-Key`. Secret. |
| `VOLC_TTS_APP_ID` + `VOLC_TTS_ACCESS_TOKEN` | yes* | — | Or the classic console's App ID + Access Token (`X-Api-App-Id` + `X-Api-Access-Key`). Secret. |
| `ARK_API_KEY` | no | — | Fallback used only when none of the above is set: a Volcano Ark **Agent Plan** key (Agent Plan TTS endpoint). Secret. |
| `BGM_DIR` | no | `~/Desktop/bgm` | Music library (mood-labelled file names). |
| `SFX_DIR` | no | `~/Desktop/布斯的音效库` | Effect library; `engine/src/sfx-roles.ts` paths are relative to it. |
| `OUTPUT_DIR` | no | folder holding the project | Where `npm run deliver` copies `<title>_16比9讲解版.mp4/.srt`. |
| `CACHE_DIR` | no | `~/.explainer-video/cache` | Paid TTS results by request hash (re-runs free). Copy it along to keep old results. |
| `TTS_SPEAKER` | no | `zh_male_jieshuoxiaoming_uranus_bigtts` | Default voice (解说小明 2.0); `script.json` `speaker` overrides. |
| `TTS_RESOURCE_ID` | no | `seed-tts-2.0` | Resource id for TTS 2.0 (`*_uranus_*`) voices. |
| `FFMPEG_DIR` | no | auto (WinGet, then PATH) | Folder with `ffmpeg.exe`/`ffprobe.exe` for a manual install. |
| `JP_FONT` | no | `C:/Windows/Fonts/YuGothB.ttc` | A font with Japanese glyphs (book titles). |

Minimal file:
```
VOLC_TTS_API_KEY=<your Doubao Speech 2.0 API key>
BGM_DIR=C:/Users/<you>/Desktop/bgm
SFX_DIR=C:/Users/<you>/Desktop/布斯的音效库
OUTPUT_DIR=C:/Users/<you>/tiktok
```
\* One of the two Doubao options is required (or the `ARK_API_KEY` fallback).

A project folder may carry its own `.env` with any of these keys (e.g. a different `OUTPUT_DIR` or voice).

## 4. Fonts
Bundled in `engine/fonts` (copied into each project): 得意黑 SmileySans (display, OFL), Noto Sans SC Bold (body, OFL),
DSEG7 (LCD digits, OFL). From Windows: Bahnschrift (numbers), Consolas (mono), Yu Gothic Bold (Japanese). On a
non-Windows machine set `JP_FONT` and expect fallback faces for numbers and mono text.

## 5. Smoke test
```
node "%USERPROFILE%/.claude/skills/explainer-video/scripts/new-project.mjs" "C:/temp/smoke" "<any .mp4 ≥ 4 s>" --title=测试
cd C:/temp/smoke
npm run check            # every line should be ✓
npm run check -- --tts   # one tiny paid TTS call (2 characters) proves the key and the subscription
npm run draft            # silent draft voice from the template script (free)
npm run render && npm run mix && npm run qa
```
`check` failures tell you what to fix. With Doubao Speech 2.0, an auth error or "resource not granted" means the key is
wrong or 豆包语音合成模型2.0 / the voice is not enabled for the app in the speech console. With the Agent Plan fallback,
`InvalidSubscription` (HTTP 400) means the plan has lapsed — the user renews it; never attempt payment.
