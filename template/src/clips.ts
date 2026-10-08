// The usable stretches of the source footage, in source seconds. Fill this from `npm run scan`: one entry per shot,
// with what it shows and anything to avoid (burned-in subtitles, watermarks, a ghosting dissolve). Shots never cross
// a clip edge: past it they freeze on the last frame.
export const CLIPS = {
  A: [0.0, 3.0], // first shot of the source (placeholder for the template's smoke test)
} as const;
