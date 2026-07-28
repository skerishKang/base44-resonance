import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import viteConfigFunc, { PRODUCTION_RELEASE_APP_ID } from "../vite.config.js";

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

test("release build fails closed without an explicit App ID even when a linked app exists", async () => {
  const originalEnv = process.env.VITE_BASE44_APP_ID;
  const originalBase44Env = process.env.BASE44_APP_ID;
  delete process.env.VITE_BASE44_APP_ID;
  delete process.env.BASE44_APP_ID;

  const appJsoncPath = path.resolve(__dirname, "../base44/.app.jsonc");
  const hasAppJsonc = fs.existsSync(appJsoncPath);
  if (hasAppJsonc) {
    fs.renameSync(appJsoncPath, appJsoncPath + ".bak");
  }

  try {
    fs.writeFileSync(appJsoncPath, JSON.stringify({ id: PRODUCTION_RELEASE_APP_ID }), "utf-8");
    await assert.rejects(
      async () => viteConfigFunc({ command: "build", mode: "release" }),
      /RELEASE_APP_ID_REQUIRED/,
      "release build must fail closed instead of using the linked workspace app"
    );
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

test("release build cannot be satisfied by BASE44_APP_ID alone", async () => {
  const originalEnv = process.env.VITE_BASE44_APP_ID;
  const originalBase44Env = process.env.BASE44_APP_ID;
  delete process.env.VITE_BASE44_APP_ID;
  process.env.BASE44_APP_ID = PRODUCTION_RELEASE_APP_ID;

  try {
    await assert.rejects(
      async () => viteConfigFunc({ command: "build", mode: "release" }),
      /RELEASE_APP_ID_REQUIRED/,
      "release build must ignore BASE44_APP_ID and require explicit VITE_BASE44_APP_ID"
    );
  } finally {
    if (originalEnv !== undefined) process.env.VITE_BASE44_APP_ID = originalEnv;
    if (originalBase44Env !== undefined) process.env.BASE44_APP_ID = originalBase44Env;
    else delete process.env.BASE44_APP_ID;
  }
});

test("release build accepts only the exact production App ID from VITE_BASE44_APP_ID", async () => {
  const originalEnv = process.env.VITE_BASE44_APP_ID;
  const originalSource = process.env.VITE_BASE44_APP_SOURCE;
  delete process.env.VITE_BASE44_APP_SOURCE;
  process.env.VITE_BASE44_APP_ID = PRODUCTION_RELEASE_APP_ID;

  try {
    const config = await viteConfigFunc({ command: "build", mode: "release" });
    assert.deepEqual(config.define, {
      "import.meta.env.VITE_BASE44_APP_ID": JSON.stringify(PRODUCTION_RELEASE_APP_ID),
      "import.meta.env.VITE_BASE44_APP_SOURCE": '"environment"',
      "process.env.NODE_ENV": '"production"'
    });
  } finally {
    if (originalEnv !== undefined) process.env.VITE_BASE44_APP_ID = originalEnv;
    else delete process.env.VITE_BASE44_APP_ID;
    if (originalSource !== undefined) process.env.VITE_BASE44_APP_SOURCE = originalSource;
  }
});

test("release build preserves an explicit VITE_BASE44_APP_SOURCE", async () => {
  const originalEnv = process.env.VITE_BASE44_APP_ID;
  const originalSource = process.env.VITE_BASE44_APP_SOURCE;
  process.env.VITE_BASE44_APP_ID = PRODUCTION_RELEASE_APP_ID;
  process.env.VITE_BASE44_APP_SOURCE = "production-release";

  try {
    const config = await viteConfigFunc({ command: "build", mode: "release" });
    assert.equal(config.define["import.meta.env.VITE_BASE44_APP_SOURCE"], '"production-release"');
  } finally {
    if (originalEnv !== undefined) process.env.VITE_BASE44_APP_ID = originalEnv;
    else delete process.env.VITE_BASE44_APP_ID;
    if (originalSource !== undefined) process.env.VITE_BASE44_APP_SOURCE = originalSource;
    else delete process.env.VITE_BASE44_APP_SOURCE;
  }
});

test("release build rejects any App ID that is not the exact production ID", async () => {
  const originalEnv = process.env.VITE_BASE44_APP_ID;
  const nonProductionIds = [
    "arbitrary-app-id",
    "6a66efa32405ef17115532ed",
    "6a65182449c7c0f8ec33e31d",
  ];

  try {
    for (const wrongId of nonProductionIds) {
      process.env.VITE_BASE44_APP_ID = wrongId;
      await assert.rejects(
        async () => viteConfigFunc({ command: "build", mode: "release" }),
        /RELEASE_APP_ID_MISMATCH/,
        `release build must reject non-production App ID ${wrongId}`
      );
    }
  } finally {
    if (originalEnv !== undefined) process.env.VITE_BASE44_APP_ID = originalEnv;
    else delete process.env.VITE_BASE44_APP_ID;
  }
});

test("release fail-closed applies only to builds, not dev serve", async () => {
  const originalEnv = process.env.VITE_BASE44_APP_ID;
  const originalBase44Env = process.env.BASE44_APP_ID;
  delete process.env.VITE_BASE44_APP_ID;
  delete process.env.BASE44_APP_ID;

  const appJsoncPath = path.resolve(import.meta.dirname, "../base44/.app.jsonc");
  const hasAppJsonc = fs.existsSync(appJsoncPath);
  if (hasAppJsonc) {
    fs.renameSync(appJsoncPath, appJsoncPath + ".bak");
  }

  try {
    const config = await viteConfigFunc({ command: "serve", mode: "release" });
    assert.equal(config.define["import.meta.env.VITE_BASE44_APP_ID"], '""');
  } finally {
    if (hasAppJsonc) {
      fs.renameSync(appJsoncPath + ".bak", appJsoncPath);
    }
    if (originalEnv !== undefined) process.env.VITE_BASE44_APP_ID = originalEnv;
    if (originalBase44Env !== undefined) process.env.BASE44_APP_ID = originalBase44Env;
  }
});
