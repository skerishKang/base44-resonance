import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
            {index === 5 && (
              <div className="shared-evidence">
                <span>Exact overlap</span><span>Rare signal</span><span>Shared path</span><span>Meaningful difference</span>
              </div>
            )}
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
        <div className="reduced-relationship" data-shared-relationship="reduced" aria-label="Connected reduced WatchTree composition">
          <SharedPathOverlay className="reduced-path-overlay--horizontal" orientation="horizontal" />
          <SharedPathOverlay className="reduced-path-overlay--vertical" orientation="vertical" />
          <div className="reduced-tree-slot reduced-tree-slot--a">
            <WatchTreeGraphic compact pathSide="a" label="Personal WatchTree" events={sampleEvents(18)} />
          </div>
          <div className="reduced-path-space" aria-hidden="true" />
          <div className="reduced-tree-slot reduced-tree-slot--b">
            <WatchTreeGraphic compact shared pathSide="b" label="Synthetic viewer WatchTree" events={sampleEvents(17)} />
          </div>
          <div className="reduced-path-evidence" aria-label="Shared path evidence">
            <span>Exact overlap</span><span>Rare signal</span><span>Shared path</span><span>Meaningful difference</span>
          </div>
        </div>
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
  if (index === 5) return (
    <div className="shared-scene">
      <div className="shared-relationship" data-shared-relationship="scene-6" aria-label="Tree A connected to Tree B">
        <SharedPathOverlay orientation="horizontal" />
        <img className="scene-viewer-a" src="/watchtree/viewer-person-a.svg" alt="" />
        <div className="shared-tree-slot shared-tree-slot--a">
          <WatchTreeGraphic compact shared pathSide="a" label="Your tree" events={sampleEvents(16)} />
        </div>
        <div className="shared-path-space" aria-hidden="true" />
        <div className="shared-tree-slot shared-tree-slot--b">
          <WatchTreeGraphic compact shared pathSide="b" label="Synthetic tree" events={sampleEvents(16)} />
        </div>
        <img className="scene-viewer-b" src="/watchtree/viewer-person-b.svg" alt="" />
      </div>
    </div>
  );
  return <div className="entry-visual"><span>Private demo</span><span>Local HTML / JSON parser</span><span>Consent-controlled reveal</span></div>;
}

function SharedPathOverlay({ orientation, className = "" }) {
  const layerRef = useRef(null);
  const [points, setPoints] = useState(null);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    const relationship = layer?.closest("[data-shared-relationship]");
    if (!layer || !relationship) return undefined;

    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const svg = layer.querySelector("svg");
        const svgRect = svg?.getBoundingClientRect();
        if (!svg || !svgRect?.width || !svgRect.height) {
          setPoints(null);
          return;
        }
        const selectors = orientation === "vertical"
          ? ["[data-tree-anchor=\"a-bottom-right\"]", "[data-tree-anchor=\"b-top-left\"]"]
          : ["[data-tree-anchor=\"a-right\"]", "[data-tree-anchor=\"b-left\"]"];
        const anchors = selectors.map((selector) => relationship.querySelector(selector));
        if (anchors.some((anchor) => !anchor)) {
          setPoints(null);
          return;
        }
        const toPoint = (anchor) => {
          const rect = anchor.getBoundingClientRect();
          return {
            x: ((rect.left + rect.width / 2 - svgRect.left) / svgRect.width) * 100,
            y: ((rect.top + rect.height / 2 - svgRect.top) / svgRect.height) * 100,
          };
        };
        const next = { start: toPoint(anchors[0]), end: toPoint(anchors[1]) };
        if ([next.start.x, next.start.y, next.end.x, next.end.y].every(Number.isFinite)) setPoints(next);
      });
    };

    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    observer?.observe(relationship);
    relationship.querySelectorAll("[data-tree-anchor]").forEach((anchor) => observer?.observe(anchor));
    window.addEventListener("resize", measure);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [orientation]);

  const d = points ? `M ${points.start.x} ${points.start.y} L ${points.end.x} ${points.end.y}` : "";
  const nodes = points ? [0, 0.33, 0.66, 1].map((ratio) => ({
    x: points.start.x + (points.end.x - points.start.x) * ratio,
    y: points.start.y + (points.end.y - points.start.y) * ratio,
  })) : [];

  return (
    <div ref={layerRef} className={`shared-path-visual ${className}`.trim()} data-path-orientation={orientation}>
      <svg className="shared-path-svg" viewBox="0 0 100 100" preserveAspectRatio="none" overflow="visible" aria-hidden="true" data-shared-path-svg={orientation} data-path-ready={points ? "true" : "false"}>
        {points ? (
          <>
            <path className="shared-path-underlay" d={d} />
            <path className="shared-path-line" data-shared-path="true" d={d} />
            {nodes.map((node, index) => <circle key={index} className="shared-path-node" cx={node.x} cy={node.y} r={index === 0 || index === nodes.length - 1 ? 2.15 : 1.8} />)}
          </>
        ) : null}
      </svg>
    </div>
  );
}
