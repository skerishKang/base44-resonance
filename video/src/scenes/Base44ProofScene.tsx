import React from "react";
import type {DemoAsset} from "../data/assets";
import {ArchitectureOverlay} from "../components/ArchitectureOverlay";
import {BrowserFrame} from "../components/BrowserFrame";
import {ProductClip} from "../components/ProductClip";
import {SceneShell} from "../components/SceneShell";
import {colors} from "../components/theme";

export const Base44ProofScene = ({asset, available, renderMode}: {asset: DemoAsset; available: boolean; renderMode: "preview" | "final"}) => (
  <SceneShell number={7} eyebrow="Base44 proof" title="Backend authority, source truth, release evidence" truthStatus={asset.truthStatus}>
    <div style={{display: "grid", gridTemplateColumns: "0.88fr 1.12fr", gap: 26, height: "100%"}}>
      <BrowserFrame label="Sanitized exact-release evidence">
        <ProductClip asset={asset} available={available} renderMode={renderMode} />
      </BrowserFrame>
      <div style={{display: "flex", flexDirection: "column", justifyContent: "center", gap: 18}}>
        <ArchitectureOverlay />
        <div style={{display: "flex", gap: 14}}>
          <div style={{flex: 1, borderRadius: 15, padding: "14px 18px", background: "rgba(168,230,203,0.12)", color: colors.mint, fontSize: 19, fontWeight: 800}}>13 Entity schemas in source</div>
          <div style={{flex: 1, borderRadius: 15, padding: "14px 18px", background: "rgba(242,184,75,0.12)", color: colors.amber, fontSize: 19, fontWeight: 800}}>13 Function sources</div>
        </div>
        <div style={{borderRadius: 15, padding: "12px 18px", background: "rgba(242,184,75,0.12)", color: colors.amber, fontSize: 17, fontWeight: 900, letterSpacing: "0.08em", textAlign: "center"}}>
          SOURCE INVENTORY · NOT DEPLOYMENT PROOF
        </div>
      </div>
    </div>
  </SceneShell>
);
