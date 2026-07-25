export function Atmosphere() {
  return (
    <div className="atmosphere" aria-hidden="true">
      <div className="atmosphere__wash atmosphere__wash--dawn" />
      <div className="atmosphere__wash atmosphere__wash--dusk" />
      <svg className="resonance-field" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="fieldGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(236, 190, 151, .24)" />
            <stop offset="65%" stopColor="rgba(127, 111, 190, .08)" />
            <stop offset="100%" stopColor="rgba(11, 11, 26, 0)" />
          </radialGradient>
        </defs>
        <g className="resonance-field__orbit resonance-field__orbit--one">
          <ellipse cx="438" cy="430" rx="245" ry="330" />
          <ellipse cx="438" cy="430" rx="154" ry="224" />
          <circle cx="438" cy="430" r="62" />
        </g>
        <g className="resonance-field__orbit resonance-field__orbit--two">
          <ellipse cx="760" cy="430" rx="245" ry="330" />
          <ellipse cx="760" cy="430" rx="154" ry="224" />
          <circle cx="760" cy="430" r="62" />
        </g>
        <circle className="resonance-field__glow" cx="600" cy="430" r="290" fill="url(#fieldGlow)" />
        <path className="resonance-field__thread" d="M225 526 C405 338 791 338 972 526" />
      </svg>
      <div className="atmosphere__grain" />
    </div>
  );
}
