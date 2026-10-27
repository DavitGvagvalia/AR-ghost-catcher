import { RadioIcon } from "./icons";

export function StatusPill({
  connected,
  label,
}: {
  connected: boolean;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-bold uppercase tracking-[0.12em] ${
        connected
          ? "border-[#7df9e7]/25 bg-[#7df9e7]/8 text-[#7df9e7]"
          : "border-[#ffb36b]/25 bg-[#ff7a1a]/8 text-[#ffb36b]"
      }`}
    >
      <RadioIcon className="size-4" />
      {label ?? (connected ? "Live" : "Reconnecting")}
    </span>
  );
}
