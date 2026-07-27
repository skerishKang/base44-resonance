import React,{useMemo,useState} from "react";
import ReactDOM from "react-dom/client";
import { CinematicWatchTree } from "../../src/watchtree/CinematicWatchTree.jsx";
import { WatchTreeExperience } from "../../src/watchtree/WatchTreeExperience.jsx";
import { getWatchTreeCopy } from "../../src/watchtree/copy.js";
import { createInMemoryWatchTreeAdapter } from "./inMemoryWatchTreeAdapter.js";
import "../../src/watchtree/watchtree.css";
import "../../src/index.css";
import "../../src/product.css";

function Harness(){const[language,setLanguage]=useState("en");const adapter=useMemo(()=>createInMemoryWatchTreeAdapter(),[]);const copy=getWatchTreeCopy(language);return <main className="site-shell" data-test-harness="watchtree"><button data-testid="language" type="button" onClick={()=>setLanguage((v)=>v==="en"?"ko":"en")}>{language}</button><CinematicWatchTree copy={copy} onPrimary={()=>document.querySelector("#experience")?.scrollIntoView()}/><WatchTreeExperience language={language} adapter={adapter}/></main>}
ReactDOM.createRoot(document.getElementById("root")).render(<React.StrictMode><Harness/></React.StrictMode>);
