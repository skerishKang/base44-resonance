import React from "react";
import {useCurrentFrame, useVideoConfig} from "remotion";
import type {CaptionCue} from "../data/captions";
import {colors, fontFamily} from "./theme";

export const CaptionBand = ({cues}: {cues: CaptionCue[]}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const seconds = frame / fps;
  const cue = cues.find((candidate) => seconds >= candidate.start && seconds < candidate.end);

  if (!cue) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 90,
        right: 90,
        bottom: 38,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: 1540,
          borderRadius: 20,
          background: "rgba(7,17,15,0.92)",
          border: "1px solid rgba(168,230,203,0.42)",
          padding: "16px 28px 18px",
          color: colors.white,
          fontFamily,
          fontSize: 31,
          lineHeight: 1.28,
          fontWeight: 650,
          textAlign: "center",
          boxShadow: "0 14px 40px rgba(0,0,0,0.28)",
        }}
      >
        {cue.text}
      </div>
    </div>
  );
};
