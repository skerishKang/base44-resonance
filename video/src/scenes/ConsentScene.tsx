import React from "react";
import type {DemoAsset} from "../data/assets";
import {BrowserFrame} from "../components/BrowserFrame";
import {ProductClip} from "../components/ProductClip";
import {SceneShell} from "../components/SceneShell";
import {colors} from "../components/theme";

const labels = ["Synthetic archetype", "Simulated mutual", "No real user contacted"];

export const ConsentScene = ({asset, available, renderMode}: {asset: DemoAsset; available: boolean; renderMode: "preview" | "final"}) => (
  <SceneShell number={5} eyebrow="Consent" title="Reveal only what the owner selects" truthStatus={asset.truthStatus}>
    <div
      style={{
        display: "grid",
        gridTemplateRows: "1fr auto",
        gap: 20,
        height: "100%",
        boxSizing: "border-box",
        paddingBottom: 76,
      }}
    >
      <BrowserFrame label="Evidence selection + explicit reveal consent">
        <ProductClip asset={asset} available={available} renderMode={renderMode} />
      </BrowserFrame>
      <div style={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18}}>
        {labels.map((label, index) => (
          <div key={label} style={{borderRadius: 17, padding: "16px 20px", textAlign: "center", fontSize: 22, fontWeight: 850, background: index === 0 ? "rgba(168,230,203,0.16)" : "rgba(242,184,75,0.15)", border: `1px solid ${index === 0 ? "rgba(168,230,203,0.5)" : "rgba(242,184,75,0.5)"}`, color: index === 0 ? colors.mint : colors.amber}}>
            {label}
          </div>
        ))}
      </div>
    </div>
  </SceneShell>
);
