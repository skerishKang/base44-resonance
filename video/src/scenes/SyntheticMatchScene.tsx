import React from "react";
import type {DemoAsset} from "../data/assets";
import {BrowserFrame} from "../components/BrowserFrame";
import {ProductClip} from "../components/ProductClip";
import {SceneShell} from "../components/SceneShell";
import {colors} from "../components/theme";

export const SyntheticMatchScene = ({asset, available, renderMode}: {asset: DemoAsset; available: boolean; renderMode: "preview" | "final"}) => (
  <SceneShell number={4} eyebrow="Synthetic match" title="Deterministic and inspectable" truthStatus={asset.truthStatus}>
    <div style={{display: "grid", gridTemplateColumns: "1fr 390px", gap: 28, height: "100%"}}>
      <BrowserFrame label="Synthetic archetype + bounded evidence">
        <ProductClip asset={asset} available={available} renderMode={renderMode} />
      </BrowserFrame>
      <aside style={{display: "flex", flexDirection: "column", justifyContent: "center", gap: 18}}>
        <div style={{borderRadius: 24, background: colors.cream, color: colors.ink, padding: 26}}>
          <div style={{fontSize: 17, fontWeight: 900, letterSpacing: "0.12em", color: colors.moss}}>SYNTHETIC ARCHETYPE</div>
          <div style={{fontSize: 34, fontWeight: 860, marginTop: 14}}>No real person</div>
          <div style={{fontSize: 20, lineHeight: 1.42, marginTop: 14, opacity: 0.72}}>Evidence comes from the owner’s own records and remains inspectable.</div>
        </div>
        {["No percentage", "No soulmate score", "No hidden AI ranking"].map((text) => (
          <div key={text} style={{fontSize: 21, fontWeight: 760, borderRadius: 15, border: "1px solid rgba(242,125,107,0.42)", padding: "16px 20px", color: colors.cream}}>{text}</div>
        ))}
      </aside>
    </div>
  </SceneShell>
);
