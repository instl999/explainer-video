// Source footage: the clip map, a streaming RGBA frame reader for the full render and single-frame grabs for previews.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createCanvas, ImageData, type Canvas } from "@napi-rs/canvas";
import { FOOTAGE, FPS, H, W } from "./common.ts";
import { ffmpegBin } from "./lib/util.ts";

/** The clip map is per video: src/clips.ts lists the usable stretches of the source (shots never cross a clip edge). */
import { CLIPS } from "./clips.ts";
export { CLIPS };
export type ClipId = keyof typeof CLIPS;
const FRAME = W * H * 4;

export class FrameReader {
  private proc: ChildProcess;
  private queue: Buffer[] = [];
  private partial = Buffer.allocUnsafe(FRAME);
  private fill = 0;
  private ended = false;
  private waiters: Array<() => void> = [];
  private index = -1;
  private last: Buffer | null = null;
  private err = "";
  /** Decodes [a, b] seconds of the source at `speed`, as frame j = source time a + j * speed / FPS. */
  constructor(a: number, b: number, speed: number, vf = "") {
    const filters = [`setpts=(PTS-STARTPTS)/${speed}`, `fps=${FPS}`, "scale=1920:1080:flags=bicubic", vf, "format=rgba"].filter(Boolean).join(",");
    this.proc = spawn(ffmpegBin("ffmpeg"), ["-v", "error", "-ss", a.toFixed(3), "-t", (b - a + 0.1).toFixed(3), "-i", FOOTAGE, "-an", "-vf", filters, "-f", "rawvideo", "-"],
      { stdio: ["ignore", "pipe", "pipe"] });
    this.proc.stderr!.on("data", (d) => { this.err += String(d); });
    this.proc.stdout!.on("data", (chunk: Buffer) => {
      let off = 0;
      while (off < chunk.length) {
        const n = Math.min(chunk.length - off, FRAME - this.fill);
        chunk.copy(this.partial, this.fill, off, off + n); this.fill += n; off += n;
        if (this.fill === FRAME) { this.queue.push(this.partial); this.partial = Buffer.allocUnsafe(FRAME); this.fill = 0; }
      }
      if (this.queue.length > 6) this.proc.stdout!.pause();
      this.wake();
    });
    this.proc.stdout!.on("end", () => { this.ended = true; this.wake(); });
  }
  private wake() { const w = this.waiters; this.waiters = []; for (const f of w) f(); }
  /** Frame j (non-decreasing between calls); past the end of the stream it keeps returning the last frame. */
  async frame(j: number): Promise<Buffer> {
    while (this.index < j) {
      if (this.queue.length) { this.last = this.queue.shift()!; this.index++; if (this.queue.length < 3) this.proc.stdout!.resume(); continue; }
      if (this.ended) break;
      await new Promise<void>((ok) => this.waiters.push(ok));
    }
    if (!this.last) throw new Error(`footage decode produced no frames: ${this.err.slice(0, 300)}`);
    return this.last;
  }
  /** Stop decoding. ffmpeg 7 ignores SIGTERM while its muxer thread is blocked writing into the paused pipe, and the
   *  open pipe then keeps this Node process alive forever; closing our end first makes that write fail at once. */
  close() { if (!this.ended) { this.proc.stdout!.destroy(); this.proc.kill("SIGKILL"); } }
}

const grabCache = new Map<string, Buffer>();
/** One RGBA frame at source time `s` (preview renders). */
export function grab(s: number, vf = ""): Buffer {
  const key = `${s.toFixed(3)}|${vf}`;
  const hit = grabCache.get(key); if (hit) return hit;
  const filters = ["scale=1920:1080:flags=bicubic", vf, "format=rgba"].filter(Boolean).join(",");
  const r = spawnSync(ffmpegBin("ffmpeg"), ["-v", "error", "-ss", s.toFixed(3), "-i", FOOTAGE, "-frames:v", "1", "-an", "-vf", filters, "-f", "rawvideo", "-"], { maxBuffer: FRAME * 2 });
  const buf = r.stdout as Buffer;
  if (!buf || buf.length < FRAME) throw new Error(`grab ${s}: ${String(r.stderr).slice(0, 300)}`);
  const out = buf.subarray(0, FRAME);
  grabCache.set(key, out);
  return out;
}

const stillCache = new Map<string, Canvas>();
/** A source frame at time `s` as a canvas `w` px wide (photos pinned on boards). */
export function still(s: number, w = 960): Canvas {
  const key = `${s.toFixed(3)}|${w}`;
  const hit = stillCache.get(key); if (hit) return hit;
  const img = new ImageData(W, H); img.data.set(grab(s));
  const full = createCanvas(W, H); full.getContext("2d").putImageData(img, 0, 0);
  const c = createCanvas(w, Math.round((w * H) / W)), x = c.getContext("2d");
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high"; x.drawImage(full, 0, 0, c.width, c.height);
  stillCache.set(key, c);
  return c;
}
