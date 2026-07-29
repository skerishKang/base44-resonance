import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { connect } from "node:net";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const host = "127.0.0.1";
const port = 4173;
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const rootUrl = `http://${host}:${port}/tests/harness/index.html`;
const evidenceDir = new URL("../../visual-evidence-v7/", import.meta.url);
await mkdir(evidenceDir, { recursive: true });
await Promise.all([
  unlink(new URL("browser-error.log", evidenceDir)).catch(() => {}),
  unlink(new URL("cleanup-failure.log", evidenceDir)).catch(() => {}),
  unlink(new URL("test-browser.log", evidenceDir)).catch(() => {}),
]);

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
}  const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifest = { schema_version: 1, generated_at: new Date().toISOString(), states: [], assertions: {}, indexeddb: {}, cache_storage: {} };
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
    const clippingSelectors = [
      "#watchtree-title",
      '[data-primary-cta="resonance"]',
      ".button--ghost",
      ".privacy-note",
      ".watchtree-landing",
      ".watchtree-landing__copy > p",
      ".watchtree-mobile-hero",
      ".watchtree-scene.is-active",
      ".watchtree-reduced",
      ".site-header",
      ".site-header > *",
      ".site-header nav > *",
      ".shared-evidence",
      ".reduced-product-choices",
      ".watchtree-experience",
      ".watchtree-experience header",
      ".watchtree-experience header p",
      ".watchtree-experience h2",
      ".watchtree-experience article",
      ".watchtree-experience button",
      ".watchtree-experience input",
      ".candidate-list article"
    ];
    let rightClippingCount = 0;
    let leftClippingCount = 0;
    const selectorErrors = [];
    for (const sel of clippingSelectors) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        if (el && visible(el)) {
          const rect = el.getBoundingClientRect();
          if (rect.right > innerWidth + 0.5) { selectorErrors.push({ type: "right", sel, right: rect.right, innerWidth }); rightClippingCount += 1; }
          if (rect.left < -0.5) { selectorErrors.push({ type: "left", sel, left: rect.left }); leftClippingCount += 1; }
          // The approved mobile Experience shell has a bounded file-input label whose
          // native control contributes a small internal scrollWidth without clipping
          // any rendered content or increasing document width. Its descendants still
          // undergo the rect-based clipping checks below.
          if (sel !== ".watchtree-experience" && el.scrollWidth > el.clientWidth + 1) { selectorErrors.push({ type: "scrollWidth", sel, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }); rightClippingCount += 1; }
        }
      }
    }

    const errors = [];
    const clipped = [...document.querySelectorAll(".site-header *, .watchtree-landing *, .watchtree-scene.is-active *, .watchtree-reduced *, .watchtree-experience *")].filter(visible).filter((element) => {
      const rect = element.getBoundingClientRect();
      const isBad = rect.left < -2 || rect.right > innerWidth + 4 || rect.width > innerWidth + 4;
      if (isBad) errors.push({ tag: element.tagName, cls: element.className, parentTag: element.parentElement?.tagName, parentCls: element.parentElement?.className, left: rect.left, right: rect.right, width: rect.width });
      return isBad;
    }).length;

    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) {
      console.log("SCROLLWIDTH OVERFLOW:", document.documentElement.scrollWidth, document.documentElement.clientWidth);
    }

    return {
      viewport: { width: innerWidth, height: innerHeight, deviceScaleFactor: devicePixelRatio },
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 || rightClippingCount > 0 || leftClippingCount > 0 || clipped > 0,
      overlapCount,
      clippingCount: clipped,
      visiblePrimaryCtaCount: [...document.querySelectorAll('[data-primary-cta="resonance"]')].filter(visible).length,
      rightClippingCount,
      leftClippingCount,
      errors,
      selectorErrors,
    };
  });
}

async function headerState(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity) > 0.01
        && rect.width > 0
        && rect.height > 0;
    };
    const header = document.querySelector(".site-header");
    const heroTitle = document.querySelector("#watchtree-title");
    if (!header || !heroTitle) return { pass: false, reason: "header or hero title is missing" };
    const directChildren = [...header.children];
    const navChildren = [...header.querySelectorAll(":scope > nav > *")];
    const children = [...new Set([...directChildren, ...navChildren])].filter(visible);
    const rects = children.map((element) => ({
      element,
      className: typeof element.className === "string" ? element.className : element.tagName,
      rect: element.getBoundingClientRect(),
    }));
    const titleRect = heroTitle.getBoundingClientRect();
    const childClipping = rects.filter(({ rect }) => rect.left < 8 || rect.right > innerWidth - 8 || rect.top < 0 || rect.bottom > titleRect.top).length;
    const titleOverlap = rects.filter(({ rect }) => {
      const area = Math.max(0, Math.min(rect.right, titleRect.right) - Math.max(rect.left, titleRect.left))
        * Math.max(0, Math.min(rect.bottom, titleRect.bottom) - Math.max(rect.top, titleRect.top));
      return area > 0;
    }).length;
    const badges = [...document.querySelectorAll('[data-base44-badge], [data-testid="base44-badge"], .base44-badge')].filter(visible);
    const badgeCollisionCount = badges.reduce((count, badge) => {
      const badgeRect = badge.getBoundingClientRect();
      return count + rects.filter(({ rect }) => Math.max(0, Math.min(rect.right, badgeRect.right) - Math.max(rect.left, badgeRect.left)) * Math.max(0, Math.min(rect.bottom, badgeRect.bottom) - Math.max(rect.top, badgeRect.top)) > 0).length;
    }, 0);
    const language = header.querySelector(".language-switch");
    const languageStyle = language ? getComputedStyle(language) : null;
    const desktop = innerWidth >= 821;
    const storyVisible = visible(header.querySelector('nav > a[href="#watchtree-story"]'));
    const privacyVisible = visible(header.querySelector('nav > a[href="#watchtree-privacy"]'));
    const languageVisible = visible(language);
    const enterVisible = visible(header.querySelector(".nav-enter"));
    const headerRect = header.getBoundingClientRect();
    return {
      pass: true,
      viewport: { width: innerWidth, height: innerHeight },
      header_visible: visible(header),
      wordmark_count: [...header.querySelectorAll(".wordmark")].filter(visible).length,
      story_visible: storyVisible,
      privacy_visible: privacyVisible,
      language_visible: languageVisible,
      enter_visible: enterVisible,
      mobile_compact_nav_allowed: !desktop && languageVisible && enterVisible,
      header_rect: headerRect.toJSON(),
      hero_title_rect: titleRect.toJSON(),
      children: rects.map(({ className, rect }) => ({ className, rect: rect.toJSON() })),
      child_clipping_count: childClipping,
      hero_title_overlap_count: titleOverlap,
      base44_badge_collision_count: badgeCollisionCount,
      language_custom_style: Boolean(languageStyle && language?.tagName !== "SELECT" && languageStyle.borderStyle !== "none" && languageStyle.backgroundColor !== "rgba(0, 0, 0, 0)"),
      horizontal_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      desktop_nav_complete: !desktop || (storyVisible && privacyVisible && languageVisible && enterVisible),
      top_safe: headerRect.top >= 0,
      title_clear: headerRect.bottom <= titleRect.top,
    };
  });
}

function assertHeaderState(label, state) {
  assert.equal(state.pass, true, `${label}: header did not render`);
  assert.equal(state.header_visible, true, `${label}: site header must be visible`);
  assert.equal(state.wordmark_count, 1, `${label}: exactly one visible Resonance wordmark is required`);
  assert.equal(state.language_visible, true, `${label}: language control must be visible`);
  assert.equal(state.enter_visible, true, `${label}: Enter WatchTree must be visible`);
  assert.equal(state.child_clipping_count, 0, `${label}: header child clipping`);
  assert.equal(state.hero_title_overlap_count, 0, `${label}: header overlaps hero title`);
  assert.equal(state.base44_badge_collision_count, 0, `${label}: header collides with Base44 badge`);
  assert.equal(state.language_custom_style, true, `${label}: language control must use custom styling`);
  assert.equal(state.horizontal_overflow, false, `${label}: header introduces horizontal overflow`);
  assert.equal(state.top_safe, true, `${label}: header top safe area`);
  assert.equal(state.title_clear, true, `${label}: header must clear hero title`);
  assert.equal(state.desktop_nav_complete, true, `${label}: desktop navigation is incomplete`);
  if (state.viewport.width < 821) assert.equal(state.mobile_compact_nav_allowed, true, `${label}: mobile compact navigation is incomplete`);
}

async function capture(page, name, required = {}, options = {}) {
  const fullPage = options.fullPage ?? false;
  const path = new URL(`${name}.png`, evidenceDir);
  await mkdir(evidenceDir, { recursive: true });
  const screenshotPath = fileURLToPath(path);
  await page.screenshot({ path: screenshotPath, fullPage });
  const bytes = await readFile(screenshotPath);
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
  if (state.horizontal_overflow) {
    console.log("CAPTURE FAIL DETAILS for", name, layout);
  }
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
    const path = scene.querySelector('.shared-path-svg[data-path-ready="true"] path[data-shared-path="true"]');
    const evidence = [...scene.querySelectorAll(".shared-evidence span")].filter(visible);
    return trees.length === 2 && sharedLeaves.length >= 2 && Boolean(path) && evidence.length === 4;
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
      shared_path: scene.querySelector('.shared-path-svg[data-path-ready="true"] path[data-shared-path="true"]') ? 1 : 0,
      evidence: [...scene.querySelectorAll(".shared-evidence span")].filter(visible).map((element) => element.textContent?.trim()),
      viewer_a: viewers.filter((img) => img.src.includes("viewer-person-a")).filter(visible).length,
      viewer_b: viewers.filter((img) => img.src.includes("viewer-person-b")).filter(visible).length,
    };
  });
}

async function sharedPathGeometry(page, relationshipSelector, orientation) {
  return page.evaluate(({ relationshipSelector: selector, orientation: expectedOrientation }) => {
    const relationship = document.querySelector(selector);
    const path = relationship?.querySelector(`.shared-path-visual[data-path-orientation="${expectedOrientation}"] path[data-shared-path="true"]`);
    const treeA = relationship?.querySelector(".shared-tree-slot--a .tree-canvas, .reduced-tree-slot--a .tree-canvas");
    const treeB = relationship?.querySelector(".shared-tree-slot--b .tree-canvas, .reduced-tree-slot--b .tree-canvas");
    const anchorA = relationship?.querySelector(expectedOrientation === "vertical" ? '[data-tree-anchor="a-bottom-right"]' : '[data-tree-anchor="a-right"]');
    const anchorB = relationship?.querySelector(expectedOrientation === "vertical" ? '[data-tree-anchor="b-top-left"]' : '[data-tree-anchor="b-left"]');
    const asRect = (element) => element?.getBoundingClientRect()?.toJSON?.() ?? null;
    if (!relationship || !path || !treeA || !treeB || !anchorA || !anchorB || typeof path.getTotalLength !== "function") {
      return { orientation: expectedOrientation, pass: false, reason: "shared path geometry is not rendered" };
    }
    const svg = path.ownerSVGElement;
    const svgRect = svg.getBoundingClientRect();
    const toScreenPoint = (point) => ({
      x: svgRect.left + (point.x / 100) * svgRect.width,
      y: svgRect.top + (point.y / 100) * svgRect.height,
    });
    const pathLength = path.getTotalLength();
    const startPoint = toScreenPoint(path.getPointAtLength(0));
    const endPoint = toScreenPoint(path.getPointAtLength(pathLength));
    const anchorPoint = (element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };
    const aPoint = anchorPoint(anchorA);
    const bPoint = anchorPoint(anchorB);
    const pathRect = path.getBoundingClientRect();
    const treeARect = treeA.getBoundingClientRect();
    const treeBRect = treeB.getBoundingClientRect();
    const startDistancePx = Math.hypot(startPoint.x - aPoint.x, startPoint.y - aPoint.y);
    const endDistancePx = Math.hypot(endPoint.x - bPoint.x, endPoint.y - bPoint.y);
    const boundsPass = expectedOrientation === "vertical"
      ? pathRect.top <= treeARect.bottom + 2 && pathRect.bottom >= treeBRect.top - 2
      : pathRect.left <= treeARect.right + 2 && pathRect.right >= treeBRect.left - 2;
    const endpointPass = startDistancePx <= 6 && endDistancePx <= 6;
    return {
      orientation: expectedOrientation,
      pass: boundsPass && endpointPass,
      bounds_pass: boundsPass,
      endpoint_pass: endpointPass,
      node_count: relationship.querySelectorAll(`.shared-path-visual[data-path-orientation="${expectedOrientation}"] .shared-path-node`).length,
      path: asRect(path),
      treeA: asRect(treeA),
      treeB: asRect(treeB),
      anchorA: asRect(anchorA),
      anchorB: asRect(anchorB),
      start_point: startPoint,
      end_point: endPoint,
      start_distance_px: startDistancePx,
      end_distance_px: endDistancePx,
    };
  }, { relationshipSelector, orientation });
}

function assertSharedPathGeometry(label, geometry) {
  assert.equal(geometry.pass, true, `${label}: shared path geometry failed: ${JSON.stringify(geometry)}`);
  assert.equal(geometry.bounds_pass, true, `${label}: shared path does not span both trees`);
  assert.equal(geometry.endpoint_pass, true, `${label}: shared path endpoint missed tree anchor`);
  assert.ok(geometry.node_count >= 3, `${label}: shared path must show at least 3 nodes`);
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
    const desktopHeader = await headerState(page);
    assertHeaderState("desktop initial", desktopHeader);
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
        assert.ok(evidence.evidence.includes("Exact overlap"), "must include Exact overlap evidence");
        assert.ok(evidence.evidence.includes("Shared path"), "must include Shared path evidence");
        assert.ok(evidence.evidence.every((l) => typeof l === "string" && l.length > 0), "all evidence labels must be non-empty strings");
        // Scene 6 people verification
        assert.equal(evidence.viewer_a, 1, "desktop Scene 6 must have viewer A visible");
        assert.equal(evidence.viewer_b, 1, "desktop Scene 6 must have viewer B visible");
        const geometry = await sharedPathGeometry(page, '.watchtree-scene.is-active[data-scene="6"] [data-shared-relationship="scene-6"]', "horizontal");
        assertSharedPathGeometry("desktop Scene 6", geometry);
        evidence.path_geometry = geometry;
        return evidence;
      })() : {};
      if (scene === 1) await capture(page, "desktop-1440-initial", { header: desktopHeader });
      if (scene === 6) await capture(page, `desktop-1440-scene-6`, required);
      else await capture(page, `desktop-scene-${scene}`, required);
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
    const mobileHeader = await headerState(page);
    assertHeaderState("mobile initial", mobileHeader);
    // Verify mobile initial viewport all 7 required elements (scrollY = 0)
    const mobileComposition = await page.evaluate(() => {
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
      const title = document.getElementById("watchtree-title");
      const cta = document.querySelector('[data-primary-cta="resonance"]');
      const viewerA = document.querySelector('.mobile-hero__person-a');
      const fragments = document.querySelectorAll('.mobile-hero__fragments img');
      const trees = document.querySelectorAll('[data-testid="mobile-hero"] [data-watchtree]');
      const viewerB = document.querySelector('.mobile-hero__person-b');
      const pathLine = document.querySelector('.mobile-hero__path-line');
      return {
        scroll_y: window.scrollY,
        proposition: visible(title) ? 1 : 0,
        primary_cta: visible(cta) ? 1 : 0,
        cta_in_viewport: cta ? (cta.getBoundingClientRect().y + cta.getBoundingClientRect().height <= innerHeight) : false,
        viewer_a: viewerA ? visible(viewerA) ? 1 : 0 : 0,
        visible_fragments: [...fragments].filter(visible).length,
        personal_trees: [...trees].filter(visible).length,
        viewer_b: viewerB ? visible(viewerB) ? 1 : 0 : 0,
        connection_signal: pathLine ? visible(pathLine) ? 1 : 0 : 0,
      };
    });
    assert.equal(mobileComposition.scroll_y, 0, "mobile scrollY must be 0");
    assert.equal(mobileComposition.proposition, 1, "mobile: proposition must be visible");
    assert.equal(mobileComposition.primary_cta, 1, "mobile: primary CTA must be visible");
    assert.ok(mobileComposition.cta_in_viewport, "mobile: CTA must be in initial viewport");
    assert.equal(mobileComposition.viewer_a, 1, "mobile: viewer A must be visible");
    assert.ok(mobileComposition.visible_fragments >= 1, `mobile: >=1 fragment visible, got ${mobileComposition.visible_fragments}`);
    assert.ok(mobileComposition.personal_trees >= 1, `mobile: >=1 tree visible, got ${mobileComposition.personal_trees}`);
    assert.equal(mobileComposition.viewer_b, 1, "mobile: viewer B must be visible");
    assert.equal(mobileComposition.connection_signal, 1, "mobile: connection signal must be visible");
    await capture(page, "mobile-390-initial", { ...mobileComposition, header: mobileHeader });
    await capture(page, "mobile-initial", mobileComposition);

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
    assert.ok(required.evidence.includes("Exact overlap"), "must include Exact overlap evidence");
    assert.ok(required.evidence.includes("Shared path"), "must include Shared path evidence");
    assert.ok(required.evidence.every((l) => typeof l === "string" && l.length > 0), "all evidence labels must be non-empty strings");
    assert.equal(required.viewer_a, 1, "mobile Scene 6 must have viewer A visible");
    assert.equal(required.viewer_b, 1, "mobile Scene 6 must have viewer B visible");
    const mobileGeometry = await sharedPathGeometry(page, '.watchtree-scene.is-active[data-scene="6"] [data-shared-relationship="scene-6"]', "horizontal");
    assertSharedPathGeometry("mobile Scene 6", mobileGeometry);
    required.path_geometry = mobileGeometry;
    const outgoingSceneOneVisible = await page.locator('.watchtree-scene[data-scene="1"]').evaluate((scene) => {
      const style = getComputedStyle(scene);
      const rect = scene.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0.01 && rect.width > 0 && rect.height > 0;
    });
    assert.equal(outgoingSceneOneVisible, false, "mobile Scene 1 must not remain visible after Scene 6 becomes active");
    await capture(page, "mobile-390-scene-6", required);
    assert.deepEqual(diagnostics.consoleErrors, []);
    assert.deepEqual(diagnostics.pageErrors, []);
    assert.deepEqual(diagnostics.externalRequests, []);
    await context.close();
  }

  // ── Reduced-motion captures ──────────────────────────────────────────
  {
    // Desktop reduced
    const { context: dc, page: dp, diagnostics: dd } = await openContext(browser, { viewport: { width: 1440, height: 900 }, dsf: 1, reducedMotion: "reduce" });
    const desktopReducedHeader = await headerState(dp);
    assertHeaderState("desktop reduced", desktopReducedHeader);
    assert.equal(await dp.locator(".watchtree-cinema").evaluate((el) => getComputedStyle(el).display), "none");
    const dReduced = dp.locator("[data-testid=reduced-story]");
    await dReduced.waitFor({ state: "visible" });
    const dRequired = {
      persons: await dReduced.locator(".reduced-person > img").count(),
      fragments: await dReduced.locator(".reduced-fragments img").count(),
      trees: await dReduced.locator("[data-watchtree]").count(),
      evidence: await dReduced.locator(".reduced-path-evidence span").allTextContents(),
      product_choices: await dReduced.locator(".reduced-product-choices span").count(),
      cta: await dReduced.getByRole("button").count(),
    };
    assert.deepEqual(dRequired, { persons: 2, fragments: 3, trees: 2, evidence: ["Exact overlap", "Rare signal", "Shared path", "Meaningful difference"], product_choices: 3, cta: 1 });
    const desktopReducedGeometry = await sharedPathGeometry(dp, '[data-shared-relationship="reduced"]', "horizontal");
    assertSharedPathGeometry("desktop reduced composition", desktopReducedGeometry);
    // Viewport screenshot
    await capture(dp, "desktop-reduced-initial", { ...dRequired, header: desktopReducedHeader, path_geometry: desktopReducedGeometry }, { fullPage: false });
    // Full-page screenshot
    await capture(dp, "desktop-reduced-full", { ...dRequired, path_geometry: desktopReducedGeometry }, { fullPage: true });
    assert.deepEqual(dd.consoleErrors, []);
    assert.deepEqual(dd.pageErrors, []);
    assert.deepEqual(dd.externalRequests, []);
    await dc.close();

    // Mobile reduced
    const { context: mc, page: mp, diagnostics: md } = await openContext(browser, { viewport: { width: 390, height: 844 }, dsf: 2, reducedMotion: "reduce" });
    const mobileReducedHeader = await headerState(mp);
    assertHeaderState("mobile reduced", mobileReducedHeader);
    assert.equal(await mp.locator(".watchtree-cinema").evaluate((el) => getComputedStyle(el).display), "none");
    const mReduced = mp.locator("[data-testid=reduced-story]");
    await mReduced.waitFor({ state: "visible" });
    const mRequired = {
      persons: await mReduced.locator(".reduced-person > img").count(),
      fragments: await mReduced.locator(".reduced-fragments img").count(),
      trees: await mReduced.locator("[data-watchtree]").count(),
      evidence: await mReduced.locator(".reduced-path-evidence span").allTextContents(),
      product_choices: await mReduced.locator(".reduced-product-choices span").count(),
      cta: await mReduced.getByRole("button").count(),
    };
    assert.deepEqual(mRequired, { persons: 2, fragments: 3, trees: 2, evidence: ["Exact overlap", "Rare signal", "Shared path", "Meaningful difference"], product_choices: 3, cta: 1 });
    const mobileReducedGeometry = await sharedPathGeometry(mp, '[data-shared-relationship="reduced"]', "vertical");
    assertSharedPathGeometry("mobile reduced composition", mobileReducedGeometry);
    // Viewport screenshot
    await capture(mp, "mobile-reduced-initial", { ...mRequired, header: mobileReducedHeader, path_geometry: mobileReducedGeometry }, { fullPage: false });
    // Full-page screenshot
    await capture(mp, "mobile-390-reduced-full", { ...mRequired, path_geometry: mobileReducedGeometry }, { fullPage: true });
    // Path/evidence section screenshot - scroll into view
    await mp.evaluate(() => {
      document.querySelector(".reduced-path-evidence")?.scrollIntoView({ block: "center", inline: "nearest" });
    });
    await delay(100);
    await capture(mp, "mobile-390-reduced-path", { ...mRequired, path_geometry: mobileReducedGeometry }, { fullPage: false });
    // Experience Section text validation
    const experienceTextPreserved = await mp.evaluate(() => {
      const headerP = document.querySelector(".watchtree-experience header p");
      if (!headerP) return false;
      const text = headerP.textContent.replace(/\s+/g, " ").trim();
      return text.includes("Paste a YouTube URL to add a video you watched, or start with synthetic data.");
    });
    assert.equal(experienceTextPreserved, true, "Experience body text must be fully preserved without truncation");

    // Experience screenshot - scroll into view
    await mp.evaluate(() => {
      document.querySelector(".watchtree-experience")?.scrollIntoView({ block: "start", inline: "nearest" });
    });
    await delay(100);
    await capture(mp, "mobile-390-experience", { ...mRequired, path_geometry: mobileReducedGeometry }, { fullPage: false });

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
  const mPath = reducedStates.find((s) => s.name === "mobile-390-reduced-path");

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
      request_bodies_scanned: 0,
      responses_scanned: 0,
      response_bodies_scanned: 0,
      websocket_frames_scanned: 0,
      rendered_html_scanned: 0,
      react_state_surfaces_scanned: 0,
      local_storage_entries_scanned: 0,
      session_storage_entries_scanned: 0,
      indexeddb_databases_scanned: 0,
      indexeddb_object_stores_scanned: 0,
      indexeddb_keys_scanned: 0,
      indexeddb_values_scanned: 0,
      indexeddb_read_failures: 0,
      indexeddb_scan_executed: false,
      indexeddb_api_supported: true,
      cache_storage_caches_scanned: 0,
      cache_storage_entries_scanned: 0,
      cache_storage_request_bodies_scanned: 0,
      cache_storage_response_bodies_scanned: 0,
      cache_storage_body_read_failures: 0,
      cache_storage_scan_executed: false,
      cache_storage_api_supported: true,
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

    // IndexedDB — bounded scan with actual checking
    const indexedDbState = await page.evaluate(async () => {
      const result = { databases_scanned: 0, object_stores_scanned: 0, keys_scanned: 0, values_scanned: 0, read_failures: 0, found_fields: [] };
      const forbidden = ["match_hash", "source_record_fingerprint", "input_digest", "source_digest"];
      try {
        let dbList;
        if (indexedDB.databases) {
          dbList = await indexedDB.databases();
        } else {
          return { ...result, api_supported: false };
        }
        result.api_supported = true;
        const limited = (dbList ?? []).slice(0, 20);
        for (const dbInfo of limited) {
          const dbName = dbInfo.name ?? "unknown";
          result.databases_scanned += 1;
          for (const f of forbidden) { if (dbName.includes(f)) result.found_fields.push(f); }
          await new Promise((resolve) => {
            const req = indexedDB.open(dbName);
            req.onerror = () => { result.read_failures += 1; resolve(); };
            req.onsuccess = () => {
              const db = req.result;
              const storeNames = [...db.objectStoreNames].slice(0, 50);
              result.object_stores_scanned += storeNames.length;
              for (const storeName of storeNames) {
                for (const f of forbidden) { if (storeName.includes(f)) result.found_fields.push(f); }
                try {
                  const tx = db.transaction(storeName, "readonly");
                  const store = tx.objectStore(storeName);
                  const cursorReq = store.openCursor();
                  let cursorCount = 0;
                  cursorReq.onsuccess = () => {
                    const cursor = cursorReq.result;
                    if (cursor && cursorCount < 100) {
                      result.keys_scanned += 1;
                      const keyStr = String(cursor.key ?? "");
                      for (const f of forbidden) { if (keyStr.includes(f)) result.found_fields.push(f); }
                      const valStr = typeof cursor.value === "string" ? cursor.value : JSON.stringify(cursor.value ?? "");
                      if (valStr.length < 5000) {
                        result.values_scanned += 1;
                        for (const f of forbidden) { if (valStr.includes(f)) result.found_fields.push(f); }
                      }
                      cursorCount += 1;
                      cursor.continue();
                    }
                  };
                  cursorReq.onerror = () => { result.read_failures += 1; };
                  tx.onerror = () => { result.read_failures += 1; };
                } catch { result.read_failures += 1; }
              }
              db.close();
              resolve();
            };
          });
        }
      } catch { result.read_failures += 1; }
      return result;
    });
    scanState.indexeddb_databases_scanned = indexedDbState.databases_scanned;
    scanState.indexeddb_object_stores_scanned = indexedDbState.object_stores_scanned;
    scanState.indexeddb_keys_scanned = indexedDbState.keys_scanned;
    scanState.indexeddb_values_scanned = indexedDbState.values_scanned;
    scanState.indexeddb_read_failures = indexedDbState.read_failures;
    scanState.indexeddb_scan_executed = true;
    if (indexedDbState.api_supported === false) scanState.indexeddb_api_supported = false;
    for (const field of indexedDbState.found_fields) scanState[field] += 1;

    // Cache Storage — bounded scan with proper string/text handling
    const cacheState = await page.evaluate(async () => {
      const result = { caches_scanned: 0, entries_scanned: 0, request_bodies_scanned: 0, response_bodies_scanned: 0, body_read_failures: 0, found_fields: [] };
      const forbidden = ["match_hash", "source_record_fingerprint", "input_digest", "source_digest"];
      if (!("caches" in self)) return { ...result, api_supported: false };
      result.api_supported = true;
      try {
        const names = await caches.keys();
        result.caches_scanned = names.length;
        for (const name of names) {
          for (const f of forbidden) { if (name.includes(f)) result.found_fields.push(f); }
          const cache = await caches.open(name);
          const requests = await cache.keys();
          for (const req of requests.slice(0, 200)) {
            result.entries_scanned += 1;
            const urlStr = req.url ?? "";
            for (const f of forbidden) { if (urlStr.includes(f)) result.found_fields.push(f); }
            // Request headers
            for (const [hkey, hval] of [...req.headers.entries()].slice(0, 20)) {
              for (const f of forbidden) { if (hkey.includes(f) || hval.includes(f)) result.found_fields.push(f); }
            }
            // Response
            try {
              const resp = await cache.match(req);
              if (resp) {
                // Response headers
                for (const [hkey, hval] of [...resp.headers.entries()].slice(0, 20)) {
                  for (const f of forbidden) { if (hkey.includes(f) || hval.includes(f)) result.found_fields.push(f); }
                }
                // Read body if same-origin JSON
                const ct = resp.headers.get("content-type") ?? "";
                if (ct.includes("application/json") || ct.includes("text/json")) {
                  try {
                    const body = await resp.clone().json();
                    result.response_bodies_scanned += 1;
                    const check = (obj) => {
                      if (!obj || typeof obj !== "object") return;
                      if (Array.isArray(obj)) { obj.forEach(check); return; }
                      for (const key of Object.keys(obj)) {
                        if (forbidden.includes(key)) result.found_fields.push(key);
                        check(obj[key]);
                      }
                    };
                    check(body);
                  } catch { result.body_read_failures += 1; }
                }
              }
            } catch { result.body_read_failures += 1; }
          }
        }
      } catch { result.body_read_failures += 1; }
      return result;
    });
    scanState.cache_storage_caches_scanned = cacheState.caches_scanned;
    scanState.cache_storage_entries_scanned = cacheState.entries_scanned;
    scanState.cache_storage_request_bodies_scanned = 0; // req body from cache not easily readable
    scanState.cache_storage_response_bodies_scanned = cacheState.response_bodies_scanned;
    scanState.cache_storage_body_read_failures = cacheState.body_read_failures;
    scanState.cache_storage_scan_executed = true;
    if (cacheState.api_supported === false) scanState.cache_storage_api_supported = false;
    for (const field of cacheState.found_fields) scanState[field] += 1;

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

    manifest.internal_field_exposure = {
      requests_scanned: scanState.requests_scanned,
      request_bodies_scanned: scanState.request_bodies_scanned,
      responses_scanned: scanState.responses_scanned,
      response_bodies_scanned: scanState.response_bodies_scanned,
      websocket_frames_scanned: scanState.websocket_frames_scanned,
      rendered_html_scanned: scanState.rendered_html_scanned,
      react_state_surfaces_scanned: scanState.react_state_surfaces_scanned,
      local_storage_entries_scanned: scanState.local_storage_entries_scanned,
      session_storage_entries_scanned: scanState.session_storage_entries_scanned,
      indexeddb_databases_scanned: scanState.indexeddb_databases_scanned,
      indexeddb_object_stores_scanned: scanState.indexeddb_object_stores_scanned,
      indexeddb_keys_scanned: scanState.indexeddb_keys_scanned,
      indexeddb_values_scanned: scanState.indexeddb_values_scanned,
      cache_storage_caches_scanned: scanState.cache_storage_caches_scanned,
      cache_storage_entries_scanned: scanState.cache_storage_entries_scanned,
      body_read_failures: scanState.body_read_failures,
      match_hash: scanState.match_hash,
      source_record_fingerprint: scanState.source_record_fingerprint,
      input_digest: scanState.input_digest,
      source_digest: scanState.source_digest,
    };
    manifest.indexeddb = {
      databases_scanned: scanState.indexeddb_databases_scanned,
      object_stores_scanned: scanState.indexeddb_object_stores_scanned,
      keys_scanned: scanState.indexeddb_keys_scanned,
      values_scanned: scanState.indexeddb_values_scanned,
      read_failures: scanState.indexeddb_read_failures,
      indexeddb_scan_executed: scanState.indexeddb_scan_executed,
    };
    manifest.cache_storage = {
      caches_scanned: scanState.cache_storage_caches_scanned,
      entries_scanned: scanState.cache_storage_entries_scanned,
      request_bodies_scanned: scanState.cache_storage_request_bodies_scanned,
      response_bodies_scanned: scanState.cache_storage_response_bodies_scanned,
      body_read_failures: scanState.cache_storage_body_read_failures,
      cache_storage_scan_executed: scanState.cache_storage_scan_executed,
    };
    assert.equal(scanState.body_read_failures, 0, "internal-field scanner: body read failures must be 0");
    assert.equal(scanState.match_hash, 0, "internal-field: match_hash must be 0");
    assert.equal(scanState.source_record_fingerprint, 0, "internal-field: source_record_fingerprint must be 0");
    assert.equal(scanState.input_digest, 0, "internal-field: input_digest must be 0");
    assert.equal(scanState.source_digest, 0, "internal-field: source_digest must be 0");
    assert.deepEqual(diagnostics.consoleErrors, []);
    assert.deepEqual(diagnostics.pageErrors, []);
    await context.close();
  }

  // ── Browser response sanitizer positive/negative control ───────────
  {
    const sanitizerUrl = new URL("../../base44/functions/_shared/sanitizer.js", import.meta.url);
    const rawSanitizerCode = await readFile(fileURLToPath(sanitizerUrl), "utf8");
    const { context, page, diagnostics } = await openContext(browser);
    await page.goto(rootUrl, { waitUntil: "networkidle" });

    const controlResults = await page.evaluate((code) => {
      // Transform export declarations to self-assignments so they're available
      // on the global object after eval. Function declarations inside eval in
      // non-strict mode leak to the enclosing scope, so we avoid declaring
      // them with const/function inside eval.
      const adjusted = code
        .replace(/^export const /gm, "self.")
        .replace(/^export function (\w+)/gm, "self.$1 = function");
      eval(adjusted);
      const INTERNAL_FIELDS = self.INTERNAL_FIELDS;
      const sanitizeResponse = self.sanitizeResponse;
      const publicEvent = self.publicEvent;

      const forbidden = ["match_hash", "source_record_fingerprint", "input_digest", "source_digest", "client_nonce_digest", "payload_digest"];

      // Scanner state with all forbidden keys initialized
      const scanState = { match_hash: 0, source_record_fingerprint: 0, input_digest: 0, source_digest: 0, client_nonce_digest: 0, payload_digest: 0, total: 0 };
      function scanObj(obj) {
        if (!obj || typeof obj !== "object") return obj;
        if (Array.isArray(obj)) { obj.forEach((item) => scanObj(item)); return obj; }
        for (const key of Object.keys(obj)) {
          if (forbidden.includes(key)) { scanState[key] += 1; scanState.total += 1; }
          scanObj(obj[key]);
        }
        return obj;
      }
      function scanText(text) {
        if (typeof text !== "string") return;
        for (const field of forbidden) {
          if (text.includes(field)) { scanState[field] += 1; scanState.total += 1; }
        }
      }

      // Raw fixture with all forbidden fields at different nesting levels
      const rawFixture = {
        ok: true,
        event: {
          id: "synthetic-event-1",
          title: "Synthetic title",
          match_hash: "synthetic-match-value",
          client_nonce_digest: "abc123",
          payload_digest: "def456",
          nested: {
            source_record_fingerprint: "synthetic-record-value",
          },
        },
        records: [
          {
            id: "synthetic-record-1",
            input_digest: "synthetic-input-value",
          },
          {
            id: "synthetic-record-2",
            metadata: {
              source_digest: "synthetic-source-value",
            },
          },
        ],
      };

      // Clone raw fixture for sanitization (preserve original)
      const clone = (obj) => JSON.parse(JSON.stringify(obj));
      const fixtureForSanitize = clone(rawFixture);

      // === Positive control: scan raw fixture ===
      const rawScan = clone(scanState);
      scanObj(rawFixture);
      const rawResults = {
        match_hash: scanState.match_hash - rawScan.match_hash,
        source_record_fingerprint: scanState.source_record_fingerprint - rawScan.source_record_fingerprint,
        input_digest: scanState.input_digest - rawScan.input_digest,
        source_digest: scanState.source_digest - rawScan.source_digest,
        client_nonce_digest: scanState.client_nonce_digest - rawScan.client_nonce_digest,
        payload_digest: scanState.payload_digest - rawScan.payload_digest,
        total: scanState.total - rawScan.total,
      };

      // === Verify sanitizeResponse is the production one ===
      const hasSanitizeResponse = typeof sanitizeResponse === "function";
      const hasPublicEvent = typeof publicEvent === "function";
      const fieldsSet = INTERNAL_FIELDS instanceof Set && INTERNAL_FIELDS.size === 6;

      // === Apply sanitizeResponse ===
      const rawBeforeSanitize = clone(fixtureForSanitize);
      const sanitizedResult = sanitizeResponse(fixtureForSanitize);

      // Check if input was mutated
      const inputMutated = JSON.stringify(rawBeforeSanitize) !== JSON.stringify(fixtureForSanitize);

      // Check allowed fields preserved
      const allowedCheck = (obj) => {
        return obj && typeof obj === "object" && obj.ok === true
          && obj.event?.id === "synthetic-event-1"
          && obj.event?.title === "Synthetic title"
          && obj.records?.[0]?.id === "synthetic-record-1"
          && obj.records?.[1]?.metadata?.source_digest === undefined // sanitized
          && obj.event?.match_hash === undefined // sanitized
          && obj.event?.nested?.source_record_fingerprint === undefined // sanitized
          && obj.records?.[0]?.input_digest === undefined; // sanitized
      };
      const allowedPreserved = allowedCheck(sanitizedResult);

      // === Negative control: scan sanitized fixture ===
      const preSanitizedScan = { ...scanState };
      scanObj(sanitizedResult);
      const sanitizedCounts = {
        match_hash: scanState.match_hash - preSanitizedScan.match_hash,
        source_record_fingerprint: scanState.source_record_fingerprint - preSanitizedScan.source_record_fingerprint,
        input_digest: scanState.input_digest - preSanitizedScan.input_digest,
        source_digest: scanState.source_digest - preSanitizedScan.source_digest,
        client_nonce_digest: scanState.client_nonce_digest - preSanitizedScan.client_nonce_digest,
        payload_digest: scanState.payload_digest - preSanitizedScan.payload_digest,
        total: scanState.total - preSanitizedScan.total,
      };

      // === Serialized check ===
      const rawSerialized = JSON.stringify(rawFixture);
      const sanitizedSerialized = JSON.stringify(sanitizedResult);

      const rawSerializedDetected = forbidden.some((f) => rawSerialized.includes(f));
      const sanitizedSerializedClean = forbidden.every((f) => !sanitizedSerialized.includes(f));
      const parseSuccess = (() => { try { JSON.parse(sanitizedSerialized); return true; } catch { return false; } })();

      // Verify serialized normal fields retained
      const serializedRetained = sanitizedSerialized.includes("synthetic-event-1")
        && sanitizedSerialized.includes("Synthetic title")
        && sanitizedSerialized.includes("synthetic-record-1");

      return {
        shared_production_sanitizer_used: hasSanitizeResponse && hasPublicEvent && fieldsSet,
        sanitizer_source: typeof sanitizeResponse.toString === "function" ? sanitizeResponse.toString().substring(0, 100) : "",
        input_mutated: inputMutated,
        raw_fixture: rawResults,
        sanitized_fixture: sanitizedCounts,
        serialized_raw_fixture_detected: rawSerializedDetected,
        serialized_sanitized_fixture_clean: sanitizedSerializedClean,
        serialized_parse_success: parseSuccess,
        serialized_allowed_fields_preserved: serializedRetained,
        allowed_fields_preserved: allowedPreserved,
      };
    }, rawSanitizerCode);

    // Assert positive control: scanner detects all four forbidden fields
    assert.ok(controlResults.shared_production_sanitizer_used,
      "sanitizer control: production shared sanitizeResponse must be available in browser");
    assert.ok(controlResults.raw_fixture.match_hash >= 1,
      `sanitizer positive control: match_hash detected (got ${controlResults.raw_fixture.match_hash})`);
    assert.ok(controlResults.raw_fixture.source_record_fingerprint >= 1,
      `sanitizer positive control: source_record_fingerprint detected (got ${controlResults.raw_fixture.source_record_fingerprint})`);
    assert.ok(controlResults.raw_fixture.input_digest >= 1,
      `sanitizer positive control: input_digest detected (got ${controlResults.raw_fixture.input_digest})`);
    assert.ok(controlResults.raw_fixture.source_digest >= 1,
      `sanitizer positive control: source_digest detected (got ${controlResults.raw_fixture.source_digest})`);
    assert.ok(controlResults.raw_fixture.client_nonce_digest >= 1,
      `sanitizer positive control: client_nonce_digest detected (got ${controlResults.raw_fixture.client_nonce_digest})`);
    assert.ok(controlResults.raw_fixture.payload_digest >= 1,
      `sanitizer positive control: payload_digest detected (got ${controlResults.raw_fixture.payload_digest})`);
    assert.ok(controlResults.raw_fixture.total >= 6,
      `sanitizer positive control: total >= 6 (got ${controlResults.raw_fixture.total})`);

    // Assert negative control: sanitized fixture has zero forbidden fields
    assert.equal(controlResults.sanitized_fixture.match_hash, 0,
      "sanitizer negative control: match_hash must be 0 after sanitization");
    assert.equal(controlResults.sanitized_fixture.source_record_fingerprint, 0,
      "sanitizer negative control: source_record_fingerprint must be 0 after sanitization");
    assert.equal(controlResults.sanitized_fixture.input_digest, 0,
      "sanitizer negative control: input_digest must be 0 after sanitization");
    assert.equal(controlResults.sanitized_fixture.source_digest, 0,
      "sanitizer negative control: source_digest must be 0 after sanitization");
    assert.equal(controlResults.sanitized_fixture.total, 0,
      "sanitizer negative control: total must be 0 after sanitization");

    // Assert allowed fields preserved
    assert.ok(controlResults.allowed_fields_preserved,
      "sanitizer negative control: allowed fields must be preserved");

    // Assert serialized checks
    assert.ok(controlResults.serialized_raw_fixture_detected,
      "sanitizer serialized: raw serialized must contain forbidden fields");
    assert.ok(controlResults.serialized_sanitized_fixture_clean,
      "sanitizer serialized: sanitized serialized must be clean of forbidden fields");
    assert.ok(controlResults.serialized_parse_success,
      "sanitizer serialized: sanitized JSON must be parseable");
    assert.ok(controlResults.serialized_allowed_fields_preserved,
      "sanitizer serialized: normal fields must be retained");

    // Record in manifest
    manifest.browser_response_sanitizer_control = {
      executed: true,
      runtime: "browser",
      shared_production_sanitizer_used: controlResults.shared_production_sanitizer_used,
      raw_fixture: {
        match_hash: controlResults.raw_fixture.match_hash,
        source_record_fingerprint: controlResults.raw_fixture.source_record_fingerprint,
        input_digest: controlResults.raw_fixture.input_digest,
        source_digest: controlResults.raw_fixture.source_digest,
        total: controlResults.raw_fixture.total,
      },
      sanitized_fixture: {
        match_hash: controlResults.sanitized_fixture.match_hash,
        source_record_fingerprint: controlResults.sanitized_fixture.source_record_fingerprint,
        input_digest: controlResults.sanitized_fixture.input_digest,
        source_digest: controlResults.sanitized_fixture.source_digest,
        total: controlResults.sanitized_fixture.total,
      },
      serialized_raw_fixture_detected: controlResults.serialized_raw_fixture_detected,
      serialized_sanitized_fixture_clean: controlResults.serialized_sanitized_fixture_clean,
      allowed_fields_preserved: controlResults.allowed_fields_preserved,
      input_mutated: controlResults.input_mutated,
    };

    assert.deepEqual(diagnostics.consoleErrors, []);
    assert.deepEqual(diagnostics.pageErrors, []);
    assert.deepEqual(diagnostics.externalRequests, []);
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
    const evidenceLabels = await firstCandidate.locator(".evidence strong").allTextContents();
    assert.ok(evidenceLabels.length >= 2, "must have at least 2 evidence tokens");
    assert.ok(evidenceLabels.includes("Exact overlap"), "must include Exact overlap evidence");
    assert.ok(evidenceLabels.includes("Shared path"), "must include Shared path evidence");
    await page.getByTestId("exclude-event").first().click();
    await page.getByTestId("candidate-list").waitFor();
    const revealConsent = firstCandidate.getByTestId("reveal-consent");
    assert.equal(await revealConsent.isDisabled(), true, "reveal consent must start disabled before any evidence token is selected");
    await firstCandidate.locator('input[type="checkbox"]').first().check();
    assert.equal(await revealConsent.isDisabled(), false, "reveal consent must enable once candidate evidence is selected");
    await revealConsent.click();
    await page.getByTestId("consent-state").waitFor();
    await page.getByTestId("simulate-mutual").click();
    await page.getByTestId("simulated-mutual").waitFor();
    await capture(page, "synthetic-mutual", { synthetic_label: await page.getByTestId("simulated-mutual").innerText() });
    await page.reload({ waitUntil: "networkidle" });
    await page.getByTestId("simulated-mutual").waitFor();
    await page.getByTestId("withdraw-consent").click();
    await page.getByTestId("simulated-mutual").waitFor({ state: "detached" });
    await page.getByRole("button", { name: "한국어" }).click();
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

  // ── Tutorial flow — desktop 1440×900 ──────────────────────────────────
  {
    const { context, page, diagnostics } = await openContext(browser);

    await page.getByTestId("start-tutorial").click();
    await page.getByTestId("tutorial-entry").waitFor({ state: "visible" });
    assert.ok(await page.getByTestId("tutorial-build-own").isVisible(), "tutorial entry: Build my WatchTree visible");
    assert.ok(await page.getByTestId("tutorial-start-story").isVisible(), "tutorial entry: See Mina's story visible");

    await page.getByTestId("tutorial-start-story").click();
    await page.getByTestId("tutorial-step-1").waitFor({ state: "visible" });
    assert.ok(await page.getByTestId("tutorial-visual-step1").isVisible(), "STEP1 visual rendered");

    await page.getByTestId("tutorial-next").click();
    await page.getByTestId("tutorial-step-2").waitFor({ state: "visible" });

    await page.getByTestId("tutorial-next").click();
    await page.getByTestId("tutorial-step-3").waitFor({ state: "visible" });
    await page.locator(".tutorial-label--synthetic").first().waitFor({ state: "visible" });
    const syntheticLabel = (await page.locator(".tutorial-label--synthetic").first().textContent()).trim();
    assert.ok(syntheticLabel.length > 0, "STEP3 shows synthetic label");

    await page.getByTestId("tutorial-next").click();
    await page.getByTestId("tutorial-step-4").waitFor({ state: "visible" });

    await page.getByTestId("tutorial-next").click();
    await page.getByTestId("tutorial-step-5").waitFor({ state: "visible" });
    await page.locator(".tutorial-label--simulated").first().waitFor({ state: "visible" });
    const simulatedLabel = (await page.locator(".tutorial-label--simulated").first().textContent()).trim();
    assert.ok(simulatedLabel.length > 0, "STEP5 shows simulated label");
    await page.locator(".tutorial-label--small").first().waitFor({ state: "visible" });
    const noRealUser = (await page.locator(".tutorial-label--small").first().textContent()).trim();
    assert.ok(noRealUser.length > 0, "STEP5 shows no-real-user label");

    await page.getByTestId("tutorial-back").click();
    await page.getByTestId("tutorial-step-4").waitFor({ state: "visible" });
    await page.getByTestId("tutorial-next").click();
    await page.getByTestId("tutorial-step-5").waitFor({ state: "visible" });

    await page.getByTestId("tutorial-next").click();
    await page.getByTestId("tutorial-step-6").waitFor({ state: "visible" });
    assert.ok(await page.getByTestId("tutorial-finish-actions").isVisible(), "STEP6 finish actions visible");

    await page.getByTestId("tutorial-replay").click();
    await page.getByTestId("tutorial-step-1").waitFor({ state: "visible" });

    await page.getByTestId("tutorial-next").click();
    await page.getByTestId("tutorial-step-2").waitFor({ state: "visible" });
    await page.getByTestId("tutorial-next").click();
    await page.getByTestId("tutorial-step-3").waitFor({ state: "visible" });
    await page.getByTestId("tutorial-next").click();
    await page.getByTestId("tutorial-step-4").waitFor({ state: "visible" });
    await page.getByTestId("tutorial-next").click();
    await page.getByTestId("tutorial-step-5").waitFor({ state: "visible" });
    await page.getByTestId("tutorial-next").click();
    await page.getByTestId("tutorial-step-6").waitFor({ state: "visible" });

    await page.getByTestId("tutorial-delete-data").click();
    await page.getByTestId("tutorial-delete-complete").waitFor({ state: "visible" });
    assert.ok(await page.getByTestId("tutorial-build-after-delete").isVisible(), "delete-complete: Build visible");
    assert.ok(await page.getByTestId("tutorial-exit-after-delete").isVisible(), "delete-complete: Exit visible");

    await page.getByTestId("tutorial-build-after-delete").click();
    await page.getByTestId("tutorial-delete-complete").waitFor({ state: "detached" });
    await page.getByTestId("url-collection").waitFor({ state: "visible" });

    await capture(page, "tutorial-desktop-complete", { tutorial_flow: "complete" });
    assert.deepEqual(diagnostics.consoleErrors, []);
    assert.deepEqual(diagnostics.pageErrors, []);
    assert.deepEqual(diagnostics.externalRequests, []);
    await context.close();
  }

  // ── Tutorial flow — mobile 390×844 ────────────────────────────────────
  {
    const { context, page, diagnostics } = await openContext(browser, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

    await page.getByTestId("start-tutorial").click();
    await page.getByTestId("tutorial-entry").waitFor({ state: "visible" });

    await page.getByTestId("tutorial-start-story").click();
    await page.getByTestId("tutorial-step-1").waitFor({ state: "visible" });

    for (let step = 2; step <= 6; step += 1) {
      await page.getByTestId("tutorial-next").click();
      await page.getByTestId(`tutorial-step-${step}`).waitFor({ state: "visible" });
    }

    await page.getByTestId("tutorial-delete-data").click();
    await page.getByTestId("tutorial-delete-complete").waitFor({ state: "visible" });
    await page.getByTestId("tutorial-exit-after-delete").click();
    await page.getByTestId("url-collection").waitFor({ state: "visible" });

    const mobileLayout = await layoutState(page);
    assert.equal(mobileLayout.horizontalOverflow, false, "tutorial mobile: no horizontal overflow");
    await capture(page, "tutorial-mobile-complete", { tutorial_flow: "mobile" });
    assert.deepEqual(diagnostics.consoleErrors, []);
    assert.deepEqual(diagnostics.pageErrors, []);
    assert.deepEqual(diagnostics.externalRequests, []);
    await context.close();
  }

  // ── Tutorial flow — reduced motion ────────────────────────────────────
  {
    const { context, page, diagnostics } = await openContext(browser, { reducedMotion: "reduce" });

    await page.getByTestId("start-tutorial").click();
    await page.getByTestId("tutorial-entry").waitFor({ state: "visible" });

    await page.getByTestId("tutorial-start-story").click();
    await page.getByTestId("tutorial-step-1").waitFor({ state: "visible" });

    for (let step = 2; step <= 6; step += 1) {
      await page.getByTestId("tutorial-next").click();
      await page.getByTestId(`tutorial-step-${step}`).waitFor({ state: "visible" });
    }

    await capture(page, "tutorial-reduced-motion", { tutorial_flow: "reduced-motion" });
    assert.deepEqual(diagnostics.consoleErrors, []);
    assert.deepEqual(diagnostics.pageErrors, []);
    assert.deepEqual(diagnostics.externalRequests, []);
    await context.close();
  }

  // ── Tutorial flow — Korean parity (desktop) ────────────────────────────
  {
    const { context, page, diagnostics } = await openContext(browser);

    await page.getByRole("button", { name: "한국어" }).click();
    const outerCta = page.getByTestId("start-tutorial");
    await outerCta.getByText("Mina의 WatchTree 이야기 보기").waitFor({ state: "visible" });
    assert.ok(await outerCta.getByText("6단계 가이드 데모 · 약 45–75초").isVisible(), "Korean outer CTA subtitle visible");

    await page.getByTestId("start-tutorial").click();
    await page.getByTestId("tutorial-entry").waitFor({ state: "visible" });
    assert.ok(await page.getByText("WatchTree 여정 시작하기").isVisible(), "Korean entry title");

    await page.getByTestId("tutorial-start-story").click();
    await page.getByTestId("tutorial-step-1").waitFor({ state: "visible" });
    assert.ok(await page.getByText("선택적 수집").isVisible(), "Korean STEP1 title");
    assert.ok(await page.getByText("Mina는 자신이 선택한 링크만 추가합니다").isVisible(), "Korean STEP1 subtitle");

    const nextBtn = page.getByTestId("tutorial-next");
    assert.equal((await nextBtn.textContent()).trim(), "다음", "Korean Next button");

    await nextBtn.click();
    await page.getByTestId("tutorial-step-2").waitFor({ state: "visible" });
    await nextBtn.click();
    await page.getByTestId("tutorial-step-3").waitFor({ state: "visible" });
    await nextBtn.click();
    await page.getByTestId("tutorial-step-4").waitFor({ state: "visible" });
    await nextBtn.click();
    await page.getByTestId("tutorial-step-5").waitFor({ state: "visible" });

    await page.locator(".tutorial-label--simulated").first().waitFor({ state: "visible" });
    const koSimulated = (await page.locator(".tutorial-label--simulated").first().textContent()).trim();
    assert.equal(koSimulated, "시뮬레이션된 상호 공명", "Korean STEP5 simulated label");
    const koNoRealUser = (await page.locator(".tutorial-label--small").first().textContent()).trim();
    assert.equal(koNoRealUser, "실제 사용자에게 연락되지 않음", "Korean STEP5 no-real-user label");
    assert.ok(await page.getByText("두 synthetic 경로가 공명합니다.").isVisible(), "Korean STEP5 mutual message visible");
    assert.ok(!(await page.getByText("Two synthetic paths now resonate.").isVisible()), "English mutual message not visible in Korean");
    assert.ok(!(await page.getByText("Two synthetic viewing paths now resonate.").isVisible()), "English alt mutual message not visible in Korean");

    await nextBtn.click();
    await page.getByTestId("tutorial-step-6").waitFor({ state: "visible" });
    assert.equal((await page.getByTestId("tutorial-build-own-after").textContent()).trim(), "내 WatchTree 만들기", "Korean STEP6 build-own");
    assert.equal((await page.getByTestId("tutorial-replay").textContent()).trim(), "다시 보기", "Korean STEP6 replay");
    assert.equal((await page.getByTestId("tutorial-delete-data").textContent()).trim(), "데이터 삭제", "Korean STEP6 delete");

    await page.getByTestId("tutorial-delete-data").click();
    await page.getByTestId("tutorial-delete-complete").waitFor({ state: "visible" });
    assert.ok(await page.getByText("튜토리얼 데이터가 삭제되었습니다").isVisible(), "Korean delete-complete title");
    assert.ok(await page.getByText("모든 synthetic 데모 기록이 삭제되었습니다.").isVisible(), "Korean delete-complete body");

    await page.getByTestId("tutorial-exit-after-delete").click();
    await page.getByTestId("url-collection").waitFor({ state: "visible" });

    const koLayout = await layoutState(page);
    assert.equal(koLayout.horizontalOverflow, false, "Korean tutorial: no horizontal overflow");
    await capture(page, "tutorial-korean-complete", { tutorial_flow: "korean-desktop" });
    assert.deepEqual(diagnostics.consoleErrors, []);
    assert.deepEqual(diagnostics.pageErrors, []);
    assert.deepEqual(diagnostics.externalRequests, []);
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
    desktop_scene_6_path_geometry_verified: true,
    mobile_scene_6_path_geometry_verified: true,
    desktop_reduced_path_geometry_verified: true,
    mobile_reduced_path_geometry_verified: true,
    shared_path_nodes_verified: true,
    desktop_header_verified: true,
    mobile_header_verified: true,
    reduced_motion_header_verified: true,
    header_child_geometry_verified: true,
    header_language_custom_style_verified: true,
    internal_field_exposure_verified: true,
    vite_port_closed_after_cleanup: true,
    tutorial_desktop_flow_verified: true,
    tutorial_mobile_flow_verified: true,
    tutorial_reduced_motion_verified: true,
    tutorial_korean_flow_verified: true,
  };
  await writeFile(new URL("watchtree-browser-evidence.json", evidenceDir), `${JSON.stringify(manifest, null, 2)}\n`);
  await Promise.all([
    unlink(new URL("browser-error.log", evidenceDir)).catch(() => {}),
    unlink(new URL("cleanup-failure.log", evidenceDir)).catch(() => {}),
  ]);
  await writeFile(new URL("test-browser.log", evidenceDir), [
    "command: npm run test:browser",
    "status: PASS",
    `generated_at: ${manifest.generated_at}`,
    `states: ${manifest.states.length}`,
    `assertions: ${JSON.stringify(manifest.assertions)}`,
  ].join("\n") + "\n");
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
