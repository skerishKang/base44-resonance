import React, {type ReactNode} from "react";
import {AbsoluteFill} from "remotion";
import type {TruthStatus} from "../data/assets";
import {TruthBadge} from "./TruthBadge";
import {colors, fontFamily} from "./theme";

export const SceneShell = ({
  number,
  eyebrow,
  title,
  truthStatus,
  children,
}: {
  number: number;
  eyebrow: string;
  title: string;
  truthStatus: TruthStatus;
  children: ReactNode;
}) => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(circle at 8% 0%, rgba(40,95,76,0.52), transparent 34%), linear-gradient(145deg, #07110f 0%, #102c24 100%)",
      color: colors.cream,
      fontFamily,
      padding: "54px 70px 128px",
    }}
  >
    <header style={{display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 40, marginBottom: 30}}>
      <div>
        <div style={{fontSize: 18, fontWeight: 850, letterSpacing: "0.15em", color: colors.mint}}>
          {String(number).padStart(2, "0")} · {eyebrow.toUpperCase()}
        </div>
        <div style={{fontSize: 48, fontWeight: 860, letterSpacing: "-0.035em", marginTop: 10}}>{title}</div>
      </div>
      <TruthBadge status={truthStatus} />
    </header>
    <div style={{flex: 1, minHeight: 0}}>{children}</div>
  </AbsoluteFill>
);
