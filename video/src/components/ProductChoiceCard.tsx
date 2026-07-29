import React from "react";
import {colors, fontFamily} from "./theme";

export const ProductChoiceCard = ({
  index,
  title,
  detail,
  status,
}: {
  index: string;
  title: string;
  detail: string;
  status?: "SOURCE TARGET";
}) => (
  <div
    style={{
      flex: 1,
      borderRadius: 22,
      border: "1px solid rgba(168,230,203,0.35)",
      background: "rgba(16,44,36,0.78)",
      padding: 24,
      fontFamily,
      color: colors.cream,
    }}
  >
    <div style={{color: colors.mint, fontWeight: 850, fontSize: 18, letterSpacing: "0.12em"}}>
      {index}
    </div>
    <div style={{fontSize: 28, fontWeight: 820, marginTop: 12}}>{title}</div>
    <div style={{fontSize: 19, lineHeight: 1.4, opacity: 0.72, marginTop: 10}}>{detail}</div>
    {status ? (
      <div style={{display: "inline-block", marginTop: 14, borderRadius: 999, border: `1px solid ${colors.amber}`, color: colors.amber, padding: "6px 10px", fontSize: 14, fontWeight: 900, letterSpacing: "0.08em"}}>
        {status}
      </div>
    ) : null}
  </div>
);
