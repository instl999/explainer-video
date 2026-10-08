// The cut: shots, overlays, impacts, sound-effect cues, music beds (and any extra sound roles), all keyed to the narration.
import { FPS, H, VOICE_END, W, clamp, prog } from "./common.ts";
import { CLIPS, type ClipId } from "./footage.ts";
import { push, type Impact, type Overlay, type Shot, type Trans } from "./model.ts";
import { captionOverlay } from "./captions.ts";
import type { Role } from "./sfx-roles.ts";
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
// Each shot runs from its t0 to the next shot's t0. A transition `tin` is centred on the cut; half of it must fit in
// both neighbouring shots. Board shots (no clip) draw paper; `world: [2 * W, H]` + camera keys make a two-panel board.
const D: Draft[] = [
  { id: "hook", t0: 0, clip: "A", src: 0, speed: "fit", grade: { dark: 0.1, vignette: 0.5 }, cam: push(0, T.board, 1.04, 1.14), hud: S.hookHud },
  { id: "board", t0: T.board, paint: S.boardPaint, tin: tr("slide", 0.45), cam: push(T.board, 99, 1.0, 1.04) },
];
export const shots: Shot[] = D.map((d, i) => {
  const t1 = i + 1 < D.length ? D[i + 1].t0 : END;
  const speed = d.speed === "fit" ? fit(d.clip!, d.src!, d.t0, t1) : d.speed;
  return { id: d.id, t0: d.t0, t1, clip: d.clip, src: d.src, speed, cam: d.cam, grade: d.grade, full: d.full, world: d.world, board: d.board, paint: d.paint, hud: d.hud, tin: d.tin };
});

export const overlays: Overlay[] = [
  captionOverlay([[0, T.board - 0.05]]),   // hide burned-in captions where big kinetic type already says the words
  { id: "endFade", t0: END - 0.8, t1: END + 1, z: 70, paint: (ctx, t) => { ctx.fillStyle = `rgba(0,0,0,${prog(t, END - 0.8, 0.75)})`; ctx.fillRect(0, 0, W, H); } },
];

const STAMP_LAND = 0.19;   // a stamp started at t0 lands at t0 + 0.19
export const impacts: Impact[] = [
  { t: 0, flash: 0.55, punch: 0.04, shake: 6 },   // frame 0 always hits
  { t: T.hookEnd, shake: 10 },
  { t: T.clear + 0.1 + STAMP_LAND, shake: 9 },
];

/** Sound-effect cues: `k` names a role in sfx-roles.ts (or `roles` below); `t` is where its hit (or onset) lands. */
export const sfx: Array<{ t: number; k: string; g?: number }> = [
  { t: 0, k: "hitOpen" }, { t: T.hook - 0.15, k: "slam" }, { t: T.hookEnd - 0.05, k: "xHit" },
  { t: T.board - 0.05, k: "page" }, { t: T.pic, k: "pop" }, { t: T.clear + 0.1 + STAMP_LAND, k: "stamp" },
];
/** Video-specific roles, merged over the shared catalogue. */
export const roles: Record<string, Role> = {};

/** Music beds: `file` in BGM_DIR, `level` (dB, the louder quarter of the used stretch), `from` = entry point in the
 *  track, solved so a measured accent (tools/onsets.ts) lands on a word: from = accent - (wordTime - t0). */
export const music: Array<{ k: string; file: string; level: number; t0: number; t1: number; fadeIn: number; fadeOut: number; from?: number; tapeStop?: number; duck?: Array<[number, number, number]> }> = [
  { k: "main", file: "解释Secret Room - Soundroll.mp3", level: -26, t0: 0, t1: END, fadeIn: 0, fadeOut: 1.2 },
];
export const meta = { fps: FPS, end: END };
