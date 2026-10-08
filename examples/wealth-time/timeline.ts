// The cut: shots, overlays, impacts, sound-effect cues and the music plan, all keyed to the narration.
// Structure: 0–12 s hook (8 hours a day, 4.2 of them for the bank, worked out) → the treadmill (buy, borrow, sell time;
// the loop; the rat race) → what freedom really is (income that needs no work covers the costs) → money loses value, time
// runs out → the most valuable assets → the habit: price things in time → follow.
import { FPS, H, VOICE_END, W, clamp, prog } from "./common.ts";
import { CLIPS, type ClipId } from "./footage.ts";
import { push, type Impact, type Overlay, type Shot, type Trans } from "./model.ts";
import { captionOverlay } from "./captions.ts";
import * as S from "./scenes.ts";

const T = S.T;
export const END = VOICE_END + 1.7;

/** Speed that lets a clip from `src` cover [t0 - pad, t1 + pad] without running out (kept within 0.68..1.0). */
function fit(clip: ClipId, src: number, t0: number, t1: number, pad = 0.35): number {
  const avail = CLIPS[clip][1] - src - 0.05, need = t1 - t0 + 2 * pad;
  return clamp(avail / need, 0.68, 1.0);
}
const tr = (kind: Trans["kind"], d: number, dir: 1 | -1 = 1): Trans => ({ kind, d, dir });
interface Draft { id: string; t0: number; clip?: ClipId; src?: number; speed?: number | "fit"; cam?: Shot["cam"]; grade?: Shot["grade"]; full?: boolean; world?: [number, number];
  board?: Shot["board"]; paint?: Shot["paint"]; hud?: Shot["hud"]; tin?: Trans }
const D: Draft[] = [
  // hook: the workday (the 8-hour bar rides over these three shots)
  { id: "bldg", t0: 0, clip: "BLDG", src: 0.5, speed: 1, grade: { dark: 0.1, vignette: 0.5 }, cam: push(0, T.cut1, 1.06, 1.16, [960, 520]) },
  { id: "office", t0: T.cut1, clip: "OFFICE", src: 6.6, speed: 1, grade: { dark: 0.25, sat: 0.8, vignette: 0.5 }, cam: push(T.cut1, T.cut2, 1.04, 1.12, [1300, 500]) },
  { id: "late", t0: T.cut2, clip: "LATE", src: 15.2, speed: 1, grade: { dark: 0.15, vignette: 0.5 }, cam: push(T.cut2, T.sum, 1.0, 1.1, [500, 600]) },
  // the sum
  { id: "contract", t0: T.sum, clip: "CONTRACT", src: 24.2, speed: 1, grade: { dark: 0.04, vignette: 0.3 }, cam: push(T.sum, T.pay, 1.0, 1.08, [1000, 700]), paint: S.contractPaint, hud: S.contractHud, tin: tr("whip", 0.32) },
  { id: "pay", t0: T.pay, paint: S.payPaint, tin: tr("slide", 0.45), cam: push(T.pay, T.many, 1.0, 1.03) },
  // the treadmill
  { id: "crowd", t0: T.many, clip: "CROWD", src: 55.6, speed: 1, grade: { dark: 0.1, sat: 0.8, vignette: 0.45 }, cam: push(T.many, T.grind - 0.1, 1.04, 1.1, [1100, 560]), hud: S.crowdHud, tin: tr("whip", 0.3) },
  { id: "keys", t0: T.grind - 0.1, clip: "KEYS", src: 44.2, speed: 1, grade: { dark: 0.1, vignette: 0.45 }, cam: push(T.grind - 0.1, T.car - 0.12, 1.0, 1.1, [1000, 600]), hud: S.keysHud },
  { id: "house", t0: T.car - 0.12, clip: "HOUSE", src: 106.3, speed: 1, grade: { dark: 0.02 }, cam: push(T.car - 0.12, T.bound, 1.0, 1.08, [900, 500]), paint: S.housePaint },
  { id: "overdue", t0: T.bound, clip: "OVERDUE", src: 60.2, speed: 1, grade: { dark: 0.12, vignette: 0.45 }, cam: push(T.bound, T.only - 0.1, 1.0, 1.1, [800, 560]), paint: S.overduePaint, hud: S.overdueHud, tin: tr("glitch", 0.3) },
  { id: "gears", t0: T.only - 0.1, clip: "GEARS", src: 170.0, speed: 1, grade: { dark: 0.15, vignette: 0.5 }, cam: push(T.only - 0.1, T.loop, 1.0, 1.08), hud: S.gearsHud },
  { id: "loop", t0: T.loop, clip: "LOOP", src: 50.4, speed: "fit", grade: { dark: 0.15, vignette: 0.45 }, cam: push(T.loop, T.rat, 1.02, 1.08, [1040, 640]), paint: S.loopPaint, hud: S.loopHud, tin: tr("zoom", 0.4) },
  { id: "rat", t0: T.rat, paint: S.ratPaint, tin: tr("push", 0.45), cam: push(T.rat, T.free, 1.0, 1.035) },
  // what freedom is
  { id: "cash", t0: T.free, clip: "CAR", src: 101.0, speed: 1, grade: { dark: 0.12, vignette: 0.45 }, cam: push(T.free, T.labor, 1.04, 1.12, [1500, 380]), hud: S.cashHud, tin: tr("dip", 0.5) },
  { id: "balcony", t0: T.labor, clip: "BALCONY", src: 84.25, speed: "fit", grade: { dark: 0.05, vignette: 0.35 }, cam: push(T.labor, T.chart, 1.0, 1.06, [700, 540]), hud: S.laborHud, tin: tr("fade", 0.4) },
  { id: "chart", t0: T.chart, paint: S.chartPaint, tin: tr("slide", 0.45), cam: push(T.chart, T.print, 1.0, 1.03) },
  // money vs time
  { id: "print", t0: T.print, clip: "PRINT", src: 115.0, speed: 1, grade: { dark: 0.1, vignette: 0.45 }, cam: push(T.print, T.infl, 1.0, 1.1), hud: S.printHud, tin: tr("whip", 0.3) },
  { id: "infl", t0: T.infl, paint: S.inflPaint, tin: tr("slide", 0.45), cam: push(T.infl, T.sand, 1.0, 1.03) },
  { id: "sand", t0: T.sand, clip: "HOURGLASS", src: 140.0, speed: 1, grade: { dark: 0.05, vignette: 0.45 }, cam: push(T.sand, T.life, 1.0, 1.08, [500, 540]), hud: S.sandHud, tin: tr("fade", 0.4) },
  { id: "days", t0: T.life, paint: S.daysPaint, tin: tr("slide", 0.45), cam: push(T.life, T.pair, 1.0, 1.03) },
  { id: "pair", t0: T.pair, paint: S.pairPaint, tin: tr("push", 0.45), cam: push(T.pair, T.asset, 1.0, 1.03) },
  { id: "asset", t0: T.asset, paint: S.assetPaint, tin: tr("slide", 0.45), cam: push(T.asset, T.price, 1.0, 1.035) },
  // the habit
  { id: "bills", t0: T.price, clip: "BILLS", src: 156.8, speed: 1, grade: { dark: 0.06, vignette: 0.4 }, cam: push(T.price, T.carSum, 1.0, 1.06, [1200, 560]), hud: S.billsHud, tin: tr("whip", 0.3) },
  { id: "car", t0: T.carSum, paint: S.carPaint, tin: tr("slide", 0.45), cam: push(T.carSum, T.end, 1.0, 1.03) },
  { id: "end", t0: T.end, clip: "ROAD", src: 164.1, speed: "fit", grade: { dark: 0.06, vignette: 0.4 }, cam: push(T.end, END, 1.0, 1.08, [960, 560]), hud: S.endHud, tin: tr("fade", 0.5) },
];
export const shots: Shot[] = D.map((d, i) => {
  const t1 = i + 1 < D.length ? D[i + 1].t0 : END;
  const speed = d.speed === "fit" ? fit(d.clip!, d.src!, d.t0, t1) : d.speed;
  return { id: d.id, t0: d.t0, t1, clip: d.clip, src: d.src, speed, cam: d.cam, grade: d.grade, full: d.full, world: d.world, board: d.board, paint: d.paint, hud: d.hud, tin: d.tin };
});

export const overlays: Overlay[] = [
  { id: "dayBar", t0: 0, t1: T.sum + 0.2, z: 25, paint: S.dayBar },
  captionOverlay([[0, T.sum - 0.05]]),
  { id: "endFade", t0: END - 0.8, t1: END + 1, z: 70, paint: (ctx, t) => { ctx.fillStyle = `rgba(0,0,0,${prog(t, END - 0.8, 0.75)})`; ctx.fillRect(0, 0, W, H); } },
];

const STAMP_LAND = 0.19;
export const impacts: Impact[] = [
  { t: 0, flash: 0.6, punch: 0.04, shake: 8 },
  { t: T.cut1, punch: 0.02 }, { t: T.cut2, punch: 0.02 },
  { t: T.h4 + 0.45, shake: 9, punch: 0.02 },
  { t: T.bankEnd + 0.02, shake: 12, punch: 0.025 },
  { t: T.monthly + 0.6, punch: 0.025 },
  { t: T.flow + 0.2, shake: 8 },
  { t: T.car - 0.05 + STAMP_LAND, shake: 8 }, { t: T.buyHouse - 0.05 + STAMP_LAND, shake: 8 }, { t: T.debt - 0.05 + STAMP_LAND, shake: 12 },
  { t: T.tied + 0.15, shake: 12, punch: 0.02 },
  { t: T.sellEnd, punch: 0.025 },
  { t: T.noStop - 0.05 + STAMP_LAND, shake: 12 },
  { t: T.raceEnd, punch: 0.025 },
  { t: T.cashEnd + 0.1, shake: 8 },
  { t: T.cover + 0.1, punch: 0.025 },
  { t: T.left82 + 0.25, punch: 0.025 },
  { t: T.days + 0.5, punch: 0.02 },
  { t: T.gone + 0.3, shake: 8 },
  { t: T.mostEnd, punch: 0.03 },
  { t: T.two + 0.15, punch: 0.025 },
  { t: T.redeem + 0.6, punch: 0.02 },
];

/** Sound-effect cues: `k` names a role in audio.ts; `t` is where the sound's hit (or onset, for swells) lands. */
export const sfx: Array<{ t: number; k: string; g?: number }> = [
  // hook
  { t: 0.0, k: "hitOpen" }, { t: T.day - 0.2, k: "slam" }, { t: T.h8 - 0.25, k: "tickRun" },
  { t: T.cut1 - 0.04, k: "whooshFast" }, { t: T.cut2 - 0.04, k: "whooshFast" }, { t: T.h4 + 0.42, k: "riserShort" }, { t: T.h4 + 0.45, k: "hit" },
  { t: T.bank - 0.15, k: "pop" }, { t: T.bankEnd + 0.02, k: "xHit" },
  // the sum
  { t: T.sum - 0.05, k: "whoosh" }, { t: T.calc - 0.1, k: "pop" }, { t: T.wage + 0.1, k: "tickerFast" }, { t: T.loan - 0.12, k: "pop" }, { t: T.house - 0.12, k: "popSoft" }, { t: T.y30 - 0.12, k: "popSoft" },
  { t: T.pay - 0.05, k: "page" }, { t: T.monthly - 0.12, k: "tickerFast" }, { t: T.monthly + 0.6, k: "hit" },
  { t: T.half - 0.35, k: "whooshSoft" }, { t: T.flow - 0.15, k: "drain" },
  // treadmill
  { t: T.many - 0.05, k: "whoosh" }, { t: T.grind - 0.12, k: "whooshFast" }, { t: T.car - 0.14, k: "whooshFast" },
  { t: T.car - 0.05 + STAMP_LAND, k: "stamp" }, { t: T.buyHouse - 0.05 + STAMP_LAND, k: "stamp" }, { t: T.debt - 0.05 + STAMP_LAND, k: "stampBig" },
  { t: T.bound - 0.05, k: "glitch" }, { t: T.debtW - 0.05, k: "scribble" }, { t: T.tied - 0.1, k: "rope" }, { t: T.tied + 0.15, k: "hit" },
  { t: T.only - 0.12, k: "whooshFast" }, { t: T.only - 0.1, k: "gears" }, { t: T.sellEnd, k: "hitSoft" },
  { t: T.loop - 0.1, k: "whoosh" }, { t: T.incUp - 0.1, k: "pop" }, { t: T.loanUp - 0.1, k: "pop" }, { t: T.wheel - 0.1, k: "pop" }, { t: T.faster + 0.7, k: "riserShort" },
  { t: T.noStop - 0.05 + STAMP_LAND, k: "stampBig" },
  { t: T.rat - 0.05, k: "whoosh" }, { t: T.rat + 0.05, k: "wheel" }, { t: T.book - 0.15, k: "page" }, { t: T.race - 0.05, k: "hit" },
  // what freedom is
  { t: T.notCash - 0.1, k: "pop" }, { t: T.cashEnd - 0.05, k: "slash" },
  { t: T.labor + 0.02, k: "ding" },
  { t: T.chart - 0.05, k: "page" }, { t: T.cover + 0.02, k: "riserSoft" }, { t: T.cover + 0.05, k: "sparkle" }, { t: T.cover + 0.1, k: "hitSoft" },
  // money vs time
  { t: T.print - 0.05, k: "whoosh" }, { t: T.print + 0.05, k: "press" },
  { t: T.infl - 0.05, k: "page" }, { t: T.pct - 0.15, k: "pop" }, { t: T.y10 - 0.4, k: "tickerFast" }, { t: T.left82 + 0.2, k: "boom" },
  { t: T.sand + 0.1, k: "sand" }, { t: T.timeW - 0.1, k: "hitSoft" },
  { t: T.life - 0.05, k: "whooshSoft" }, { t: T.life + 0.05, k: "tickRun" }, { t: T.days - 0.1, k: "tickerFast" }, { t: T.days + 0.5, k: "hit" },
  { t: T.pair - 0.05, k: "whoosh" }, { t: T.spent - 0.1, k: "coin" }, { t: T.earn - 0.2, k: "whooshSoft" }, { t: T.te - 0.1, k: "pop" }, { t: T.used - 0.1, k: "whooshFast" }, { t: T.gone + 0.3, k: "xHit" },
  { t: T.asset - 0.05, k: "page" }, { t: T.tf - 0.12, k: "pop" }, { t: T.energy - 0.12, k: "pop" }, { t: T.most - 0.37, k: "popSoft" }, { t: T.mostEnd, k: "hitWarm" },
  // the habit
  { t: T.price - 0.05, k: "whoosh" }, { t: T.priceW - 0.12, k: "pop" }, { t: T.toTime - 0.12, k: "whooshSoft" }, { t: T.toTime + 0.1, k: "ding" },
  { t: T.carSum - 0.05, k: "page" }, { t: T.car20 - 0.15, k: "pop" }, { t: T.wage2 - 0.12, k: "pop" }, { t: T.noEat - 0.25, k: "coinsFast" }, { t: T.two + 0.1, k: "boom" },
  { t: T.follow - 0.1, k: "pop" }, { t: T.redeem + 0.55, k: "hitWarm" },
];

/** Music: a driving, anxious pulse under the treadmill that tape-stops on "老鼠赛跑"; a reflective waltz from "真正的财富
 *  自由"; a warm groove from the key line to the end. `from` (source seconds) is solved so a measured accent lands on a
 *  word: the waltz's 3.30 s downbeat on "财富自由", Melody's 18.58 s drop on "最值钱的资产". */
export const music: Array<{ k: string; t0: number; t1: number; fadeIn: number; fadeOut: number; from?: number; tapeStop?: number; duck?: Array<[number, number, number]> }> = [
  { k: "hook", t0: 0, t1: T.raceEnd + 0.3, fadeIn: 0, fadeOut: 0.03, tapeStop: 0.6, from: 16.32 },
  { k: "explain", t0: T.free, t1: T.asset + 0.3, fadeIn: 0.3, fadeOut: 0.6, from: 3.30 - (T.freeW - T.free) },
  { k: "resolve", t0: T.asset, t1: END, fadeIn: 0.25, fadeOut: 1.4, from: 18.58 - (T.most - T.asset) },
];
export const meta = { fps: FPS, end: END };
