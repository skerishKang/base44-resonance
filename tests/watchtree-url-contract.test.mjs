import { describe, it } from "node:test";
import * as assert from "node:assert";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

async function loadAndCaptureHandler(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const replaced = content
    .replace(
      /from "npm:@base44\/sdk"/g,
      'from "data:text/javascript,export function createClientFromRequest(){}"'
    )
    .replace(
      /from "\.\/_shared\//g,
      `from "file://${join(import.meta.dirname, "../base44/functions/_shared/")}/`
    );
  const tmpFile = join(tmpdir(), `test-entry-${Date.now()}-${Math.random()}.mjs`);
  writeFileSync(tmpFile, replaced);
  let capturedHandler;
  globalThis.Deno = {
    serve: (handler) => { capturedHandler = handler; }
  };
  try {
    await import(`file://${tmpFile}`);
    return capturedHandler;
  } finally {
    delete globalThis.Deno;
    unlinkSync(tmpFile);
  }
}

describe("WatchTree URL Event Contract", () => {
  it("mocks Deno.serve to execute resolve-youtube-video handler", async () => {
    const handler = await loadAndCaptureHandler(join(import.meta.dirname, "../base44/functions/resolve-youtube-video/entry.ts"));
    assert.ok(handler, "Deno.serve was called with a handler");
    
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" })
    });
    const response = await handler(req);
    assert.strictEqual(response instanceof Response, true);
    const data = await response.json();
    assert.strictEqual(data.ok, false);
    assert.ok(data.error?.code, "Returns standard failure JSON format");
  });

  it("mocks Deno.serve to execute add-watch-url-event handler", async () => {
    const handler = await loadAndCaptureHandler(join(import.meta.dirname, "../base44/functions/add-watch-url-event/entry.ts"));
    assert.ok(handler, "Deno.serve was called with a handler");
    
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ video_id: "dQw4w9WgXcQ" })
    });
    const response = await handler(req);
    assert.strictEqual(response instanceof Response, true);
    const data = await response.json();
    assert.strictEqual(data.ok, false);
    assert.ok(data.error?.code, "Returns standard failure JSON format");
  });
});
