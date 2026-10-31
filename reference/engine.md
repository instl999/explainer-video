# Engine reference

Node 24 runs the TypeScript directly (type stripping: only erasable syntax — no enums, namespaces or parameter
properties). Canvas: `@napi-rs/canvas`. Video in/out: FFmpeg. Output 1920×1080, 30 fps, H.264 CRF 16, AAC 256k.

## Project layout
```
script.json            title, footage path, voice style, the narration lines            (per video)
src/clips.ts           usable stretches of the footage                                    (per video)
src/scenes.ts          anchors (T) + painters                                             (per video)
src/timeline.ts        shots, overlays, impacts, sfx cues, music beds, extra roles        (per video)
src/*.ts, src/lib/*    engine (common, draw, kit, props, model, render, footage, voice, audio, captions, qa, deliver…)
tools/*.ts             check, scan, sheet, onsets, vob, sfxinfo
vo/                    voice.wav, alignment.json, times.txt, lines/*.wav
out/                   video.mp4, mix.wav, final.mp4, captions.srt, cost.json, audio_plan.json, stems
review/                scan sheets, previews, final sheets
```

## script.json
```json
{ "title": "视频标题", "footage": "C:/…/source.mp4", "speaker": "(optional, default TTS_SPEAKER)",
  "instruction": "overall voice style (context_texts)", "lexicon": { "显示文字": "读法" },
  "lines": [ { "id": "s00", "text": "…", "pause": 0.4, "rate": 12, "instruction": "this line's tone",
               "holds": [["phrase", 0.25]] } ] }
```
- Optional `"cover": { "lines": ["标题第一行"], "hook": "钩子问句", "tag": "小标签", "frame": <source s>, "focus": 0..1 }`
  for the delivery covers (`src/cover.ts`). Defaults: title split at its first "：" into headline (white) + hook
  (yellow); frame = the first footage shot's `src` + 0.4 s; focus 0.5.
- `rate` −50…100 (0 = normal, 10 default ≈ 5.5 字/s, 24 = fast hook). `pause` = silence after the line (free to change).
- `holds` widen the gap after a phrase at its quietest 10 ms — free, no re-synthesis.
- Normalisation: 4-digit years before 年 read digit by digit; `x%` → 百分之x; decimals; cardinals with 两 before measure
  words. Use `lexicon` for anything else (English names, odd readings).
- `npm run voice -- --times` prints/writes per-character **video** times (audio + LEAD 0.3 s). `npm run draft` makes a
  silent placeholder from a pace model (free) — QA ignores loudness then.

## Anchors (from common.ts / kit.ts)
- `A(id, phrase?, {end?, nth?})` → video time of the phrase's first (or last) character; no phrase = line start.
- `ct(id, phrase, nth?)` → one time per display character (for `say`/`sayC`; concat arrays to cover longer strings).
- `cutAt(id)` → cut point just before a line's first word (≥ the middle of the pause before it). `gapMid(id)`.
- `VOICE_END`; timeline `END = VOICE_END + 1.7`. `LEAD = 0.3` (voice starts at 0.3 s).
- Put all anchors in `export const T = {...}` at the top of scenes.ts; phrases must match the display text exactly.

## Shots (timeline.ts `D` → `shots`)
`{ id, t0, clip?, src?, speed?|"fit", cam?, grade?, full?, world?, board?, paint?, hud?, tin? }`
- Shot runs `t0 → next t0`. Footage shot: `clip` key from clips.ts + `src` (source seconds); `speed: "fit"` stretches
  0.68–1.0× so the clip covers the shot plus transition pads; a clip never plays past its end (freezes).
- Board shot: no clip → paper (`board: { tone, grid }`). `world: [2*W, H]` gives a two-panel board; drive it with cam keys.
- `cam`: keys `{ t, s, x, y, ease }` in world pixels (s ≥ 1 for footage). `push(t0, t1, s0, s1, [x,y], [x2,y2])` =
  slow push. Two keys 0.01 s apart = an instant jump (a "jump cut" inside one board, or a dive-through: zoom deep into
  an element, jump to the second panel at a wider scale, settle).
- `grade`: `{ dark, sat, tint, tintA, blur, vignette, bright }` on footage.
- `paint(ctx, {t, shot, foot})` world space (follows camera; rings/callouts on footage, everything on boards).
  `hud(ctx, …)` screen space (titles over footage). `full: false` hands the decoded frame to `paint` (e.g. to shrink
  footage into a pinned photo).
- `tin`: transition into the shot, centred on the cut: `cut | whip | push | slide | zoom | fade | dip | flash | glitch`,
  `{kind, d, dir}`. Half of `d` must fit inside both neighbouring shots (render.ts validates).
  Habits: hard cuts in the hook, `glitch` into a twist, `whip` between footage, `slide`/`push` between boards,
  `flash` into the hopeful turn, `fade`/`dip` for tone changes and the end.

## Overlays, impacts, captions
- `overlays: [{ id, t0, t1, z, paint(ctx, t) }]` screen space; z < 50 under the impact flash, ≥ 50 above it.
- `captionOverlay(hide)` (z 60) burns in captions from the alignment (phrases split at punctuation, long ones halved,
  digits yellow); pass `[[t0, t1], …]` to hide them where big type already says the words. `captions.srt` is written too.
- `impacts: [{ t, shake?, punch?, flash?, dur? }]` — shake px, punch = zoom kick (0.02–0.04), flash 0–1. A stamp started
  at t0 lands at t0 + 0.19 (`STAMP_LAND`).

## Drawing kit
- `draw.ts`: `text(ctx, s, x, y, {size, fam, color, align, stroke, bold, alpha, shadow, mixNum}, fx?)` (digits switch to
  the Num face automatically; `mixNum:false` to stop), `popText`, `typeText`, `measure`, `wrapLines`, `inkPath`,
  `arrow`, `ring`, `strike`, `marker`, `rr`, `dropShadow`, `card(ctx,x,y,w,h,{rot,a,s,fill,shadow},body)`, `glass`,
  `stamp(ctx,label,cx,cy,t,t0,{size,color,rot,sub})`, `seg7`, `icon(kind)` (person pill bottle coin clock heart lens
  bowl flame warn star check cross ticket doc bubble), `countUp`, `fmtInt`.
- `kit.ts`: `say`/`sayC` (voice-synced pop type), `pill`, `callout` (label + leader line), `plate` (dark panel),
  `left/right/topShade`, `xMark`, `foot` (footnote), `rule`, `photo` (pinned polaroid), `popS`, `WT`/`INK` text presets.
- `props.ts`: bolt, phoneIcon, bookIcon, penIcon, button3d, ecg, bell, lockIcon, eyeIcon, brain, bankIcon, clockFace,
  priceTag, carIcon, runner, hourglassIcon, battery, banknote, cake, pudding, pants, crystal, piggy, tidyBox,
  umbrella, shopBag, basket, coinFlat, coinFace, icePack.
- `footage.ts`: `still(sourceSeconds, width)` → a canvas frame for photo walls / pinned photos.
- `common.ts`: `W, H, FPS, C` (palette), `E` (easings: out, out5, in, inOut, sine, back), `clamp, lerp, prog, hash`.

## Render
- `node src/render.ts --sheet=t1,t2,…` (16 thumbnails per sheet, accurate seeks) · `--sheet-every=1.5 [--from --to]` ·
  `--stills=t1,…` (full size) · `--from=a --to=b --out=review/x.mp4 [--fast]` · `--jobs=4` (full, parallel → out/video.mp4).
- Speed ≈ 200–300 ms/frame per job; 70 s at 4 jobs ≈ 2–3 min.

## Audio (audio.ts)
- Voice levelled to −18 dBFS RMS. Beds: `music` entries `{k, file, level, t0, t1, fadeIn, fadeOut, from?, tapeStop?,
  duck?}` (level = dB of the louder quarter of the used stretch; −25…−27 typical). Beds duck −10 dB under speech
  (60 ms look-ahead), effects −5 dB. Limiter −1 dBFS, two-pass loudnorm to −14 LUFS / −1.5 dBTP.
- Effects: `sfx` cues `{t, k, g?}` → roles (`sfx-roles.ts` + timeline `roles`), aligned by onset or peak.
- Writes `out/mix.wav`, stems, `audio_plan.json`, `captions.srt`; `--mux` → `out/final.mp4`.

## Tools
`npm run check [-- --tts]` · `npm run scan` / `node tools/scan.ts --frames=…` · `node tools/onsets.ts "<bgm>" a b` ·
`node tools/sfxinfo.ts --find=…` / `<files>` · `node tools/vob.ts [--list]` · `npm run review` (final sheets) ·
`npm run qa` · `npm run cover` · `npm run deliver [-- --name=…] [-- --no-covers]` · `npm run bgm` (scan the whole music library).
