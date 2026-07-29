import React from "react";
import {Composition, getStaticFiles} from "remotion";
import {WatchTreeDemo} from "./WatchTreeDemo";
import {DEMO_ASSETS} from "./data/assets";
import {
  COMPOSITION_ID,
  DURATION_IN_FRAMES,
  FPS,
  HEIGHT,
  WIDTH,
} from "./composition/timing";

export const Root = () => {
  const staticNames = new Set(
    getStaticFiles()
      .filter((file) => file.sizeInBytes > 0)
      .map((file) => file.name),
  );
  const discoveredAssetIds = DEMO_ASSETS
    .filter((asset) => staticNames.has(asset.filename))
    .map((asset) => asset.id);

  return (
    <Composition
      id={COMPOSITION_ID}
      component={WatchTreeDemo}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{renderMode: "preview", availableAssetIds: discoveredAssetIds, sceneTruth: {}}}
    />
  );
};
