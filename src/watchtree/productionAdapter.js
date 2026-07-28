import { getBase44Client } from "@/api/base44Client";
import { LIMITS, WATCHTREE_VERSIONS } from "./constants.js";
import { restoreScopedMatching } from "./restore.js";

const unwrap = (response) => response?.data ?? response ?? {};
const nonce = () => crypto.randomUUID();
const encoder = new TextEncoder();

async function invokeWithRetry(name, payload, attempts = 3) {
  const base44 = await getBase44Client();
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const result = unwrap(await base44.functions.invoke(name, payload));
      if (result?.ok === false) {
        const error = new Error(result.error?.code ?? "FUNCTION_FAILED");
        error.code = result.error?.code;
        error.retryable = result.error?.retryable === true;
        throw error;
      }
      return result;
    } catch (error) {
      lastError = error;
      const status = error?.response?.status ?? error?.status;
      const retryable = error?.retryable === true || status === 429 || status >= 500;
      if (!retryable || attempt === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 120 * (2 ** attempt)));
    }
  }
  throw lastError;
}

export function splitTransportChunks(records) {
  const chunks = [];
  let current = [];
  let currentBytes = 2;
  for (const record of records) {
    const recordBytes = encoder.encode(JSON.stringify(record)).byteLength + 1;
    if (recordBytes > LIMITS.requestBytes - 8_192) throw new Error("RECORD_TOO_LARGE");
    if (
      current.length >= LIMITS.maxChunk
      || (current.length >= LIMITS.minChunk && currentBytes + recordBytes > LIMITS.requestBytes - 24_576)
    ) {
      chunks.push(current);
      current = [];
      currentBytes = 2;
    }
    current.push(record);
    currentBytes += recordBytes;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

export function createProductionWatchTreeAdapter() {
  return {
    kind: "production",

    async restore() {
      const base44 = await getBase44Client();
      const imports = await base44.entities.WatchImport.list("-created_date", 20, 0);
      const completed = imports.find((item) => item.status === "completed") ?? null;
      if (!completed) return { import: null, events: [], tree: null, candidates: [], consent: null, mutual: null, matchingEnabled: false };
      const [events, trees] = await Promise.all([
        base44.entities.WatchEvent.filter({ import_id: completed.id }, "watched_at", LIMITS.maxRecords, 0),
        base44.entities.WatchTreeFingerprint.filter({ import_id: completed.id, stale: false }, "-created_date", 1, 0),
      ]);
      const tree = trees?.[0] ?? null;
      const candidates = tree ? (await base44.entities.SharedPathCandidate.filter({ fingerprint_id: tree.id }, "candidate_rank", 20, 0)) ?? [] : [];
      const { consent, mutual } = await restoreScopedMatching(base44, candidates);
      return {
        import: completed,
        events,
        tree,
        candidates,
        consent,
        mutual,
        matchingEnabled: Boolean(completed.matching_enabled),
      };
    },

    async seedDemo() {
      const payload = {
        schema_version: 1,
        client_nonce: nonce(),
        fixture_id: WATCHTREE_VERSIONS.fixture,
        consent_version: "watchtree-consent-v1",
      };
      return invokeWithRetry("seed-demo-history", payload);
    },

    async validatePreview(payload) {
      const chunks = splitTransportChunks(payload.records);
      const normalized = [];
      const aggregate = { accepted: 0, excluded: 0, rejected: 0 };
      const errors = [];
      let confirmationToken = "";
      for (const [index, records] of chunks.entries()) {
        const result = await invokeWithRetry("parse-watch-history", {
          schema_version: 1,
          client_nonce: nonce(),
          source_type: payload.source_type,
          file_sha256: payload.file_sha256,
          records,
          counts: payload.counts,
          chunk_index: index,
          chunk_offset: normalized.length,
          total_chunks: chunks.length,
          total_records: payload.records.length,
        });
        confirmationToken = result.confirmation_token;
        normalized.push(...(result.normalized_records ?? []));
        aggregate.accepted += result.counts?.accepted ?? 0;
        aggregate.excluded += result.counts?.excluded ?? 0;
        aggregate.rejected += result.counts?.rejected ?? 0;
        errors.push(...(result.errors ?? []).slice(0, LIMITS.errorSamples - errors.length));
      }
      return { confirmation_token: confirmationToken, records: normalized, counts: aggregate, errors, total_chunks: chunks.length };
    },

    async commitPreview(payload) {
      const chunks = splitTransportChunks(payload.records);
      const commitNonce = nonce();
      let finalResult = null;
      for (const [index, records] of chunks.entries()) {
        finalResult = await invokeWithRetry("commit-watch-import", {
          schema_version: 1,
          client_nonce: commitNonce,
          confirmation_token: payload.confirmation_token,
          file_sha256: payload.file_sha256,
          source_type: payload.source_type,
          records,
          chunk_index: index,
          total_chunks: chunks.length,
          total_records: payload.records.length,
          excluded_count: payload.excluded_count ?? 0,
          rejected_count: payload.rejected_count ?? 0,
          final_chunk: index === chunks.length - 1,
        });
        if (finalResult?.existing_complete) break;
      }
      if (!finalResult?.import?.id) throw new Error("IMPORT_NOT_STORED");
      const treeResult = await this.buildTree(finalResult.import.id);
      return { ...finalResult, ...treeResult, candidates: [], matchingEnabled: false };
    },

    async buildTree(importId) {
      return invokeWithRetry("build-watch-tree", {
        schema_version: 1,
        client_nonce: nonce(),
        import_id: importId,
        matching_version: WATCHTREE_VERSIONS.matching,
      });
    },

    async findCandidates(fingerprintId) {
      return invokeWithRetry("find-shared-paths", {
        schema_version: 1,
        client_nonce: nonce(),
        fingerprint_id: fingerprintId,
        matching_version: WATCHTREE_VERSIONS.matching,
      });
    },

    async setConsent(candidateId, tokens, state) {
      return invokeWithRetry("set-reveal-consent", {
        schema_version: 1,
        client_nonce: nonce(),
        candidate_id: candidateId,
        selected_evidence_tokens: tokens,
        state,
        consent_version: "watchtree-consent-v1",
      });
    },

    async simulateMutual(candidateId) {
      return invokeWithRetry("simulate-mutual", {
        schema_version: 1,
        client_nonce: nonce(),
        candidate_id: candidateId,
      });
    },

    async mutatePrivacy(action, payload) {
      return invokeWithRetry("delete-watch-data", {
        schema_version: 1,
        client_nonce: nonce(),
        action,
        ...payload,
      });
    },
  };
}
