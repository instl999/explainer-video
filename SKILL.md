---
name: explainer-video
description: Turn the user's footage plus copy (文案) into a finished 16:9 Chinese 财经/知识 explainer short video — rewrite the script around a strong hook, fact-check it, voice it with Volcano Engine Doubao Speech Synthesis 2.0 (豆包语音合成模型2.0, 默认 解说小明2.0), cut the footage with canvas motion graphics, auto-pick BGM and sound effects from the user's own libraries, mix, QA and deliver. Use whenever the user gives a video file (usually with copy or a topic) and asks to 精剪/剪成讲解短视频, 做动效, 合成配音, 横屏16:9, or to choose bgm/音效 from their folders.
---

# 16:9 explainer: footage + copy → final.mp4

You are director, writer, animator and mixer. The engine in this folder renders everything; each video is its own
project folder, and per video you write only four files: `script.json`, `src/clips.ts`, `src/scenes.ts`, `src/timeline.ts`.

**Hard rules**
- Never print, read aloud or copy the TTS credentials anywhere; never go looking for keys in other folders. They live in
  `~/.explainer-video/.env` (`VOLC_TTS_API_KEY=`, or `VOLC_TTS_APP_ID=` + `VOLC_TTS_ACCESS_TOKEN=`; `ARK_API_KEY=` is
  an Agent Plan fallback), see `.env.example`. If none is set, ask the user to add one.
- Never invent facts. Every number, study, quote or name on screen is verified (WebSearch/WebFetch) or shown as an
  example with its assumptions ("按年利率3%估算", "示意价格"). Hedge what cannot be verified; drop what is wrong.
- The video must read as an **explainer, not a promo**: build the look from the mechanism (paper boards, ink diagrams,
  annotated footage). No gold/glass/light-leak styling, no epic trailer music. See `reference/style.md`.
- The **first 20 seconds decide everything** (the user's own rule): the whole opening is hook, background comes later.
- BGM and effects come **only** from the user's folders (BGM_DIR, SFX_DIR), picked automatically.
- Paid steps are cheap (TTS ≈ ¥0.1 per minute, cached); previews and re-renders are free — iterate on those.

## 0 · Machine ready?
On first use on a machine, or if anything fails: scaffold (step 1) then run `npm run check` in the project (and
`npm run check -- --tts` once to prove the key works). Fix what it reports with `reference/setup.md`.

## 1 · New project
```
node "<this skill folder>/scripts/new-project.mjs" "<workdir>/<english-slug>" "<footage.mp4>" --title=<中文标题>
```
Copies engine + template, points `script.json` at the footage, creates `~/.explainer-video/.env` if missing, runs
`npm install`. Put the project next to the user's other videos (OUTPUT_DIR's folder) unless told otherwise.

## 2 · Study the footage (free)
`npm run scan` → `review/scan.txt` (duration, hard cuts, dissolves) and `review/src_00.jpg…` (1 frame/s). Look at
**every** sheet. Then `node tools/scan.ts --frames=t1,t2,…` for full-size frames of the clips you will annotate.
Write `src/clips.ts`: one entry per usable stretch, with what it shows. Exclude burned-in subtitles, watermarks
(or crop them out with the camera), ghosting dissolves inside a clip and off-topic shots. Note each clip's mood and
any strong image (a loop, an hourglass, a stamp, a before/after) — those become the motion-graphic ideas.

## 3 · Facts and script (`script.json`)
- Keep the user's key lines (verbatim when they ask to keep the hook); you may rewrite the rest — they always say
  "别让现有的文案和视频限制住你的思路".
- Hook: open on the most concrete, surprising, relatable thing — a real study, a worked number, a test the viewer can
  do at home. Turn to the viewer ("你是不是也…") inside 20 s. Then the mechanism, then the fix, then the CTA the user gave.
- Check every claim now (WebSearch, standard mode; extended only if thin). Keep the source URLs for the final report.
- One sentence or clause per line; ~5.5 字/s at rate 10, so 60–75 s ≈ 320–380 characters. Numbers as digits are fine
  (2014年→二零一四, 25年→二十五年, 2%→百分之二, 4200多→四千二百多).
- Per line: `pause` (s), optional `rate` (−50…100; 12–24 for a fast hook), `instruction` (tone, e.g. "重读'三分之二'"),
  `holds: [["phrase", 0.25]]` to stretch the gap after a phrase for free. Fields: `reference/engine.md`.

## 4 · Voice (paid, cached)
`npm run voice -- --times` → `vo/voice.wav`, `vo/alignment.json`, `vo/times.txt` (every character's video time).
Use `npm run draft` (silent, free) only to rough out timing before the script is final. Re-running with the same
text is free; changing pauses/holds is free; changing text/rate/instruction re-buys only those lines.

## 5 · Shots and graphics (`src/scenes.ts`, `src/timeline.ts`)
Plan a shot list against `vo/times.txt` before coding: for each line, footage or paper board, what the viewer must
understand, the picture that shows it, what moves. Then write anchors and painters.
- Anchor everything to words: `A("s03","乱糟糟")` (first char; `{end:true}` for last), `ct(line, phrase)` for
  voice-synced type (`say`/`sayC`), cuts with `cutAt("s04")` (just before a line's first word).
- Hook: hard cuts every 1.5–2.5 s, a kinetic word or stamp on each key word, an impact (flash/shake) on frame 0.
- Something new every second; one idea per shot; a payoff (stamp, big number, ✗) needs 0.4–0.8 s on screen before
  the cut — lengthen the line's `pause` or add a `hold` rather than rushing it.
- Keep text and boards above y≈900 (the burned-in captions live at the bottom); hide captions where big kinetic type
  already says the words (`captionOverlay([[t0,t1]])`).
- Reuse: `src/kit.ts` (say, pill, callout, plate, shades, xMark, photo, cutAt…), `src/props.ts` (coins, clock,
  price tag, bell, lock, eye, brain, piggy bank, banknote, car…), `src/draw.ts` (stamp, ring, strike, marker, arrow,
  card, inkPath, countUp…). Recipes and where each is used: `examples/README.md`.

## 6 · Music and effects
- Beds: usually three — hook / explanation / turn-to-solution — chosen by the mood label at the start of each file name.
  Vary from recent videos (`reference/audio.md` has the catalogue, measured accents and what was used where).
- Measure a candidate: `node tools/onsets.ts "<file>" 0 60`. Solve the entry so an accent lands on a word:
  `from: accent - (wordTime - bed.t0)`. A tape-stop (`tapeStop: 0.5`) under a twist line then silence works well.
- Effects: cue roles from `src/sfx-roles.ts` (`{ t, k: "stamp" }`). Land hits just **after** the keyword, not on it.
  New file? `node tools/sfxinfo.ts --find=关键词`, then measure it and add a role in `timeline.ts` `roles`.

## 7 · Preview loop (free)
`node src/render.ts --sheet=0.5,2.4,3.9,…` (16 per sheet) or `--stills=…` (full size), then Read the jpgs.
Check: every shot reads at a glance, something moves, nothing overlaps captions or runs off-frame, glyphs render
(SmileySans lacks some characters; Japanese needs `fam: "JP"`), stamps don't cover the words they comment on.

## 8 · Mix check
`node src/audio.ts && node tools/vob.ts` — voice over background median ≥ 14 dB in every bed (hook especially).
If low: lower that bed's `level`, trim long hit tails (`slice`/`fade`), move hits off words.

## 9 · Render, QA, review
`npm run render && npm run mix && npm run qa` (≈2–3 min for 70 s), then `npm run review` and **look at every sheet
of the final encode** (2.5 frames/s): empty boards, late payoffs, text clashes, transitions. Fix, re-render, re-check.

## 10 · Deliver
`npm run deliver` → `<OUTPUT_DIR>/<title>_16比9讲解版.mp4` + `.srt`, plus the covers `<title>_封面横版.jpg` (1920×1080)
and `<title>_封面竖版.jpg` (1080×1920), made by default (`--no-covers` skips them). Look at both covers first: the title
must not cross a face. Set `"cover": { "focus": <0..1 where the subject is> }` in script.json (≥ 0.58 puts the landscape
title on the left; otherwise it sits in a low band; the portrait crop centres on it), or `frame`, `lines`, `hook`, `tag`
(see `reference/engine.md`), then `npm run cover`. Send the video, subtitles and both covers with SendUserFile.
Report: length, specs, QA numbers, TTS cost, the structure (what happens when), how the copy changed and why, music
picks, anything assumed or hedged, and Sources (markdown links).

## References
- `reference/setup.md` — new computer: Node, FFmpeg, libraries, the `.env` (location, every key), smoke test.
- `reference/style.md` — look, hook and pacing rules, writing and fact rules, what the user has rejected.
- `reference/engine.md` — script.json fields, anchors, the shot/camera/transition model, overlays, impacts, render flags.
- `reference/audio.md` — BGM catalogue with measured accents and past use; sound-role catalogue; mix targets.
- `reference/tts.md` — Doubao Speech Synthesis 2.0 facts (and the Agent Plan fallback) (endpoint, headers, rates, timestamps, errors, cost).
- `reference/pitfalls.md` — gotchas met so far and their fixes.
- `examples/` — four finished videos' script, clips, scenes, timeline and beds; `examples/README.md` indexes the recipes.
