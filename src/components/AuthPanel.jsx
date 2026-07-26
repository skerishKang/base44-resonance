import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthPanel({ copy, onAuthenticated, onClose }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const resetFeedback = () => {
    setStatus("idle");
    setMessage("");
  };

  const switchMode = (nextMode) => {
    resetFeedback();
    setMode(nextMode);
    setPassword("");
    setOtp("");
  };

  const validateCredentials = () => {
    if (!EMAIL_PATTERN.test(email.trim())) return copy.auth.errors.email;
    if (password.length < 8) return copy.auth.errors.password;
    return "";
  };

  const handleSignIn = async () => {
    const validationMessage = validateCredentials();
    if (validationMessage) {
      setStatus("error");
      setMessage(validationMessage);
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const response = await base44.auth.loginViaEmailPassword(email.trim(), password);
      if (!activeRef.current) return;
      const user = response?.user ?? await base44.auth.me();
      onAuthenticated(user);
    } catch (error) {
      if (!activeRef.current) return;
      const code = error?.response?.status ?? error?.status;
      setStatus("error");
      setMessage(code === 401 || code === 403 ? copy.auth.errors.credentials : copy.auth.errors.unavailable);
    }
  };

  const handleRegister = async () => {
    const validationMessage = validateCredentials();
    if (validationMessage) {
      setStatus("error");
      setMessage(validationMessage);
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      await base44.auth.register({ email: email.trim(), password });
      if (!activeRef.current) return;
      setPendingEmail(email.trim());
      setPassword("");
      setMode("verify");
      setStatus("success");
      setMessage(copy.auth.registered);
    } catch {
      if (!activeRef.current) return;
      setStatus("error");
      setMessage(copy.auth.errors.registration);
    }
  };

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setStatus("error");
      setMessage(copy.auth.errors.otp);
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      await base44.auth.verifyOtp({ email: pendingEmail, otpCode: otp });
      if (!activeRef.current) return;
      setEmail(pendingEmail);
      setOtp("");
      setMode("signin");
      setStatus("success");
      setMessage(copy.auth.verified);
    } catch {
      if (!activeRef.current) return;
      setStatus("error");
      setMessage(copy.auth.errors.verification);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (status === "loading") return;
    if (mode === "signin") void handleSignIn();
    if (mode === "register") void handleRegister();
    if (mode === "verify") void handleVerify();
  };

  const submitLabel = mode === "signin"
    ? copy.auth.submitSignIn
    : mode === "register"
      ? copy.auth.submitRegister
      : copy.auth.submitVerify;

  return (
    <section className="auth-panel" aria-labelledby="auth-title">
      <button className="panel-close" type="button" onClick={onClose} aria-label="Close authentication panel">
        <span aria-hidden="true">×</span>
      </button>
      <div className="section-kicker">{copy.auth.eyebrow}</div>
      <h2 id="auth-title">{copy.auth.title}</h2>
      <p className="auth-panel__intro">{copy.auth.body}</p>

      <div className="auth-tabs" role="tablist" aria-label={copy.auth.title}>
        <button
          type="tab"
          role="tab"
          aria-selected={mode === "signin"}
          className={mode === "signin" ? "is-active" : ""}
          onClick={() => switchMode("signin")}
        >
          {copy.auth.signIn}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "register"}
          className={mode === "register" ? "is-active" : ""}
          onClick={() => switchMode("register")}
        >
          {copy.auth.register}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {mode !== "verify" ? (
          <>
            <label>
              <span>{copy.auth.email}</span>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value.slice(0, 254))}
                disabled={status === "loading"}
              />
            </label>
            <label>
              <span>{copy.auth.password}</span>
              <input
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value.slice(0, 128))}
                disabled={status === "loading"}
              />
            </label>
          </>
        ) : (
          <label>
            <span>{copy.auth.otp}</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              disabled={status === "loading"}
            />
            <small>{copy.auth.verifyInstruction}</small>
          </label>
        )}

        {message ? (
          <p className={`form-message form-message--${status}`} role={status === "error" ? "alert" : "status"}>
            {message}
          </p>
        ) : null}

        <button className="button button--primary button--wide" type="submit" disabled={status === "loading"}>
          {status === "loading" ? copy.auth.working : submitLabel}
        </button>
      </form>

      {mode === "verify" ? (
        <button className="text-action" type="button" onClick={() => switchMode("signin")}>
          {copy.auth.switchToSignIn} {copy.auth.signIn}
        </button>
      ) : (
        <button className="text-action" type="button" onClick={() => switchMode(mode === "signin" ? "register" : "signin")}>
          {mode === "signin" ? copy.auth.switchToRegister : copy.auth.switchToSignIn}{" "}
          {mode === "signin" ? copy.auth.register : copy.auth.signIn}
        </button>
      )}
    </section>
  );
}
