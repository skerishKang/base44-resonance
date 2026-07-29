import React from "react";
import {colors, fontFamily} from "./theme";

const platformItems = [
  "Base44 Auth",
  "Owner-scoped Entities / RLS",
  "Caller-scoped Deno Functions",
  "Runtime + hosting + deployment",
];

const workflowItems = [
  "Human owner: intent, approval, deploy authority",
  "AI CTO development role: contract and merge readiness",
  "Local coding tools: isolated source slices",
  "GitHub / CI: evidence and integration boundary",
];

export const ArchitectureOverlay = () => (
  <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, fontFamily}}>
    <section
      style={{borderRadius: 24, padding: 26, background: "rgba(40,95,76,0.35)", border: "1px solid rgba(168,230,203,0.34)"}}
    >
      <div style={{fontSize: 18, color: colors.mint, fontWeight: 850, letterSpacing: "0.12em"}}>
        PRODUCT BACKEND
      </div>
      {platformItems.map((item) => (
        <div key={item} style={{fontSize: 23, fontWeight: 720, color: colors.cream, padding: "16px 0", borderBottom: "1px solid rgba(244,240,230,0.1)"}}>
          {item}
        </div>
      ))}
    </section>
    <section
      style={{borderRadius: 24, padding: 26, background: "rgba(7,17,15,0.52)", border: "1px solid rgba(242,184,75,0.34)"}}
    >
      <div style={{fontSize: 18, color: colors.amber, fontWeight: 850, letterSpacing: "0.12em"}}>
        DEVELOPMENT WORKFLOW · NOT A PRODUCT FEATURE
      </div>
      {workflowItems.map((item, index) => (
        <div key={item} style={{display: "flex", gap: 14, alignItems: "baseline", color: colors.cream, padding: "13px 0"}}>
          <span style={{fontSize: 17, fontWeight: 900, color: colors.amber}}>{index + 1}</span>
          <span style={{fontSize: 20, lineHeight: 1.32}}>{item}</span>
        </div>
      ))}
    </section>
  </div>
);
