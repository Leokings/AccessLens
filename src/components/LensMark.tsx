export function LensMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "lens-mark lens-mark--compact" : "lens-mark"} aria-hidden="true">
      <span className="lens-mark__glass">
        <span className="lens-mark__spark lens-mark__spark--one" />
        <span className="lens-mark__spark lens-mark__spark--two" />
      </span>
      <span className="lens-mark__handle" />
    </span>
  );
}
