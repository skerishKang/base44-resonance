import manifest from "./assets.json";

export type TruthStatus =
  | "VERIFIED_PRODUCTION"
  | "MERGED_NOT_DEPLOYED"
  | "SOURCE_TARGET"
  | "OPTIONAL_IF_VERIFIED";

export type DemoAsset = {
  id: string;
  filename: string;
  type: "video" | "audio" | "image";
  required: boolean;
  expectedDuration: number;
  truthStatus: TruthStatus;
  description: string;
  fallbackAllowed: boolean;
};

export const DEMO_ASSETS = manifest as DemoAsset[];
export const assetById = (id: string): DemoAsset => {
  const asset = DEMO_ASSETS.find((candidate) => candidate.id === id);
  if (!asset) {
    throw new Error(`Unknown demo asset: ${id}`);
  }
  return asset;
};
