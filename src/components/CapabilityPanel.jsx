import { useEffect, useMemo, useRef, useState } from "react";
import { getBase44Client } from "@/api/base44Client";
import {
  createClientNonce,
  deriveStatusCards,
  isProbeIdValid,
  isProbeLabelValid,
  normalizeProbeLabel,
} from "@/lib/capability";

export function CapabilityPanel({ language, copy, onAuthStateChange }) {
  const [label, setLabel] = useState("");
  const [probes, setProbes] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("neutral");
  const [states, setStates] = useState({ auth: "ready", entity: "loading", function: "waiting" });
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const setStateFor = (key, value) => {
    setStates((current) => ({ ...current, [key]: value }));
  };

  const loadProbes = async ({ quiet = false } = {}) => {
    if (!quiet) setIsLoading(true);
    setStateFor("entity", "loading");
    try {
      const base44 = await getBase44Client();
      const CapabilityProbe = base44.entities.CapabilityProbe;
      const records = await CapabilityProbe.list("-created_date", 20, 0);
      if (!activeRef.current) return;
      const boundedRecords = Array.isArray(records) ? records : [];
      setProbes(boundedRecords);
      setSelectedId((current) => current || boundedRecords?.[0]?.id || "");
      setStateFor("entity", boundedRecords.length ? "ready" : "empty");
      setStateFor("function", boundedRecords.some((record) => record?.verified === true) ? "ready" : "waiting");
      setMessage("");
    } catch {
      if (!activeRef.current) return;
      setProbes([]);
      setStateFor("entity", "error");
      setMessageTone("error");
      setMessage(copy.capability.errors.entity);
    } finally {
      if (activeRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProbes();
  }, []);

  const createProbe = async (event) => {
    event.preventDefault();
    const normalized = normalizeProbeLabel(label);
    if (!isProbeLabelValid(normalized)) {
      setMessageTone("error");
      setMessage(copy.capability.errors.label);
      return;
    }

    setIsCreating(true);
    setStateFor("entity", "loading");
    setMessage("");
    try {
      const base44 = await getBase44Client();
      const CapabilityProbe = base44.entities.CapabilityProbe;
      const record = await CapabilityProbe.create({
        label: normalized,
        locale: language,
        client_nonce: createClientNonce(),
        verified: false,
      });
      if (!activeRef.current) return;
      setLabel("");
      setSelectedId(record?.id || "");
      setMessageTone("success");
      setMessage(copy.capability.successCreate);
      await loadProbes({ quiet: true });
    } catch {
      if (!activeRef.current) return;
      setStateFor("entity", "error");
      setMessageTone("error");
      setMessage(copy.capability.errors.entity);
    } finally {
      if (activeRef.current) setIsCreating(false);
    }
  };

  const verifyProbe = async () => {
    if (!isProbeIdValid(selectedId)) {
      setMessageTone("error");
      setMessage(copy.capability.errors.missing);
      return;
    }

    setIsVerifying(true);
    setStateFor("function", "loading");
    setMessage("");
    try {
      const base44 = await getBase44Client();
      const response = await base44.functions.invoke("verify-capability", {
        probe_id: selectedId,
        locale: language,
      });
      const result = response.data;
      if (!result?.ok || result?.capabilities?.function !== true) throw new Error("INVALID_CAPABILITY_RESPONSE");
      if (!activeRef.current) return;
      setProbes((current) => current.map((probe) => (
        probe.id === selectedId ? { ...probe, verified: true } : probe
      )));
      setStateFor("function", "ready");
      setStateFor("entity", "ready");
      setMessageTone("success");
      setMessage(copy.capability.successVerify);
    } catch {
      if (!activeRef.current) return;
      setStateFor("function", "error");
      setMessageTone("error");
      setMessage(copy.capability.errors.function);
    } finally {
      if (activeRef.current) setIsVerifying(false);
    }
  };

  const logout = () => {
    onAuthStateChange("anonymous");
    void getBase44Client().then((base44) => base44.auth.logout(window.location.origin)).catch(() => {});
  };

  const statusCards = useMemo(
    () => deriveStatusCards(states, copy.status),
    [states, copy.status],
  );
  const displayName = copy.capability.member;

  return (
    <section className="capability-shell" id="capability" aria-labelledby="capability-title">
      <div className="capability-heading">
        <div>
          <div className="section-kicker">{copy.capability.eyebrow}</div>
          <h2 id="capability-title">{copy.capability.title}</h2>
          <p>{copy.capability.body}</p>
        </div>
        <div className="session-card">
          <span>{copy.capability.greeting}</span>
          <strong>{displayName}</strong>
          <button className="text-action" type="button" onClick={logout}>{copy.capability.logout}</button>
        </div>
      </div>

      <div className="status-rail" aria-label={copy.status.title}>
        {statusCards.map((card, index) => (
          <div className={`status-node status-node--${card.state}`} key={card.key}>
            <span className="status-node__number">0{index + 1}</span>
            <span className="status-node__label">{card.label}</span>
            <strong>{card.stateLabel}</strong>
          </div>
        ))}
      </div>

      <div className="capability-grid">
        <form className="probe-composer" onSubmit={createProbe}>
          <label htmlFor="probe-label">{copy.capability.label}</label>
          <div className="probe-composer__row">
            <input
              id="probe-label"
              value={label}
              maxLength={48}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={copy.capability.placeholder}
              disabled={isCreating}
            />
            <button className="button button--primary" type="submit" disabled={isCreating}>
              {isCreating ? copy.capability.creating : copy.capability.create}
            </button>
          </div>
          <p className="privacy-note">{copy.hero.privacy}</p>
        </form>

        <div className="probe-list" aria-live="polite">
          <div className="probe-list__header">
            <h3>{copy.capability.records}</h3>
            <button className="text-action" type="button" onClick={() => void loadProbes()} disabled={isLoading}>
              {copy.capability.refresh}
            </button>
          </div>

          {isLoading ? (
            <div className="state-message state-message--loading">{copy.capability.loading}</div>
          ) : probes.length === 0 ? (
            <div className="state-message">{copy.capability.empty}</div>
          ) : (
            <div className="probe-list__items">
              {probes.map((probe) => {
                const selected = probe.id === selectedId;
                return (
                  <button
                    type="button"
                    className={`probe-card ${selected ? "is-selected" : ""}`}
                    key={probe.id}
                    onClick={() => setSelectedId(probe.id)}
                    aria-pressed={selected}
                  >
                    <span className="probe-card__orbit" aria-hidden="true" />
                    <span className="probe-card__main">
                      <strong>{probe.label}</strong>
                      <small>{copy.capability.locale}: {String(probe.locale || "en").toUpperCase()}</small>
                    </span>
                    <span className={`probe-card__state ${probe.verified ? "is-verified" : ""}`}>
                      {probe.verified ? copy.capability.verified : copy.capability.unverified}
                    </span>
                    <span className="probe-card__select">{selected ? copy.capability.selected : copy.capability.select}</span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            className="button button--secondary button--wide"
            type="button"
            onClick={() => void verifyProbe()}
            disabled={isVerifying || probes.length === 0}
          >
            {isVerifying ? copy.capability.verifying : copy.capability.verify}
          </button>
        </div>
      </div>

      {message ? (
        <p className={`capability-message capability-message--${messageTone}`} role={messageTone === "error" ? "alert" : "status"}>
          {message}
        </p>
      ) : null}
    </section>
  );
}
