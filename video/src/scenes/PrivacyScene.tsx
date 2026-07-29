import React from "react";
import type {DemoAsset} from "../data/assets";
import {BrowserFrame} from "../components/BrowserFrame";
import {ProductClip} from "../components/ProductClip";
import {SceneShell} from "../components/SceneShell";
import {colors} from "../components/theme";

export const PrivacyScene = ({asset, available, renderMode}: {asset: DemoAsset; available: boolean; renderMode: "preview" | "final"}) => (
  <SceneShell number={6} eyebrow="Privacy lifecycle" title="Deletion is part of the product" truthStatus={asset.truthStatus}>
    <div style={{display: "grid", gridTemplateColumns: "1fr 430px", gap: 28, height: "100%"}}>
      <BrowserFrame label="Matching toggle → exclusion → delete all → empty state">
        <ProductClip asset={asset} available={available} renderMode={renderMode} />
      </BrowserFrame>
      <aside style={{display: "flex", alignItems: "center"}}>
        <div style={{fontSize: 43, lineHeight: 1.2, fontWeight: 860, color: colors.cream, letterSpacing: "-0.03em"}}>
          “Deletion is a product feature,
          <span style={{color: colors.mint}}> not a footer promise.</span>”
        </div>
      </aside>
    </div>
  </SceneShell>
);
