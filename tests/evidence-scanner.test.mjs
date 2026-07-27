import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const HIGH_CONFIDENCE_PATTERNS = [
  { name: "email-literal", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { name: "bearer-token", pattern: /Authorization\s*:\s*Bearer\s+\S+/i },
  { name: "jwt", pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: "api-key-or-secret", pattern: /\b(?:access[_-]?token|refresh[_-]?token|client[_-]?secret|api[_-]?key)\b\s*[:=]\s*["'`][^"'`\n]{8,}["'`]/i },
  { name: "cookie-header", pattern: /\b(?:cookie|set-cookie)\s*:\s*\S+/i },
  { name: "private-path", pattern: /\/Users\/[^/\s]+|\/home\/[^/\s]+|C:\\Users\\[^\\\s]+/i },
];

const CREDENTIAL_TERM = /\b(?:password|passwd|otp)\b/i;
const CREDENTIAL_LITERAL = /\b(password|passwd|otp)\b\s*[:=]\s*["'`]([^"'`\n]*)["'`]/gi;

const TERM_LINE_ALLOWLIST = new Map([
  ["src/components/AuthPanel.jsx", [
    /^\s*const \[password, setPassword\] = useState\(""\);$/,
    /^\s*const \[otp, setOtp\] = useState\(""\);$/,
    /^\s*if \(password\.length < 8\) return copy\.auth\.errors\.password;$/,
    /^\s*const response = await base44\.auth\.loginViaEmailPassword\(email\.trim\(\), password\);$/,
    /^\s*await base44\.auth\.register\(\{ email: email\.trim\(\), password \}\);$/,
    /^\s*if \(!\/\^\\d\{6\}\$\/\.test\(otp\)\) \{$/,
    /^\s*setMessage\(copy\.auth\.errors\.otp\);$/,
    /^\s*await base44\.auth\.verifyOtp\(\{ email: pendingEmail, otpCode: otp \}\);$/,
    /^\s*<span>\{copy\.auth\.password\}<\/span>$/,
    /^\s*type="password"$/,
    /^\s*autoComplete=\{mode === "signin" \? "current-password" : "new-password"\}$/,
    /^\s*value=\{password\}$/,
    /^\s*<span>\{copy\.auth\.otp\}<\/span>$/,
    /^\s*value=\{otp\}$/,
  ]],
  ["src/lib/i18n.js", [
    /^\s*password:\s*"(?:Password|Use at least 8 characters\.|비밀번호|비밀번호는 8자 이상이어야 합니다\.)",?$/,
    /^\s*otp:\s*"(?:Verification code|Enter the 6-digit verification code\.|인증번호|6자리 인증번호를 입력하세요\.)",?$/,
  ]],
]);

const CREDENTIAL_LITERAL_ALLOWLIST = new Set([
  "src/lib/i18n.js|password|Password",
  "src/lib/i18n.js|password|Use at least 8 characters.",
  "src/lib/i18n.js|password|비밀번호",
  "src/lib/i18n.js|password|비밀번호는 8자 이상이어야 합니다.",
  "src/lib/i18n.js|otp|Verification code",
  "src/lib/i18n.js|otp|Enter the 6-digit verification code.",
  "src/lib/i18n.js|otp|인증번호",
  "src/lib/i18n.js|otp|6자리 인증번호를 입력하세요.",
]);

const root = fileURLToPath(new URL("../", import.meta.url));
const normalizeRelative = (path) => relative(root, path).split(sep).join("/");

function lineAllowed(relativePath, line) {
  return (TERM_LINE_ALLOWLIST.get(relativePath) ?? []).some((pattern) => pattern.test(line));
}

function scanText(relativePath, text) {
  const violations = [];

  for (const { name, pattern } of HIGH_CONFIDENCE_PATTERNS) {
    if (pattern.test(text)) violations.push(`${relativePath}: ${name}`);
  }

  for (const match of text.matchAll(CREDENTIAL_LITERAL)) {
    const [, key, value] = match;
    const allowlistKey = `${relativePath}|${key.toLowerCase()}|${value}`;
    if (!CREDENTIAL_LITERAL_ALLOWLIST.has(allowlistKey)) {
      violations.push(`${relativePath}: literal-${key.toLowerCase()}`);
    }
  }

  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (CREDENTIAL_TERM.test(line) && !lineAllowed(relativePath, line)) {
      violations.push(`${relativePath}:${index + 1}: credential-term`);
    }
  }

  return violations;
}

function textFiles(dir, output = []) {
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".git", "dist"].includes(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) textFiles(path, output);
    else if (/\.(?:js|mjs|jsx|ts|tsx|json|jsonc|md|html|css|yml|yaml|svg)$/.test(name)) output.push(path);
  }
  return output;
}

test("scanner rejects high-confidence secrets and accepts synthetic aggregate evidence", () => {
  assert.ok(scanText("synthetic.js", "Authorization: Bearer abcdefghijklmnop").length);
  assert.ok(scanText("synthetic.js", "person@example.com").length);
  assert.ok(scanText("synthetic.js", 'const api_key = "sk_live_1234567890";').length);
  assert.equal(scanText("synthetic.js", "synthetic fixture: 48 accepted, 0 rejected").length, 0);
});

test("AuthPanel and i18n cannot bypass high-confidence or literal credential detection", () => {
  const highRiskPaths = ["src/components/AuthPanel.jsx", "src/lib/i18n.js"];
  const injectedLeaks = [
    'const leaked = "Authorization: Bearer abcdefghijklmnop";',
    'const leaked = "person@example.com";',
    'const leaked = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzeW50aGV0aWMifQ.c2lnbmF0dXJlMTIzNDU";',
    'const api_key = "sk_live_1234567890";',
    'const client_secret = "secret_1234567890";',
    'const password = "literal-secret-123";',
    'const otp = "654321";',
  ];

  for (const path of highRiskPaths) {
    for (const leak of injectedLeaks) {
      assert.ok(scanText(path, leak).length, `${path} failed to detect ${leak}`);
    }
  }
});

test("legitimate AuthPanel and i18n credential UI terminology is narrowly allowlisted", () => {
  const authPanel = readFileSync(join(root, "src/components/AuthPanel.jsx"), "utf8");
  const i18n = readFileSync(join(root, "src/lib/i18n.js"), "utf8");
  assert.deepEqual(scanText("src/components/AuthPanel.jsx", authPanel), []);
  assert.deepEqual(scanText("src/lib/i18n.js", i18n), []);
});

test("repository evidence-facing source contains no embedded credentials", () => {
  const violations = [];
  const roots = ["src", "base44"].map((name) => join(root, name));
  for (const path of roots.flatMap((dir) => textFiles(dir))) {
    const relativePath = normalizeRelative(path);
    const text = readFileSync(path, "utf8");
    violations.push(...scanText(relativePath, text));
  }
  assert.deepEqual(violations, []);
});
