import { describe, it } from "node:test";
import assert from "node:assert/strict";

if (typeof globalThis.sessionStorage === "undefined") {
  const store = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

import {
  createTutorialState,
  createInactiveState,
  reducer,
  TUTORIAL_STEPS,
  executeStepTransition,
  deleteTutorialData,
} from "../src/watchtree/tutorial/tutorial-controller.js";
import { getTutorialCopy } from "../src/watchtree/tutorial/tutorial-copy.js";
import { createInMemoryWatchTreeAdapter } from "./harness/inMemoryWatchTreeAdapter.js";

async function seededAdapter() {
  const adapter = createInMemoryWatchTreeAdapter("tutorial-test-" + Date.now());
  const result = await adapter.seedDemo();
  assert.ok(result?.import?.id, "seedDemo must return import.id");
  return adapter;
}

describe("1 — Entry CTAs", () => {
  it("entry state shows two CTA strings in both languages", () => {
    for (const lang of ["en", "ko"]) {
      const copy = getTutorialCopy(lang);
      assert.ok(copy.entry.primary, `${lang}: missing primary CTA`);
      assert.ok(copy.entry.secondary, `${lang}: missing secondary CTA`);
      assert.notEqual(copy.entry.primary, "", `${lang}: primary CTA empty`);
      assert.notEqual(copy.entry.secondary, "", `${lang}: secondary CTA empty`);
    }
  });
});

describe("2 — Build my WatchTree path", () => {
  it("'Build my WatchTree' exits tutorial without mutations", () => {
    const state = createTutorialState();
    assert.equal(state.status, "active");
    assert.equal(state.currentStep, TUTORIAL_STEPS.ENTRY);

    const afterExit = reducer(state, { type: "EXIT" });
    assert.equal(afterExit.status, "inactive");
    assert.equal(afterExit.currentStep, TUTORIAL_STEPS.INACTIVE);
  });
});

describe("3 — Tutorial mount at ENTRY", () => {
  it("createTutorialState starts at ENTRY with status active", () => {
    const state = createTutorialState();
    assert.equal(state.status, "active");
    assert.equal(state.currentStep, TUTORIAL_STEPS.ENTRY);
    assert.equal(state.error, "");
    assert.equal(state.transitionPending, false);
  });

  it("createInactiveState starts at INACTIVE", () => {
    const state = createInactiveState();
    assert.equal(state.status, "inactive");
    assert.equal(state.currentStep, TUTORIAL_STEPS.INACTIVE);
  });
});

describe("4 — Step sequence", () => {
  it("reducer produces steps ENTRY=0 through DELETE_COMPLETE=8 in order", () => {
    assert.equal(TUTORIAL_STEPS.INACTIVE, -1);
    assert.equal(TUTORIAL_STEPS.ENTRY, 0);
    assert.equal(TUTORIAL_STEPS.STEP1, 1);
    assert.equal(TUTORIAL_STEPS.STEP2, 2);
    assert.equal(TUTORIAL_STEPS.STEP3, 3);
    assert.equal(TUTORIAL_STEPS.STEP4, 4);
    assert.equal(TUTORIAL_STEPS.STEP5, 5);
    assert.equal(TUTORIAL_STEPS.STEP6, 6);
    assert.equal(TUTORIAL_STEPS.COMPLETED, 7);
    assert.equal(TUTORIAL_STEPS.DELETE_COMPLETE, 8);
  });

  it("SET_STEP changes currentStep", () => {
    let state = createTutorialState();
    state = reducer(state, { type: "SET_STEP", step: 3 });
    assert.equal(state.currentStep, 3);
  });
});

describe("5 — Next transition", () => {
  it("TRANSITION_PENDING then TRANSITION_DONE toggles transitionPending", () => {
    const state = createTutorialState();
    const pending = reducer(state, { type: "TRANSITION_PENDING" });
    assert.equal(pending.transitionPending, true);
    const done = reducer(pending, { type: "TRANSITION_DONE" });
    assert.equal(done.transitionPending, false);
  });
});

describe("6 — SET_STEP_DATA contract", () => {
  it("SET_STEP_DATA uses action.currentStep and clears transitionPending", () => {
    const state = {
      ...createTutorialState(),
      transitionPending: true,
      error: "pending",
      completedSteps: [],
    };
    const result = reducer(state, {
      type: "SET_STEP_DATA",
      currentStep: TUTORIAL_STEPS.STEP1,
      payload: { events: [], tree: null },
    });
    assert.equal(result.transitionPending, false);
    assert.equal(result.error, "");
    assert.equal(result.currentStep, TUTORIAL_STEPS.STEP1);
    assert.ok(result.completedSteps.includes(TUTORIAL_STEPS.STEP1));
  });

  it("SET_STEP_DATA tracks completedSteps for idempotency", () => {
    let state = createTutorialState();
    state = reducer(state, {
      type: "SET_STEP_DATA",
      currentStep: TUTORIAL_STEPS.STEP1,
      payload: { events: [1], tree: { id: "t" }, importId: "imp" },
    });
    assert.ok(state.completedSteps.includes(TUTORIAL_STEPS.STEP1));
    state = reducer(state, {
      type: "SET_STEP_DATA",
      currentStep: TUTORIAL_STEPS.STEP2,
      payload: {},
    });
    assert.ok(state.completedSteps.includes(TUTORIAL_STEPS.STEP1));
    assert.ok(state.completedSteps.includes(TUTORIAL_STEPS.STEP2));
  });

  it("COMPLETED clears transitionPending", () => {
    const state = {
      ...createTutorialState(),
      currentStep: 6,
      transitionPending: true,
    };
    const result = reducer(state, { type: "COMPLETED" });
    assert.equal(result.transitionPending, false);
    assert.equal(result.status, "completed");
  });
});

describe("7 — Back navigation", () => {
  it("SET_STEP decrements currentStep if above STEP1", () => {
    const state = { ...createTutorialState(), currentStep: 3 };
    const result = reducer(state, { type: "SET_STEP", step: 2 });
    assert.equal(result.currentStep, 2);
  });

  it("SET_STEP does not go below STEP1", () => {
    const state = { ...createTutorialState(), currentStep: 1 };
    const result = reducer(state, { type: "SET_STEP", step: 0 });
    assert.equal(result.currentStep, 0);
  });
});

describe("8 — Exit", () => {
  it("EXIT resets to inactive state", () => {
    const state = {
      ...createTutorialState(),
      currentStep: 4,
      events: [1, 2, 3],
    };
    const result = reducer(state, { type: "EXIT" });
    assert.equal(result.status, "inactive");
    assert.equal(result.currentStep, TUTORIAL_STEPS.INACTIVE);
    assert.equal(result.events.length, 0);
  });
});

describe("9 — Replay preserves data", () => {
  it("RESTART returns to STEP1 preserving cached data", () => {
    const state = {
      ...createTutorialState(),
      status: "completed",
      currentStep: TUTORIAL_STEPS.COMPLETED,
      events: [{ id: "e1" }],
      tree: { id: "tree" },
      candidates: [{ id: "c1" }],
      consent: { id: "consent_1" },
      mutual: { id: "mutual_1" },
      importId: "imp_demo",
      completedSteps: [1, 2, 3, 4, 5],
    };
    const result = reducer(state, { type: "RESTART" });
    assert.equal(result.status, "active");
    assert.equal(result.currentStep, TUTORIAL_STEPS.STEP1);
    assert.equal(result.events.length, 1);
    assert.equal(result.tree.id, "tree");
    assert.equal(result.candidates.length, 1);
    assert.equal(result.consent.id, "consent_1");
    assert.equal(result.mutual.id, "mutual_1");
    assert.equal(result.importId, "imp_demo");
  });
});

describe("10 — seedDemo adapter call", () => {
  it("seedDemo returns synthetic import with id", async () => {
    const adapter = createInMemoryWatchTreeAdapter("tutorial-test-10");
    const result = await adapter.seedDemo();
    assert.ok(result?.import?.id, "seedDemo must return import.id");
    assert.equal(result.import.is_synthetic, true);
    assert.ok(Array.isArray(result.events), "seedDemo returns events array");
  });
});

describe("11 — Tree uses actual result", () => {
  it("buildTree returns tree structure after seed", async () => {
    const adapter = createInMemoryWatchTreeAdapter("tutorial-test-11");
    const seed = await adapter.seedDemo();
    const result = await adapter.buildTree(seed.import.id);
    assert.ok(result.tree, "buildTree returns tree object");
    assert.equal(typeof result.tree.unique_content_count, "number");
  });
});

describe("12 — Match uses actual result", () => {
  it("findCandidates returns candidates after matching enabled", async () => {
    const adapter = createInMemoryWatchTreeAdapter("tutorial-test-12");
    await adapter.seedDemo();
    const state = await adapter.restore();
    const matchingResult = await adapter.mutatePrivacy("enable_import_matching", {
      import_id: state.import.id,
    });
    assert.ok(matchingResult.complete, "matching enabled");
    assert.ok(matchingResult.tree, "tree present after matching");
    const candidateResult = await adapter.findCandidates(matchingResult.tree.id);
    assert.ok(Array.isArray(candidateResult.candidates), "findCandidates returns array");
    assert.ok(candidateResult.candidates.length > 0, "seeded demo returns candidates");
  });
});

describe("13 — Evidence matches candidate tokens", () => {
  it("candidate.evidence_tokens contain id and label", async () => {
    const adapter = createInMemoryWatchTreeAdapter("tutorial-test-13");
    await adapter.seedDemo();
    const state = await adapter.restore();
    await adapter.mutatePrivacy("enable_import_matching", { import_id: state.import.id });
    const afterMatch = await adapter.restore();
    const candidates = afterMatch.candidates ?? [];
    assert.ok(candidates.length > 0, "seeded demo must have candidates after matching enabled");
    for (const candidate of candidates) {
      const tokens = candidate.evidence_tokens ?? [];
      assert.ok(tokens.length > 0, "candidate must have evidence tokens");
      for (const token of tokens) {
        assert.ok(token.id, "token has id");
        assert.ok(token.label, "token has label");
        assert.ok(token.type, "token has type");
      }
    }
  });
});

describe("14 — Consent adapter call", () => {
  it("setConsent with grant returns consent state", async () => {
    const adapter = createInMemoryWatchTreeAdapter("tutorial-test-14");
    await adapter.seedDemo();
    const state = await adapter.restore();
    await adapter.mutatePrivacy("enable_import_matching", { import_id: state.import.id });
    const matched = await adapter.restore();
    const candidate = matched.candidates?.[0];
    if (candidate) {
      const tokens = (candidate.evidence_tokens ?? []).slice(0, 2).map((t) => t.id);
      const result = await adapter.setConsent(candidate.id, tokens, "grant");
      assert.ok(result.consent, "setConsent returns consent");
      assert.equal(result.consent.state, "granted");
    }
  });
});

describe("15 — Simulated mutual adapter call", () => {
  it("simulateMutual returns mutual with is_simulated", async () => {
    const adapter = createInMemoryWatchTreeAdapter("tutorial-test-15");
    await adapter.seedDemo();
    const state = await adapter.restore();
    await adapter.mutatePrivacy("enable_import_matching", { import_id: state.import.id });
    const matched = await adapter.restore();
    const candidate = matched.candidates?.[0];
    if (candidate) {
      const tokens = (candidate.evidence_tokens ?? []).slice(0, 2).map((t) => t.id);
      await adapter.setConsent(candidate.id, tokens, "grant");
      const result = await adapter.simulateMutual(candidate.id);
      assert.ok(result.mutual, "simulateMutual returns mutual");
      assert.equal(result.mutual.is_simulated, true);
    }
  });
});

describe("16 — Synthetic/simulated labels", () => {
  it("both languages contain truth labels", () => {
    for (const lang of ["en", "ko"]) {
      const copy = getTutorialCopy(lang);
      assert.ok(copy.truth.synthetic, `${lang}: missing synthetic label`);
      assert.ok(copy.truth.simulated, `${lang}: missing simulated label`);
      assert.ok(copy.truth.noRealUser, `${lang}: missing noRealUser label`);
    }
  });
});

describe("17 — Delete tutorial data", () => {
  it("deleteTutorialData calls adapter.mutatePrivacy('delete_all') and verifies empty", async () => {
    const adapter = createInMemoryWatchTreeAdapter("tutorial-test-17");
    await adapter.seedDemo();

    let state = await adapter.restore();
    assert.ok(state.import, "data exists before delete");

    const result = await deleteTutorialData(adapter);
    assert.equal(result.import, null);
    assert.equal(result.events.length, 0);
    assert.equal(result.tree, null);
    assert.equal(result.candidates.length, 0);
    assert.equal(result.consent, null);
    assert.equal(result.mutual, null);
  });
});

describe("18 — Post-deletion empty state", () => {
  it("restore returns empty state after delete_all", async () => {
    const adapter = createInMemoryWatchTreeAdapter("tutorial-test-18");
    await adapter.seedDemo();
    await deleteTutorialData(adapter);
    const state = await adapter.restore();
    assert.equal(state.import, null);
    assert.equal(state.events.length, 0);
    assert.equal(state.tree, null);
    assert.equal(state.candidates.length, 0);
    assert.equal(state.consent, null);
    assert.equal(state.mutual, null);
  });
});

describe("19 — Realtime + tutorial compatibility", () => {
  it("tutorial state is independent of product state machine", () => {
    const tutorialState = createTutorialState();
    const tutorialKeys = Object.keys(tutorialState);
    for (const key of tutorialKeys) {
      assert.ok(
        ["status", "currentStep", "transitionPending", "error", "events", "tree", "candidates", "consent", "mutual", "importId", "selectedTokenIds", "completedSteps"].includes(key),
        `Unexpected tutorial key: ${key}`
      );
    }
  });

  it("tutorial actions do not dispatch RESTORED to product reducer", () => {
    const adapter = createInMemoryWatchTreeAdapter("tutorial-test-19");
    assert.ok(typeof adapter.seedDemo === "function");
    assert.ok(typeof adapter.mutatePrivacy === "function");
  });
});

describe("20 — Mina CTA executes STEP1 transition", () => {
  it("executeStepTransition(STEP1) seeds demo and returns SET_STEP_DATA with currentStep", async () => {
    const adapter = createInMemoryWatchTreeAdapter("tutorial-test-20");
    const state = createTutorialState();
    const result = await executeStepTransition(TUTORIAL_STEPS.STEP1, adapter, state);
    assert.equal(result.type, "SET_STEP_DATA");
    assert.equal(result.currentStep, TUTORIAL_STEPS.STEP1);
    assert.ok(result.payload.importId, "payload has importId");
    assert.ok(result.payload.events.length > 0, "payload has events");
    assert.ok(result.payload.tree, "payload has tree");
  });

  it("duplicate STEP1 transition with completedSteps skips seedDemo", async () => {
    const adapter = createInMemoryWatchTreeAdapter("tutorial-test-20b");
    let state = createTutorialState();
    const result1 = await executeStepTransition(TUTORIAL_STEPS.STEP1, adapter, state);
    state = reducer(state, result1);
    assert.ok(state.completedSteps.includes(TUTORIAL_STEPS.STEP1));

    const result2 = await executeStepTransition(TUTORIAL_STEPS.STEP1, adapter, state);
    assert.equal(result2.type, "SET_STEP_DATA");
    assert.equal(result2.currentStep, TUTORIAL_STEPS.STEP1);
    assert.deepEqual(result2.payload, {});
  });
});

describe("21 — Back idempotency prevents duplicate mutations", () => {
  it("STEP5 re-entry after Back skips setConsent and simulateMutual", async () => {
    const adapter = createInMemoryWatchTreeAdapter("tutorial-test-21");
    let state = createTutorialState();

    const r1 = await executeStepTransition(TUTORIAL_STEPS.STEP1, adapter, state);
    state = reducer(state, r1);
    const r2 = await executeStepTransition(TUTORIAL_STEPS.STEP2, adapter, state);
    state = reducer(state, r2);
    const r3 = await executeStepTransition(TUTORIAL_STEPS.STEP3, adapter, state);
    state = reducer(state, r3);
    const r4 = await executeStepTransition(TUTORIAL_STEPS.STEP4, adapter, state);
    state = reducer(state, r4);
    const r5 = await executeStepTransition(TUTORIAL_STEPS.STEP5, adapter, state);
    state = reducer(state, r5);

    assert.ok(state.consent, "consent set after STEP5");
    assert.ok(state.mutual, "mutual set after STEP5");

    state = reducer(state, { type: "SET_STEP", step: TUTORIAL_STEPS.STEP4 });
    assert.equal(state.currentStep, TUTORIAL_STEPS.STEP4);

    const r5again = await executeStepTransition(TUTORIAL_STEPS.STEP5, adapter, state);
    assert.equal(r5again.type, "SET_STEP_DATA");
    assert.deepEqual(r5again.payload, {});
  });

  it("STEP3 re-entry after Back skips enable_import_matching", async () => {
    const adapter = createInMemoryWatchTreeAdapter("tutorial-test-21b");
    let state = createTutorialState();

    const r1 = await executeStepTransition(TUTORIAL_STEPS.STEP1, adapter, state);
    state = reducer(state, r1);
    const r2 = await executeStepTransition(TUTORIAL_STEPS.STEP2, adapter, state);
    state = reducer(state, r2);
    const r3 = await executeStepTransition(TUTORIAL_STEPS.STEP3, adapter, state);
    state = reducer(state, r3);

    assert.ok(state.candidates.length > 0, "candidates after STEP3");

    state = reducer(state, { type: "SET_STEP", step: TUTORIAL_STEPS.STEP2 });
    const r3again = await executeStepTransition(TUTORIAL_STEPS.STEP3, adapter, state);
    assert.equal(r3again.type, "SET_STEP_DATA");
    assert.deepEqual(r3again.payload, {});
  });
});

describe("22 — Replay does not re-seed", () => {
  it("RESTART preserves data and STEP1 re-entry skips seedDemo", async () => {
    const adapter = createInMemoryWatchTreeAdapter("tutorial-test-22");
    let state = createTutorialState();

    const r1 = await executeStepTransition(TUTORIAL_STEPS.STEP1, adapter, state);
    state = reducer(state, r1);
    const importIdBefore = state.importId;

    state = reducer(state, { type: "COMPLETED" });
    state = reducer(state, { type: "RESTART" });
    assert.equal(state.currentStep, TUTORIAL_STEPS.STEP1);
    assert.equal(state.importId, importIdBefore);

    const r1again = await executeStepTransition(TUTORIAL_STEPS.STEP1, adapter, state);
    assert.deepEqual(r1again.payload, {});
    assert.equal(state.importId, importIdBefore);
  });
});

describe("23 — DELETE_COMPLETE state", () => {
  it("DELETE_COMPLETE sets currentStep to DELETE_COMPLETE", () => {
    const state = { ...createTutorialState(), currentStep: TUTORIAL_STEPS.COMPLETED };
    const result = reducer(state, { type: "DELETE_COMPLETE" });
    assert.equal(result.currentStep, TUTORIAL_STEPS.DELETE_COMPLETE);
    assert.equal(result.status, "active");
    assert.equal(result.events.length, 0);
    assert.equal(result.tree, null);
  });
});

describe("24 — Full 6-step executeStepTransition sequence", () => {
  it("executes STEP1 through STEP6 in order with correct currentStep", async () => {
    const adapter = createInMemoryWatchTreeAdapter("tutorial-test-24");
    let state = createTutorialState();

    for (const step of [TUTORIAL_STEPS.STEP1, TUTORIAL_STEPS.STEP2, TUTORIAL_STEPS.STEP3, TUTORIAL_STEPS.STEP4, TUTORIAL_STEPS.STEP5]) {
      const result = await executeStepTransition(step, adapter, state);
      assert.equal(result.type, "SET_STEP_DATA");
      assert.equal(result.currentStep, step, `currentStep must be ${step}`);
      state = reducer(state, result);
      assert.equal(state.currentStep, step);
    }

    const r6 = await executeStepTransition(TUTORIAL_STEPS.STEP6, adapter, state);
    assert.equal(r6.type, "SET_STEP_DATA");
    assert.equal(r6.currentStep, TUTORIAL_STEPS.STEP6);
    state = reducer(state, r6);
    assert.equal(state.currentStep, TUTORIAL_STEPS.STEP6);
  });
});

describe("25 — Delete loop tracks latest result", () => {
  it("deleteTutorialData returns verified empty restore", async () => {
    const adapter = createInMemoryWatchTreeAdapter("tutorial-test-25");
    await adapter.seedDemo();
    const result = await deleteTutorialData(adapter);
    assert.equal(result.import, null);
    assert.equal(result.events.length, 0);
    assert.equal(result.tree, null);
    assert.equal(result.candidates.length, 0);
    assert.equal(result.consent, null);
    assert.equal(result.mutual, null);
  });
});
