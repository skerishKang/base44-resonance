import React,{useMemo,useState} from "react";
import ReactDOM from "react-dom/client";
import { LanguageSwitch } from "../../src/components/LanguageSwitch.jsx";
import { getCopy } from "../../src/lib/i18n.js";
import { CinematicWatchTree } from "../../src/watchtree/CinematicWatchTree.jsx";
import { WatchTreeExperience } from "../../src/watchtree/WatchTreeExperience.jsx";
import { getWatchTreeCopy } from "../../src/watchtree/copy.js";
import { createInMemoryWatchTreeAdapter } from "./inMemoryWatchTreeAdapter.js";
import "../../src/watchtree/watchtree.css";
import "../../src/index.css";
import "../../src/product.css";

function Harness(){const[language,setLanguage]=useState("en");const adapter=useMemo(()=>createInMemoryWatchTreeAdapter(),[]);const copy=getWatchTreeCopy(language);const text=getCopy(language);const changeLanguage=(nextLanguage)=>setLanguage(nextLanguage);return <main className="site-shell" data-test-harness="watchtree"><header className="site-header" data-testid="site-header"><a className="wordmark" href="#top" aria-label="Resonance home">Resonance</a><nav aria-label="Primary navigation"><a href="#watchtree-story">{copy.nav.story}</a><a href="#watchtree-privacy">{copy.nav.privacy}</a><LanguageSwitch language={language} onChange={changeLanguage} labels={text.language}/><button className="nav-enter" data-testid="header-enter" type="button" onClick={()=>document.querySelector("#experience")?.scrollIntoView()}>{copy.nav.enter}</button></nav></header><div id="top"><CinematicWatchTree copy={copy} onPrimary={()=>document.querySelector("#experience")?.scrollIntoView()}/></div><WatchTreeExperience language={language} adapter={adapter}/></main>}
ReactDOM.createRoot(document.getElementById("root")).render(<React.StrictMode><Harness/></React.StrictMode>);
