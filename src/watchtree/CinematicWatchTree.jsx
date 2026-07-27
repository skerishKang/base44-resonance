import { useEffect, useState } from "react";
import { WatchTreeGraphic } from "./WatchTreeGraphic.jsx";

const sampleEvents = (length) => Array.from({ length }, (_, index) => ({ normalized_content_id: `visual:${index}` }));

export function CinematicWatchTree({ copy, onPrimary }) {
  const [scene, setScene] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || scene >= 6) return undefined;
    const timeout = window.setTimeout(() => setScene((value) => Math.min(6, value + 1)), 2_600);
    return () => window.clearTimeout(timeout);
  }, [scene]);

  return (
    <section className="watchtree-landing" id="watchtree-story" aria-labelledby="watchtree-title">
      <div className="watchtree-landing__copy">
        <span className="section-kicker">{copy.landing.eyebrow}</span>
        <h1 id="watchtree-title">{copy.landing.title}</h1>
        <p>{copy.landing.body}</p>
        <div className="watchtree-landing__actions">
          <button className="button button--primary" data-primary-cta="resonance" type="button" onClick={onPrimary}>{copy.landing.primary}</button>
          <a className="button button--ghost" href="#watchtree-privacy">{copy.landing.secondary}</a>
        </div>
        <p className="privacy-note">{copy.landing.privacy}</p>
      </div>

      {/* Mobile compact composition - visible only at mobile widths */}
      <div className="watchtree-mobile-hero" data-testid="mobile-hero" aria-label="Mobile WatchTree overview">
        <div className="mobile-hero__person"><img className="mobile-hero__person-a" src="/watchtree/viewer-person-a.svg" alt="" /></div>
        <div className="mobile-hero__fragments">
          <img src="/watchtree/viewing-fragment.svg" alt="" />
          <img src="/watchtree/media-frame-interview.svg" alt="" className="mobile-hero__trace" />
        </div>
        <div className="mobile-hero__tree">
          <WatchTreeGraphic compact label="Personal" events={sampleEvents(8)} />
        </div>
        <div className="mobile-hero__path">
          <img className="mobile-hero__path-line" src="/watchtree/shared-path-line.svg" alt="" />
        </div>
        <div className="mobile-hero__tree-remote">
          <WatchTreeGraphic compact shared label="Synthetic" events={sampleEvents(7)} />
        </div>
        <div className="mobile-hero__person-remote">
          <img className="mobile-hero__person-b" src="/watchtree/viewer-person-b.svg" alt="" />
        </div>
      </div>

      <div className="watchtree-cinema" data-current-scene={scene + 1} aria-live="polite">
        {copy.landing.scenes.map(([title, body], index) => (
          <article key={title} className={`watchtree-scene${scene === index ? " is-active" : ""}`} data-scene={index + 1} aria-hidden={scene !== index}>
            <div className="scene-copy"><span>{String(index + 1).padStart(2, "0")}</span><h2>{title}</h2><p>{body}</p></div>
            <SceneVisual index={index} />
          </article>
        ))}
        <div className="scene-controls" aria-label="WatchTree story controls">
          {copy.landing.scenes.map((_, index) => (
            <button key={index} type="button" aria-label={`Scene ${index + 1}`} aria-current={scene === index ? "step" : undefined} onClick={() => setScene(index)} />
          ))}
        </div>
      </div>

      <div className="watchtree-reduced" aria-label="Static WatchTree story" data-testid="reduced-story">
        <div className="reduced-person reduced-person--first">
          <img src="/watchtree/viewer-person-a.svg" alt="Synthetic viewer one" />
          <div className="reduced-fragments" aria-label="Retained viewing fragments"><img src="/watchtree/viewing-fragment.svg" alt="" /><img src="/watchtree/viewing-fragment.svg" alt="" /><img src="/watchtree/viewing-fragment.svg" alt="" /></div>
        </div>
        <WatchTreeGraphic compact label="Personal WatchTree" events={sampleEvents(18)} />
        <div className="reduced-path">
          <img src="/watchtree/shared-path-line.svg" alt="" />
          <div><span>Exact overlap</span><span>Rare signal</span><span>Shared path</span><span>Meaningful difference</span></div>
        </div>
        <WatchTreeGraphic compact label="Synthetic viewer WatchTree" shared events={sampleEvents(17)} />
        <div className="reduced-person reduced-person--second"><img src="/watchtree/viewer-person-b.svg" alt="Synthetic viewer two" /></div>
        <div className="reduced-product-choices" aria-label="Product choices"><span>Private demo</span><span>Local HTML / JSON</span><span>Consent-controlled reveal</span></div>
        <button className="button button--primary" type="button" onClick={onPrimary}>{copy.landing.primary}</button>
      </div>
    </section>
  );
}

function SceneVisual({ index }) {
  if (index === 0) return <div className="scene-viewing"><img src="/watchtree/viewer-person-a.svg" alt="" /><div className="media-stack"><img src="/watchtree/media-frame-interview.svg" alt="" /><img src="/watchtree/media-frame-performance.svg" alt="" /><img src="/watchtree/media-frame-documentary.svg" alt="" /></div></div>;
  if (index === 1) return <div className="fragment-field">{Array.from({ length: 12 }, (_, item) => <img key={item} src="/watchtree/viewing-fragment.svg" alt="" />)}</div>;
  if (index === 2) return <div className="choice-visual"><span>Private demo</span><span>HTML / JSON</span><span>Owner-only</span></div>;
  if (index === 3) return <WatchTreeGraphic label="Growing WatchTree" events={sampleEvents(22)} />;
  if (index === 4) return <div className="two-viewers"><img src="/watchtree/viewer-person-a.svg" alt="" /><WatchTreeGraphic compact label="Tree A" events={sampleEvents(13)} /><WatchTreeGraphic compact label="Tree B" shared events={sampleEvents(14)} /><img src="/watchtree/viewer-person-b.svg" alt="" /></div>;
  if (index === 5) return <div className="shared-scene"><img className="scene-viewer-a" src="/watchtree/viewer-person-a.svg" alt="" /><WatchTreeGraphic compact shared label="Your tree" events={sampleEvents(16)} /><div className="shared-path-visual"><img src="/watchtree/shared-path-line.svg" alt="" /><div className="shared-evidence"><span>Exact overlap</span><span>Rare signal</span><span>Shared path</span><span>Meaningful difference</span></div></div><WatchTreeGraphic compact shared label="Synthetic tree" events={sampleEvents(16)} /><img className="scene-viewer-b" src="/watchtree/viewer-person-b.svg" alt="" /></div>;
  return <div className="entry-visual"><span>Private demo</span><span>Local HTML / JSON parser</span><span>Consent-controlled reveal</span></div>;
}
