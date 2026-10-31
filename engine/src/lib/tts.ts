// TTS 2.0 client (Doubao Speech Synthesis 2.0 by default, or Agent Plan; see config.ts ttsAuth): V3 HTTP unidirectional,
// chunked/SSE stream, PCM audio plus per-character subtitle timestamps.
import crypto from "node:crypto";
import { CONFIG, type TtsAuth } from "./config.ts";

export interface TtsWord { word: string; startTime: number; endTime: number }
export interface TtsRequest { text: string; speaker: string; rate: number; instruction?: string; sectionId: string; pauseMs: number; sampleRate: number }
export interface TtsResult { pcm: Buffer; words: TtsWord[]; billed: number }

/** The body is a stream of JSON objects, optionally wrapped as SSE ("event:" / "data:" lines). */
function splitJsonObjects(text: string): unknown[] {
  const s = text.split(/\r?\n/).filter((l) => !l.startsWith("event:")).map((l) => (l.startsWith("data:") ? l.slice(5).trim() : l)).join("\n");
  const out: unknown[] = [];
  let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === "{") { if (depth++ === 0) start = i; }
    else if (c === "}" && --depth === 0) out.push(JSON.parse(s.slice(start, i + 1)));
  }
  return out;
}

function collectWords(obj: unknown, out: TtsWord[]) {
  if (Array.isArray(obj)) { obj.forEach((v) => collectWords(v, out)); return; }
  if (!obj || typeof obj !== "object") return;
  const o = obj as Record<string, unknown>;
  if (Array.isArray(o.words) && o.words.length && typeof (o.words[0] as TtsWord).startTime === "number") out.push(...(o.words as TtsWord[]));
  for (const [k, v] of Object.entries(o)) if (k !== "words") collectWords(v, out);
}

export async function synthesize(auth: TtsAuth, r: TtsRequest, attempts = 3): Promise<TtsResult> {
  const body = {
    user: { uid: "explainer-video" },
    req_params: {
      text: r.text, speaker: r.speaker,
      audio_params: { format: "pcm", sample_rate: r.sampleRate, speech_rate: r.rate, enable_subtitle: true },
      additions: JSON.stringify({ section_id: r.sectionId, silence_duration: r.pauseMs, ...(r.instruction ? { context_texts: [r.instruction] } : {}) }),
    },
  };
  let last: unknown;
  for (let a = 0; a < attempts; a++) {
    try {
      const res = await fetch(auth.url, { method: "POST", headers: { ...auth.headers, "X-Api-Resource-Id": CONFIG.ttsResource, "X-Api-Request-Id": crypto.randomUUID(),
        "X-Control-Require-Usage-Tokens-Return": "text_words", "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const raw = await res.text();
      if (!res.ok) throw new Error(`TTS HTTP ${res.status}: ${raw.slice(0, 200)}`);
      const pcm: Buffer[] = [], words: TtsWord[] = [];
      let billed = 0;
      for (const obj of splitJsonObjects(raw) as Array<Record<string, unknown>>) {
        const code = obj.code as number | undefined;
        if (code !== undefined && code !== 0 && code !== 20000000) throw new Error(`TTS error ${code}: ${String(obj.message).slice(0, 200)}`);
        if (typeof obj.data === "string" && obj.data) pcm.push(Buffer.from(obj.data, "base64"));
        collectWords(obj, words);
        const usage = obj.usage as { text_words?: number } | undefined;
        if (usage?.text_words) billed = usage.text_words;
      }
      if (!pcm.length) throw new Error("TTS returned no audio");
      return { pcm: Buffer.concat(pcm), words, billed };
    } catch (e) { last = e; if (a + 1 < attempts) await new Promise((ok) => setTimeout(ok, 1500 * (a + 1))); }
  }
  throw last;
}
