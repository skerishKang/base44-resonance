import { useEffect, useMemo, useState } from "react";
import { cleanupBase44Client, getBase44Client, hasStoredBase44Session } from "@/api/base44Client";
import { Atmosphere } from "@/components/Atmosphere";
import { AuthPanel } from "@/components/AuthPanel";
import { BackendFlow } from "@/components/BackendFlow";
import { CapabilityPanel } from "@/components/CapabilityPanel";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { ResonanceJourney } from "@/components/ResonanceJourney";
import { getCopy, getStoredLanguage, persistLanguage } from "@/lib/i18n";
import { scrollToElementById } from "@/lib/scroll";
import { CinematicWatchTree } from "@/watchtree/CinematicWatchTree";
import { getWatchTreeCopy } from "@/watchtree/copy";
import { createProductionWatchTreeAdapter } from "@/watchtree/productionAdapter";
import { WatchTreeExperience } from "@/watchtree/WatchTreeExperience";

export default function App() {
  const [language, setLanguage] = useState(() => getStoredLanguage());
  const [user, setUser] = useState(null);
  const [authState, setAuthState] = useState("checking");
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const text = useMemo(() => getCopy(language), [language]);
  const watchText = useMemo(() => getWatchTreeCopy(language), [language]);
  const watchTreeAdapter = useMemo(() => createProductionWatchTreeAdapter(), []);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        if (!hasStoredBase44Session()) {
          if (!active) return;
          setUser(null);
          setAuthState("anonymous");
          setAuthNotice("");
          return;
        }

        const base44 = await getBase44Client();
        const currentUser = await base44.auth.me();
        if (!active) return;

        setAuthNotice("");
        if (currentUser) { setUser(currentUser); setAuthState("ready"); }
        else { setUser(null); setAuthState("anonymous"); }
      } catch (error) {
        if (!active) return;
        const status = error?.response?.status ?? error?.status;
        setUser(null); setAuthState("anonymous");
        if (status === 401 || status === 403) setAuthNotice("");
      }
    };
    void restoreSession();
    return () => { active = false; cleanupBase44Client(); };
  }, []);

  useEffect(() => { document.documentElement.lang = language === "ko" ? "ko" : "en"; }, [language]);
  const changeLanguage = (nextLanguage) => setLanguage(persistLanguage(nextLanguage));
  const openAuth = () => { setAuthNotice(""); setAuthPanelOpen(true); requestAnimationFrame(() => scrollToElementById("auth-region", { block: "center" })); };
  const handleAuthenticated = (authenticatedUser) => { setUser(authenticatedUser); setAuthState("ready"); setAuthPanelOpen(false); setAuthNotice(""); requestAnimationFrame(() => scrollToElementById("experience", { block: "start" })); };
  const handleLogout = () => {
    setUser(null); setAuthState("anonymous"); setAuthNotice(""); setAuthPanelOpen(false);
    void getBase44Client().then((base44) => base44.auth.logout(window.location.origin)).catch(() => {});
  };

  return <main className="site-shell">
    <Atmosphere />
    <header className="site-header"><a className="wordmark" href="#top" aria-label="Resonance home">Resonance</a><nav aria-label="Primary navigation"><a href="#watchtree-story">{watchText.nav.story}</a><a href="#watchtree-privacy">{watchText.nav.privacy}</a><LanguageSwitch language={language} onChange={changeLanguage} labels={text.language}/>{!user?<button className="nav-enter" type="button" onClick={openAuth}>{watchText.nav.enter}</button>:null}</nav></header>
    <div id="top"><CinematicWatchTree data-primary-cta="resonance" copy={watchText} onPrimary={user?()=>scrollToElementById("experience"):openAuth}/></div>
    <section className="auth-region" id="auth-region" aria-live="polite">
      {authState === "checking" ? <div className="state-message state-message--auth">{text.status.checking}</div> : null}
      {authNotice && authPanelOpen ? <p className="form-message form-message--error" role="alert">{authNotice}</p> : null}
      {!user && authPanelOpen ? <AuthPanel copy={text} onAuthenticated={handleAuthenticated} onClose={() => { setAuthPanelOpen(false); setAuthNotice(""); }}/> : null}
    </section>
    {user ? <WatchTreeExperience language={language} adapter={watchTreeAdapter} onLogout={handleLogout}/> : null}
    {user ? <details className="legacy-memory-layer"><summary>{language === "ko" ? "선택적 기억 공명 레이어" : "Optional Memory Resonance layer"}</summary><ResonanceJourney language={language} copy={text} onLogout={handleLogout}/></details> : null}
    {user ? <details className="backend-proof" id="backend-proof"><summary><span>{text.backendProof.summary}</span><small>{text.backendProof.body}</small></summary><CapabilityPanel language={language} copy={text} onAuthStateChange={(nextState) => { setUser(null); setAuthState(nextState); setAuthNotice(""); }}/></details> : null}
    <BackendFlow copy={text}/>
    <footer className="site-footer"><span>{text.footer.line}</span><span>{text.footer.privacy}</span></footer>
  </main>;
}
