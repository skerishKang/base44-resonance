import React from "react";
import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {ClosingCard} from "../components/ClosingCard";

export const CloseScene = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], {extrapolateRight: "clamp"});
  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 50% 30%, #285f4c 0%, #102c24 34%, #07110f 78%)",
        opacity,
      }}
    >
      <ClosingCard />
    </AbsoluteFill>
  );
};
