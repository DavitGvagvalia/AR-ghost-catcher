export function formatMatchTime(milliseconds: number | null): string {
  if (milliseconds === null) return "--:--";
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function MatchTimer({ remainingMs }: { remainingMs: number | null }) {
  return (
    <time className="font-mono text-5xl font-black tabular-nums tracking-[0.08em] text-[#f6f0e6] sm:text-6xl">
      {formatMatchTime(remainingMs)}
    </time>
  );
}
