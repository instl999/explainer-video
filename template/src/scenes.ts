// Scene painters for this video. Every beat is keyed to a spoken phrase with A(line, phrase) (video time of its first
// character; { end: true } for its last) and ct(line, phrase) (one time per character, for voice-synced type).
// `paint` draws in world space (follows the camera; use it for rings/callouts on footage and for paper boards);
// `hud` draws in screen space (titles over footage). Shared helpers: ./kit.ts; reusable props: ./props.ts;
// worked examples of every technique: the skill's examples/*/scenes.ts.
import { A, C, E, H, W, clamp, prog } from "./common.ts";
import { card, countUp, inkPath, marker, measure, ring, stamp, strike, text, type Ctx } from "./draw.ts";
import { INK, WT, ct, cutAt, foot, leftShade, pill, popS, say, sayC, xMark } from "./kit.ts";
import { coinFace } from "./props.ts";
import type { PaintArgs } from "./model.ts";

// ---------- anchors ----------
export const T = {
  hook: A("s00"), hookEnd: A("s00", "抓住人", { end: true }),
  board: cutAt("s01"), pic: A("s01", "一张图"), clear: A("s01", "讲清楚"),
};

// ---------- hook: kinetic type over footage ----------
export function hookHud(ctx: Ctx, { t }: PaintArgs) {
  leftShade(ctx, 0.7, 0.62);
  say(ctx, "第一句是钩子", 160, 520, WT(150), ct("s00", "第一句是钩子"), t);
  say(ctx, "第一秒抓住人", 160, 700, { ...WT(110), color: C.marker }, ct("s00", "第一秒抓住人"), t);
  xMark(ctx, 1500, 420, 120, t, T.hookEnd - 0.1, { width: 22 });
}

// ---------- board: the explanation drawn on paper ----------
export function boardPaint(ctx: Ctx, { t }: PaintArgs) {
  pill(ctx, "原理", 160, 160, t, T.board + 0.05, { size: 44, bg: C.ink });
  sayC(ctx, "用一张图讲清楚", W / 2, 420, INK(120), ct("s01", "第二句用一张图").slice(3).concat(ct("s01", "讲清楚")), t);
  const u = popS(t, T.pic, 0.35);
  if (u.u > 0) { ctx.save(); ctx.globalAlpha *= u.a; ctx.translate(W / 2, 680); ctx.scale(u.s, u.s); coinFace(ctx, 0, 0, 110); ctx.restore(); }
  stamp(ctx, "清楚", 1450, 700, t, T.clear + 0.1, { size: 110, rot: -0.12 });
  foot(ctx, "脚注：数字和出处写在这里", 160, 960, t, T.clear);
}
