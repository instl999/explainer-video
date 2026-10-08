# Volcano Ark Agent Plan · TTS 2.0 facts (verified in use, 2026-09/10)

- Endpoint: `POST https://openspeech.bytedance.com/api/v3/plan/tts/unidirectional`
- Headers: `X-Api-Key: <ARK_API_KEY>`, `X-Api-Resource-Id: seed-tts-2.0` (for `*_uranus_*` voices),
  `X-Api-Request-Id: <uuid>`, `X-Control-Require-Usage-Tokens-Return: text_words`, `Content-Type: application/json`.
- Body: `{ user: {uid}, req_params: { text, speaker, audio_params: { format: "pcm", sample_rate: 48000,
  speech_rate: <−50…100>, enable_subtitle: true }, additions: JSON.stringify({ section_id, silence_duration,
  context_texts: [<style instruction>] }) } }`.
- Response: a stream of JSON objects (optionally SSE-wrapped); base64 PCM in `data`; ends with code 20000000.
- Character timestamps come back **only** with `audio_params.enable_subtitle: true` (enable_timestamp returns nothing):
  `sentence.words[{word, startTime, endTime}]` in seconds; punctuation is glued to the previous character.
- `speech_rate`: 0 = normal, 100 = 2.0×, −50 = 0.5×. 解说小明 2.0 at 10 ≈ 5.5 字/s.
- `context_texts` (the line's `instruction`) steers tone and emphasis ("重读'三分之二'", "语速很快，一口气说完").
- One request per line keeps natural prosody; the engine caches each request by hash (CACHE_DIR), ledgers cost in
  `out/cost.json` (1350 AFP per 10k characters; 1 AFP = ¥0.002 → ≈ ¥0.1 per minute of narration).
- Voices (2.0): 解说小明 `zh_male_jieshuoxiaoming_uranus_bigtts` (default, 轻快解说), 磁性解说男声
  `zh_male_cixingjieshuonan_uranus_bigtts`, 悬疑解说 `zh_male_xuanyijieshuo_uranus_bigtts`, 广告解说
  `zh_male_guanggaojieshuo_uranus_bigtts`. Use the one the user names.
- Errors: HTTP 400 `InvalidSubscription` "does not have a valid AgentPlan subscription" = the plan lapsed (user renews;
  never attempt payment). Retries: 3 with back-off.
- The same key also serves Agent Plan chat (`/api/plan/v3/chat/completions`) and Seedream images
  (`/api/plan/v3/images/generations`, ≥ 3,686,400 px), not used by this pipeline.
