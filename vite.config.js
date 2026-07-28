import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  let appId = env.VITE_BASE44_APP_ID || env.BASE44_APP_ID;
  let source = appId ? "environment" : "unknown";

  if (!appId) {
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
