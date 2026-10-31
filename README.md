# explainer-video: footage + copy → a finished 16:9 explainer video

<!-- repository-catalog:start -->
**Category: Video creation and editing** · [Repositories in this category](https://github.com/instl999?tab=repositories&q=topic%3Avideo-creation)

A Claude Code skill that turns source footage and a script into a finished 16:9 Chinese explainer video with a rewritten hook, fact checks, Volcano Ark TTS voice-over, motion graphics, auto-picked music and effects, and QA.

Related projects: [douyin-paper-video-maker](https://github.com/instl999/douyin-paper-video-maker) · [vox-director](https://github.com/instl999/vox-director) · [douyin-daodaoshou-tool](https://github.com/instl999/douyin-daodaoshou-tool)

[简体中文](README.zh-CN.md)
<!-- repository-catalog:end -->

English | [简体中文](README.zh-CN.md)

Give Claude Code a stock-footage video and some copy (文案), ask for a 横屏16:9 财经讲解短视频, and this skill takes
it from there:

1. **Studies the footage**: cut list and contact sheets; it skips clips with burned-in subtitles or watermarks.
2. **Rewrites the script around a hook** for the first 20 seconds, and **fact-checks** every number, study and quote.
   Unverifiable claims are hedged or shown with their assumptions.
3. **Voices it** with Volcano Engine Doubao Speech Synthesis 2.0 (豆包语音合成模型2.0, default voice 解说小明 2.0), with
   per-character timestamps. A Volcano Ark Agent Plan key also works as a fallback.
4. **Cuts and animates** at 1920×1080, 30 fps on a canvas engine. Explanations are paper boards with ink diagrams;
   footage gets callouts, rings and stamps. Kinetic type is synced to every word; transitions and camera moves are
   keyed to the voice.
5. **Scores it from your own libraries**: music beds picked by mood label, entry points solved so beats land on key
   words, and about 66 sound-effect roles cued to the action.
6. **Mixes and checks**: ducking, a limiter, −14 LUFS, a voice-over-background check, black/frozen-frame detection,
   and contact sheets for a frame-by-frame review. Then it delivers `<title>_16比9讲解版.mp4` and `.srt`.

Narration costs about ¥0.1 per minute and is cached, so previews and re-renders are free.

## Requirements

- [Claude Code](https://claude.com/claude-code) on Windows 10/11.
- Node.js 24+ (runs the TypeScript directly) and FFmpeg:
  `winget install OpenJS.NodeJS.LTS` and `winget install Gyan.FFmpeg`.
- **Doubao Speech Synthesis 2.0 (豆包语音合成模型2.0)** credentials from the Volcano Engine speech console
  (an API Key, or an App ID + Access Token). A Volcano Ark Agent Plan key works as a fallback.
- **Your own** music folder (file names start with a mood label such as 开头紧张, 解释 or 结尾升华) and a sound-effect
  library. Neither is included. The shared roles in `engine/src/sfx-roles.ts` point at a library called 布斯的音效库,
  so edit those paths to match yours (`npm run check` lists any that are missing).

## Install

```bash
git clone https://github.com/instl999/explainer-video "%USERPROFILE%/.claude/skills/explainer-video"
```

Settings live in **`%USERPROFILE%\.explainer-video\.env`**. The first project you create writes this file from
[`.env.example`](.env.example); then you fill in the key. A project's own `.env` overrides it, and environment
variables override both.

| Key | Required | Default | Purpose |
|---|---|---|---|
| `VOLC_TTS_API_KEY` | yes* | — | Doubao Speech 2.0 API Key (new console), sent as `X-Api-Key`. Never logged. |
| `VOLC_TTS_APP_ID` + `VOLC_TTS_ACCESS_TOKEN` | yes* | — | Or the classic console's App ID + Access Token. |
| `ARK_API_KEY` | no | — | Fallback when none of the above is set: an Agent Plan key (Agent Plan TTS endpoint). |
| `BGM_DIR` | no | `~/Desktop/bgm` | Music library |
| `SFX_DIR` | no | `~/Desktop/布斯的音效库` | Sound-effect library (roles are relative to it) |
| `OUTPUT_DIR` | no | folder holding the project | Where finished videos are copied |
| `CACHE_DIR` | no | `~/.explainer-video/cache` | Cached TTS results (re-runs are free) |
| `TTS_SPEAKER` | no | `zh_male_jieshuoxiaoming_uranus_bigtts` | Default voice (解说小明 2.0) |
| `TTS_RESOURCE_ID` | no | `seed-tts-2.0` | Resource id for TTS 2.0 voices |
| `FFMPEG_DIR` | no | auto-detected | Folder with `ffmpeg.exe`/`ffprobe.exe` |
| `JP_FONT` | no | Yu Gothic Bold | Font with Japanese glyphs |

\* One of the two Doubao options is required (or the `ARK_API_KEY` fallback).

## Use

Ask in Claude Code, for example: *"把这个视频精剪为财经讲解短视频，配音用解说小明2.0，横屏16:9，bgm 和音效从我的文件夹里选"*,
with the video and copy attached. The skill scaffolds a project and runs the whole process.

To run a project by hand:

```bash
node "%USERPROFILE%/.claude/skills/explainer-video/scripts/new-project.mjs" "C:/videos/my-video" "C:/footage/source.mp4" --title=标题
cd C:/videos/my-video
npm run check -- --tts   # machine + key check (one tiny paid call)
npm run scan             # cut list + contact sheets of the footage
npm run voice -- --times # narration from script.json (paid, cached)
npm run render           # full render (4 parallel jobs)
npm run mix              # music + effects + voice, muxed into out/final.mp4
npm run qa               # format, loudness, black/frozen frames, voice-over-background
npm run review           # contact sheets of the final cut
npm run deliver          # copy <title>_16比9讲解版.mp4/.srt to OUTPUT_DIR
```

Per video you write only `script.json`, `src/clips.ts`, `src/scenes.ts` and `src/timeline.ts`. The rest is the shared
engine.

## Layout

```text
SKILL.md              the instructions Claude follows
.env.example          every setting, documented
scripts/              new-project.mjs (scaffolder)
engine/               shared engine copied into each project: src/ (voice, render, audio, captions, qa, kit, props,
                      sfx-roles, …), tools/ (check, scan, sheet, onsets, vob, sfxinfo), fonts/
template/             per-video starting files
reference/            setup, style, engine API, music catalogue, TTS facts, pitfalls
examples/             four finished videos' script, clips, scenes, timeline and music picks + a recipe index
```

## Licences

- Code and documentation: [MIT](LICENSE).
- Bundled fonts, under the SIL Open Font License 1.1 (texts in `engine/fonts/`): Smiley Sans 得意黑 (atelierAnchor),
  Noto Sans SC (Adobe/Google), DSEG7 (keshikan).
- The examples are the scripts of the author's own published videos. Music, effects and footage are not included.
