const clone = (value) => structuredClone(value);

function paginate(records, sort, limit, offset) {
  const sortKey = String(sort ?? "-created_date");
  const descending = sortKey.startsWith("-");
  const key = descending ? sortKey.slice(1) : sortKey;
  const sorted = [...records].sort((a, b) => {
    const av = a[key] ?? "";
    const bv = b[key] ?? "";
    const comparison = av === bv ? 0 : av > bv ? 1 : -1;
    return descending ? -comparison : comparison;
  });
  return sorted.slice(offset, offset + limit).map(clone);
}

// In-memory stand-in for the RLS-scoped Base44 entity client used by backend
// functions. Records are implicitly owner-scoped: every created record carries
// the store owner's created_by_id, mirroring production RLS behavior.
export function createMockBase44Store(ownerId = "owner_test_owner") {
  const tables = new Map();
  const controls = { failDeletes: 0 };
  let seq = 0;
  const table = (name) => {
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name);
  };
  const makeEntity = (name) => ({
    async create(record) {
      const id = record?.id ?? `${name.toLowerCase()}_${++seq}`;
      const stored = {
        ...clone(record ?? {}),
        id,
        created_by_id: record?.created_by_id ?? ownerId,
        created_date: record?.created_date ?? new Date(Date.UTC(2026, 2, 1, 0, 0, seq % 60)).toISOString(),
      };
      table(name).set(id, stored);
      return clone(stored);
    },
    async get(id) {
      const record = table(name).get(id);
      if (!record) throw new Error(`${name}_NOT_FOUND`);
      return clone(record);
    },
    async update(id, patch) {
      const record = table(name).get(id);
      if (!record) throw new Error(`${name}_NOT_FOUND`);
      Object.assign(record, clone(patch ?? {}));
      return clone(record);
    },
    async delete(id) {
      if (controls.failDeletes > 0) {
        controls.failDeletes -= 1;
        throw new Error("DELETE_SIMULATED_FAILURE");
      }
      table(name).delete(id);
    },
    async list(sort = "-created_date", limit = 20, offset = 0) {
      return paginate([...table(name).values()], sort, limit, offset);
    },
    async filter(criteria = {}, sort = "-created_date", limit = 20, offset = 0) {
      const matches = [...table(name).values()].filter((record) => Object.entries(criteria).every(([key, value]) => record[key] === value));
      return paginate(matches, sort, limit, offset);
    },
  });
  return {
    ownerId,
    controls,
    entities: {
      WatchImport: makeEntity("WatchImport"),
      WatchEvent: makeEntity("WatchEvent"),
      WatchTreeFingerprint: makeEntity("WatchTreeFingerprint"),
      SharedPathCandidate: makeEntity("SharedPathCandidate"),
      RevealConsent: makeEntity("RevealConsent"),
      MutualResonance: makeEntity("MutualResonance"),
      ImportChunkReceipt: makeEntity("ImportChunkReceipt"),
      WatchMatchSignal: makeEntity("WatchMatchSignal"),
    },
    count: (name) => table(name).size,
  };
}
