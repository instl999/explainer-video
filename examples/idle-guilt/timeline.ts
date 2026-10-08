// The cut: shots, overlays, impacts, sound-effect cues and the music plan, all keyed to the narration.
// Structure: 0–18 s hook (people would rather shock themselves than sit idle for 15 minutes: the experiment and its result,
// then "is that you?") → the mechanism (pushed along life's main line; rest feels like a sin; an installed "inertia
// program": alarm → keep busy → relief, reinforced every lap; autonomy lost) → the fix (see it; allow blank time — the
// idling brain is busy; the old alarm will ring; the sky won't fall) → choose your own life.
import { A, FPS, H, VOICE_END, W, clamp, prog } from "./common.ts";
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
  // hook
  { id: "window", t0: 0, clip: "WINDOW", src: 0.1, speed: 1, grade: { dark: 0.05, vignette: 0.5 }, cam: push(0, T.notIdle, 1.04, 1.14, [600, 470]), hud: S.zapHud },
  { id: "timer", t0: T.notIdle, paint: S.timerPaint, cam: push(T.notIdle, T.exp, 1.0, 1.05) },
  { id: "science", t0: T.exp, paint: S.sciencePaint, tin: tr("slide", 0.45), cam: push(T.exp, T.alone, 1.0, 1.04) },
  { id: "alone", t0: T.alone, clip: "WINDOW", src: 1.55, speed: "fit", grade: { dark: 0.1, vignette: 0.5 }, cam: push(T.alone, T.button, 1.1, 1.2, [560, 460]), hud: S.aloneHud, tin: tr("whip", 0.3) },
  { id: "button", t0: T.button, paint: S.buttonPaint, tin: tr("whip", 0.3), cam: push(T.button, T.result, 1.0, 1.05) },
  { id: "result", t0: T.result, paint: S.resultPaint, tin: tr("push", 0.4), cam: push(T.result, T.you, 1.0, 1.03) },
  { id: "panic", t0: T.you, clip: "BEDROOM", src: 24.7, speed: 1, grade: { dark: 0.12, vignette: 0.5 }, cam: push(T.you, T.pushed, 1.02, 1.12, [700, 500]), hud: S.panicHud, tin: tr("whip", 0.3) },
  // the mechanism
  { id: "rush", t0: T.pushed, clip: "RUSH", src: 6.0, speed: 1, grade: { dark: 0.1, vignette: 0.45 }, cam: push(T.pushed, T.guilt, 1.0, 1.08), hud: S.rushHud, tin: tr("glitch", 0.3) },
  { id: "sin", t0: T.guilt, clip: "NIGHTOFFICE", src: 11.5, speed: 1, grade: { dark: 0.05, vignette: 0.45 }, cam: push(T.guilt, T.why, 1.08, 1.18, [1400, 820]), hud: S.sinHud, tin: tr("whip", 0.3) },
  { id: "strong", t0: T.why, clip: "STRESS", src: 18.4, speed: 1, grade: { dark: 0.08, vignette: 0.45 }, cam: push(T.why, T.env, 1.04, 1.12, [1300, 560]), hud: S.strongHud, tin: tr("whip", 0.3) },
  { id: "program", t0: T.env, paint: S.programPaint, tin: tr("slide", 0.45), cam: push(T.env, T.loop, 1.0, 1.04) },
  { id: "loop", t0: T.loop, paint: S.loopPaint, tin: tr("push", 0.45), cam: push(T.loop, T.puppet, 1.0, 1.04) },
  { id: "puppet", t0: T.puppet, paint: S.puppetPaint, tin: tr("slide", 0.45), cam: push(T.puppet, T.two, 1.0, 1.04) },
  // the fix
  { id: "two", t0: T.two, clip: "STRETCH", src: 30.3, speed: 1, grade: { dark: 0.02, vignette: 0.3 }, cam: push(T.two, T.see, 1.0, 1.06, [1300, 540]), hud: S.twoHud, tin: tr("flash", 0.4) },
  { id: "see", t0: T.see, paint: S.seePaint, tin: tr("slide", 0.45), cam: push(T.see, T.blank, 1.0, 1.03) },
  { id: "blank", t0: T.blank, clip: "FIELD", src: 39.2, speed: 1, grade: { dark: 0.03, vignette: 0.3 }, cam: push(T.blank, T.brain, 1.0, 1.07, [1300, 480]), hud: S.blankHud, tin: tr("fade", 0.45) },
  { id: "brain", t0: T.brain, paint: S.brainPaint, tin: tr("slide", 0.45), cam: push(T.brain, T.uneasy, 1.0, 1.03) },
  { id: "uneasy", t0: T.uneasy, clip: "BEDROOM", src: 27.3, speed: "fit", grade: { dark: 0.14, vignette: 0.5 }, cam: push(T.uneasy, T.calm, 1.0, 1.08, [700, 520]), hud: S.uneasyHud, tin: tr("fade", 0.4) },
  { id: "calm", t0: T.calm, clip: "CLIFF", src: 48.85, speed: "fit", grade: { dark: 0.05, vignette: 0.4 }, cam: push(T.calm, T.walk, 1.0, 1.08, [960, 700]), hud: S.calmHud, tin: tr("fade", 0.4) },
  { id: "walk", t0: T.walk, clip: "GRASS", src: 52.6, speed: 1, grade: { dark: 0.02, vignette: 0.3 }, cam: push(T.walk, T.end, 1.0, 1.06, [1300, 600]), hud: S.walkHud, tin: tr("fade", 0.4) },
  { id: "end", t0: T.end, clip: "BEACH", src: 60.1, speed: "fit", grade: { dark: 0.06, vignette: 0.4 }, cam: push(T.end, END, 1.0, 1.06, [960, 640]), hud: S.endHud, tin: tr("fade", 0.5) },
];
export const shots: Shot[] = D.map((d, i) => {
  const t1 = i + 1 < D.length ? D[i + 1].t0 : END;
  const speed = d.speed === "fit" ? fit(d.clip!, d.src!, d.t0, t1) : d.speed;
  return { id: d.id, t0: d.t0, t1, clip: d.clip, src: d.src, speed, cam: d.cam, grade: d.grade, full: d.full, world: d.world, board: d.board, paint: d.paint, hud: d.hud, tin: d.tin };
});

export const overlays: Overlay[] = [
  captionOverlay([[0, T.exp - 0.05]]),
  { id: "endFade", t0: END - 0.8, t1: END + 1, z: 70, paint: (ctx, t) => { ctx.fillStyle = `rgba(0,0,0,${prog(t, END - 0.8, 0.75)})`; ctx.fillRect(0, 0, W, H); } },
];

const STAMP_LAND = 0.19;
export const impacts: Impact[] = [
  { t: 0, flash: 0.55, punch: 0.04, shake: 6 },
  { t: T.zap + 0.05, flash: 0.35, shake: 14, punch: 0.02 },
  { t: T.notIdle, punch: 0.025 },
  { t: T.m15 + 0.05, punch: 0.025 },
  { t: T.btnW + 0.25, shake: 8 },
  { t: T.men + 0.35, shake: 9 }, { t: T.women + 0.3, shake: 7 },
  { t: T.pressed - 0.05 + STAMP_LAND, shake: 10 },
  { t: A("s05", "罪过") - 0.2 + STAMP_LAND, shake: 11 },
  { t: T.program + 0.15, punch: 0.025 },
  { t: T.alarm + 0.05, shake: 8 },
  { t: T.fortify + 0.2, punch: 0.03 },
  { t: T.self + 0.1, punch: 0.02 },
  { t: T.loosen + 0.1, shake: 8 },
  { t: T.active + 0.2, punch: 0.02 },
  { t: T.sky + 0.1, punch: 0.02 },
];

/** Sound-effect cues: `k` names a role in audio.ts; `t` is where the sound's hit (or onset, for swells) lands. */
export const sfx: Array<{ t: number; k: string; g?: number }> = [
  // hook
  { t: 0.0, k: "hitOpen" }, { t: T.zap - 0.02, k: "zap" }, { t: T.zap + 0.05, k: "xHit" },
  { t: T.notIdle, k: "slam" }, { t: T.m15 - 0.2, k: "tickRun" }, { t: T.m15 + 0.05, k: "hit" },
  { t: T.exp - 0.05, k: "page" }, { t: T.year - 0.15, k: "pop" }, { t: T.sci - 0.15, k: "whooshSoft" }, { t: A("s01", "实验") + 0.14, k: "stamp" },
  { t: T.alone - 0.05, k: "whoosh" }, ...[0, 1, 2].map((k) => ({ t: T.nothing + 0.05 + k * 0.17, k: "popSoft" })),
  { t: T.button - 0.05, k: "whoosh" }, { t: T.btnW - 0.1, k: "pop" }, { t: T.btnW + 0.2, k: "zap" },
  { t: T.result - 0.05, k: "whoosh" }, { t: T.result + 0.05, k: "tickerFast" }, { t: T.men + 0.05, k: "zapShort" }, { t: T.women + 0.05, k: "zapShort" },
  { t: T.pressed - 0.05 + STAMP_LAND, k: "stamp" },
  { t: T.you - 0.05, k: "whoosh" }, { t: T.panic, k: "heart" },
  // mechanism
  { t: T.pushed - 0.05, k: "glitch" }, ...[T.school, T.work, T.marry, T.kid, T.family, T.old].map((t0) => ({ t: t0 - 0.1, k: "popSoft" })),
  { t: T.guilt - 0.05, k: "whooshFast" }, { t: A("s05", "罪过") - 0.2 + STAMP_LAND, k: "stampBig" },
  { t: T.why - 0.05, k: "whooshFast" }, { t: A("s06", "天生要强", { end: true }) - 0.05, k: "slash" },
  { t: T.env - 0.05, k: "page" }, { t: A("s06", "环境") - 0.1, k: "install" }, { t: T.program, k: "hit" },
  { t: T.loop - 0.05, k: "whoosh" }, { t: T.idle2 - 0.1, k: "pop" }, { t: T.alarm - 0.05, k: "alarm" }, { t: T.busy - 0.1, k: "pop" }, { t: T.relief - 0.05, k: "exhale" },
  { t: T.each, k: "loopRun" }, { t: T.fortify + 0.05, k: "lock" },
  { t: T.puppet - 0.05, k: "page" }, { t: T.puppet + 0.1, k: "rope" }, { t: T.self - 0.1, k: "hitSoft" }, { t: T.selfEnd + 0.15, k: "crack" },
  // fix
  { t: T.two - 0.05, k: "flashUp" }, { t: T.twoW + 0.15, k: "pop" }, { t: T.twoW + 0.35, k: "pop" },
  { t: T.see - 0.05, k: "page" }, { t: T.seeW - 0.15, k: "sparkle" }, { t: T.loosen - 0.1, k: "crack" }, { t: T.loosen + 0.1, k: "plops" },
  { t: T.blank - 0.05, k: "birds" }, { t: T.afternoon - 0.2, k: "whooshSoft" }, { t: T.sun - 0.1, k: "ding" }, { t: T.daze - 0.1, k: "ding" },
  { t: T.brain - 0.05, k: "page" }, { t: T.dmn - 0.2, k: "riserSoft" }, { t: T.active, k: "hitWarm" },
  { t: T.oldAlarm - 0.15, k: "bellSoft" },
  { t: T.calm - 0.1, k: "waves" },
  { t: T.fearEnd - 0.05, k: "slash" }, { t: T.choose - 0.3, k: "whooshSoft" },
  { t: T.end - 0.1, k: "sea" }, { t: T.right + 0.4, k: "hitWarm" },
];

/** Music: a tense pulse under the experiment (its hardest hit on "三分之二"), a lost, low bed for the mechanism (its beat
 *  drops on "惯性程序"), then a warm, sunny bed from "想找回自在" to the end. `from` is solved so the accents land. */
export const music: Array<{ k: string; t0: number; t1: number; fadeIn: number; fadeOut: number; from?: number; tapeStop?: number; duck?: Array<[number, number, number]> }> = [
  { k: "hook", t0: 0, t1: T.pushed + 0.1, fadeIn: 0, fadeOut: 0.03, tapeStop: 0.5, from: 21.04 - T.third },
  { k: "mech", t0: T.pushed, t1: T.two + 0.3, fadeIn: 0.2, fadeOut: 0.5, from: 44.33 - (T.program - T.pushed) },
  { k: "fix", t0: T.two, t1: END, fadeIn: 0.3, fadeOut: 1.5, from: 2.28 - (T.twoW - T.two) },
];
export const meta = { fps: FPS, end: END };
