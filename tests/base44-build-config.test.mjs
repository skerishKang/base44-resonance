import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import viteConfigFunc from "../vite.config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("Vite config handles clean CI build (no .app.jsonc, no env var)", async () => {
  // We simulate the environment
  const originalEnv = process.env.VITE_BASE44_APP_ID;
  const originalBase44Env = process.env.BASE44_APP_ID;
  delete process.env.VITE_BASE44_APP_ID;
  delete process.env.BASE44_APP_ID;

  const appJsoncPath = path.resolve(__dirname, "../base44/.app.jsonc");
  const hasAppJsonc = fs.existsSync(appJsoncPath);
  let backup;
  if (hasAppJsonc) {
    backup = fs.readFileSync(appJsoncPath, "utf-8");
    fs.renameSync(appJsoncPath, appJsoncPath + ".bak");
  }

  try {
    const config = await viteConfigFunc({ command: "build", mode: "production" });
    assert.ok(config);
    assert.deepEqual(config.define, {
      "import.meta.env.VITE_BASE44_APP_ID": '""',
      "import.meta.env.VITE_BASE44_APP_SOURCE": '"unknown"',
      "process.env.NODE_ENV": '"production"'
    });
  } finally {
    if (hasAppJsonc) {
      fs.renameSync(appJsoncPath + ".bak", appJsoncPath);
    }
    if (originalEnv !== undefined) process.env.VITE_BASE44_APP_ID = originalEnv;
    if (originalBase44Env !== undefined) process.env.BASE44_APP_ID = originalBase44Env;
  }
});

test("Vite config prioritizes explicit VITE_BASE44_APP_ID", async () => {
  const originalEnv = process.env.VITE_BASE44_APP_ID;
  process.env.VITE_BASE44_APP_ID = "explicit-env-id";

  try {
    const config = await viteConfigFunc({ command: "build", mode: "production" });
    assert.deepEqual(config.define, {
      "import.meta.env.VITE_BASE44_APP_ID": '"explicit-env-id"',
      "import.meta.env.VITE_BASE44_APP_SOURCE": '"environment"',
      "process.env.NODE_ENV": '"production"'
    });
  } finally {
    if (originalEnv !== undefined) process.env.VITE_BASE44_APP_ID = originalEnv;
    else delete process.env.VITE_BASE44_APP_ID;
  }
});

test("Vite config falls back to linked workspace .app.jsonc if valid", async () => {
  const originalEnv = process.env.VITE_BASE44_APP_ID;
  const originalBase44Env = process.env.BASE44_APP_ID;
  delete process.env.VITE_BASE44_APP_ID;
  delete process.env.BASE44_APP_ID;

  const appJsoncPath = path.resolve(__dirname, "../base44/.app.jsonc");
  const hasAppJsonc = fs.existsSync(appJsoncPath);
  let backup;
  if (hasAppJsonc) {
    backup = fs.readFileSync(appJsoncPath, "utf-8");
    fs.renameSync(appJsoncPath, appJsoncPath + ".bak");
  }

  try {
    fs.writeFileSync(appJsoncPath, JSON.stringify({ id: "linked-test-id" }), "utf-8");
    const config = await viteConfigFunc({ command: "build", mode: "production" });
    assert.deepEqual(config.define, {
      "import.meta.env.VITE_BASE44_APP_ID": '"linked-test-id"',
      "import.meta.env.VITE_BASE44_APP_SOURCE": '"linked-app"',
      "process.env.NODE_ENV": '"production"'
    });
  } finally {
    if (fs.existsSync(appJsoncPath)) {
      fs.unlinkSync(appJsoncPath);
    }
    if (hasAppJsonc) {
      fs.renameSync(appJsoncPath + ".bak", appJsoncPath);
    }
    if (originalEnv !== undefined) process.env.VITE_BASE44_APP_ID = originalEnv;
    if (originalBase44Env !== undefined) process.env.BASE44_APP_ID = originalBase44Env;
  }
});

test("Vite config handles invalid linked workspace .app.jsonc", async () => {
  const originalEnv = process.env.VITE_BASE44_APP_ID;
  const originalBase44Env = process.env.BASE44_APP_ID;
  delete process.env.VITE_BASE44_APP_ID;
  delete process.env.BASE44_APP_ID;

  const appJsoncPath = path.resolve(__dirname, "../base44/.app.jsonc");
  const hasAppJsonc = fs.existsSync(appJsoncPath);
  let backup;
  if (hasAppJsonc) {
    backup = fs.readFileSync(appJsoncPath, "utf-8");
    fs.renameSync(appJsoncPath, appJsoncPath + ".bak");
  }

  try {
    fs.writeFileSync(appJsoncPath, "{ invalid json", "utf-8");
    const config = await viteConfigFunc({ command: "build", mode: "production" });
    assert.deepEqual(config.define, {
      "import.meta.env.VITE_BASE44_APP_ID": '""',
      "import.meta.env.VITE_BASE44_APP_SOURCE": '"unknown"',
      "process.env.NODE_ENV": '"production"'
    });
  } finally {
    if (fs.existsSync(appJsoncPath)) {
      fs.unlinkSync(appJsoncPath);
    }
    if (hasAppJsonc) {
      fs.renameSync(appJsoncPath + ".bak", appJsoncPath);
    }
    if (originalEnv !== undefined) process.env.VITE_BASE44_APP_ID = originalEnv;
    if (originalBase44Env !== undefined) process.env.BASE44_APP_ID = originalBase44Env;
  }
});

test("Vite config sets NODE_ENV to development when mode is development", async () => {
  const originalEnv = process.env.VITE_BASE44_APP_ID;
  process.env.VITE_BASE44_APP_ID = "explicit-env-id";

  try {
    const config = await viteConfigFunc({ command: "serve", mode: "development" });
    assert.deepEqual(config.define, {
      "import.meta.env.VITE_BASE44_APP_ID": '"explicit-env-id"',
      "import.meta.env.VITE_BASE44_APP_SOURCE": '"environment"',
      "process.env.NODE_ENV": '"development"'
    });
  } finally {
    if (originalEnv !== undefined) process.env.VITE_BASE44_APP_ID = originalEnv;
    else delete process.env.VITE_BASE44_APP_ID;
  }
});
