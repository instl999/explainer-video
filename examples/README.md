# Worked examples (finished, delivered videos)

Each folder holds the per-video files of a real video: `script.json`, `clips.ts` (its clip map), `scenes.ts`,
`timeline.ts` and `beds.ts` (the music picks). They were written before the engine was packaged, so their scenes
define helpers locally (now in `src/kit.ts` / `src/props.ts`), take beds from `beds.ts` instead of `music[].file`, and
their script.json has no `footage` field. Read them for technique; don't run them as-is.

| Folder | Video | Length | Hook | Notable |
|---|---|---|---|---|
| `room-money` | 存不下钱，看看你的房间（黑田尚子） | 63 s | user's line + "问题出在你的房间" + photo wall of messy homes | freezer dive, receipt printing, before/after via source dissolve |
| `wealth-time` | 拼命赚钱却越活越穷 | 69 s | "每天8小时，4个多小时替银行打工" (worked mortgage sum) | salary bar drains, loop over a highway interchange, 30,000-day zoom-out |
| `idle-guilt` | 一闲下来就心慌 | 74 s | *Science* 2014 shock experiment | install window, reinforcement loop that thickens and cracks, brain diagram |
| `bargain-trap` | 越追求性价比越存不下钱 | 73 s | belief → "恰恰相反" → the author's chapter title | jump-cuts on a board via cam keys 0.01 s apart, sums labelled 示意价格, white-flash cut into a bare room |

## Recipes — where to find them
**Hook devices**
- Kinetic title synced to the voice over dark footage with a shade: `room-money walletHud`, `idle-guilt zapHud`.
- Paper tag crossed out with a red ✗: `room-money salaryHud` ("工资低？").
- Persistent overlay across the first shots (8-hour workday bar, 4.2 h turning red): `wealth-time dayBar`.
- Experiment → result grid of people lighting up: `idle-guilt timerPaint / sciencePaint / buttonPaint / resultPaint`.
- Photo wall slamming in with shutter sounds + banner + stamp: `room-money gridPaint` (+ `gridHud` crystal-ball ✗ for "不是玄学").

**Explaining a mechanism**
- Worked sum on a board: count-up + salary bar whose red share drains away: `wealth-time payPaint`.
- Room → bill: photo with ¥ tags, receipt printing line by line: `room-money billPaint`.
- Small amounts adding up (monthly coin stacks → one tall bar): `room-money leakPaint`.
- Loop diagrams: arrows spinning faster over footage `wealth-time loopPaint`; four-node habit loop that thickens
  ("加固 ×3"), locks, later cracks: `idle-guilt loopPaint`, `seePaint` (shared `loopDiagram`).
- Needs vs wants bins with items dropping in: `room-money nwPaint`. Ranked bars: `wealth-time assetPaint`.
- Line chart crossing (non-work income covers costs → flag "财富自由"): `wealth-time chartPaint`.
- Shrinking banknote over a 10-year axis (inflation): `wealth-time inflPaint`.
- Zoom-out reveal of a huge count (single "1天" dot → 30,000): `wealth-time daysPaint`.
- Program window installing with code lines: `idle-guilt programPaint`. Marionette on strings: `idle-guilt puppetPaint`.
- Two-panel board with a camera dive through an object: `room-money frzPaint` + `frzCam` (world [2W, H]).
- Jump-cut inside one board (two cam keys 0.01 s apart): `bargain-trap flipCam / flipPaint`.

**Footage annotation**
- Ring on the subject + big words on a shade: `room-money hoardPaint/hoardHud`, `closetPaint/closetHud`.
- Callouts with leader lines (translated labels on boxes): `room-money drawersPaint`, `crewPaint`.
- Ropes across the frame tightening on a word: `wealth-time overduePaint`. Life "main line" track over a crowd: `idle-guilt rushHud`.
- Before/after using the source's own dissolve, with 整理前/整理后 pills: `room-money kitchenHud` (+ shot `speed: 1.6`).
- "示意画面" label + file card for a person the footage only stands in for: `room-money deskHud`.

**CTA and ending**
- Book card (Japanese title in `fam: "JP"`) + notes card ticking in + comment box typing "整理" and sending:
  `room-money ctaPaint / ctaHud`.
- End titles built line by line, then the payoff line and a small source credit: `room-money endHud`, `idle-guilt endHud`.

**Timeline patterns**
- Music `from` solved from anchors so accents land on words; tape-stop under the twist: every `timeline.ts` `music`.
- Impacts and sfx lists grouped by section with `STAMP_LAND`: every `timeline.ts`.
