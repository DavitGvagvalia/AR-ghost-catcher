import Link from "next/link";
import { GhostMark } from "./icons";

export function Brand({ href = "/login" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-3 rounded-sm text-[15px] font-extrabold uppercase tracking-[0.16em] text-[#f6f0e6] no-underline"
    >
      <span className="grid size-10 place-items-center rounded-full bg-[#ff7a1a] text-[#09070f] shadow-[0_0_28px_rgba(255,122,26,0.25)]">
        <GhostMark className="size-7" />
      </span>
      Ghost Hunt
    </Link>
  );
}
