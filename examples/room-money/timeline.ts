// The cut: shots, overlays, impacts, sound-effect cues and the music plan, all keyed to the narration.
// Structure: 0–13 s hook (the claim, the twist, who says so, her rule, "not superstition") → two tests you can do at home
// (ice packs in the freezer, black trousers in the wardrobe) → the mechanism (need vs want, the room is the bill, small
// money adds up) → the fix (tidy first: before/after, clear out, know what you have) → notes CTA.
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
  // hook: hard cuts with an impact on each
  { id: "wallet", t0: 0, clip: "WALLET", src: 0.02, speed: 1, grade: { dark: 0.08, vignette: 0.5, sat: 0.9 }, cam: push(0, T.not, 1.3, 1.4, [1056, 500], [1040, 512]), hud: S.walletHud },
  { id: "salary", t0: T.not - 0.05, clip: "SALARY", src: 7.0, speed: 1, grade: { dark: 0.04, vignette: 0.35 }, cam: push(T.not - 0.05, T.room, 1.06, 1.16, [1250, 420]), hud: S.salaryHud },
  { id: "hoard", t0: T.room, clip: "HOARD", src: 24.78, speed: 1, grade: { dark: 0.1, sat: 0.8, vignette: 0.5 }, cam: push(T.room, T.desk, 1.04, 1.16, [1250, 600]), paint: S.hoardPaint, hud: S.hoardHud, tin: tr("glitch", 0.3) },
  { id: "desk", t0: T.desk, clip: "DESK", src: 11.05, speed: "fit", grade: { dark: 0.12, vignette: 0.45 }, cam: push(T.desk, T.grid, 1.02, 1.1, [640, 600]), hud: S.deskHud, tin: tr("whip", 0.32) },
  { id: "grid", t0: T.grid, board: { tone: "#E9E4D8" }, paint: S.gridPaint, hud: S.gridHud, tin: tr("zoom", 0.4), cam: push(T.grid, T.frz, 1.0, 1.04) },
  // test 1: the freezer (dives through the drawer into a second panel)
  { id: "freezer", t0: T.frz, world: [2 * W, H], paint: S.frzPaint, hud: S.frzHud, tin: tr("push", 0.45), cam: S.frzCam() },
  // test 2: the wardrobe
  { id: "closet", t0: T.closet, clip: "CLOSET", src: 27.55, speed: 1, grade: { dark: 0.05, vignette: 0.4 }, cam: push(T.closet, T.style - 0.12, 1.0, 1.16, [1010, 480]), paint: S.closetPaint, hud: S.closetHud, tin: tr("whip", 0.3) },
  { id: "pants", t0: T.style - 0.12, paint: S.pantsPaint, tin: tr("slide", 0.45), cam: push(T.style - 0.12, T.same, 1.0, 1.035) },
  // the mechanism
  { id: "same", t0: T.same, paint: S.samePaint, tin: tr("push", 0.45), cam: push(T.same, T.nw, 1.0, 1.03) },
  { id: "nw", t0: T.nw, paint: S.nwPaint, tin: tr("slide", 0.45), cam: push(T.nw, T.bill, 1.0, 1.03) },
  { id: "bill", t0: T.bill, paint: S.billPaint, tin: tr("push", 0.45), cam: push(T.bill, T.leak, 1.0, 1.03) },
  { id: "leak", t0: T.leak, paint: S.leakPaint, tin: tr("slide", 0.45), cam: push(T.leak, T.step, 1.0, 1.035) },
  // the fix
  { id: "step", t0: T.step, paint: S.stepPaint, tin: tr("flash", 0.36), cam: push(T.step, T.but - 0.06, 1.0, 1.04) },
  { id: "kitchen", t0: T.but - 0.06, clip: "KITCHEN", src: 18.6, speed: 1.6, grade: { dark: 0.04, vignette: 0.35 }, cam: push(T.but - 0.06, T.clear, 1.02, 1.1, [1150, 520]), hud: S.kitchenHud, tin: tr("whip", 0.3) },
  { id: "crew", t0: T.clear, clip: "CREW", src: 41.0, speed: 1, grade: { dark: 0.08, vignette: 0.35 }, cam: push(T.clear, T.sort, 1.04, 1.12, [900, 560]), paint: S.crewPaint, hud: S.crewHud, tin: tr("whip", 0.3) },
  { id: "drawers", t0: T.sort, clip: "DRAWERS", src: 64.1, speed: 1, grade: { dark: 0.04, vignette: 0.3 }, cam: push(T.sort, T.calm, 1.0, 1.06, [960, 520]), paint: S.drawersPaint, hud: S.drawersHud, tin: tr("whip", 0.3) },
  { id: "calm", t0: T.calm, clip: "WALKIN", src: 56.0, speed: 1, grade: { dark: 0.06, tint: "#FFB86B", tintA: 0.14, vignette: 0.35 }, cam: push(T.calm, T.cta, 1.0, 1.06, [1100, 540]), hud: S.calmHud, tin: tr("fade", 0.4) },
  // call to action
  { id: "cta", t0: T.cta, paint: S.ctaPaint, hud: S.ctaHud, tin: tr("slide", 0.45), cam: push(T.cta, T.end, 1.0, 1.03) },
  { id: "end", t0: T.end, clip: "BEDROOM", src: 30.8, speed: "fit", grade: { dark: 0.04, vignette: 0.45 }, cam: push(T.end, END, 1.0, 1.08, [900, 500]), hud: S.endHud, tin: tr("fade", 0.5) },
];
export const shots: Shot[] = D.map((d, i) => {
  const t1 = i + 1 < D.length ? D[i + 1].t0 : END;
  const speed = d.speed === "fit" ? fit(d.clip!, d.src!, d.t0, t1) : d.speed;
  return { id: d.id, t0: d.t0, t1, clip: d.clip, src: d.src, speed, cam: d.cam, grade: d.grade, full: d.full, world: d.world, board: d.board, paint: d.paint, hud: d.hud, tin: d.tin };
});

export const overlays: Overlay[] = [
  { id: "credit", t0: T.frz, t1: T.same + 0.1, z: 30, paint: S.credit },
  captionOverlay([[0, T.desk - 0.02], [T.grid, T.myth - 0.05]]),
  { id: "endFade", t0: END - 0.8, t1: END + 1, z: 70, paint: (ctx, t) => { ctx.fillStyle = `rgba(0,0,0,${prog(t, END - 0.8, 0.75)})`; ctx.fillRect(0, 0, W, H); } },
];

const STAMP_LAND = 0.19;
export const impacts: Impact[] = [
  { t: 0, flash: 0.6, punch: 0.04, shake: 8 },
  { t: T.wageEnd + 0.02, shake: 13, punch: 0.02 },
  { t: T.roomEnd, shake: 15, punch: 0.035 },
  { t: T.rule + 0.08 + STAMP_LAND, shake: 9 },
  ...[0, 1, 2, 3].map((k) => ({ t: T.grid + 0.02 + k * 0.2 + 0.16, punch: 0.012 })),
  { t: T.messEnd + 0.05, shake: 12, punch: 0.02 },
  { t: T.mythEnd + 0.08, shake: 11 },
  { t: T.open + 0.6, flash: 0.35, punch: 0.03 },
  { t: T.pile + 0.32, shake: 7 },
  { t: T.n30 + 0.45, punch: 0.02 },
  { t: T.three + 0.12, punch: 0.025 },
  { t: T.careEnd + 0.04 + STAMP_LAND, shake: 10 },
  { t: T.essence + 0.2, punch: 0.015 },
  { t: T.spendEnd + 0.05, shake: 8 },
  { t: T.k + 0.25, shake: 12, punch: 0.02 },
  { t: T.rush + 0.4, shake: 8 },
  { t: T.tidyEnd + 0.1, punch: 0.025 },
  { t: T.out + 0.2, punch: 0.015 },
  { t: T.kou + 0.45, punch: 0.015 },
  { t: T.detour + 0.4, punch: 0.02 },
];

/** Sound-effect cues: `k` names a role in audio.ts; `t` is where the sound's hit (or onset, for swells) lands. */
export const sfx: Array<{ t: number; k: string; g?: number }> = [
  // hook
  { t: 0.0, k: "hitOpen" }, { t: T.zan - 0.2, k: "slam" },
  { t: T.not - 0.06, k: "whooshFast" }, { t: T.wage - 0.16, k: "pop" }, { t: T.wageEnd - 0.02, k: "xHit" },
  { t: T.room - 0.05, k: "glitch" }, { t: T.q - 0.06, k: "pop" }, { t: T.roomEnd + 0.02, k: "darkHit" },
  { t: T.desk - 0.02, k: "whoosh" }, { t: T.desk + 0.12, k: "whooshSoft" }, { t: T.jp - 0.08, k: "popSoft" }, { t: T.name - 0.05, k: "pop" },
  { t: T.y25 - 0.12, k: "tickerFast" }, { t: T.rule + 0.08 + STAMP_LAND, k: "stamp" },
  { t: T.grid - 0.05, k: "whoosh" }, ...[0, 1, 2, 3].map((k) => ({ t: T.grid + 0.02 + k * 0.2 + 0.04, k: "shutter" })),
  { t: T.messEnd + 0.03, k: "hit" }, { t: T.myth - 0.12, k: "magic" }, { t: T.mythEnd + 0.02, k: "xHit" },
  // freezer
  { t: T.frz - 0.05, k: "whoosh" }, { t: T.dare - 0.08, k: "pop" }, { t: T.open - 0.04, k: "drawer" }, { t: T.open + 0.1, k: "cold" },
  { t: T.open + 0.58, k: "dive" }, { t: T.open + 0.7, k: "plops" },
  { t: T.buy - 0.1, k: "pop" }, { t: T.sweet - 0.08, k: "pop" }, { t: T.gift - 0.08, k: "whooshSoft" },
  { t: T.pile - 0.02, k: "ice" }, { t: T.pile + 0.05, k: "plops" },
  { t: T.n30 - 0.12, k: "tickerFast" }, { t: T.is30 + 0.08, k: "flip" }, { t: T.treat, k: "scribble" }, { t: T.treatEnd + 0.08, k: "ding" },
  // wardrobe
  { t: T.closet - 0.03, k: "whoosh" }, { t: T.closet + 0.05, k: "pop" }, { t: T.wardrobe - 0.05, k: "scribble" },
  { t: T.style - 0.14, k: "whooshSoft" }, { t: T.style - 0.02, k: "hanger" }, { t: T.pantsW - 0.08, k: "hanger" }, { t: T.three - 0.08, k: "hanger" },
  { t: T.three - 0.04, k: "pop" }, { t: T.she - 0.15, k: "page" }, { t: T.careEnd + 0.04 + STAMP_LAND, k: "stamp" },
  ...[0, 1, 2].map((k) => ({ t: T.forget - 0.25 + k * 0.17, k: "popSoft" })),
  // mechanism
  { t: T.same - 0.05, k: "whoosh" }, { t: T.tidy - 0.1, k: "pop" }, { t: T.save - 0.1, k: "coin" }, { t: T.essence - 0.04, k: "scribble" }, { t: T.one, k: "hitSoft" },
  { t: T.nw - 0.05, k: "whooshSoft" }, { t: T.need - 0.1, k: "pop" }, { t: T.want - 0.1, k: "pop" },
  ...[0, 1, 2].map((k) => ({ t: T.need + 0.02 + k * 0.13 + 0.3, k: "drop" })), ...[0, 1, 2].map((k) => ({ t: T.want + 0.02 + k * 0.13 + 0.3, k: "drop" })),
  { t: T.bill - 0.05, k: "whoosh" }, { t: T.bill + 0.05, k: "shutter" }, ...[0, 1, 2, 3].map((k) => ({ t: T.junk + k * 0.1, k: "popSoft" })),
  { t: T.billW - 0.25, k: "page" }, { t: T.billW + 0.1, k: "printer" }, { t: T.spendEnd, k: "hit" },
  { t: T.leak - 0.05, k: "whooshSoft" }, { t: T.small - 0.45, k: "coins" }, { t: T.year, k: "coinsFast" }, { t: T.k + 0.05, k: "boom" },
  // the fix
  { t: T.step - 0.05, k: "flashUp" }, { t: T.first - 0.12, k: "pop" }, { t: T.rush + 0.22, k: "slash" },
  { t: T.but - 0.08, k: "whoosh" }, { t: T.tidyFirst + 0.15, k: "sparkle" }, { t: T.tidyEnd + 0.04, k: "ding" },
  { t: T.clear - 0.05, k: "whoosh" }, { t: T.junk2 - 0.05, k: "popSoft" }, { t: T.junk2 + 0.12, k: "popSoft" }, { t: T.out + 0.18, k: "whooshFast" },
  { t: T.sort - 0.05, k: "whoosh" }, ...[0, 1, 2].map((k) => ({ t: T.sort + 0.12 + k * 0.16, k: "popSoft" })),
  { t: T.noSpend + 0.55, k: "ding" },
  // call to action
  { t: T.cta - 0.05, k: "whooshSoft" }, { t: T.book - 0.15, k: "book" }, { t: T.done + 0.1, k: "pop" },
  ...[0, 1, 2, 3].map((k) => ({ t: T.notes + 0.45 + k * 0.28, k: "popSoft" })),
  { t: T.box - 0.3, k: "whooshSoft" }, { t: T.kou, k: "type" }, { t: T.kou + 0.45, k: "send" },
  { t: T.moon - 0.2, k: "pop" }, { t: T.detour, k: "hitWarm" },
];

/** Music: a tense bed under the hook that tape-stops on "这不是玄学", a riddle-like bed for the two tests and the
 *  mechanism, then a warm bed from "所以想攒钱" to the end. Files and entry points are chosen in audio.ts. */
// `from` (source seconds) is solved so a measured accent of the track lands on a beat of the edit: the hook bed's
// 10.19 s accent on the "房间" hit, the warm bed's 7.08 s accent on the "先整理房间" check mark.
export const music: Array<{ k: string; t0: number; t1: number; fadeIn: number; fadeOut: number; from?: number; tapeStop?: number; duck?: Array<[number, number, number]> }> = [
  { k: "hook", t0: 0, t1: T.myth + 0.25, fadeIn: 0, fadeOut: 0.03, tapeStop: 0.55, from: 10.19 - (T.roomEnd + 0.02) },
  { k: "test", t0: T.frz, t1: T.step + 0.35, fadeIn: 0.05, fadeOut: 0.5 },
  { k: "hope", t0: T.step, t1: END, fadeIn: 0.12, fadeOut: 1.4, from: 7.08 - (T.tidyEnd + 0.04 - T.step) },
];
export const meta = { fps: FPS, end: END };
