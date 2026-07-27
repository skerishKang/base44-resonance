import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const rootUrl = "http://127.0.0.1:4173/tests/harness/index.html";
const evidenceDir = new URL("../evidence/", import.meta.url);
await mkdir(evidenceDir, { recursive: true });

const server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "4173", "--strictPort"], {
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, BROWSER: "none" },
});
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk; });
server.stderr.on("data", (chunk) => { serverOutput += chunk; });
server.unref();
server.stdout.unref();
server.stderr.unref();

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Vite exited early: ${serverOutput}`);
    try {
      const response = await fetch(rootUrl);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Vite did not start: ${serverOutput}`);
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifest = { schema_version: 1, generated_at: new Date().toISOString(), states: [], assertions: {} };

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
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
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

async function capture(page, name, required = {}) {
  const path = new URL(`${name}.png`, evidenceDir);
  await page.screenshot({ path: path.pathname, fullPage: false });
  const bytes = await readFile(path);
  const layout = await layoutState(page);
  const state = {
    name,
    css_viewport: `${layout.viewport.width}x${layout.viewport.height}`,
    physical_pixels: `${Math.round(layout.viewport.width * layout.viewport.deviceScaleFactor)}x${Math.round(layout.viewport.height * layout.viewport.deviceScaleFactor)}`,
    device_scale_factor: layout.viewport.deviceScaleFactor,
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

await waitForServer();
const browser = await chromium.launch({ headless: true });
try {
  // Desktop cinematic scene inventory.
  {
    const { context, page, diagnostics } = await openContext(browser);
    for (let scene = 1; scene <= 7; scene += 1) {
      await page.getByRole("button", { name: `Scene ${scene}` }).click();
      await page.locator(`.watchtree-scene[data-scene="${scene}"]`).waitFor({ state: "visible" });
      const required = scene === 6 ? {
        trees: await page.locator('.watchtree-scene[data-scene="6"] [data-watchtree]').count(),
        evidence: await page.locator('.watchtree-scene[data-scene="6"] .shared-evidence span').allTextContents(),
      } : {};
      await capture(page, `desktop-scene-${scene}`, required);
    }
    assert.equal(await page.locator('[data-primary-cta="resonance"]:visible').count(), 1);
    assert.deepEqual(diagnostics.consoleErrors, []);
    assert.deepEqual(diagnostics.pageErrors, []);
    assert.deepEqual(diagnostics.externalRequests, []);
    await context.close();
  }

  // Mobile initial viewport and Scene 6.
  {
    const { context, page, diagnostics } = await openContext(browser, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const cta = page.locator('[data-primary-cta="resonance"]:visible');
    assert.equal(await cta.count(), 1);
    const ctaBox = await cta.boundingBox();
    assert.ok(ctaBox && ctaBox.y + ctaBox.height <= 844, "mobile primary CTA must be in the initial viewport");
    await capture(page, "mobile-initial", { proposition: await page.locator("#watchtree-title").innerText(), primary_cta: 1 });
    await page.getByRole("button", { name: "Scene 6" }).click();
    await capture(page, "mobile-scene-6", { trees: await page.locator('.watchtree-scene[data-scene="6"] [data-watchtree]').count(), evidence: await page.locator('.shared-evidence span').allTextContents() });
    assert.deepEqual(diagnostics.consoleErrors, []);
    assert.deepEqual(diagnostics.pageErrors, []);
    assert.deepEqual(diagnostics.externalRequests, []);
    await context.close();
  }

  // Actual prefers-reduced-motion static narrative on desktop and mobile.
  for (const spec of [
    { name: "desktop-reduced", viewport: { width: 1440, height: 900 }, dsf: 1 },
    { name: "mobile-reduced", viewport: { width: 390, height: 844 }, dsf: 2 },
  ]) {
    const { context, page, diagnostics } = await openContext(browser, { viewport: spec.viewport, deviceScaleFactor: spec.dsf, reducedMotion: "reduce" });
    assert.equal(await page.locator(".watchtree-cinema").evaluate((element) => getComputedStyle(element).display), "none");
    const reduced = page.locator("[data-testid=reduced-story]");
    await reduced.waitFor({ state: "visible" });
    const required = {
      persons: await reduced.locator(".reduced-person > img").count(),
      fragments: await reduced.locator(".reduced-fragments img").count(),
      trees: await reduced.locator("[data-watchtree]").count(),
      evidence: await reduced.locator(".reduced-path span").allTextContents(),
      product_choices: await reduced.locator(".reduced-product-choices span").count(),
      cta: await reduced.getByRole("button").count(),
    };
    assert.deepEqual(required, { persons: 2, fragments: 3, trees: 2, evidence: ["Exact overlap", "Rare signal", "Shared path", "Meaningful difference"], product_choices: 3, cta: 1 });
    await capture(page, spec.name, required);
    assert.deepEqual(diagnostics.consoleErrors, []);
    assert.deepEqual(diagnostics.pageErrors, []);
    assert.deepEqual(diagnostics.externalRequests, []);
    await context.close();
  }

  // Full synthetic journey, exclusions, consent, withdrawal, mutual, language, reload.
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
  };
  await writeFile(new URL("watchtree-browser-evidence.json", evidenceDir), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest.assertions));
} finally {
  await browser.close().catch(() => {});
  server.kill("SIGKILL");
}
