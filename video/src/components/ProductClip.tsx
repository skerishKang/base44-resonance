import React from "react";
import {OffthreadVideo, staticFile} from "remotion";
import type {DemoAsset} from "../data/assets";
import {MissingAssetSlate} from "./MissingAssetSlate";

export const ProductClip = ({
  asset,
  available,
  renderMode,
}: {
  asset: DemoAsset;
  available: boolean;
  renderMode: "preview" | "final";
}) => {
  if (!available) {
    if (renderMode === "final") {
      throw new Error(`Final render blocked by missing asset: ${asset.filename}`);
    }
    return <MissingAssetSlate asset={asset} />;
  }

  return (
    <OffthreadVideo
      src={staticFile(asset.filename)}
      volume={0}
      style={{height: "100%", width: "100%", objectFit: "cover"}}
    />
  );
};
