import React from "react";
import type {DemoAsset} from "../data/assets";
import {BrowserFrame} from "../components/BrowserFrame";
import {ProductClip} from "../components/ProductClip";
import {SceneShell} from "../components/SceneShell";
import {colors, fontFamily} from "../components/theme";

const boundaries = ["No YouTube OAuth", "No YouTube API key", "No automatic account history"];

export const DeliberateCollectionScene = ({asset, available, renderMode}: {asset: DemoAsset; available: boolean; renderMode: "preview" | "final"}) => (
  <SceneShell number={2} eyebrow="Deliberate collection" title="Every link enters by choice" truthStatus={asset.truthStatus}>
    <div style={{display: "grid", gridTemplateColumns: "1fr 360px", gap: 28, height: "100%"}}>
      <BrowserFrame label="Exact Production URL flow — or visibly synthetic fallback">
        <ProductClip asset={asset} available={available} renderMode={renderMode} />
      </BrowserFrame>
      <aside style={{display: "flex", flexDirection: "column", gap: 18, justifyContent: "center", fontFamily}}>
        {boundaries.map((item) => (
          <div key={item} style={{borderRadius: 18, padding: "22px 20px", background: "rgba(7,17,15,0.62)", border: "1px solid rgba(242,184,75,0.38)", color: colors.cream, fontSize: 22, fontWeight: 760}}>
            {item}
          </div>
        ))}
        <div style={{fontSize: 18, lineHeight: 1.45, color: colors.amber, padding: "10px 4px"}}>
          URL capture remains a source target until final deployment and authenticated UAT.
        </div>
      </aside>
    </div>
  </SceneShell>
);
