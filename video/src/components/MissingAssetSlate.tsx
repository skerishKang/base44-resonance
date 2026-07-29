import React from "react";
import type {DemoAsset} from "../data/assets";
import {TruthBadge} from "./TruthBadge";
import {colors, fontFamily} from "./theme";

export const MissingAssetSlate = ({asset}: {asset: DemoAsset}) => (
  <div
    style={{
      height: "100%",
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background:
        "radial-gradient(circle at 20% 20%, rgba(40,95,76,0.55), transparent 34%), linear-gradient(145deg, #07110f, #102c24)",
      color: colors.cream,
      fontFamily,
    }}
  >
    <div style={{width: "78%", textAlign: "center"}}>
      <div style={{marginBottom: 32}}>
        <TruthBadge status={asset.truthStatus} />
      </div>
      <div style={{fontSize: 62, fontWeight: 850, letterSpacing: "-0.04em"}}>
        PREVIEW PLACEHOLDER
      </div>
      <div style={{fontSize: 30, marginTop: 20, color: colors.mint}}>{asset.filename}</div>
      <p style={{fontSize: 25, lineHeight: 1.45, opacity: 0.86, margin: "28px auto 0", maxWidth: 1000}}>
        Replace with an exact, privacy-reviewed Production capture. This slate is not product
        evidence and final rendering rejects it.
      </p>
    </div>
  </div>
);
