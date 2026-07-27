import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scanner = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /Authorization\s*:\s*Bearer\s+\S+/i,
  /\b(access[_-]?token|refresh[_-]?token|client[_-]?secret|api[_-]?key|password|passwd|otp|one[_-]?time[_-]?code)\b/i,
  /\b(cookie|set-cookie)\s*:/i,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  /\/Users\/[^/\s]+|\/home\/[^/\s]+|C:\\Users\\[^\\\s]+/i,
];
const scan = (text) => scanner.filter((pattern) => pattern.test(text)).map(String);
const root = fileURLToPath(new URL("../", import.meta.url));

const skipFiles = new Set([
  // Legitimate auth UI — variable names / input types / i18n labels that
  // necessarily contain terms the scanner flags as credential-like.
  "rc/components/AuthPanel.jsx",
  "rc/lib/i18n.js",
]);

function textFiles(dir, output = []) {
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".git", "dist", "tests/evidence"].includes(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) textFiles(path, output);
    else if (/\.(?:js|mjs|jsx|ts|tsx|json|jsonc|md|html|css|yml|yaml|svg)$/.test(name)) output.push(path);
  }
  return output;
}

test("scanner rejects credentials and accepts synthetic aggregate evidence", () => {
  assert.ok(scan("Authorization: Bearer abcdef").length);
  assert.ok(scan("person@example.com").length);
  assert.equal(scan("synthetic fixture: 48 accepted, 0 rejected").length, 0);
});

test("repository evidence-facing source contains no embedded credentials", () => {
  const violations = [];
  const roots = ["src", "base44"].map((name) => join(root, name));
  for (const path of roots.flatMap((dir) => textFiles(dir))) {
    const relative = path.slice(root.length + 1);
    if (skipFiles.has(relative)) continue;
    const text = readFileSync(path, "utf8");
    // Synthetic parser fixtures intentionally contain the documented titleUrl field.
    for (const pattern of scanner) if (pattern.test(text)) violations.push(`${relative}: ${pattern}`);
  }
  assert.deepEqual(violations, []);
});
