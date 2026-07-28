import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const RELEASE_MODE = "release";

// Public Base44 app identifiers (not secrets) that must never ship in a release bundle.
export const FORBIDDEN_RELEASE_APP_IDS = [
  "6a66efa32405ef17115532ed",
  "6a65182449c7c0f8ec33e31d",
];

export default defineConfig(({ command, mode }) => {
  const releaseBuild = command === "build" && mode === RELEASE_MODE;
  const env = loadEnv(mode, process.cwd(), "");
  let appId = env.VITE_BASE44_APP_ID || env.BASE44_APP_ID;
  let source = appId ? "environment" : "unknown";

  if (!appId && !releaseBuild) {
    try {
      const appJsonc = fs.readFileSync(path.resolve(__dirname, "./base44/.app.jsonc"), "utf-8");
      const cleanJson = appJsonc.replace(/\/\/.*/g, "");
      const parsed = JSON.parse(cleanJson);
      if (parsed && parsed.id) {
        appId = parsed.id;
        source = "linked-app";
      }
    } catch (err) {
      // Ignored
    }
  }

  if (releaseBuild) {
    process.env.NODE_ENV = "production";
    if (!appId) {
      throw new Error(
        "Release build failed closed: set VITE_BASE44_APP_ID to the public production App ID. " +
        "A production bundle without an App ID ships a disabled Base44 client (APP_ID_UNAVAILABLE)."
      );
    }
    if (FORBIDDEN_RELEASE_APP_IDS.includes(appId)) {
      throw new Error(
        `Release build failed closed: App ID ${appId} belongs to a non-production app. ` +
        "Release bundles must use the production App ID."
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
