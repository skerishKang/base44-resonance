import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PRODUCTION_APP_ID = "6a6538c71a8e3e1640117c91";

// Public identifiers and dev-only markers (not secrets) that must never ship in a release bundle.
export const FORBIDDEN_BUNDLE_STRINGS = [
  { label: "validation app ID", value: "6a66efa32405ef17115532ed" },
  { label: "buildoff app ID", value: "6a65182449c7c0f8ec33e31d" },
  { label: "local dev server origin", value: "localhost:4400" },
  { label: "dev-only JSX transform", value: "jsxDEV" },
];

export function collectBundleFiles(distPath) {
  const files = [];
  const assetsDir = path.join(distPath, "assets");
  if (fs.existsSync(assetsDir)) {
    for (const name of fs.readdirSync(assetsDir).sort()) {
      if (name.endsWith(".js") || name.endsWith(".css")) {
        files.push(path.join(assetsDir, name));
      }
    }
  }
  const indexHtml = path.join(distPath, "index.html");
  if (fs.existsSync(indexHtml)) files.push(indexHtml);
  return files;
}

export function verifyReleaseBundle(distPath, options = {}) {
  const expectedAppId = options.expectedAppId || PRODUCTION_APP_ID;
  const forbidden = options.forbidden || FORBIDDEN_BUNDLE_STRINGS;

  if (!fs.existsSync(distPath)) {
    return {
      ok: false,
      distPath,
      expectedAppId,
      scannedFiles: 0,
      expectedAppIdFound: false,
      violations: [{ label: "missing dist directory", value: distPath, file: null }],
    };
  }

  const files = collectBundleFiles(distPath);
  if (files.length === 0) {
    return {
      ok: false,
      distPath,
      expectedAppId,
      scannedFiles: 0,
      expectedAppIdFound: false,
      violations: [{ label: "no bundle files found", value: distPath, file: null }],
    };
  }

  let expectedAppIdFound = false;
  const violations = [];
  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    if (content.includes(expectedAppId)) expectedAppIdFound = true;
    for (const entry of forbidden) {
      if (content.includes(entry.value)) {
        violations.push({ label: entry.label, value: entry.value, file: path.relative(distPath, file) });
      }
    }
  }

  if (!expectedAppIdFound) {
    violations.push({ label: "expected production App ID absent", value: expectedAppId, file: null });
  }

  return {
    ok: violations.length === 0,
    distPath,
    expectedAppId,
    scannedFiles: files.length,
    expectedAppIdFound,
    violations,
  };
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const distPath = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, "../dist");
  const expectedAppId = process.argv[3] || PRODUCTION_APP_ID;
  const result = verifyReleaseBundle(distPath, { expectedAppId });
  if (result.ok) {
    console.log(
      `release bundle OK: ${result.scannedFiles} files scanned, production App ID ${expectedAppId} present, no forbidden strings`
    );
  } else {
    console.error(`release bundle verification FAILED for ${distPath}`);
    for (const violation of result.violations) {
      console.error(` - ${violation.label}${violation.file ? ` in ${violation.file}` : ""}`);
    }
    process.exit(1);
  }
}
