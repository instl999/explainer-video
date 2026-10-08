# Music and effects

## Picking beds
- Three beds per 60–75 s video: **hook** (tension/curiosity) → **explanation** (curious, steady, or anxious for a
  problem) → **turn/solution to the end** (warm, hopeful, not epic). Change bed at a narrative turn, not mid-thought.
- Choose by the mood label that starts each file name; avoid 结尾升华/危机/Audiomachine trailer epics for explainers
  (the "promo" complaint) unless the story is a crisis. Vary from the last videos (table below).
- Enter where the track already has energy (`from`), and solve `from` so a measured accent lands on a key word:
  `from = accentTime - (wordTime - bed.t0)`. Measure with `node tools/onsets.ts "<file>" a b` (bigger × = accent; the
  spacing of the rest = the beat).
- Levels: `level` −25 to −27; lower the hook bed if `tools/vob.ts` shows the hook under 14 dB.
- A `tapeStop: 0.5–0.6` at the end of the hook bed, then 0.5–1 s of silence under the twist line, then the next bed.

## The library (BGM_DIR) — measured
| File | Length | Tempo / feel | Measured accents (s) | Used in |
|---|---|---|---|---|
| 开头紧张Dans la maison (Thème) - Philippe Rombi | 149 s | 72/144 bpm, curious-tense, beat 0.82 s, quiet (p75 −15 dB) | 6.94, 10.19, 13.47, 15.12, 18.39 (every ~3.3 s), swell 24.13 | room-money hook, illness-savings hook |
| 焦虑Riddles - FableForte | 121 s | pizzicato puzzle, beat 0.415 s; quiet first 6 s, dip 33–36 s | 20.02, 36.57, 38.22, 43.19 | room-money explain |
| 提出措施Closest to Home - Toby Tranter | 172 s | warm, 108 bpm, accent every 4.48 s | 2.60, 7.08, 11.56, 16.04, 20.55, 25.03, 29.51 | room-money resolve, illness-savings resolve |
| 焦虑Aware - Adrián Berenguer | 195 s | driving 144 bpm pulse, builds; loud from ~30 s | 16.32, 30.07, 32.16, 35.09 | wealth-time hook |
| 疑惑讲解Yumeji's Theme - 梅林茂 | 149 s | reflective waltz, bar 2.76 s, very quiet (−18.5 dB) | 3.30, 6.06, 8.82, 11.66, 14.42 | wealth-time explain, illness-savings explain |
| 解决措施Melody (Original mix) - A s h | 228 s | intro to 18.5 s, then a groove (beat 0.58 s) | drop 18.58, 19.16, 24.40, 26.15 | wealth-time resolve |
| 紧张counting the days - cody high | 94 s | tense, 92 bpm, dense 10.5–13 s | big hit 21.04; 27.63, 31.60 | idle-guilt hook |
| 开头失落IV - AK,Mapps | 205 s | lost, low; quiet until a beat drops | drop 44.33 / 45.02, then every ~0.35 s | idle-guilt mechanism |
| 舒缓Keep on the Sunny Side - 岩崎太整 | 130 s | bright, gentle, 99 bpm | 2.28, 9.57, 14.42, 21.66 | idle-guilt fix, bargain-trap resolve |
| 转机The Grinch - Cushy | 156 s | quirky turn, 144 bpm | 13.72 | bargain-trap hook |
| 解释Secret Room - Soundroll | 86 s | quirky-curious, 99 bpm, steady | 18.44 | bargain-trap explain, life-guide explain |
| 节奏感强平淡Match My Vibe - Damma Beatz | 150 s | steady beat, 118 bpm, warm-dark | — | life-guide hook |
| 结尾升华Bulls - Mary Riddle | 134 s | uplifting (promo risk) | — | life-guide outro |
| 开头失落-鱼Jazzguitar Lucky - 辛辛君 | 65 s | jazzy, melancholic | — | — |
| 疑问Bon Voyage - Jo Blankenburg / 疑问Holding Court - Audiomachine | 170 / 124 s | questioning; Holding Court is trailer-like | — | — |
| 紧张Kill Drill / Weapons of Impact / Will of the People / preeminence / 危机Dismantle | 108–162 s | tension/trailer (Will of the People has hits ~2 s apart) | — | older crisis-style cuts |
| 危机Now We Fight / Tempt Scandal, 后期措施Rescue Mission | 111–184 s | crisis/epic | — | — |
| 结尾升华Unbound Spirit, 结尾欢乐Shake Down | 151 / 154 s | uplifting / funky-happy | — | — |
Run `npm run bgm` for tempo, pulse and a 2-second energy sparkline of every track (written to out/bgm_scan.json).

## Effects
- Roles live in `src/sfx-roles.ts` (≈66): impacts (hitOpen, xHit, darkHit, stamp, stampBig, hit, hitWarm, boom, slam),
  movement (whoosh, whooshFast, whooshSoft, dive, drain, glitch, flashUp, riserShort, riserSoft, magic, sparkle),
  UI/paper (pop, popSoft, plops, lock, page, flip, book, scribble, slash, ding, chime, type, send, shutter, tagSnap),
  counters/machines (tickerFast, printer, install, tickRun, gears, wheel, press), money (coin, coins, coinsFast),
  objects/bodies (drawer, drop, hanger, rope, ice, crack, sand, exhale, heart, zap, alarm, bellSoft…), ambience
  (birds, waves, sea).
- Every scene change gets a whoosh/page; every kinetic word a pop or slam; every stamp a stamp; every count a ticker;
  every ✗ an xHit; frame 0 a hitOpen. Effects that *mean* something (a drawer for a freezer, coins for money, a creak
  for strings) beat generic ones.
- Land hits 0–0.1 s **after** the keyword; risers peak on the hit (align "peak", slice the riser's tail).
- New sound: `node tools/sfxinfo.ts --find=硬币|coin`, then `node tools/sfxinfo.ts "<file>"` (duration, loudest
  moment, transients), then add `{ file, align, peak, slice?, fade? }` to timeline `roles` (or sfx-roles.ts if reusable).

## Mix targets (checked by tools/vob.ts and src/qa.ts)
- Voice over background: median ≥ 14 dB in every bed (≈16–19 dB is typical); worst-10% spots are hits on words.
- Final: −14 LUFS ±1, true peak ≤ −1 dBTP, AAC 48 kHz stereo.
