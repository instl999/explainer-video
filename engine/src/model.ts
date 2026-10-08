// The edit model shared by the timeline and the renderer: shots (footage or paper board), transitions centred on cuts,
// a camera keyed in world pixels, screen overlays, and impacts (shake / punch / flash) on story beats.
import type { Canvas } from "@napi-rs/canvas";
import type { Ctx } from "./draw.ts";
import type { ClipId } from "./footage.ts";
import { E, H, W, clamp, lerp } from "./common.ts";

export type TransKind = "cut" | "whip" | "push" | "zoom" | "fade" | "dip" | "flash" | "glitch" | "slide";
export interface Trans { kind: TransKind; d: number; dir?: 1 | -1; color?: string }
/** Camera key: at time t show the world rect centred on (x, y) at scale s (≥ 1 for footage). */
export interface CamKey { t: number; s: number; x: number; y: number; ease?: "inOut" | "out" | "in" | "linear" }
export interface Grade { dark?: number; sat?: number; tint?: string; tintA?: number; blur?: number; vignette?: number; bright?: number }
export interface PaintArgs { t: number; shot: Shot; foot: Canvas | null }
export interface Shot {
  id: string; t0: number; t1: number;
  clip?: ClipId; src?: number; speed?: number;
  /** Footage drawn full-frame through the camera (default when a clip is set); false hands the frame to `paint`. */
  full?: boolean;
  board?: { grid?: boolean; tone?: string };
  world?: [number, number];
  cam?: CamKey[];
  grade?: Grade;
  paint?: (ctx: Ctx, a: PaintArgs) => void;   // world space (moves with the camera)
  hud?: (ctx: Ctx, a: PaintArgs) => void;     // shot screen space (travels with the shot through transitions)
  tin?: Trans;
}
export interface Overlay { id: string; t0: number; t1: number; z?: number; paint: (ctx: Ctx, t: number) => void }
export interface Impact { t: number; shake?: number; punch?: number; flash?: number; dur?: number }

const EASES = { inOut: E.inOut, out: E.out, in: E.in, linear: (u: number) => u };
export function camAt(keys: CamKey[] | undefined, t: number, world: [number, number] = [W, H]): { s: number; x: number; y: number } {
  if (!keys || !keys.length) return { s: 1, x: world[0] / 2, y: world[1] / 2 };
  let k = { s: keys[0].s, x: keys[0].x, y: keys[0].y };
  if (t >= keys[keys.length - 1].t) k = { ...keys[keys.length - 1] };
  else for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t >= a.t && t < b.t) { const u = EASES[b.ease ?? "inOut"](clamp((t - a.t) / (b.t - a.t))); k = { s: lerp(a.s, b.s, u), x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) }; break; }
  }
  const hw = W / (2 * k.s), hh = H / (2 * k.s);
  return { s: k.s, x: clamp(k.x, hw, world[0] - hw), y: clamp(k.y, hh, world[1] - hh) };
}
export function applyCam(ctx: Ctx, c: { s: number; x: number; y: number }) {
  ctx.translate(W / 2, H / 2); ctx.scale(c.s, c.s); ctx.translate(-c.x, -c.y);
}
/** Slow push-in helper: from scale s0 at t0 to s1 at t1 around a focus that drifts from f0 to f1 (world px). */
export const push = (t0: number, t1: number, s0: number, s1: number, f0: [number, number] = [W / 2, H / 2], f1: [number, number] = f0, ease: CamKey["ease"] = "linear"): CamKey[] =>
  [{ t: t0, s: s0, x: f0[0], y: f0[1] }, { t: t1, s: s1, x: f1[0], y: f1[1], ease }];
