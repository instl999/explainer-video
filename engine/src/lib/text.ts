// Chinese text normalisation (display → spoken, with a span map back to the display text), the punctuation set, and the
// LCS aligner that carries TTS character timestamps back onto the spoken text.

const DIGITS = "零一二三四五六七八九", UNITS = ["", "十", "百", "千"], SECTIONS = ["", "万", "亿", "万亿"];
const MEASURE = "个次种天位张条只件本家名台辆岁块层步点分秒倍万千百亿元";
export const PUNCT = new Set([..."，。、！？；：“”‘’（）《》「」『』—…,.!?;:()\"' 　"]);
export type Span = [number, number, number, number];   // display[d0:d1] is read as spoken[s0:s1]

function four(n: number): string {
  let out = "", zero = false;
  for (let i = 3; i >= 0; i--) {
    const d = Math.floor(n / 10 ** i) % 10;
    if (d === 0) zero = out.length > 0;
    else { if (zero) { out += "零"; zero = false; } out += DIGITS[d] + UNITS[i]; }
  }
  return out;
}
export function cardinal(n: number): string {
  if (n === 0) return "零";
  const parts: string[] = [];
  let i = 0, needZero = false;
  while (n > 0) {
    const sec = n % 10000;
    if (sec) { let s = four(sec) + SECTIONS[i]; if (needZero) s += "零"; parts.push(s); needZero = sec < 1000; }
    else if (parts.length) needZero = true;
    n = Math.floor(n / 10000); i++;
  }
  let text = parts.reverse().join("").replace(/零+$/, "");
  if (text.startsWith("一十")) text = text.slice(1);
  if (/^二[百千万亿]/.test(text)) text = "两" + text.slice(1);
  return text;
}
const digitString = (s: string) => [...s].map((c) => DIGITS[Number(c)]).join("");
const decimal = (s: string) => { const [w, f] = s.split("."); return cardinal(Number(w)) + (f ? "点" + digitString(f) : ""); };
const twoAsLiang = (spoken: string, next: string) => (spoken === "二" && next && MEASURE.includes(next) ? "两" : spoken);

type Rule = [RegExp, (m: RegExpExecArray, next: string) => string];
const RULES: Rule[] = [
  [/(\d{4})(?=年)/y, (m) => digitString(m[1])],
  [/(\d+(?:\.\d+)?)%/y, (m) => "百分之" + decimal(m[1])],
  [/\d+\.\d+/y, (m) => decimal(m[0])],
  [/\d+/y, (m, next) => twoAsLiang(cardinal(Number(m[0])), next)],
];

export function normalize(display: string, lexicon: Record<string, string> = {}): { spoken: string; spans: Span[] } {
  const spoken: string[] = [], spans: Span[] = [];
  const lex = Object.entries(lexicon).sort((a, b) => b[0].length - a[0].length);
  let i = 0, s0 = 0;
  const push = (d1: number, text: string) => { spans.push([i, d1, s0, s0 + text.length]); spoken.push(text); s0 += text.length; i = d1; };
  while (i < display.length) {
    const hit = lex.find(([k]) => display.startsWith(k, i));
    if (hit) { push(i + hit[0].length, hit[1]); continue; }
    let matched = false;
    for (const [rx, fn] of RULES) {
      rx.lastIndex = i;
      const m = rx.exec(display);
      if (m) { const end = i + m[0].length; push(end, fn(m, display[end] ?? "")); matched = true; break; }
    }
    if (!matched) push(i + 1, display[i]);
  }
  return { spoken: spoken.join(""), spans };
}

/** LCS alignment of spoken characters to timed characters; equal-length gaps between matches pair up positionally. */
export function alignSpoken(spoken: string, timed: Array<[string, number, number]>) {
  const sp = [...spoken].map((c, i) => [i, c] as const).filter(([, c]) => !PUNCT.has(c));
  const a = sp.map(([, c]) => c.toLowerCase()), b = timed.map(([c]) => c.toLowerCase());
  const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const pairs: Array<[number, number]> = [];
  for (let i = 0, j = 0; i < n && j < m; ) { if (a[i] === b[j]) { pairs.push([i, j]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
  const times = new Map<number, [number, number]>();
  let pi = -1, pj = -1;
  for (const [i, j] of [...pairs, [n, m] as [number, number]]) {
    if (i - pi === j - pj) for (let k = 1; k < i - pi; k++) times.set(sp[pi + k][0], [timed[pj + k][1], timed[pj + k][2]]);
    if (i < n) times.set(sp[i][0], [timed[j][1], timed[j][2]]);
    pi = i; pj = j;
  }
  return { times, coverage: times.size / Math.max(1, n) };
}
