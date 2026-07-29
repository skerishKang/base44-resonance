import React from "react";
import type {DemoAsset} from "../data/assets";
import {BrowserFrame} from "../components/BrowserFrame";
import {ProductChoiceCard} from "../components/ProductChoiceCard";
import {ProductClip} from "../components/ProductClip";
import {SceneShell} from "../components/SceneShell";
import {TitleCard} from "../components/TitleCard";

export const HookScene = ({asset, available, renderMode}: {asset: DemoAsset; available: boolean; renderMode: "preview" | "final"}) => (
  <SceneShell number={1} eyebrow="Hook" title="Attention can become a memory path" truthStatus={asset.truthStatus}>
    <div style={{display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 38, height: "100%"}}>
      <div style={{display: "flex", flexDirection: "column", justifyContent: "center"}}>
        <TitleCard />
        <div style={{display: "flex", gap: 18, marginTop: 40}}>
          <ProductChoiceCard index="PATH 01" title="Build my WatchTree" detail="Add only the links you deliberately choose." />
          <ProductChoiceCard index="PATH 02" title="See Mina’s story" detail="Planned guided story; never a Production claim before UAT." status="SOURCE TARGET" />
        </div>
      </div>
      <BrowserFrame label="Final Production landing capture">
        <ProductClip asset={asset} available={available} renderMode={renderMode} />
      </BrowserFrame>
    </div>
  </SceneShell>
);
