// The cut: shots, overlays, impacts, sound-effect cues and the music plan, all keyed to the narration.
// Structure: 0–21 s hook (the belief → "恰恰相反" → her chapter title "buy your drink at the konbini and you save" → why:
// dearer means one can, cheap by the case means you drink more) → stockpiling (deals, idle stuff, expired, thrown out) →
// the sum (6 face-mask boxes "save" 60 but cost 20 more) → the rule (what you never had you mostly don't need; cheap ≠
// worth it; cost per use) → price vs value → switch the habit off (the source's own white flash into a bare room) → like.
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
// the flash between the cluttered and the bare bedroom lands just before "你的存款"
const FLASH_AT = T.yours - 0.1, FLASH_PEAK_SRC = S.FLASH_SRC + 0.23;
const FLIP_SPEED = (FLASH_PEAK_SRC - S.FLIP_SRC) / (FLASH_AT - T.off);
const CLEAN_SPEED = (CLIPS.FLIP[1] - 0.05 - FLASH_PEAK_SRC) / (END - FLASH_AT);
interface Draft { id: string; t0: number; clip?: ClipId; src?: number; speed?: number | "fit"; cam?: Shot["cam"]; grade?: Shot["grade"]; full?: boolean; world?: [number, number];
  board?: Shot["board"]; paint?: Shot["paint"]; hud?: Shot["hud"]; tin?: Trans }
const D: Draft[] = [
  // hook: the belief, hard cuts
  { id: "shop", t0: 0, clip: "SHOP", src: 0.0, speed: 1, grade: { dark: 0.08, vignette: 0.45 }, cam: push(0, T.c1, 1.1, 1.2, [900, 420], [940, 400]), hud: S.shopHud },
  { id: "calc1", t0: T.c1, clip: "CALC", src: 37.75, speed: 1, grade: { dark: 0.12, vignette: 0.45 }, cam: push(T.c1, T.desk, 1.06, 1.14, [1100, 640]), hud: S.calc1Hud },
  { id: "desk", t0: T.desk, clip: "DESK", src: 3.4, speed: 1, grade: { dark: 0.05, vignette: 0.4 }, cam: push(T.desk, T.flip, 1.02, 1.08, [1150, 420]), hud: S.deskHud },
  // the flip and her chapter title
  { id: "flip", t0: T.flip, paint: S.flipPaint, tin: tr("flash", 0.3), cam: S.flipCam() },
  { id: "book", t0: T.book, paint: S.bookPaint, tin: tr("slide", 0.45), cam: push(T.book, T.chapter, 1.0, 1.06, [960, 540], [1000, 500]) },
  { id: "chapter", t0: T.chapter, paint: S.chapterPaint, tin: tr("push", 0.4), cam: push(T.chapter, T.store, 1.0, 1.04, [960, 540], [900, 560]) },
  { id: "store", t0: T.store, paint: S.storePaint, tin: tr("whip", 0.3), cam: push(T.store, T.one, 1.0, 1.05) },
  { id: "one", t0: T.one, paint: S.onePaint, tin: tr("push", 0.4), cam: push(T.one, T.cans, 1.0, 1.05, [960, 540], [1000, 540]) },
  { id: "cans", t0: T.cans, paint: S.cansPaint, tin: tr("slide", 0.4), cam: push(T.cans, T.cart, 1.0, 1.05, [960, 540], [1000, 560]) },
  // stockpiling
  { id: "cart", t0: T.cart, clip: "CART", src: 28.1, speed: 1, grade: { dark: 0.08, vignette: 0.4 }, cam: push(T.cart, T.cart2, 1.08, 1.15, [800, 520]), hud: S.cartHud, tin: tr("whip", 0.3) },
  { id: "cart2", t0: T.cart2, clip: "CART", src: 33.4, speed: 1, grade: { dark: 0.08, vignette: 0.45 }, cam: push(T.cart2, T.hoard, 1.36, 1.46, [860, 640]), hud: S.cart2Hud },
  { id: "hoard", t0: T.hoard, clip: "HOARD", src: 10.6, speed: 1, grade: { dark: 0.12, sat: 0.85, vignette: 0.5 }, cam: push(T.hoard, T.messy, 1.04, 1.12, [1000, 600]), hud: S.hoardHud, tin: tr("glitch", 0.3) },
  { id: "messy", t0: T.messy, clip: "FLIP", src: 19.6, speed: "fit", grade: { dark: 0.08, sat: 0.6, vignette: 0.5 }, cam: push(T.messy, T.calc, 1.02, 1.12, [960, 560]), hud: S.messyHud },
  // the sum
  { id: "calc2", t0: T.calc, clip: "CALC", src: 39.3, speed: 1, grade: { dark: 0.1, vignette: 0.4 }, cam: push(T.calc, T.deal2, 1.0, 1.05, [900, 640]), hud: S.calc2Hud, tin: tr("whip", 0.3) },
  { id: "deal", t0: T.deal2, paint: S.dealPaint, tin: tr("slide", 0.45), cam: push(T.deal2, T.waste, 1.0, 1.03) },
  { id: "waste", t0: T.waste, paint: S.wastePaint, tin: tr("push", 0.45), cam: push(T.waste, T.loss, 1.0, 1.03) },
  { id: "loss", t0: T.loss, clip: "CALC", src: 40.8, speed: "fit", grade: { dark: 0.2, vignette: 0.5 }, cam: push(T.loss, T.quote, 1.02, 1.1, [700, 700]), hud: S.lossHud, tin: tr("whip", 0.3) },
  // the rule
  { id: "quote", t0: T.quote, paint: S.quotePaint, tin: tr("slide", 0.45), cam: push(T.quote, T.neq, 1.0, 1.035) },
  { id: "neq", t0: T.neq, clip: "HOARD", src: 15.9, speed: "fit", grade: { dark: 0.12, sat: 0.85, vignette: 0.45 }, cam: push(T.neq, T.rule, 1.04, 1.1, [1300, 500]), hud: S.neqHud, tin: tr("whip", 0.3) },
  { id: "rule", t0: T.rule, paint: S.rulePaint, tin: tr("slide", 0.45), cam: push(T.rule, T.perUse, 1.0, 1.03) },
  { id: "perUse", t0: T.perUse, paint: S.perUsePaint, tin: tr("push", 0.45), cam: push(T.perUse, T.write, 1.0, 1.03) },
  // the fix
  { id: "write", t0: T.write, clip: "WRITE", src: 45.72, speed: "fit", grade: { dark: 0.06, vignette: 0.4 }, cam: push(T.write, T.value, 1.0, 1.06, [1300, 700]), hud: S.writeHud, tin: tr("fade", 0.4) },
  { id: "value", t0: T.value, paint: S.valuePaint, tin: tr("slide", 0.45), cam: push(T.value, T.off, 1.0, 1.035) },
  { id: "flip2", t0: T.off, clip: "FLIP", src: S.FLIP_SRC, speed: FLIP_SPEED, grade: { dark: 0.05, sat: 0.7, vignette: 0.4 }, cam: push(T.off, FLASH_AT, 1.02, 1.08, [960, 560]), hud: S.flip2Hud, tin: tr("whip", 0.3) },
  { id: "clean", t0: FLASH_AT, clip: "FLIP", src: FLASH_PEAK_SRC, speed: CLEAN_SPEED, grade: { vignette: 0.3 }, cam: push(FLASH_AT, END, 1.0, 1.07, [1000, 560]), hud: S.flip2Hud },
];
export const shots: Shot[] = D.map((d, i) => {
  const t1 = i + 1 < D.length ? D[i + 1].t0 : END;
  const speed = d.speed === "fit" ? fit(d.clip!, d.src!, d.t0, t1) : d.speed;
  return { id: d.id, t0: d.t0, t1, clip: d.clip, src: d.src, speed, cam: d.cam, grade: d.grade, full: d.full, world: d.world, board: d.board, paint: d.paint, hud: d.hud, tin: d.tin };
});

export const overlays: Overlay[] = [
  // captions stay off where the board already spells out the line
  captionOverlay([[0, T.store - 0.02], [T.quote, T.rule - 0.02], [T.end - 0.05, 1e9]]),
  { id: "endFade", t0: END - 0.8, t1: END + 1, z: 70, paint: (ctx, t) => { ctx.fillStyle = `rgba(0,0,0,${prog(t, END - 0.8, 0.75)})`; ctx.fillRect(0, 0, W, H); } },
];

const STAMP_LAND = 0.19;
export const impacts: Impact[] = [
  { t: 0, flash: 0.6, punch: 0.04, shake: 8 },
  { t: T.cpr + 0.05, punch: 0.02 },
  { t: T.c1, punch: 0.025 },
  { t: T.saveEnd, shake: 8 },
  { t: T.desk, punch: 0.02 },
  { t: T.opp + 0.05 + STAMP_LAND, shake: 14, punch: 0.03 },
  { t: T.too - 0.12, punch: 0.025 },
  { t: T.hurt - 0.02 + STAMP_LAND, shake: 12 },
  { t: T.chap, punch: 0.015 },
  { t: T.saved + 0.15, punch: 0.02 },
  { t: T.savedEnd - 0.12 + STAMP_LAND, shake: 10 },
  { t: T.q, punch: 0.025 },
  { t: T.can1End, punch: 0.02 },
  { t: T.more + 0.1, shake: 9, punch: 0.02 },
  { t: T.hoardW - 0.05 + STAMP_LAND, shake: 12 },
  { t: T.idle1 - 0.05 + STAMP_LAND, shake: 10 },
  { t: T.exp - 0.05 + STAMP_LAND, shake: 8 }, { t: T.idle - 0.05 + STAMP_LAND, shake: 10 }, { t: T.toss - 0.05 + STAMP_LAND, shake: 15, punch: 0.025 },
  { t: T.s60 + 0.3, punch: 0.02 },
  { t: T.expire - 0.05 + STAMP_LAND, shake: 9 },
  { t: T.p160 + 0.3, punch: 0.02 },
  { t: T.white + 0.1 + STAMP_LAND, shake: 10 },
  { t: T.p20 + 0.15, shake: 14, punch: 0.03 },
  { t: T.unneeded + 0.1, punch: 0.02 },
  { t: T.neq1, punch: 0.015 }, { t: T.neq2, punch: 0.015 },
  { t: T.worthIt + 0.2, punch: 0.02 }, { t: T.pureEnd, shake: 9 },
  { t: T.once1 + 0.1, punch: 0.02 }, { t: T.allEnd - 0.05 + STAMP_LAND, shake: 10 },
  { t: T.monkEnd + 0.1, shake: 7 },
  { t: T.valueW + 0.1, punch: 0.025 },
  { t: T.offW + 0.15, punch: 0.02 },
  { t: FLASH_AT, flash: 0.35 },
  { t: T.like, punch: 0.02 },
  { t: T.leak + 0.1, punch: 0.025 },
];

/** Sound-effect cues: `k` names a role in audio.ts; `t` is where the sound's hit (or onset, for swells) lands. */
export const sfx: Array<{ t: number; k: string; g?: number }> = [
  // hook
  { t: 0.0, k: "hitOpen" }, { t: T.cpr - 0.05, k: "pop" }, { t: T.cpr + 0.05, k: "tagSnap" },
  { t: T.c1 - 0.03, k: "whooshFast" }, { t: T.saveEnd - 0.05, k: "popSoft" },
  { t: T.desk - 0.03, k: "whooshFast" }, { t: T.desk + 0.1, k: "page" }, { t: T.jp - 0.1, k: "pop" }, { t: T.name - 0.1, k: "popSoft" },
  { t: T.flip, k: "flashUp" }, { t: T.opp + 0.05 + STAMP_LAND, k: "stampBig" }, { t: T.opp + 0.12, k: "slash" },
  { t: T.too - 0.12, k: "whooshSoft" }, { t: T.asset - 0.08, k: "pop" }, { t: T.hurt - 0.02 + STAMP_LAND, k: "stamp" },
  { t: T.book - 0.05, k: "whoosh" }, { t: T.book + 0.15, k: "flip" }, { t: T.chap - 0.05, k: "pop" },
  { t: T.chapter - 0.03, k: "whooshSoft" }, { t: T.chapter + 0.1, k: "type", g: -2 }, { t: T.saved + 0.1, k: "hitSoft" }, { t: T.savedEnd - 0.12 + STAMP_LAND, k: "stamp" },
  { t: T.store - 0.05, k: "whooshFast" }, { t: T.cvs2, k: "chime" }, { t: T.pricier - 0.08, k: "tagSnap" }, { t: T.q - 0.05, k: "popSoft" },
  { t: T.one - 0.05, k: "whooshSoft" }, { t: T.only, k: "pop" }, { t: T.can1 + 0.05, k: "canOpen" },
  { t: T.cans - 0.05, k: "whoosh" }, { t: T.box, k: "coinsFast" }, { t: T.drink, k: "plops" }, { t: T.more + 0.1, k: "hit" },
  // stockpiling
  { t: T.cart - 0.05, k: "whooshFast" }, { t: T.deal - 0.08, k: "tagSnap" }, { t: T.crazy - 0.08, k: "tagSnap" }, { t: T.crazy + 0.18, k: "tagSnap", g: -3 },
  { t: T.hoardW - 0.05 + STAMP_LAND, k: "stampBig" }, { t: T.low - 0.08, k: "tagSnap" }, { t: T.idle1 - 0.05 + STAMP_LAND, k: "stamp" },
  { t: T.hoard - 0.05, k: "glitch" }, { t: T.space - 0.1, k: "scribble" },
  { t: T.messy - 0.05, k: "whooshSoft" },
  { t: T.exp - 0.05 + STAMP_LAND, k: "stamp" }, { t: T.idle - 0.05 + STAMP_LAND, k: "stamp" }, { t: T.toss - 0.05 + STAMP_LAND, k: "stampBig" },
  // the sum
  { t: T.calc - 0.05, k: "whooshFast" }, { t: T.sumW - 0.1, k: "pop" },
  { t: T.deal2 - 0.05, k: "page" }, { t: T.single, k: "popSoft" }, { t: T.p40 - 0.1, k: "tickerFast" }, { t: T.stock + 0.1, k: "plops" }, { t: T.p180 - 0.1, k: "tickerFast" },
  { t: T.look - 0.15, k: "whooshSoft" }, { t: T.s60 - 0.12, k: "tickerFast" }, { t: T.s60 + 0.3, k: "ding" },
  { t: T.waste - 0.05, k: "whoosh" }, { t: T.used4, k: "coins", g: -3 }, { t: T.expire - 0.05 + STAMP_LAND, k: "stamp" },
  { t: T.buy4 - 0.15, k: "whooshSoft" }, { t: T.p160 - 0.12, k: "tickerFast" }, { t: T.p160 + 0.3, k: "hitSoft" },
  { t: T.loss - 0.05, k: "whooshFast" }, { t: T.white - 0.05, k: "slash" }, { t: T.white + 0.1 + STAMP_LAND, k: "stamp" }, { t: T.p20 + 0.1, k: "boom" },
  // the rule
  { t: T.quote - 0.05, k: "page" }, { t: T.never - 0.2, k: "scribble" }, { t: T.unneeded, k: "hitWarm" },
  { t: T.neq - 0.05, k: "whooshFast" }, { t: T.cheapW - 0.1, k: "tagSnap" }, { t: T.neq1 - 0.08, k: "pop" }, { t: T.dealW - 0.1, k: "tagSnap" }, { t: T.neq2 - 0.08, k: "pop" },
  { t: T.rule - 0.05, k: "page" }, { t: T.worthIt + 0.2, k: "ding" }, { t: T.cheapR - 0.15, k: "whooshSoft" }, { t: T.pureEnd - 0.05, k: "xHit" },
  { t: T.perUse - 0.05, k: "whoosh" }, { t: T.shoe - 0.1, k: "pop" }, { t: T.wear - 0.05, k: "tickerFast" }, { t: T.once1 + 0.1, k: "ding" },
  { t: T.shirt - 0.1, k: "pop" }, { t: T.never0 - 0.1, k: "popSoft" }, { t: T.all - 0.1, k: "hit" }, { t: T.allEnd - 0.05 + STAMP_LAND, k: "stamp" },
  // the fix
  { t: T.monkEnd + 0.05, k: "slash" },
  { t: T.value - 0.05, k: "page" }, { t: T.learn + 0.1, k: "scribble" }, { t: T.priceW - 0.1, k: "pop" }, { t: T.valueW - 0.1, k: "hitWarm" },
  { t: T.off - 0.05, k: "whooshFast" }, { t: T.offW + 0.1, k: "switch" }, { t: T.habitEnd - 0.1, k: "slash" },
  { t: FLASH_AT, k: "flashUp" }, { t: T.slow, k: "riserSoft" }, { t: T.riseEnd, k: "sparkle" },
  { t: T.like - 0.1, k: "pop" }, { t: T.leak + 0.1, k: "hitWarm" },
];

/** Music: a mischievous pulse for the belief and the hoard that tape-stops on "丢弃"; a calm explainer bed for the sums and
 *  the rule; a sunny, unhurried bed from "存钱不是苦行僧" to the end. `from` (source seconds) is solved so a measured accent
 *  lands on a beat (review/onsets.ts): the Grinch's groove entry (13.72 s) on the "恰恰相反" stamp, Secret Room's 18.44 s
 *  accent on "倒贴20", Sunny Side's 9.57 s accent on the white flash into the bare room. */
const HOOK_HIT = T.opp + 0.05 + STAMP_LAND, EXPLAIN_T0 = T.calc - 0.1;
export const music: Array<{ k: string; t0: number; t1: number; fadeIn: number; fadeOut: number; from?: number; tapeStop?: number; duck?: Array<[number, number, number]> }> = [
  { k: "hook", t0: 0, t1: T.tossEnd + 0.35, fadeIn: 0, fadeOut: 0.03, tapeStop: 0.6, from: 13.72 - HOOK_HIT },
  { k: "explain", t0: EXPLAIN_T0, t1: T.write + 0.3, fadeIn: 0.3, fadeOut: 0.6, from: 18.44 - (T.p20 + 0.1 - EXPLAIN_T0) },
  { k: "resolve", t0: T.write, t1: END, fadeIn: 0.25, fadeOut: 1.4, from: 9.57 - (FLASH_AT - T.write) },
];
export const meta = { fps: FPS, end: END };
