export function LanguageSwitch({ language, onChange, labels }) {
  return (
    <div className="language-switch" data-testid="language" role="group" aria-label={labels.label}>
      <button
        type="button"
        className={language === "en" ? "is-active" : ""}
        aria-pressed={language === "en"}
        onClick={() => onChange("en")}
      >
        {labels.english}
      </button>
      <span aria-hidden="true">|</span>
      <button
        type="button"
        className={language === "ko" ? "is-active" : ""}
        aria-pressed={language === "ko"}
        onClick={() => onChange("ko")}
      >
        {labels.korean}
      </button>
    </div>
  );
}
