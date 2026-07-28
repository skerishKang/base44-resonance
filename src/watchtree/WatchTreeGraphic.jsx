const BRANCH_TIPS = [
  [19.9, 31.1],
  [83.8, 38.9],
  [31.9, 18.1],
  [69.1, 16.8],
  [19.3, 27.6],
  [84.9, 34.4],
  [31.4, 18.8],
  [69.4, 19.9],
  [32.3, 37.6],
  [68.5, 42.5],
  [39.1, 29.5],
  [61.5, 31.8],
];

export function WatchTreeGraphic({ events = [], shared = false, label = "WatchTree", compact = false, pathSide = null }) {
  const unique = new Set(events.map((event) => event.normalized_content_id)).size;
  const leaves = Math.max(8, Math.min(28, unique || 12));
  const leafItems = Array.from({ length: leaves }, (_, index) => {
    const tip = BRANCH_TIPS[index % BRANCH_TIPS.length];
    const jitterX = ((index * 37) % 11) - 5;
    const jitterY = ((index * 53) % 9) - 4;
    const left = tip[0] + jitterX;
    const top = tip[1] + jitterY;
    const state = shared && index % 5 === 0 ? "shared" : index % 7 === 0 ? "rare" : "normal";
    return { index, left, top, state, rotation: (index * 37) % 180 - 90 };
  });

  return (
    <figure className={`watchtree-graphic${compact ? " is-compact" : ""}${shared ? " has-shared-leaves" : ""}`} aria-label={label} data-watchtree>
      <div className="tree-canvas" role="img" aria-label={label}>
        <img className="tree-layer tree-layer--roots" src="/watchtree/watchtree-roots.svg" alt="" />
        <img className="tree-layer tree-layer--trunk" src="/watchtree/watchtree-trunk.svg" alt="" />
        <img className="tree-layer tree-layer--branches" src="/watchtree/watchtree-branch-set.svg" alt="" />
        <div className="tree-leaf-layer" aria-hidden="true">
          {leafItems.map((leaf) => (
            <img
              key={leaf.index}
              className={`tree-leaf tree-leaf--${leaf.state}`}
              src={`/watchtree/watchtree-leaf-${leaf.state}.svg`}
              alt=""
              style={{ left: `${leaf.left}%`, top: `${leaf.top}%`, transform: `translate(-50%, -50%) rotate(${leaf.rotation}deg)` }}
            />
          ))}
        </div>
        {pathSide === "a" ? (
          <>
            <span className="tree-edge-anchor tree-edge-anchor--a-right" data-tree-anchor="a-right" aria-hidden="true" />
            <span className="tree-edge-anchor tree-edge-anchor--a-bottom-right" data-tree-anchor="a-bottom-right" aria-hidden="true" />
          </>
        ) : null}
        {pathSide === "b" ? (
          <>
            <span className="tree-edge-anchor tree-edge-anchor--b-left" data-tree-anchor="b-left" aria-hidden="true" />
            <span className="tree-edge-anchor tree-edge-anchor--b-top-left" data-tree-anchor="b-top-left" aria-hidden="true" />
          </>
        ) : null}
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
