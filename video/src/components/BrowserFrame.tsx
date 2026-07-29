import React, {type ReactNode} from "react";
import {colors, fontFamily, shadow} from "./theme";

export const BrowserFrame = ({
  children,
  label = "Exact Production capture",
}: {
  children: ReactNode;
  label?: string;
}) => (
  <div
    style={{
      overflow: "hidden",
      height: "100%",
      width: "100%",
      borderRadius: 28,
      border: "1px solid rgba(168, 230, 203, 0.35)",
      background: colors.ink,
      boxShadow: shadow,
    }}
  >
    <div
      style={{
        height: 58,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 22px",
        background: "#e9e5dc",
        borderBottom: "1px solid rgba(7, 17, 15, 0.16)",
        fontFamily,
        color: colors.ink,
      }}
    >
      <span style={{width: 13, height: 13, borderRadius: 13, background: "#ff6b63"}} />
      <span style={{width: 13, height: 13, borderRadius: 13, background: "#f2b84b"}} />
      <span style={{width: 13, height: 13, borderRadius: 13, background: "#61c28b"}} />
      <div
        style={{
          marginLeft: 16,
          flex: 1,
          borderRadius: 9,
          background: "rgba(255,255,255,0.72)",
          padding: "8px 16px",
          fontSize: 17,
          textAlign: "center",
        }}
      >
        {label}
      </div>
    </div>
    <div style={{position: "relative", height: "calc(100% - 58px)", background: colors.ink}}>
      {children}
    </div>
  </div>
);
