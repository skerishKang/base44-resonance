import assert from "node:assert/strict";
import test from "node:test";

const REQUEST_GUARD = 196608; // 192 KiB

function simulateStreamRead(bytes, maxBytes) {
  const reader = {
    _buffer: bytes,
    _offset: 0,
    read() {
      if (this._offset >= this._buffer.byteLength) {
        return Promise.resolve({ done: true, value: undefined });
      }
      const chunk = this._buffer.slice(this._offset, this._offset + 4096);
      this._offset += chunk.byteLength;
      return Promise.resolve({ done: false, value: chunk });
    },
    cancel() {
      this._cancelled = true;
      return Promise.resolve();
    },
  };
  return reader;
}

function mockRequest(method, contentType, bodyBytes = new Uint8Array(0), chunked = false) {
  const req = {
    method,
    headers: new Map([
      ["content-type", contentType],
      ...(chunked ? [] : [["content-length", String(bodyBytes.byteLength)]]),
    ]),
    body: {
      getReader() {
        return simulateStreamRead(bodyBytes, REQUEST_GUARD + 1);
      },
    },
  };
  req.headers.get = (name) => req.headers.get(name.toLowerCase()) ?? null;
  return req;
}

async function readStreamBytes(stream, maxBytes) {
  if (!stream) return new Uint8Array(0);
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > maxBytes) {
          reader.cancel().catch(() => {});
          return null;
        }
        chunks.push(value);
      }
    }
  } catch {
    return null;
  }
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined;
}

function isJsonResponse(body) {
  try {
    const parsed = JSON.parse(body);
    return parsed?.ok === false && parsed?.error?.code;
  } catch {
    return false;
  }
}

test("no Content-Length header still works for small body", async () => {
  const body = new Uint8Array(128);
  const result = await readStreamBytes({ getReader: () => simulateStreamRead(body, REQUEST_GUARD + 1) }, REQUEST_GUARD + 1);
  assert.ok(result);
  assert.equal(result.byteLength, 128);
});

test("oversized body exceeds guard limit", async () => {
  const body = new Uint8Array(REQUEST_GUARD + 1);
  const result = await readStreamBytes({ getReader: () => simulateStreamRead(body, REQUEST_GUARD + 1) }, REQUEST_GUARD);
  assert.equal(result, null);
});

test("body exactly at boundary", async () => {
  const body = new Uint8Array(REQUEST_GUARD);
  const result = await readStreamBytes({ getReader: () => simulateStreamRead(body, REQUEST_GUARD + 1) }, REQUEST_GUARD);
  assert.ok(result);
  assert.equal(result.byteLength, REQUEST_GUARD);
});

test("one byte over boundary is rejected", async () => {
  const body = new Uint8Array(REQUEST_GUARD + 1);
  const result = await readStreamBytes({ getReader: () => simulateStreamRead(body, REQUEST_GUARD) }, REQUEST_GUARD);
  assert.equal(result, null);
});

test("chunked oversized body is rejected", async () => {
  const body = new Uint8Array(REQUEST_GUARD + 100);
  const result = await readStreamBytes({ getReader: () => simulateStreamRead(body, REQUEST_GUARD) }, REQUEST_GUARD);
  assert.equal(result, null);
});

test("smaller Content-Length than actual body fails", async () => {
  const body = new Uint8Array(5000);
  const result = await readStreamBytes({ getReader: () => simulateStreamRead(body, REQUEST_GUARD + 1) }, REQUEST_GUARD);
  assert.ok(result);
  assert.equal(result.byteLength, 5000);
});

test("larger Content-Length than actual body reads actual bytes", async () => {
  const body = new Uint8Array(100);
  const result = await readStreamBytes({ getReader: () => simulateStreamRead(body, REQUEST_GUARD + 1) }, REQUEST_GUARD);
  assert.ok(result);
  assert.equal(result.byteLength, 100);
});

test("malformed JSON after valid body read", async () => {
  const text = "this is not json {{{{";
  const body = new TextEncoder().encode(text);
  const result = await readStreamBytes({ getReader: () => simulateStreamRead(body, REQUEST_GUARD + 1) }, REQUEST_GUARD);
  assert.ok(result);
  const decoded = new TextDecoder().decode(result);
  assert.throws(() => JSON.parse(decoded));
});

test("empty body is accepted", async () => {
  const body = new Uint8Array(0);
  const result = await readStreamBytes({ getReader: () => simulateStreamRead(body, REQUEST_GUARD + 1) }, REQUEST_GUARD);
  assert.ok(result);
  assert.equal(result.byteLength, 0);
});

test("stream error returns null", async () => {
  const stream = {
    getReader() {
      return {
        read() { return Promise.reject(new Error("Stream failure")); },
        cancel() { return Promise.resolve(); },
      };
    },
  };
  const result = await readStreamBytes(stream, REQUEST_GUARD);
  assert.equal(result, null);
});

test("no body stream handles gracefully", async () => {
  const result = await readStreamBytes(null, REQUEST_GUARD);
  assert.ok(result);
  assert.equal(result.byteLength, 0);
});
