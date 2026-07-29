import React from "react";
import {AbsoluteFill, Audio, Sequence, staticFile} from "remotion";
import {CaptionBand} from "./components/CaptionBand";
import {colors, fontFamily} from "./components/theme";
import {SCENES} from "./composition/timing";
import {assetById, type DemoAsset} from "./data/assets";
import {CAPTION_CUES} from "./data/captions";
import {Base44ProofScene} from "./scenes/Base44ProofScene";
import {CloseScene} from "./scenes/CloseScene";
import {ConsentScene} from "./scenes/ConsentScene";
import {DeliberateCollectionScene} from "./scenes/DeliberateCollectionScene";
import {HookScene} from "./scenes/HookScene";
import {PrivacyScene} from "./scenes/PrivacyScene";
import {PrivateTreeScene} from "./scenes/PrivateTreeScene";
import {SyntheticMatchScene} from "./scenes/SyntheticMatchScene";

export type WatchTreeDemoProps = {
  renderMode: "preview" | "final";
  availableAssetIds: string[];
  sceneTruth: Record<string, "VERIFIED_PRODUCTION" | "SYNTHETIC_FALLBACK" | "SOURCE_EVIDENCE">;
};

const sceneComponents = {
  hook: HookScene,
  collection: DeliberateCollectionScene,
  tree: PrivateTreeScene,
  match: SyntheticMatchScene,
  consent: ConsentScene,
  privacy: PrivacyScene,
  base44: Base44ProofScene,
};

export const WatchTreeDemo = ({renderMode, availableAssetIds, sceneTruth}: WatchTreeDemoProps) => {
  const available = new Set(availableAssetIds);
  const narration = assetById("narration-main");
  const narrationAvailable = available.has(narration.id);

  if (renderMode === "final" && !narrationAvailable) {
    throw new Error(`Final render blocked by missing narration: ${narration.filename}`);
  }

  return (
    <AbsoluteFill style={{background: colors.ink, fontFamily}}>
      {SCENES.map((scene) => {
        if (scene.id === "close") {
          return (
            <Sequence key={scene.id} from={scene.startFrame} durationInFrames={scene.durationInFrames} name="08 · Close">
              <CloseScene />
            </Sequence>
          );
        }

        const asset = assetById(scene.assetId as string);
        const truthResolution = sceneTruth?.[asset.id];
        const effectiveAsset: DemoAsset = truthResolution === "VERIFIED_PRODUCTION"
          ? {...asset, truthStatus: "VERIFIED_PRODUCTION"}
          : asset;
        const SceneComponent = sceneComponents[scene.id as keyof typeof sceneComponents];
        return (
          <Sequence key={scene.id} from={scene.startFrame} durationInFrames={scene.durationInFrames} name={`${String(scene.number).padStart(2, "0")} · ${scene.label}`}>
            <SceneComponent asset={effectiveAsset} available={available.has(asset.id)} renderMode={renderMode} />
            {truthResolution === "SYNTHETIC_FALLBACK" && scene.id === "collection" ? (
              <div
                style={{
                  position: "absolute",
                  top: 132,
                  right: 82,
                  zIndex: 20,
                  borderRadius: 999,
                  border: "2px solid #f2b84b",
                  background: "rgba(7,17,15,0.94)",
                  color: "#f2b84b",
                  padding: "12px 18px",
                  fontSize: 20,
                  fontWeight: 900,
                  letterSpacing: "0.06em",
                }}
              >
                SYNTHETIC FALLBACK · NO LIVE URL BEHAVIOR
              </div>
            ) : null}
          </Sequence>
        );
      })}

      {narrationAvailable ? <Audio src={staticFile(narration.filename)} /> : null}
      <CaptionBand cues={CAPTION_CUES} />

      {renderMode === "preview" ? (
        <div
          style={{
            position: "absolute",
            top: 22,
            left: 24,
            borderRadius: 999,
            padding: "8px 14px",
            background: "rgba(242,184,75,0.92)",
            color: colors.ink,
            fontSize: 15,
            fontWeight: 900,
            letterSpacing: "0.08em",
          }}
        >
          PREVIEW · PLACEHOLDERS ALLOWED · NOT PRODUCT EVIDENCE
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
