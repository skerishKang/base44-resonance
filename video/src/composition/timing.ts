import timeline from "../data/timeline.json";
import type {TruthStatus} from "../data/assets";

export const COMPOSITION_ID = timeline.compositionId;
export const WIDTH = timeline.width;
export const HEIGHT = timeline.height;
export const FPS = timeline.fps;
export const DURATION_SECONDS = timeline.durationSeconds;
export const DURATION_IN_FRAMES = DURATION_SECONDS * FPS;

export type SceneTiming = {
  id: string;
  number: number;
  start: number;
  duration: number;
  startFrame: number;
  durationInFrames: number;
  label: string;
  assetId: string | null;
  truthStatus: TruthStatus;
};

export const SCENES: SceneTiming[] = timeline.scenes.map((scene) => ({
  ...scene,
  truthStatus: scene.truthStatus as TruthStatus,
  startFrame: scene.start * FPS,
  durationInFrames: scene.duration * FPS,
}));

const computedDuration = SCENES.reduce(
  (latest, scene) => Math.max(latest, scene.start + scene.duration),
  0,
);

if (computedDuration !== DURATION_SECONDS) {
  throw new Error(
    `Timeline mismatch: scenes end at ${computedDuration}s, composition is ${DURATION_SECONDS}s`,
  );
}
