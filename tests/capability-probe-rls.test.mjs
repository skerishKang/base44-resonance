import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(repoRoot, path), "utf8");
const schema = JSON.parse(read("base44/entities/capability-probe.jsonc"));

const authenticatedCreateRule = {
  $or: [
    { user_condition: { role: "user" } },
    { user_condition: { role: "admin" } },
  ],
};

test("CapabilityProbe create allows only documented authenticated roles", () => {
  assert.deepEqual(schema.rls.create, authenticatedCreateRule);
  assert.notEqual(schema.rls.create, true);
  assert.notDeepEqual(schema.rls.create, { user_condition: { id: "{{user.id}}" } });
});

test("CapabilityProbe read, update, and delete use built-in creator ID ownership", () => {
  const ownerRule = { created_by_id: "{{user.id}}" };
  assert.deepEqual(schema.rls.read, ownerRule);
  assert.deepEqual(schema.rls.update, ownerRule);
  assert.deepEqual(schema.rls.delete, ownerRule);
  assert.notEqual(schema.rls.read, true);
});

test("CapabilityProbe exposes no client-controlled owner or built-in identity fields", () => {
  const prohibitedFields = ["id", "created_by", "created_by_id", "owner_id", "owner_email"];
  const propertyNames = Object.keys(schema.properties ?? {});
  const requiredNames = schema.required ?? [];

  for (const field of prohibitedFields) {
    assert.equal(propertyNames.includes(field), false, `${field} must not be client controlled`);
    assert.equal(requiredNames.includes(field), false, `${field} must not be client required`);
  }
});

test("verify-capability remains authenticated and caller scoped", () => {
  const source = read("base44/functions/verify-capability/entry.ts");
  assert.match(source, /createClientFromRequest\(req\)/);
  assert.match(source, /await base44\.auth\.me\(\)/);
  assert.match(source, /base44\.entities\.CapabilityProbe\.get/);
  assert.match(source, /base44\.entities\.CapabilityProbe\.update/);
  assert.doesNotMatch(source, /asServiceRole|service[_-]?role/i);
});

test("CI remains credential-free and contains no deploy", () => {
  const workflow = read(".github/workflows/ci.yml");
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run test:ci/);
  assert.match(workflow, /npm run build/);
  assert.doesNotMatch(workflow, /base44 deploy|entities push|secrets\./i);
});
