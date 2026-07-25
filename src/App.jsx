import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Atmosphere } from "@/components/Atmosphere";
import { AuthPanel } from "@/components/AuthPanel";
import { BackendFlow } from "@/components/BackendFlow";
import { CapabilityPanel } from "@/components/CapabilityPanel";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { getCopy, getStoredLanguage, persistLanguage } from "@/lib/i18n";

export default function App() {
  const [language, setLanguage] = useState(() => getStoredLanguage());
  const [user, setUser] = useState(null);
  const [authState, setAuthState] = useState("checking");
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const text = useMemo(() => getCopy(language), [language]);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!active) return;
        if (currentUser) {
          setUser(currentUser);
          setAuthState("ready");
        } else {
          setAuthState("anonymous");
        }
      } catch (error) {
        if (!active) return;
        const status = error?.response?.status ?? error?.status;
        if (status === 401 || status === 403) {
          setAuthState("anonymous");
        } else {
          setAuthState("error");
          setAuthNotice(text.auth.errors.unavailable);
        }
      }
    };
    void restoreSession();
    return () => {
      active = false;
      base44.cleanup?.();
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "ko" ? "ko" : "en";
  }, [language]);

  const changeLanguage = (nextLanguage) => {
    const persisted = persistLanguage(nextLanguage);
    setLanguage(persisted);
  };

  const openAuth = () => {
    setAuthPanelOpen(true);
    requestAnimationFrame(() => document.getElementById("auth-region")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  const handleAuthenticated = (authenticatedUser) => {
    setUser(authenticatedUser);
    setAuthState("ready");
    setAuthPanelOpen(false);
    setAuthNotice("");
    requestAnimationFrame(() => document.getElementById("capability")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <main className="site-shell">
      <Atmosphere />
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Resonance home">Resonance</a>
        <nav aria-label="Primary navigation">
          <a href="#backend">{text.nav.backend}</a>
          <LanguageSwitch language={language} onChange={changeLanguage} labels={text.language} />
          {!user ? (
            <button className="nav-enter" type="button" onClick={openAuth}>{text.nav.enter}</button>
          ) : null}
        </nav>
      </header>

      <section className="hero" id="top" aria-labelledby="hero-title">
        <div className="hero__copy">
          <div className="section-kicker">{text.hero.eyebrow}</div>
          <h1 id="hero-title">{text.hero.title}</h1>
          <p className="hero__korean-line" lang="ko">{text.hero.koreanLine}</p>
          <p className="hero__body">{text.hero.body}</p>
          <div className="hero__actions">
            <button className="button button--primary" type="button" onClick={user ? () => document.getElementById("capability")?.scrollIntoView({ behavior: "smooth" }) : openAuth}>
              {text.hero.primary}
            </button>
            <a className="button button--ghost" href="#backend">{text.hero.secondary}</a>
          </div>
          <p className="privacy-note">{text.hero.privacy}</p>
        </div>

        <div className="hero__signal" aria-hidden="true">
          <div className="signal-disc signal-disc--left"><span /></div>
          <div className="signal-disc signal-disc--right"><span /></div>
          <div className="signal-caption">R / 01</div>
        </div>
      </section>

      <section className="auth-region" id="auth-region" aria-live="polite">
        {authState === "checking" ? (
          <div className="state-message state-message--auth">{text.status.checking}</div>
        ) : null}
        {authNotice ? <p className="form-message form-message--error" role="alert">{authNotice}</p> : null}
        {!user && authPanelOpen ? (
          <AuthPanel copy={text} onAuthenticated={handleAuthenticated} onClose={() => setAuthPanelOpen(false)} />
        ) : null}
      </section>

      {user ? (
        <CapabilityPanel
          user={user}
          language={language}
          copy={text}
          onAuthStateChange={(nextState) => {
            setUser(null);
            setAuthState(nextState);
          }}
        />
      ) : null}

      <BackendFlow copy={text} />

      <footer className="site-footer">
        <span>{text.footer.line}</span>
        <span>{text.footer.privacy}</span>
      </footer>
    </main>
  );
}
