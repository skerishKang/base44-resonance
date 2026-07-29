import React from "react";
import {interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {colors, fontFamily} from "./theme";

export const TitleCard = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const entrance = spring({frame, fps, config: {damping: 18, stiffness: 90}});
  const opacity = interpolate(frame, [0, 16], [0, 1], {extrapolateRight: "clamp"});

  return (
    <div
      style={{
        transform: `translateY(${(1 - entrance) * 42}px)`,
        opacity,
        color: colors.cream,
        fontFamily,
      }}
    >
      <div style={{fontSize: 24, letterSpacing: "0.18em", color: colors.mint, fontWeight: 800}}>
        WATCHTREE BY RESONANCE
      </div>
      <div style={{fontSize: 92, lineHeight: 0.98, letterSpacing: "-0.055em", fontWeight: 880, marginTop: 24}}>
        A private tree of
        <br />
        what held your attention.
      </div>
      <p style={{fontSize: 29, lineHeight: 1.45, maxWidth: 860, color: "rgba(244,240,230,0.78)", marginTop: 30}}>
        Deliberate links in. Explainable, synthetic matches out.
      </p>
    </div>
  );
};
