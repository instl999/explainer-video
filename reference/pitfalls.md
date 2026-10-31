# Pitfalls met so far

**Footage**
- Stock montages often hide a **burned-in subtitle** or **watermark** in one clip (e.g. "我们作为妈妈" from 37.9 s; a
  faint signature bottom-right). Find them on the 1-fps sheets; cut around them or frame them out with the camera
  (check the visible world rect: centre ± W/(2s), H/(2s)).
- A clip can contain an internal **ghosting dissolve** or a time-lapse jump; scdet marks time-lapses as many "cuts".
- Dark, slow dissolves don't register as cuts — confirm boundaries with a 2–5 fps strip around the suspect time.
- A clip's own dissolve (messy → tidy kitchen, white flash → empty room) makes a great before/after: map `src` and
  `speed` so the dissolve lands on the word ("先整理房间").

**Type and drawing**
- 得意黑 (Display) lacks some characters (Japanese 貯/黒 etc.) and silently draws a **wrong glyph** — render a test
  or use `fam: "JP"` / "Sans". Bahnschrift has no CJK (the engine switches faces per glyph).
- Keep everything above y≈900 (captions). Check right-edge overflow: `measure()` before placing wide text.
- A stamp landing on the words it comments on hides them — put stamps beside or on the picture.
- Footnotes left-aligned near the right edge overflow — right-align them.
- Empty board moments (a card appearing before its content) read as broken: bring content in with the card.

**Voice and timing**
- Don't rush payoffs: a ✗ or stamp needs ≥ 0.4 s before the cut. Use `pause`/`holds` (free) rather than new TTS.
- `A()` phrases must match the display text exactly (quotes, full-width punctuation); use `nth` for repeats.
- Two characters can get near-identical timestamps (e.g. "扣整理"); don't time critical motion to a single character.

**Audio**
- Long hit files (Bold Hit 7.8 s, Dark Truth 5 s) carry tails that mask the next words → `slice` + `fade`.
- Risers peak late (6–8 s): slice the last ~1.5 s and align "peak".
- With a draft (silent) voice, loudnorm lifts music+effects ~10 dB and QA's peak numbers are meaningless.

**Windows shell**
- Python prints fail on Chinese with cp1252 → `PYTHONIOENCODING=utf-8` (or avoid Python: the tools are all Node).
- Python can't open `/c/Users/...` paths (Git Bash style) — use `C:/Users/...`.
- `cat > file` without a heredoc waits on stdin and hangs; bash heredocs with backticks/quotes can break — write files
  with the Write tool.
- ffmpeg `drawtext` chokes on `C:` in `fontfile` → run ffmpeg with `cwd` = project and a relative font path.
- `sed -i` with backslashes is fragile; use the Edit tool for exact replacements.

**Rendering**
- With ffmpeg 7.x a full render could finish every frame and then never exit: a footage decoder blocked writing into its
  paused pipe ignores SIGTERM, and the open pipe keeps the part process alive. `FrameReader.close()` now closes the pipe
  and sends SIGKILL. If a render ever sits at 0% CPU, check for leftover `ffmpeg -v error -ss …` processes.
