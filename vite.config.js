import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const RELEASE_MODE = "release";

// Public production app identifier (not a secret); the only App ID a release bundle may carry.
export const PRODUCTION_RELEASE_APP_ID = "6a6538c71a8e3e1640117c91";

function readLinkedAppId() {
  try {
    const appJsonc = fs.readFileSync(path.resolve(__dirname, "./base44/.app.jsonc"), "utf-8");
    const cleanJson = appJsonc.replace(/\/\/.*/g, "");
    const parsed = JSON.parse(cleanJson);
    if (parsed && parsed.id) return parsed.id;
  } catch (err) {
    // Ignored
  }
  return "";
}

export default defineConfig(({ command, mode }) => {
  const releaseBuild = command === "build" && mode === RELEASE_MODE;
  const env = loadEnv(mode, process.cwd(), "");
  const explicitViteAppId = (env.VITE_BASE44_APP_ID || "").trim();
  const explicitSource = (env.VITE_BASE44_APP_SOURCE || "").trim();

  let appId = "";
  let resolvedSource = "unknown";
  if (releaseBuild) {
    appId = explicitViteAppId;
    if (appId) resolvedSource = "environment";
  } else if (explicitViteAppId) {
    appId = explicitViteAppId;
    resolvedSource = "environment";
  } else if (env.BASE44_APP_ID) {
    appId = env.BASE44_APP_ID;
    resolvedSource = "environment";
  } else {
    const linkedAppId = readLinkedAppId();
    if (linkedAppId) {
      appId = linkedAppId;
      resolvedSource = "linked-app";
    }
  }

  const source = explicitSource || resolvedSource;

  if (releaseBuild) {
    process.env.NODE_ENV = "production";
    if (!explicitViteAppId) {
      throw new Error(
        "RELEASE_APP_ID_REQUIRED: release builds require an explicit VITE_BASE44_APP_ID. " +
        "BASE44_APP_ID and linked workspace .app.jsonc are ignored in release mode."
      );
    }
    if (explicitViteAppId !== PRODUCTION_RELEASE_APP_ID) {
      throw new Error(
        `RELEASE_APP_ID_MISMATCH: release builds accept only the production App ID ${PRODUCTION_RELEASE_APP_ID}.`
      );
    }
  }

  return {
    plugins: [react()],
    server: { host: "0.0.0.0" },
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
    define: {
      "import.meta.env.VITE_BASE44_APP_ID": JSON.stringify(appId || ""),
      "import.meta.env.VITE_BASE44_APP_SOURCE": JSON.stringify(source),
      "process.env.NODE_ENV": JSON.stringify(mode === "development" ? "development" : "production"),
    },
  };
});
