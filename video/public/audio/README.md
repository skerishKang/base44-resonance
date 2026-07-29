# Narration contract

Final rendering requires:

```text
watchtree-narration.wav
```

Record the exact English narration in `docs/submission/VIDEO_SCRIPT.md`, including deliberate pauses so the WAV is exactly 158 seconds (±1 second accepted by preflight). Recommended source is mono or stereo PCM WAV at 48 kHz. Normalize clean speech during the final audio pass; do not add unlicensed music.

The file is ignored by Git. Preview renders omit it and enforce a silent AAC track; final renders fail closed when it is absent.
