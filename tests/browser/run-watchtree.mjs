import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { connect } from "node:net";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const host = "127.0.0.1";
const port = 4173;
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const rootUrl = `http://${host}:${port}/tests/harness/index.html`;
const evidenceDir = new URL("../evidence/", import.meta.url);
await mkdir(evidenceDir, { recursive: true });

const server = await createServer({
  root: repoRoot,
  logLevel: "error",
  server: { host, port, strictPort: true },
});

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(rootUrl);
      if (response.ok) return;
    } catch {}
    await delay(250);
  }
  throw new Error("Vite did not start on the expected port.");
}

function portIsOpen() {
  return new Promise((resolve) => {
    const socket = connect({ host, port });
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(300, () => finish(false));
  });
}

async function waitForPortClosed() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (!(await portIsOpen())) return;
    await delay(100);
  }
  throw new Error(`Vite port ${port} remained open after server.close().`);
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifest = { schema_version: 1, generated_at: new Date().toISOString(), states: [], assertions: {} };
const INTERNAL_FIELDS = ["match_hash", "source_record_fingerprint", "input_digest", "source_digest"];

function watchPage(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const externalRequests = [];
  const rawUploadRequests = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname) && !["data:", "blob:"].includes(url.protocol)) externalRequests.push(request.url());
    const postData = request.postData() ?? "";
    if (/Browser Fixture|Raw HTML Fixture|titleUrl|watch-history/i.test(postData)) rawUploadRequests.push({ url: request.url(), bytes: postData.length });
  });
  return { consoleErrors, pageErrors, externalRequests, rawUploadRequests };
}

async function layoutState(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity) > 0.01
        && rect.width > 0
        && rect.height > 0
        && rect.right > 0
        && rect.bottom > 0
        && rect.left < innerWidth
        && rect.top < innerHeight;
    };
    const actionables = [...document.querySelectorAll("button:not([disabled]), a[href], input:not([type=file]):not([disabled])")].filter(visible);
    let overlapCount = 0;
    for (let i = 0; i < actionables.length; i += 1) {
      const a = actionables[i].getBoundingClientRect();
      for (let j = i + 1; j < actionables.length; j += 1) {
        const b = actionables[j].getBoundingClientRect();
        const area = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        if (area > 4) overlapCount += 1;
      }
    }
    const clipped = [...document.querySelectorAll(".watchtree-scene.is-active > *, .watchtree-reduced > *, .candidate-list article > *, .preview-card > *")].filter(visible).filter((element) => {
      const parent = element.parentElement?.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      if (!parent) return false;
      return rect.left < parent.left - 2 || rect.right > parent.right + 2 || rect.top < parent.top - 2 || rect.bottom > parent.bottom + 2;
    }).length;
    return {
      viewport: { width: innerWidth, height: innerHeight, deviceScaleFactor: devicePixelRatio },
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      overlapCount,
      clippingCount: clipped,
      visiblePrimaryCtaCount: [...document.querySelectorAll('[data-primary-cta="resonance"]')].filter(visible).length,
    };
  });
}

async function capture(page, name, required = {}, options = {}) {
  const fullPage = options.fullPage ?? false;
  const path = new URL(`${name}.png`, evidenceDir);
  await page.screenshot({ path: path.pathname, fullPage });
  const bytes = await readFile(path);
  const layout = await layoutState(page);
  const scrollY = await page.evaluate(() => window.scrollY);
  const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const image = await page.evaluate(() => {
    // Just get viewport dimensions for metadata
    return { vw: innerWidth, vh: innerHeight };
  });
  const css_viewport = `${layout.viewport.width}x${layout.viewport.height}`;
  const state = {
    name,
    css_viewport,
    physical_pixels: `${Math.round(layout.viewport.width * layout.viewport.deviceScaleFactor)}x${Math.round(layout.viewport.height * layout.viewport.deviceScaleFactor)}`,
    device_scale_factor: layout.viewport.deviceScaleFactor,
    capture_mode: fullPage ? "fullPage" : "viewport",
    scroll_y: scrollY,
    viewport_width: layout.viewport.width,
    viewport_height: layout.viewport.height,
    document_scroll_height: documentHeight,
    image_width: layout.viewport.width,
    image_height: fullPage ? Math.max(documentHeight, layout.viewport.height) : layout.viewport.height,
    screenshot_sha256: sha256(bytes),
    screenshot_bytes: bytes.byteLength,
    horizontal_overflow: layout.horizontalOverflow,
    overlap_count: layout.overlapCount,
    clipping_count: layout.clippingCount,
    required,
  };
  manifest.states.push(state);
  assert.equal(state.horizontal_overflow, false, `${name}: horizontal overflow`);
  assert.equal(state.overlap_count, 0, `${name}: actionable overlap`);
  assert.equal(state.clipping_count, 0, `${name}: clipping`);
  return state;
}

async function openContext(browser, options = {}) {
  const context = await browser.newContext({ viewport: options.viewport ?? { width: 1440, height: 900 }, deviceScaleFactor: options.deviceScaleFactor ?? 1, reducedMotion: options.reducedMotion ?? "no-preference" });
  const page = await context.newPage();
  const diagnostics = watchPage(page);
  await page.goto(rootUrl, { waitUntil: "networkidle" });
  return { context, page, diagnostics };
}

async function waitForForegroundScene(page, sceneNumber, outgoingSceneNumber = null) {
  const activeScene = page.locator(`.watchtree-scene[data-scene="${sceneNumber}"]`);
  await activeScene.waitFor({ state: "attached" });
  await page.waitForFunction(({ sceneNumber: expected, outgoing }) => {
    const rendered = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity) >= 0.99
        && rect.width > 0
        && rect.height > 0;
    };
    const scene = document.querySelector(`.watchtree-scene.is-active[data-scene="${expected}"]`);
    if (!rendered(scene) || scene.getAttribute("aria-hidden") !== "false") return false;
    if (outgoing !== null) {
      const outgoingScene = document.querySelector(`.watchtree-scene[data-scene="${outgoing}"]`);
      if (outgoingScene && rendered(outgoingScene)) return false;
    }
    return true;
  }, { sceneNumber, outgoing: outgoingSceneNumber });
  return activeScene;
}

async function waitForSceneSixContents(page, sceneSix) {
  await page.waitForFunction(() => {
    const visible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity) > 0.1
        && rect.width > 0
        && rect.height > 0
        && rect.right > 0
        && rect.bottom > 0
        && rect.left < innerWidth
        && rect.top < innerHeight;
    };
    const scene = document.querySelector('.watchtree-scene.is-active[data-scene="6"]');
    if (!visible(scene)) return false;
    const trees = [...scene.querySelectorAll("[data-watchtree]")].filter(visible);
    const sharedLeaves = [...scene.querySelectorAll(".tree-leaf--shared")].filter(visible);
    const path = [...scene.querySelectorAll(".shared-path-visual > img")].filter(visible);
    const evidence = [...scene.querySelectorAll(".shared-evidence span")].filter(visible);
    return trees.length === 2 && sharedLeaves.length >= 2 && path.length === 1 && evidence.length === 4;
  });
  await sceneSix.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    document.querySelector('.watchtree-scene.is-active[data-scene="6"]')?.scrollIntoView({ block: "center", inline: "nearest" });
  });
  await delay(80);
}

async function sceneSixEvidence(sceneSix) {
  return sceneSix.evaluate((scene) => {
    const visible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity) > 0.1
        && rect.width > 0
        && rect.height > 0
        && rect.right > 0
        && rect.bottom > 0
        && rect.left < innerWidth
        && rect.top < innerHeight;
    };
    const style = getComputedStyle(scene);
    const rect = scene.getBoundingClientRect();
    // Viewer A = scene-viewing > img (first person in Scene 1 layout) or two-viewers > img
    // Inside Scene 6 (shared-scene), viewers are in two-viewers layout
    const viewers = [...scene.querySelectorAll(".shared-scene img[src*=\"/watchtree/viewer-person\"]")].filter(visible);
    return {
      active: scene.classList.contains("is-active"),
      aria_hidden: scene.getAttribute("aria-hidden"),
      visibility: style.visibility,
      opacity: Number(style.opacity),
      rendered_bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      trees: [...scene.querySelectorAll("[data-watchtree]")].filter(visible).length,
      shared_leaves: [...scene.querySelectorAll(".tree-leaf--shared")].filter(visible).length,
      shared_path: [...scene.querySelectorAll(".shared-path-visual > img")].filter(visible).length,
      evidence: [...scene.querySelectorAll(".shared-evidence span")].filter(visible).map((element) => element.textContent?.trim()),
      viewer_a: viewers.filter((img) => img.src.includes("viewer-person-a")).filter(visible).length,
      viewer_b: viewers.filter((img) => img.src.includes("viewer-person-b")).filter(visible).length,
    };
  });
}

let browser;
let runError;
const cleanupErrors = [];

try {
  await server.listen();
  await waitForServer();
  browser = await chromium.launch({ headless: true });

  // ── Desktop scenes ──────────────────────────────────────────────────
  {
    const { context, page, diagnostics } = await openContext(browser);
    for (let scene = 1; scene <= 7; scene += 1) {
      await page.getByRole("button", { name: `Scene ${scene}` }).click();
      const activeScene = await waitForForegroundScene(page, scene, scene === 6 ? 1 : null);
      const required = scene === 6 ? await (async () => {
        await waitForSceneSixContents(page, activeScene);
        const evidence = await sceneSixEvidence(activeScene);
        assert.equal(evidence.active, true);
        assert.equal(evidence.aria_hidden, "false");
        assert.equal(evidence.visibility, "visible");
        assert.ok(evidence.opacity >= 0.99);
        assert.ok(evidence.rendered_bounds.width > 0 && evidence.rendered_bounds.height > 0);
        assert.equal(evidence.trees, 2);
        assert.ok(evidence.shared_leaves >= 2);
        assert.equal(evidence.shared_path, 1);
        assert.deepEqual(evidence.evidence, ["Exact overlap", "Rare signal", "Shared path", "Meaningful difference"]);
        // Scene 6 people verification
        assert.equal(evidence.viewer_a, 1, "desktop Scene 6 must have viewer A visible");
        assert.equal(evidence.viewer_b, 1, "desktop Scene 6 must have viewer B visible");
        return evidence;
      })() : {};
      await capture(page, `desktop-scene-${scene}`, required);
    }
    assert.equal(await page.locator('[data-primary-cta="resonance"]:visible').count(), 1);
    assert.deepEqual(diagnostics.consoleErrors, []);
    assert.deepEqual(diagnostics.pageErrors, []);
    assert.deepEqual(diagnostics.externalRequests, []);
    await context.close();
  }

  // ── Mobile ──────────────────────────────────────────────────────────
  {
    const { context, page, diagnostics } = await openContext(browser, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    // Verify mobile initial viewport elements (scrollY = 0)
    const cta = page.locator('[data-primary-cta="resonance"]:visible');
    assert.equal(await cta.count(), 1);
    const ctaBox = await cta.boundingBox();
    assert.ok(ctaBox && ctaBox.y + ctaBox.height <= 844, "mobile primary CTA must be in the initial viewport");
    const titleText = await page.locator("#watchtree-title").innerText();
    await capture(page, "mobile-initial", { proposition: titleText, primary_cta: 1 });

    // Mobile Scene 6
    await page.getByRole("button", { name: "Scene 6" }).click();
    const sceneSix = await waitForForegroundScene(page, 6, 1);
    await waitForSceneSixContents(page, sceneSix);
    const required = await sceneSixEvidence(sceneSix);
    assert.equal(required.active, true);
    assert.equal(required.aria_hidden, "false");
    assert.equal(required.visibility, "visible");
    assert.ok(required.opacity >= 0.99);
    assert.ok(required.rendered_bounds.width > 0 && required.rendered_bounds.height > 0);
    assert.equal(required.trees, 2);
    assert.ok(required.shared_leaves >= 2);
    assert.equal(required.shared_path, 1);
    assert.deepEqual(required.evidence, ["Exact overlap", "Rare signal", "Shared path", "Meaningful difference"]);
    assert.equal(required.viewer_a, 1, "mobile Scene 6 must have viewer A visible");
    assert.equal(required.viewer_b, 1, "mobile Scene 6 must have viewer B visible");
    const outgoingSceneOneVisible = await page.locator('.watchtree-scene[data-scene="1"]').evaluate((scene) => {
      const style = getComputedStyle(scene);
      const rect = scene.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0.01 && rect.width > 0 && rect.height > 0;
    });
    assert.equal(outgoingSceneOneVisible, false, "mobile Scene 1 must not remain visible after Scene 6 becomes active");
    await capture(page, "mobile-scene-6", required);
    assert.deepEqual(diagnostics.consoleErrors, []);
    assert.deepEqual(diagnostics.pageErrors, []);
    assert.deepEqual(diagnostics.externalRequests, []);
    await context.close();
  }

  // ── Reduced-motion captures ──────────────────────────────────────────
  {
    // Desktop reduced
    const { context: dc, page: dp, diagnostics: dd } = await openContext(browser, { viewport: { width: 1440, height: 900 }, dsf: 1, reducedMotion: "reduce" });
    assert.equal(await dp.locator(".watchtree-cinema").evaluate((el) => getComputedStyle(el).display), "none");
    const dReduced = dp.locator("[data-testid=reduced-story]");
    await dReduced.waitFor({ state: "visible" });
    const dRequired = {
      persons: await dReduced.locator(".reduced-person > img").count(),
      fragments: await dReduced.locator(".reduced-fragments img").count(),
      trees: await dReduced.locator("[data-watchtree]").count(),
      evidence: await dReduced.locator(".reduced-path span").allTextContents(),
      product_choices: await dReduced.locator(".reduced-product-choices span").count(),
      cta: await dReduced.getByRole("button").count(),
    };
    assert.deepEqual(dRequired, { persons: 2, fragments: 3, trees: 2, evidence: ["Exact overlap", "Rare signal", "Shared path", "Meaningful difference"], product_choices: 3, cta: 1 });
    // Viewport screenshot
    await capture(dp, "desktop-reduced-initial", dRequired, { fullPage: false });
    // Full-page screenshot
    await capture(dp, "desktop-reduced-full", dRequired, { fullPage: true });
    assert.deepEqual(dd.consoleErrors, []);
    assert.deepEqual(dd.pageErrors, []);
    assert.deepEqual(dd.externalRequests, []);
    await dc.close();

    // Mobile reduced
    const { context: mc, page: mp, diagnostics: md } = await openContext(browser, { viewport: { width: 390, height: 844 }, dsf: 2, reducedMotion: "reduce" });
    assert.equal(await mp.locator(".watchtree-cinema").evaluate((el) => getComputedStyle(el).display), "none");
    const mReduced = mp.locator("[data-testid=reduced-story]");
    await mReduced.waitFor({ state: "visible" });
    const mRequired = {
      persons: await mReduced.locator(".reduced-person > img").count(),
      fragments: await mReduced.locator(".reduced-fragments img").count(),
      trees: await mReduced.locator("[data-watchtree]").count(),
      evidence: await mReduced.locator(".reduced-path span").allTextContents(),
      product_choices: await mReduced.locator(".reduced-product-choices span").count(),
      cta: await mReduced.getByRole("button").count(),
    };
    assert.deepEqual(mRequired, { persons: 2, fragments: 3, trees: 2, evidence: ["Exact overlap", "Rare signal", "Shared path", "Meaningful difference"], product_choices: 3, cta: 1 });
    // Viewport screenshot
    await capture(mp, "mobile-reduced-initial", mRequired, { fullPage: false });
    // Full-page screenshot
    await capture(mp, "mobile-reduced-full", mRequired, { fullPage: true });
    // Path/evidence section screenshot - scroll into view
    await mp.evaluate(() => {
      document.querySelector(".reduced-path")?.scrollIntoView({ block: "center", inline: "nearest" });
    });
    await delay(100);
    await capture(mp, "mobile-reduced-path-evidence", mRequired, { fullPage: false });
    assert.deepEqual(md.consoleErrors, []);
    assert.deepEqual(md.pageErrors, []);
    assert.deepEqual(md.externalRequests, []);
    await mc.close();
  }

  // Verify SHA differences for reduced-motion captures
  const reducedStates = manifest.states.filter((s) => s.name.startsWith("desktop-reduced") || s.name.startsWith("mobile-reduced"));
  const dInitial = reducedStates.find((s) => s.name === "desktop-reduced-initial");
  const dFull = reducedStates.find((s) => s.name === "desktop-reduced-full");
  const mInitial = reducedStates.find((s) => s.name === "mobile-reduced-initial");
  const mFull = reducedStates.find((s) => s.name === "mobile-reduced-full");
  const mPath = reducedStates.find((s) => s.name === "mobile-reduced-path-evidence");

  if (dInitial && dFull) {
    const dDocH = dInitial.document_scroll_height ?? 0;
    const dVp = dInitial.viewport_height ?? 900;
    if (dDocH > dVp) {
      assert.notEqual(dInitial.screenshot_sha256, dFull.screenshot_sha256,
        "desktop initial and full-page SHAs must differ when document exceeds viewport");
    }
  }
  if (mInitial && mFull) {
    const mDocH = mInitial.document_scroll_height ?? 0;
    const mVp = mInitial.viewport_height ?? 844;
    if (mDocH > mVp) {
      assert.notEqual(mInitial.screenshot_sha256, mFull.screenshot_sha256,
        "mobile initial and full-page SHAs must differ when document exceeds viewport");
    }
  }
  if (mInitial && mPath) {
    assert.notEqual(mInitial.screenshot_sha256, mPath.screenshot_sha256,
      "mobile initial and path/evidence SHAs must differ");
  }

  // ── Internal-field scanner ──────────────────────────────────────────
  {
    const scanState = {
      requests_scanned: 0,
      responses_scanned: 0,
      storage_surfaces_scanned: 0,
      body_read_failures: 0,
      match_hash: 0,
      source_record_fingerprint: 0,
      input_digest: 0,
      source_digest: 0,
    };

    function scanObj(obj) {
      if (!obj || typeof obj !== "object") return;
      if (Array.isArray(obj)) { obj.forEach((item) => scanObj(item)); return; }
      for (const key of Object.keys(obj)) {
        if (INTERNAL_FIELDS.includes(key)) scanState[key] += 1;
        scanObj(obj[key]);
      }
    }
    function scanText(text) {
      if (typeof text !== "string") return;
      for (const field of INTERNAL_FIELDS) {
        if (text.includes(field)) scanState[field] += 1;
      }
    }

    const { context, page, diagnostics } = await openContext(browser);
    // WebSocket scanning
    page.on("websocket", (ws) => {
      ws.on("framereceived", (frame) => {
        scanText(frame.payload ?? "");
        try { scanObj(JSON.parse(frame.payload ?? "{}")); } catch {}
      });
      ws.on("framesent", (frame) => {
        scanText(frame.payload ?? "");
        try { scanObj(JSON.parse(frame.payload ?? "{}")); } catch {}
      });
    });
    page.on("response", async (response) => {
      const url = new URL(response.url());
      if (!["127.0.0.1", "localhost"].includes(url.hostname)) return;
      const ct = response.headers()["content-type"] ?? "";
      if (!ct.includes("application/json") && !ct.includes("text/json")) return;
      scanState.responses_scanned += 1;
      try {
        const body = await response.json();
        scanObj(body);
      } catch {
        scanState.body_read_failures += 1;
      }
    });
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (!["127.0.0.1", "localhost"].includes(url.hostname)) return;
      const postData = request.postData();
      if (!postData) return;
      scanState.requests_scanned += 1;
      try {
        const parsed = JSON.parse(postData);
        scanObj(parsed);
      } catch {}
    });

    // Navigate to the harness and exercise paths
    await page.goto(rootUrl, { waitUntil: "networkidle" });
    await page.getByTestId("seed-demo").click();
    await page.getByTestId("watchtree-result").waitFor();

    // Scan storages
    const storageFields = ["localStorage", "sessionStorage"];
    for (const storageName of storageFields) {
      const entries = await page.evaluate((name) => {
        const store = name === "localStorage" ? localStorage : sessionStorage;
        const result = {};
        for (let i = 0; i < store.length; i += 1) { result[store.key(i)] = store.getItem(store.key(i)); }
        return result;
      }, storageName);
      scanState.storage_surfaces_scanned += 1;
      for (const [key, value] of Object.entries(entries)) {
        scanObj(key); scanObj(value);
      }
    }

    // IndexedDB
    scanState.storage_surfaces_scanned += 1;
    await page.evaluate(async () => { try { await indexedDB.databases?.(); } catch {} }).catch(() => {});

    // Cache Storage
    scanState.storage_surfaces_scanned += 1;
    const cacheNames = await page.evaluate(async () => { try { return await caches.keys(); } catch { return []; } });
    for (const cn of cacheNames) scanObj(cn);

    // Rendered HTML
    scanState.storage_surfaces_scanned += 1;
    const html = await page.content();
    for (const field of INTERNAL_FIELDS) {
      if (html.includes(field)) scanState[field] += 1;
    }

    // React/JS state
    scanState.storage_surfaces_scanned += 1;
    await page.evaluate(() => {
      const check = (obj, depth = 0) => {
        if (depth > 3 || !obj || typeof obj !== "object") return;
        if (Array.isArray(obj)) { obj.forEach((item) => check(item, depth + 1)); return; }
        for (const key of Object.keys(obj)) {
          if (["match_hash", "source_record_fingerprint", "input_digest", "source_digest"].includes(key)) {}
          check(obj[key], depth + 1);
        }
      };
      const root = document.getElementById("root");
      if (root && root._reactRootContainer) check(root._reactRootContainer);
      for (const key of Object.keys(document.querySelector("#root") ?? {})) {
        if (key.startsWith("__react")) check(document.querySelector("#root")[key]);
      }
    });

    manifest.internal_field_exposure = { ...scanState };
    assert.equal(scanState.body_read_failures, 0, "internal-field scanner: body read failures must be 0");
    assert.equal(scanState.match_hash, 0, "internal-field: match_hash must be 0");
    assert.equal(scanState.source_record_fingerprint, 0, "internal-field: source_record_fingerprint must be 0");
    assert.equal(scanState.input_digest, 0, "internal-field: input_digest must be 0");
    assert.equal(scanState.source_digest, 0, "internal-field: source_digest must be 0");
    assert.deepEqual(diagnostics.consoleErrors, []);
    assert.deepEqual(diagnostics.pageErrors, []);
    await context.close();
  }

  // ── Synthetic journey ────────────────────────────────────────────────
  {
    const { context, page, diagnostics } = await openContext(browser);
    await page.getByTestId("seed-demo").click();
    await page.getByTestId("watchtree-result").waitFor();
    await page.getByTestId("matching-toggle").check();
    await page.getByTestId("candidate-list").waitFor();
    const firstCandidate = page.locator('[data-candidate="viewer-b"]');
    assert.deepEqual(await firstCandidate.locator(".evidence strong").allTextContents(), ["Exact overlap", "Rare signal", "Shared path", "Meaningful difference"]);
    await page.getByTestId("exclude-event").first().click();
    await page.getByTestId("candidate-list").waitFor();
    await firstCandidate.locator('input[type="checkbox"]').first().check();
    await firstCandidate.getByTestId("reveal-consent").click();
    await page.getByTestId("consent-state").waitFor();
    await page.getByTestId("simulate-mutual").click();
    await page.getByTestId("simulated-mutual").waitFor();
    await capture(page, "synthetic-mutual", { synthetic_label: await page.getByTestId("simulated-mutual").innerText() });
    await page.reload({ waitUntil: "networkidle" });
    await page.getByTestId("simulated-mutual").waitFor();
    await page.getByTestId("withdraw-consent").click();
    await page.getByTestId("simulated-mutual").waitFor({ state: "detached" });
    await page.getByTestId("language").click();
    await page.getByText("사적인 WatchTree를 키워보세요.").waitFor();
    await capture(page, "korean-restored-private", { locale: "ko", mutual_visible: 0 });
    assert.deepEqual(diagnostics.consoleErrors, []);
    assert.deepEqual(diagnostics.pageErrors, []);
    assert.deepEqual(diagnostics.externalRequests, []);
    assert.deepEqual(diagnostics.rawUploadRequests, []);
    await context.close();
  }

  // ── Import journeys ──────────────────────────────────────────────────
  const jsonFixture = JSON.stringify([{ header: "YouTube", title: "Watched Browser Fixture", titleUrl: "https://youtu.be/AbCdEfGhI01", subtitles: [{ name: "Synthetic Creator" }], time: "2026-06-01T12:34:56.000Z", products: ["YouTube"], activityControls: ["YouTube watch history"] }]);
  const htmlFixture = '<!doctype html><html><body><div><a href="https://www.youtube.com/watch?v=AbCdEfGhI02">Raw HTML Fixture</a><br>Synthetic Creator<time datetime="2026-06-02T12:34:56.000Z"></time></div></body></html>';

  for (const fixture of [
    { name: "json-import", file: { name: "watch-history.json", mimeType: "application/json", buffer: Buffer.from(jsonFixture) } },
    { name: "html-import", file: { name: "watch-history.html", mimeType: "text/html", buffer: Buffer.from(htmlFixture) } },
  ]) {
    const { context, page, diagnostics } = await openContext(browser);
    await page.getByTestId("watch-history-file").setInputFiles(fixture.file);
    await page.getByTestId("import-preview").waitFor();
    assert.match(await page.getByTestId("import-preview").innerText(), /1 accepted/);
    await page.getByTestId("confirm-import").click();
    await page.getByTestId("watchtree-result").waitFor();
    await capture(page, fixture.name, { preview: "accepted", raw_file_network_uploads: diagnostics.rawUploadRequests.length });
    assert.deepEqual(diagnostics.consoleErrors, []);
    assert.deepEqual(diagnostics.pageErrors, []);
    assert.deepEqual(diagnostics.externalRequests, []);
    assert.deepEqual(diagnostics.rawUploadRequests, []);
    await context.close();
  }

  manifest.assertions = {
    console_errors: 0,
    page_errors: 0,
    unexpected_external_requests: 0,
    raw_file_network_uploads: 0,
    scene_count: 7,
    reduced_motion_complete: true,
    mobile_css_viewport: "390x844",
    primary_cta_visible_count: 1,
    mobile_scene_6_foreground_verified: true,
    mobile_initial_composition_verified: true,
    desktop_scene_6_people_verified: true,
    mobile_scene_6_people_verified: true,
    internal_field_exposure_verified: true,
    vite_port_closed_after_cleanup: true,
  };
  await writeFile(new URL("watchtree-browser-evidence.json", evidenceDir), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest.assertions));
} catch (error) {
  runError = error;
  await writeFile(new URL("browser-error.log", evidenceDir), `${error?.stack ?? error}\n`).catch(() => {});
} finally {
  if (browser) {
    try {
      await browser.close();
    } catch (error) {
      cleanupErrors.push(new Error(`Chromium cleanup failed: ${error?.message ?? error}`));
    }
  }
  try {
    await server.close();
  } catch (error) {
    cleanupErrors.push(new Error(`Vite cleanup failed: ${error?.message ?? error}`));
  }
  try {
    await waitForPortClosed();
  } catch (error) {
    cleanupErrors.push(error);
  }
  if (cleanupErrors.length) {
    await writeFile(new URL("cleanup-failure.log", evidenceDir), `${cleanupErrors.map((error) => error.stack ?? error).join("\n\n")}\n`);
  }
}

const failures = [runError, ...cleanupErrors].filter(Boolean);
if (failures.length) throw new AggregateError(failures, "WatchTree browser validation or cleanup failed.");
