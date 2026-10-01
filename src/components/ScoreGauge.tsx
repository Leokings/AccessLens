export function ScoreGauge({ score, label, tone }: { score: number; label: string; tone: string }) {
  return (
    <div className="score-gauge">
      <div className={`score-gauge__ring score-gauge__ring--${tone}`}>
        <svg className="score-gauge__svg" viewBox="0 0 100 100" aria-hidden="true">
          <circle className="score-gauge__track" cx="50" cy="50" r="44" pathLength="100" />
          <circle
            className="score-gauge__value"
            cx="50"
            cy="50"
            r="44"
            pathLength="100"
            strokeDasharray={`${score} ${100 - score}`}
          />
        </svg>
        <div className="score-gauge__center">
          <strong>{score}</strong>
          <span>/ 100</span>
        </div>
      </div>
      <span className="score-gauge__label">{label}</span>
    </div>
  );
}
