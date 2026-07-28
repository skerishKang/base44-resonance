export function BackendFlow({ copy }) {
  return (
    <section className="backend-flow" id="backend" aria-labelledby="backend-title">
      <div className="backend-flow__intro">
        <div className="section-kicker">{copy.backend.eyebrow}</div>
        <h2 id="backend-title">{copy.backend.title}</h2>
        <p>{copy.backend.body}</p>
        <span className="foundation-label">{copy.backend.foundation}</span>
      </div>

      <div className="backend-path">
        {copy.backend.steps.map((step, index) => (
          <article className="backend-step" key={step.title}>
            <span className="backend-step__index">0{index + 1}</span>
            <div className="backend-step__line" aria-hidden="true" />
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </article>
        ))}
      </div>
      <p className="backend-note">{copy.backend.note}</p>
    </section>
  );
}
