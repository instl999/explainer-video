// Sound-effect roles, shared by every video. `file` is relative to SFX_DIR (the 布斯的音效库 folder). A cue in timeline.ts
// names a role and a time `t`: with align "peak" the loudest 10 ms of the (sliced) file lands on t (hits, whooshes,
// stamps); with "onset" the first audible moment does (swells, beds, clicks). `peak` is the level in dBFS of the sound's
// sample peak before the speech duck; a cue may add `g` dB. Long files need a `slice` [from, to] in file seconds and a
// `fade` (s) on the tail. Add video-specific roles in timeline.ts (`export const roles = {...}`); measure new files with
// tools/sfxinfo.ts first. Levels were tuned so the voice stays ≥14 dB over the background in a hook.
export type Role = { file: string; align: "onset" | "peak"; peak: number; slice?: [number, number]; fade?: number };

export const SFX_ROLES: Record<string, Role> = {
  // ---- impacts (frame 0, crossings-out, stamps, reveals)
  hitOpen: { file: "击打-Hits/04 Definitive Hit.wav", align: "onset", peak: -13, slice: [0, 1.1], fade: 0.75 },   // frame-0 boom
  xHit: { file: "击打-Hits/02 Bold Hit.wav", align: "peak", peak: -11, slice: [0, 1.0], fade: 0.65 },             // a red ✗ lands
  darkHit: { file: "击打-Hits/04 Dark Truth.mp3", align: "peak", peak: -10, slice: [0, 1.5], fade: 0.8 },          // twist word
  stamp: { file: "击打-Hits/05 Solid Hit.mp3", align: "peak", peak: -16.5 },                                       // rubber stamp
  stampBig: { file: "击打-Hits/05 Solid Hit.mp3", align: "peak", peak: -14 },
  hit: { file: "击打-Hits/05 Subtle Hit.wav", align: "onset", peak: -13 },
  hitSoft: { file: "击打-Hits/05 Subtle Hit.wav", align: "onset", peak: -18 },
  hitWarm: { file: "击打-Hits/16 Piano Stab.mp3", align: "onset", peak: -15 },                                     // warm payoff / end title
  boom: { file: "击打-Hits/19 Sub Drop.mp3", align: "onset", peak: -10 },                                          // big number lands
  slam: { file: "环境音效/字幕音效48-嘭.WAV", align: "onset", peak: -21 },                                         // kinetic text slams in
  tagSnap: { file: "击打-Hits/18 Clicker A.wav", align: "peak", peak: -20 },                                       // label snaps on
  // ---- movement and transitions
  whoosh: { file: "转场音效-whooosh/16 Quick Whoosh B.mp3", align: "peak", peak: -16 },
  whooshFast: { file: "转场音效-whooosh/13 Fast Whoosh A.mp3", align: "peak", peak: -16 },
  whooshSoft: { file: "转场音效-whooosh/弱whoosh2.wav", align: "peak", peak: -21 },
  dive: { file: "转场音效-whooosh/01 Deep Whoosh A.mp3", align: "peak", peak: -14 },                                // camera dives through
  drain: { file: "转场音效-whooosh/10 Drop Whoosh.wav", align: "peak", peak: -18 },                                 // something drains away
  glitch: { file: "信号干扰故障音效/04 Fat Glitch.mp3", align: "onset", peak: -15, slice: [0.55, 1.0], fade: 0.12 },
  flashUp: { file: "环境音效/闪白音效05.wav", align: "peak", peak: -17 },                                          // white flash / turn to hope
  riserShort: { file: "上升 Risers/02 Close Riser.wav", align: "peak", peak: -21, slice: [5.9, 7.45], fade: 0.12 },// 1.5 s build into a hit
  riserSoft: { file: "上升 Risers/18 Pad Riser A.wav", align: "peak", peak: -24, slice: [6.4, 8.7], fade: 0.2 },
  magic: { file: "环境音效/光魔法.mp3", align: "onset", peak: -25, slice: [0.0, 1.9], fade: 0.7 },                 // shimmer (玄学, wonder)
  sparkle: { file: "环境音效/光魔法神圣感.mp3", align: "onset", peak: -20, slice: [0.0, 1.8], fade: 0.6 },          // the "after" reveal
  // ---- UI / paper
  pop: { file: "胶片老电影音效包/dpd_开关按钮切换-3.mp3", align: "peak", peak: -21 },                                // a card / pill pops
  popSoft: { file: "胶片老电影音效包/dpd_开关按钮切换-3.mp3", align: "peak", peak: -26 },
  plops: { file: "信号干扰故障音效/26 Fast Pops.mp3", align: "onset", peak: -20, slice: [0.0, 1.1], fade: 0.3 },     // many items land
  lock: { file: "胶片老电影音效包/dpd_开关按钮切换-0.mp3", align: "peak", peak: -12 },                              // click / lock
  switch: { file: "环境音效/拉式开灯.wav", align: "peak", peak: -16 },
  page: { file: "环境音效/翻页.mp3", align: "peak", peak: -18 },                                                   // board slides in
  flip: { file: "环境音效/翻书1.wav", align: "onset", peak: -17 },
  book: { file: "环境音效/翻书.mp3", align: "onset", peak: -18, slice: [0.42, 1.4], fade: 0.25 },
  scribble: { file: "环境音效/粉笔书写.mp3", align: "onset", peak: -22, slice: [0.3, 0.75], fade: 0.1 },             // ink ring / marker
  slash: { file: "特效音效/武士刀.wav", align: "peak", peak: -18 },                                                // strike-through
  ding: { file: "环境音效/叮.mp3", align: "onset", peak: -19 },                                                    // tick ✓ / insight
  chime: { file: "综艺音效/叮咚.mp3", align: "onset", peak: -20 },
  type: { file: "环境音效/手机打字音typing-iphone.mp3", align: "onset", peak: -17, slice: [0.08, 0.62], fade: 0.06 }, // comment box typing
  send: { file: "环境音效/iPhone发送音.wav", align: "onset", peak: -15 },
  shutter: { file: "环境音效/相机咔嚓声.mp3", align: "peak", peak: -20 },                                           // photo pinned
  // ---- counters and machines
  tickerFast: { file: "信号干扰故障音效/29 Ticker Fast.mp3", align: "onset", peak: -25, slice: [0.05, 0.75], fade: 0.2 }, // count-up
  printer: { file: "信号干扰故障音效/28 Ticker.mp3", align: "onset", peak: -24, slice: [0.0, 1.15], fade: 0.15 },     // receipt prints
  install: { file: "信号干扰故障音效/27 Ticker Ramp.mp3", align: "onset", peak: -24, fade: 0.3 },                      // progress bar
  tickRun: { file: "环境音效/时钟滴答.mp3", align: "onset", peak: -24, slice: [0.0, 1.6], fade: 0.4 },                 // clock ticking
  gears: { file: "信号干扰故障音效/32 Old Clock.mp3", align: "onset", peak: -21, slice: [0.0, 1.7], fade: 0.4 },
  wheel: { file: "胶片老电影音效包/dpd_放映机1.mp3", align: "onset", peak: -24, slice: [0.5, 3.4], fade: 0.8 },         // something spinning
  loopRun: { file: "胶片老电影音效包/dpd_放映机1.mp3", align: "onset", peak: -25, slice: [0.5, 3.4], fade: 0.6 },
  press: { file: "环境音效/电影放映机-快速.mp3", align: "onset", peak: -23, slice: [0.5, 2.2], fade: 0.5 },            // money press
  // ---- money
  coin: { file: "特效音效/亮铃.wav", align: "onset", peak: -22, slice: [0.0, 1.4], fade: 0.6 },
  coins: { file: "信号干扰故障音效/24 Fast Clicks High.mp3", align: "onset", peak: -21, slice: [0.0, 1.0], fade: 0.25 },
  coinsFast: { file: "信号干扰故障音效/22 Exp Clicks.mp3", align: "onset", peak: -22, slice: [0.0, 0.95], fade: 0.25 },
  // ---- objects and bodies
  drawer: { file: "环境音效/拉动声.wav", align: "onset", peak: -15 },
  drop: { file: "环境音效/放下东西.m4a", align: "peak", peak: -16, slice: [3.86, 4.5], fade: 0.15 },                 // item drops in a bin
  hanger: { file: "环境音效/衣物摩擦-mcs070518_爱给网_aigei_com.wav", align: "onset", peak: -18 },
  rope: { file: "环境音效/吱呀.mp3", align: "peak", peak: -16 },                                                   // creak / strings
  ice: { file: "大势所趋，一往无前TVC视频音效库/冰块破碎_爱给网_aigei_com.wav", align: "onset", peak: -18, slice: [0.0, 1.2], fade: 0.4 },
  crack: { file: "大势所趋，一往无前TVC视频音效库/冰块破碎_爱给网_aigei_com.wav", align: "onset", peak: -18, slice: [0.0, 1.0], fade: 0.35 },
  canOpen: { file: "美食音效/汽水瓶的声音.mp3", align: "onset", peak: -17, slice: [0.35, 1.1], fade: 0.25 },
  sand: { file: "环境音效/沙子倒出.mp3", align: "onset", peak: -23, slice: [0.0, 1.8], fade: 0.6 },                  // hourglass
  cold: { file: "转场音效-whooosh/04 Exhale Short.mp3", align: "onset", peak: -21, slice: [0.0, 1.5], fade: 0.6 },
  exhale: { file: "转场音效-whooosh/03 Exhale Long.mp3", align: "onset", peak: -21, slice: [0.0, 1.8], fade: 0.6 },   // relief
  heart: { file: "环境音效/心跳.mp3", align: "onset", peak: -19, slice: [1.0, 3.6], fade: 0.6 },
  zap: { file: "环境音效/电子滋滋滋.wav", align: "onset", peak: -16, fade: 0.15 },
  zapShort: { file: "环境音效/电流声.mp3", align: "onset", peak: -21, slice: [0.0, 0.5], fade: 0.15 },
  alarm: { file: "环境音效/警报声.wav", align: "onset", peak: -20, slice: [0.0, 1.0], fade: 0.3 },
  bellSoft: { file: "环境音效/铃铛声.wav", align: "onset", peak: -22, fade: 0.4 },
  // ---- ambience under a shot (keep low)
  birds: { file: "环境音效/微风（鸟叫）.mp3", align: "onset", peak: -27, slice: [0.0, 5.5], fade: 1.5 },
  waves: { file: "环境音效/海浪拍打岩石.mp3", align: "onset", peak: -24, slice: [2.0, 6.0], fade: 1.2 },
  sea: { file: "环境音效/海浪-平静.wav", align: "onset", peak: -26, slice: [0.0, 6.0], fade: 2.0 },
};
