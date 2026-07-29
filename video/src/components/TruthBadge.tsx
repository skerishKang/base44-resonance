import React from "react";
import type {TruthStatus} from "../data/assets";
import {colors, fontFamily} from "./theme";

const badgeMap: Record<TruthStatus, {label: string; color: string; detail?: string}> = {
  VERIFIED_PRODUCTION: {label: "VERIFIED PRODUCTION", color: colors.mint},
  MERGED_NOT_DEPLOYED: {
    label: "MERGED · NOT DEPLOYED",
    color: colors.amber,
    detail: "SOURCE TARGET",
  },
  SOURCE_TARGET: {label: "SOURCE TARGET", color: colors.amber},
  OPTIONAL_IF_VERIFIED: {label: "OPTIONAL IF VERIFIED", color: colors.blue},
};

export const TruthBadge = ({status}: {status: TruthStatus}) => {
  const badge = badgeMap[status];
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        borderRadius: 999,
        border: `2px solid ${badge.color}`,
        background: "rgba(7, 17, 15, 0.88)",
        color: badge.color,
        padding: "10px 18px",
        fontFamily,
        fontWeight: 800,
        fontSize: 20,
        letterSpacing: "0.08em",
        lineHeight: 1,
      }}
    >
      <span style={{width: 10, height: 10, borderRadius: 10, background: badge.color}} />
      <span>{badge.label}</span>
      {badge.detail ? (
        <span style={{fontSize: 14, color: colors.cream, opacity: 0.78}}>{badge.detail}</span>
      ) : null}
    </div>
  );
};
