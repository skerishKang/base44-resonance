import React from "react";
import type {DemoAsset} from "../data/assets";
import {BrowserFrame} from "../components/BrowserFrame";
import {ProductClip} from "../components/ProductClip";
import {SceneShell} from "../components/SceneShell";
import {colors} from "../components/theme";

const signals = [
  ["COUNT", "Collection growth"],
  ["REPEAT", "Repeat tendency"],
  ["RHYTHM", "Time rhythm"],
  ["SEQUENCE", "Viewing order"],
];

export const PrivateTreeScene = ({asset, available, renderMode}: {asset: DemoAsset; available: boolean; renderMode: "preview" | "final"}) => (
  <SceneShell number={3} eyebrow="Private tree" title="Supported signals, no invented metadata" truthStatus={asset.truthStatus}>
    <div style={{display: "grid", gridTemplateRows: "1fr auto", gap: 22, height: "100%"}}>
      <BrowserFrame label="Owner-private WatchTree capture">
        <ProductClip asset={asset} available={available} renderMode={renderMode} />
      </BrowserFrame>
      <div style={{display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16}}>
        {signals.map(([label, detail]) => (
          <div key={label} style={{borderRadius: 16, border: "1px solid rgba(168,230,203,0.28)", background: "rgba(16,44,36,0.82)", padding: "14px 18px"}}>
            <div style={{fontSize: 15, fontWeight: 900, color: colors.mint, letterSpacing: "0.12em"}}>{label}</div>
            <div style={{fontSize: 20, fontWeight: 720, marginTop: 7}}>{detail}</div>
          </div>
        ))}
      </div>
    </div>
  </SceneShell>
);
