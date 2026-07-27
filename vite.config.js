import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

export default defineConfig(({ command, mode }) => {
  let appId = undefined;
  try {
    const appJsonc = fs.readFileSync(path.resolve(__dirname, "./base44/.app.jsonc"), "utf-8");
    // Simple regex or JSON parse without comments.
    const cleanJson = appJsonc.replace(/\/\/.*/g, "");
    appId = JSON.parse(cleanJson).id;
  } catch (err) {
    if (command === "build") {
      throw new Error("Missing or invalid base44/.app.jsonc for production build.");
    }
  }

  if (command === "build" && !appId) {
    throw new Error("Missing appId in base44/.app.jsonc for production build.");
  }

  return {
    plugins: [react()],
    server: { host: "0.0.0.0" },
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
    define: {
      ...(appId ? { "import.meta.env.VITE_BASE44_APP_ID": JSON.stringify(appId) } : {}),
    },
  };
});
