import cues from "./captions.json";

export type CaptionCue = {start: number; end: number; text: string};
export const CAPTION_CUES = cues as CaptionCue[];
