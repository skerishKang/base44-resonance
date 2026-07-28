import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("production browser config has no localhost and uses app id", async () => {
  const distPath = path.resolve(__dirname, "../dist");
  if (!fs.existsSync(distPath)) {
    return; // skip if build not run yet
  }

  let foundLocalhost = false;
  let foundOldAppId = false;

  const files = fs.readdirSync(path.join(distPath, "assets"));
  for (const file of files) {
    if (file.endsWith(".js")) {
      const content = fs.readFileSync(path.join(distPath, "assets", file), "utf-8");
      if (content.includes("localhost:4400")) {
        foundLocalhost = true;
      }
      if (content.includes("6a6538c71a8e3e1640117c91")) {
        foundOldAppId = true;
      }
    }
  }

  assert.equal(foundLocalhost, false, "Production build should not contain localhost:4400");
  assert.equal(foundOldAppId, false, "Production build should not contain old hardcoded app ID");
});
