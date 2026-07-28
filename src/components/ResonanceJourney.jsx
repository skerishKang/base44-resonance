import { useEffect, useMemo, useRef, useState } from "react";
import { getBase44Client } from "@/api/base44Client";
import {
  MEMORY_CARD_SLOTS,
  MEMORY_MAX_LENGTH,
  MEMORY_MIN_LENGTH,
  createMutationNonce,
  deriveJourneyStep,
  fingerprintPolygon,
  hasExactlyThreeSavedCards,
  isCardSaved,
  isMemoryTextValid,
  memoryCardIds,
  normalizeMemoryText,
} from "@/lib/resonance";

async function getBase44Entities() {
  const base44 = await getBase44Client();
  return base44.entities;
}

function initialCards() {
  return Object.fromEntries(MEMORY_CARD_SLOTS.map((slot) => [slot, { id: "", slot, content: "" }]));
}

function initialCardStates() {
  return Object.fromEntries(MEMORY_CARD_SLOTS.map((slot) => [slot, "idle"]));
}

function latestCardsBySlot(records) {
  const result = initialCards();
  for (const record of Array.isArray(records) ? records : []) {
    if (MEMORY_CARD_SLOTS.includes(record?.slot) && !result[record.slot].id) {
      result[record.slot] = {
        id: record.id,
        slot: record.slot,
        content: String(record.content ?? "").slice(0, MEMORY_MAX_LENGTH),
      };
    }
  }
  return result;
}

function isCurrent(activeRef, versionRef, version) {
  return activeRef.current && versionRef.current === version;
}

export function ResonanceJourney({ language, copy, onLogout }) {
  const [cards, setCards] = useState(initialCards);
  const [savedContent, setSavedContent] = useState(() => Object.fromEntries(MEMORY_CARD_SLOTS.map((slot) => [slot, ""])));
  const [cardStates, setCardStates] = useState(initialCardStates);
  const [consentChecked, setConsentChecked] = useState(false);
  const [consent, setConsent] = useState(null);
  const [fingerprint, setFingerprint] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [decision, setDecision] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [restoreStatus, setRestoreStatus] = useState("loading");
  const [consentStatus, setConsentStatus] = useState("idle");
  const [fingerprintStatus, setFingerprintStatus] = useState("idle");
  const [matchStatus, setMatchStatus] = useState("idle");
  const [decisionStatus, setDecisionStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("neutral");
  const activeRef = useRef(true);
  const loadVersionRef = useRef(0);
  const inFlightRef = useRef(new Set());

  const beginAction = (key) => {
    if (inFlightRef.current.has(key)) return false;
    inFlightRef.current.add(key);
    return true;
  };

  const endAction = (key) => {
    inFlightRef.current.delete(key);
  };

  const showMessage = (tone, value) => {
    setMessageTone(tone);
    setMessage(value);
  };

  const clearMessage = () => {
    setMessage("");
    setMessageTone("neutral");
  };

  const loadMatches = async (fingerprintId, version = loadVersionRef.current) => {
    setMatchStatus("loading");
    try {
      const base44 = await getBase44Client();
      const response = await base44.functions.invoke("compute-matches", {
        fingerprint_id: fingerprintId,
        locale: language,
      });
      const result = response?.data;
      if (!result?.ok || !Array.isArray(result.candidates) || result.candidates.length !== 3) {
        throw new Error("INVALID_MATCH_RESPONSE");
      }
      if (!isCurrent(activeRef, loadVersionRef, version)) return false;
      setCandidates(result.candidates);
      setMatchStatus("success");
      return true;
    } catch {
      if (!isCurrent(activeRef, loadVersionRef, version)) return false;
      setCandidates([]);
      setMatchStatus("error");
      showMessage("error", copy.journey.errors.matches);
      return false;
    }
  };

  const restoreJourney = async (version) => {
    setIsRestoring(true);
    setRestoreStatus("loading");
    clearMessage();
    try {
      const { MemoryCard, ConsentRecord, ResonanceFingerprint, MatchDecision } = await getBase44Entities();
      const [memoryRecords, consentRecords, fingerprintRecords, decisionRecords] = await Promise.all([
        MemoryCard.list("-updated_date", 20, 0),
        ConsentRecord.list("-updated_date", 10, 0),
        ResonanceFingerprint.list("-updated_date", 10, 0),
        MatchDecision.list("-updated_date", 10, 0),
      ]);
      if (!isCurrent(activeRef, loadVersionRef, version)) return;

      const restoredCards = latestCardsBySlot(memoryRecords);
      const restoredSaved = Object.fromEntries(MEMORY_CARD_SLOTS.map((slot) => [slot, restoredCards[slot].content]));
      const activeConsent = (Array.isArray(consentRecords) ? consentRecords : []).find((record) => record?.active === true) ?? null;
      const restoredFingerprint = activeConsent
        ? (Array.isArray(fingerprintRecords) ? fingerprintRecords : []).find(
          (record) => record?.consent_record_id === activeConsent.id,
        ) ?? null
        : null;
      const restoredDecision = restoredFingerprint
        ? (Array.isArray(decisionRecords) ? decisionRecords : []).find(
          (record) => record?.fingerprint_id === restoredFingerprint.id,
        ) ?? null
        : null;

      setCards(restoredCards);
      setSavedContent(restoredSaved);
      setConsent(activeConsent);
      setConsentChecked(Boolean(activeConsent));
      setFingerprint(restoredFingerprint);
      setDecision(restoredDecision);
      setCardStates(initialCardStates());

      if (restoredFingerprint?.id) {
        await loadMatches(restoredFingerprint.id, version);
      } else {
        setCandidates([]);
        setMatchStatus("idle");
      }
      if (isCurrent(activeRef, loadVersionRef, version)) setRestoreStatus("success");
    } catch {
      if (!isCurrent(activeRef, loadVersionRef, version)) return;
      setRestoreStatus("error");
      showMessage("error", copy.journey.errors.restore);
    } finally {
      if (isCurrent(activeRef, loadVersionRef, version)) setIsRestoring(false);
    }
  };

  useEffect(() => {
    activeRef.current = true;
    const version = loadVersionRef.current + 1;
    loadVersionRef.current = version;
    void restoreJourney(version);

    return () => {
      activeRef.current = false;
      loadVersionRef.current += 1;
      inFlightRef.current.clear();
    };
  }, []);

  const retryRestore = async () => {
    if (!beginAction("restore")) return;
    const version = loadVersionRef.current + 1;
    loadVersionRef.current = version;
    try {
      await restoreJourney(version);
    } finally {
      endAction("restore");
    }
  };

  const updateCardContent = (slot, value) => {
    const bounded = String(value ?? "").slice(0, MEMORY_MAX_LENGTH);
    setCards((current) => ({
      ...current,
      [slot]: { ...current[slot], content: bounded },
    }));
    setCardStates((current) => ({ ...current, [slot]: "idle" }));
    clearMessage();
  };

  const saveCard = async (slot) => {
    const key = `memory:${slot}`;
    if (!beginAction(key)) return;
    const currentCard = cards[slot];
    const normalized = normalizeMemoryText(currentCard.content);
    if (!isMemoryTextValid(normalized)) {
      setCardStates((current) => ({ ...current, [slot]: "error" }));
      showMessage("error", copy.journey.errors.memory);
      endAction(key);
      return;
    }

    setCardStates((current) => ({ ...current, [slot]: "loading" }));
    clearMessage();
    try {
      const { MemoryCard } = await getBase44Entities();
      const payload = {
        slot,
        content: normalized,
        locale: language,
        client_nonce: createMutationNonce(),
      };
      let targetId = currentCard.id;
      if (!targetId) {
        const existing = await MemoryCard.filter({ slot }, "-updated_date", 1, 0);
        targetId = existing?.[0]?.id ?? "";
      }
      const record = targetId
        ? await MemoryCard.update(targetId, payload)
        : await MemoryCard.create(payload);
      if (!activeRef.current) return;
      setCards((current) => ({
        ...current,
        [slot]: { id: record.id, slot, content: normalized },
      }));
      setSavedContent((current) => ({ ...current, [slot]: normalized }));
      setCardStates((current) => ({ ...current, [slot]: "success" }));
      showMessage("success", copy.journey.memory.savedMessage);
    } catch {
      if (!activeRef.current) return;
      setCardStates((current) => ({ ...current, [slot]: "error" }));
      showMessage("error", copy.journey.errors.memorySave);
    } finally {
      endAction(key);
    }
  };

  const cardsSaved = hasExactlyThreeSavedCards(cards)
    && MEMORY_CARD_SLOTS.every((slot) => isCardSaved(cards[slot], savedContent[slot]));

  const activateConsent = async () => {
    if (!beginAction("consent")) return;
    if (!cardsSaved || !consentChecked) {
      showMessage("error", copy.journey.errors.consent);
      endAction("consent");
      return;
    }

    setConsentStatus("loading");
    clearMessage();
    const ids = memoryCardIds(cards);
    const payload = {
      consent_version: "slice2-demo-v1",
      active: true,
      memory_card_ids: ids,
      locale: language,
      client_nonce: createMutationNonce(),
    };

    try {
      const { ConsentRecord } = await getBase44Entities();
      let targetId = consent?.id ?? "";
      if (!targetId) {
        const existing = await ConsentRecord.filter(
          { consent_version: "slice2-demo-v1" },
          "-updated_date",
          1,
          0,
        );
        targetId = existing?.[0]?.id ?? "";
      }
      const record = targetId
        ? await ConsentRecord.update(targetId, payload)
        : await ConsentRecord.create(payload);
      if (!activeRef.current) return;
      setConsent(record);
      setConsentChecked(true);
      setConsentStatus("success");
      showMessage("success", copy.journey.consent.saved);
    } catch {
      if (!activeRef.current) return;
      setConsentStatus("error");
      showMessage("error", copy.journey.errors.consentSave);
    } finally {
      endAction("consent");
    }
  };

  const withdrawConsent = async () => {
    if (!consent?.id || fingerprint || !beginAction("withdraw-consent")) return;
    setConsentStatus("loading");
    clearMessage();
    try {
      const { ConsentRecord } = await getBase44Entities();
      const record = await ConsentRecord.update(consent.id, { active: false });
      if (!activeRef.current) return;
      setConsent(record);
      setConsentChecked(false);
      setConsentStatus("idle");
      showMessage("success", copy.journey.consent.withdrawn);
    } catch {
      if (!activeRef.current) return;
      setConsentStatus("error");
      showMessage("error", copy.journey.errors.consentSave);
    } finally {
      endAction("withdraw-consent");
    }
  };

  const generateFingerprint = async () => {
    if (!consent?.active || !cardsSaved || !beginAction("generate-fingerprint")) return;
    setFingerprintStatus("loading");
    clearMessage();
    try {
      const base44 = await getBase44Client();
      const response = await base44.functions.invoke("generate-fingerprint", {
        memory_card_ids: memoryCardIds(cards),
        consent_record_id: consent.id,
        locale: language,
      });
      const result = response?.data;
      if (!result?.ok || !result?.fingerprint?.id) throw new Error("INVALID_FINGERPRINT_RESPONSE");
      if (!activeRef.current) return;
      setFingerprint(result.fingerprint);
      setDecision(null);
      setCandidates([]);
      setFingerprintStatus("success");
      showMessage("success", copy.journey.fingerprint.generated);
      await loadMatches(result.fingerprint.id);
    } catch {
      if (!activeRef.current) return;
      setFingerprintStatus("error");
      showMessage("error", copy.journey.errors.fingerprint);
    } finally {
      endAction("generate-fingerprint");
    }
  };

  const chooseCandidate = async (candidateId) => {
    if (!fingerprint?.id || !beginAction("match-decision")) return;
    setDecisionStatus("loading");
    clearMessage();
    const payload = {
      fingerprint_id: fingerprint.id,
      candidate_id: candidateId,
      state: "interested_waiting",
      simulation_label: true,
      locale: language,
      client_nonce: createMutationNonce(),
    };
    try {
      const { MatchDecision } = await getBase44Entities();
      let targetId = decision?.id ?? "";
      if (!targetId) {
        const existing = await MatchDecision.filter(
          { fingerprint_id: fingerprint.id },
          "-updated_date",
          1,
          0,
        );
        targetId = existing?.[0]?.id ?? "";
      }
      const record = targetId
        ? await MatchDecision.update(targetId, payload)
        : await MatchDecision.create(payload);
      if (!activeRef.current) return;
      setDecision(record);
      setDecisionStatus("success");
      showMessage("success", copy.journey.decision.saved);
    } catch {
      if (!activeRef.current) return;
      setDecisionStatus("error");
      showMessage("error", copy.journey.errors.decision);
    } finally {
      endAction("match-decision");
    }
  };

  const simulateMutual = async () => {
    if (!decision?.id || decision.state === "simulated_mutual" || !beginAction("simulate-mutual")) return;
    setDecisionStatus("loading");
    clearMessage();
    try {
      const { MatchDecision } = await getBase44Entities();
      const record = await MatchDecision.update(decision.id, {
        state: "simulated_mutual",
        simulation_label: true,
      });
      if (!activeRef.current) return;
      setDecision(record);
      setDecisionStatus("success");
      showMessage("success", copy.journey.decision.simulatedSaved);
    } catch {
      if (!activeRef.current) return;
      setDecisionStatus("error");
      showMessage("error", copy.journey.errors.decision);
    } finally {
      endAction("simulate-mutual");
    }
  };

  const retryMatches = async () => {
    if (!fingerprint?.id || !beginAction("retry-matches")) return;
    clearMessage();
    try {
      await loadMatches(fingerprint.id);
    } finally {
      endAction("retry-matches");
    }
  };

  const step = deriveJourneyStep({ cards, consent, fingerprint, candidates, decision });
  const selectedCandidate = candidates.find((candidate) => candidate.id === decision?.candidate_id) ?? null;
  const polygon = useMemo(() => fingerprintPolygon(fingerprint), [fingerprint]);

  return (
    <section className="resonance-journey" id="experience" aria-labelledby="journey-title">
      <div className="journey-heading">
        <div>
          <div className="section-kicker">{copy.journey.eyebrow}</div>
          <h2 id="journey-title">{copy.journey.title}</h2>
          <p>{copy.journey.body}</p>
        </div>
        <div className="member-card">
          <span>{copy.journey.session}</span>
          <strong>{copy.journey.member}</strong>
          <button className="text-action" type="button" onClick={onLogout}>{copy.capability.logout}</button>
        </div>
      </div>

      <ol className="journey-progress" aria-label={copy.journey.progressLabel}>
        {copy.journey.steps.map((item, index) => (
          <li className={item.key === step ? "is-current" : ""} key={item.key}>
            <span>0{index + 1}</span>
            <strong>{item.label}</strong>
          </li>
        ))}
      </ol>

      {isRestoring ? (
        <div className="state-message state-message--loading">{copy.journey.restoring}</div>
      ) : null}
      {!isRestoring && restoreStatus === "error" ? (
        <button className="button button--secondary restore-retry" type="button" onClick={() => void retryRestore()}>
          {copy.journey.retryRestore}
        </button>
      ) : null}

      {restoreStatus !== "error" ? <div className="journey-grid">
        <section className="journey-panel memory-capture" aria-labelledby="memory-title">
          <div className="journey-panel__heading">
            <span>01</span>
            <div>
              <h3 id="memory-title">{copy.journey.memory.title}</h3>
              <p>{copy.journey.memory.body}</p>
            </div>
          </div>

          <div className="memory-cards">
            {MEMORY_CARD_SLOTS.map((slot, index) => {
              const card = cards[slot];
              const state = cardStates[slot];
              const saved = isCardSaved(card, savedContent[slot]);
              const prompt = copy.journey.memory.cards[index];
              return (
                <article className="memory-card" key={slot}>
                  <div className="memory-card__meta">
                    <span>{prompt.kicker}</span>
                    <strong className={`memory-state memory-state--${state === "error" ? "error" : saved ? "saved" : "unsaved"}`}>
                      {state === "loading"
                        ? copy.journey.memory.saving
                        : state === "error"
                          ? copy.journey.memory.error
                          : saved
                            ? copy.journey.memory.saved
                            : copy.journey.memory.unsaved}
                    </strong>
                  </div>
                  <label htmlFor={`memory-${slot}`}>{prompt.prompt}</label>
                  <textarea
                    id={`memory-${slot}`}
                    value={card.content}
                    minLength={MEMORY_MIN_LENGTH}
                    maxLength={MEMORY_MAX_LENGTH}
                    rows={5}
                    disabled={state === "loading" || Boolean(fingerprint)}
                    onChange={(event) => updateCardContent(slot, event.target.value)}
                    placeholder={prompt.placeholder}
                  />
                  <div className="memory-card__footer">
                    <small>{copy.journey.memory.privacy}</small>
                    <span>{card.content.length}/{MEMORY_MAX_LENGTH}</span>
                  </div>
                  <button
                    className="button button--secondary button--wide"
                    type="button"
                    disabled={state === "loading" || !isMemoryTextValid(card.content) || saved || Boolean(fingerprint)}
                    onClick={() => void saveCard(slot)}
                  >
                    {state === "loading" ? copy.journey.memory.saving : copy.journey.memory.save}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="journey-panel consent-panel" aria-labelledby="consent-title">
          <div className="journey-panel__heading">
            <span>02</span>
            <div>
              <h3 id="consent-title">{copy.journey.consent.title}</h3>
              <p>{copy.journey.consent.body}</p>
            </div>
          </div>
          <label className="consent-control">
            <input
              type="checkbox"
              checked={consentChecked}
              disabled={!cardsSaved || consentStatus === "loading" || Boolean(fingerprint)}
              onChange={(event) => {
                setConsentChecked(event.target.checked);
                clearMessage();
              }}
            />
            <span>{copy.journey.consent.label}</span>
          </label>
          <p className="privacy-note">{copy.journey.consent.privacy}</p>
          {!consent?.active ? (
            <button
              className="button button--primary button--wide"
              type="button"
              disabled={!cardsSaved || !consentChecked || consentStatus === "loading"}
              onClick={() => void activateConsent()}
            >
              {consentStatus === "loading" ? copy.journey.consent.saving : copy.journey.consent.confirm}
            </button>
          ) : !fingerprint ? (
            <button className="text-action" type="button" disabled={consentStatus === "loading"} onClick={() => void withdrawConsent()}>
              {copy.journey.consent.withdraw}
            </button>
          ) : (
            <span className="consent-locked">{copy.journey.consent.used}</span>
          )}
        </section>

        <section className="journey-panel fingerprint-panel" aria-labelledby="fingerprint-title">
          <div className="journey-panel__heading">
            <span>03</span>
            <div>
              <h3 id="fingerprint-title">{copy.journey.fingerprint.title}</h3>
              <p>{copy.journey.fingerprint.body}</p>
            </div>
          </div>

          {!fingerprint ? (
            <button
              className="button button--primary button--wide"
              type="button"
              disabled={!consent?.active || fingerprintStatus === "loading"}
              onClick={() => void generateFingerprint()}
            >
              {fingerprintStatus === "loading" ? copy.journey.fingerprint.generating : copy.journey.fingerprint.generate}
            </button>
          ) : (
            <div className="fingerprint-result" data-product-result="fingerprint">
              <svg className="fingerprint-visual" viewBox="0 0 200 200" role="img" aria-label={copy.journey.fingerprint.visualLabel}>
                <circle cx="100" cy="100" r="76" />
                <circle cx="100" cy="100" r="50" />
                <polygon points={polygon} />
                <circle cx="100" cy="100" r="4" />
              </svg>
              <div className="fingerprint-copy">
                <span className="demo-label">{copy.journey.fingerprint.demoLabel}</span>
                <p>{fingerprint.summary}</p>
                <dl className="fingerprint-dimensions">
                  {copy.journey.fingerprint.dimensions.map((dimension) => (
                    <div key={dimension.key}>
                      <dt>{dimension.label}</dt>
                      <dd>{dimension.format(fingerprint[dimension.key])}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}
        </section>

        <section className="journey-panel candidate-panel" aria-labelledby="candidate-title">
          <div className="journey-panel__heading">
            <span>04</span>
            <div>
              <h3 id="candidate-title">{copy.journey.candidates.title}</h3>
              <p>{copy.journey.candidates.body}</p>
            </div>
          </div>

          {matchStatus === "loading" ? <div className="state-message state-message--loading">{copy.journey.candidates.loading}</div> : null}
          {fingerprint && matchStatus === "error" ? (
            <button className="button button--secondary button--wide" type="button" onClick={() => void retryMatches()}>
              {copy.journey.candidates.retry}
            </button>
          ) : null}
          {candidates.length === 3 ? (
            <div className="candidate-list" data-product-result="candidates">
              {candidates.map((candidate, index) => (
                <article className={`candidate-card ${decision?.candidate_id === candidate.id ? "is-selected" : ""}`} key={candidate.id}>
                  <div className="candidate-card__header">
                    <div>
                      <span className="demo-label">{candidate.synthetic_label}</span>
                      <h4>{candidate.name}</h4>
                    </div>
                    <div className="candidate-score">
                      <strong>{candidate.score}</strong>
                      <span>{copy.journey.candidates.score}</span>
                    </div>
                  </div>
                  <div className="candidate-tier">{copy.journey.candidates.tiers[candidate.tier] ?? candidate.tier}</div>
                  <ul>
                    {candidate.shared_signals.slice(0, 3).map((signal) => <li key={signal}>{signal}</li>)}
                  </ul>
                  <p><strong>{copy.journey.candidates.difference}</strong> {candidate.difference}</p>
                  <p>{candidate.explanation}</p>
                  <button
                    className="button button--secondary button--wide"
                    type="button"
                    disabled={decisionStatus === "loading" || decision?.state === "simulated_mutual" || decision?.candidate_id === candidate.id}
                    onClick={() => void chooseCandidate(candidate.id)}
                  >
                    {decision?.candidate_id === candidate.id
                      ? copy.journey.candidates.selected
                      : `${copy.journey.candidates.choose} ${index + 1}`}
                  </button>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section className="journey-panel mutual-panel" aria-labelledby="mutual-title">
          <div className="journey-panel__heading">
            <span>05</span>
            <div>
              <h3 id="mutual-title">{copy.journey.decision.title}</h3>
              <p>{copy.journey.decision.body}</p>
            </div>
          </div>

          {!decision ? (
            <div className="state-message">{copy.journey.decision.empty}</div>
          ) : (
            <div className={`mutual-state mutual-state--${decision.state}`} data-product-result="mutual">
              <span className="demo-label">{copy.journey.decision.simulationLabel}</span>
              <h4>{selectedCandidate?.name ?? copy.journey.decision.candidate}</h4>
              <strong>
                {decision.state === "simulated_mutual"
                  ? copy.journey.decision.mutual
                  : copy.journey.decision.waiting}
              </strong>
              <p>
                {decision.state === "simulated_mutual"
                  ? copy.journey.decision.mutualBody
                  : copy.journey.decision.waitingBody}
              </p>
              {decision.state !== "simulated_mutual" ? (
                <button
                  className="button button--primary button--wide"
                  type="button"
                  disabled={decisionStatus === "loading"}
                  onClick={() => void simulateMutual()}
                >
                  {decisionStatus === "loading" ? copy.journey.decision.saving : copy.journey.decision.simulate}
                </button>
              ) : null}
            </div>
          )}
        </section>
      </div> : null}

      {message ? (
        <p className={`journey-message journey-message--${messageTone}`} role={messageTone === "error" ? "alert" : "status"}>
          {message}
        </p>
      ) : null}
    </section>
  );
}
