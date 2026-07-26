export function WatchTreeGraphic({ events = [], shared = false, label = "WatchTree", compact = false }) {
  const unique = new Set(events.map((event) => event.normalized_content_id)).size;
  const leaves = Math.max(8, Math.min(28, unique || 12));
  const leafItems = Array.from({ length: leaves }, (_, index) => {
    const angle = (index / leaves) * Math.PI * 2 - Math.PI / 2;
    const radiusX = 33 + (index % 4) * 5;
    const radiusY = 28 + (index % 3) * 4;
    const left = 50 + Math.cos(angle) * radiusX;
    const top = 42 + Math.sin(angle) * radiusY;
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
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
