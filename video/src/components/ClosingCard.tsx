import React from "react";
import {colors, fontFamily} from "./theme";

export const ClosingCard = () => (
  <div style={{textAlign: "center", color: colors.cream, fontFamily}}>
    <div style={{fontSize: 25, fontWeight: 850, color: colors.mint, letterSpacing: "0.18em"}}>
      WATCHTREE BY RESONANCE
    </div>
    <div style={{fontSize: 84, lineHeight: 1.02, fontWeight: 880, letterSpacing: "-0.05em", marginTop: 28}}>
      Your memory. Your rules.
    </div>
    <div style={{display: "flex", justifyContent: "center", gap: 32, marginTop: 54, fontSize: 24}}>
      <span style={{color: colors.mint}}>base44-resonance-40117c91.base44.app</span>
      <span style={{opacity: 0.4}}>•</span>
      <span>github.com/skerishKang/base44-resonance</span>
    </div>
    <div style={{fontSize: 21, fontWeight: 800, letterSpacing: "0.12em", color: colors.amber, marginTop: 42}}>
      BUILT FOR BASE44 DEV BUILD-OFF
    </div>
  </div>
);
