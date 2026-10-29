import type { SVGProps } from "react";
type IconProps = SVGProps<SVGSVGElement>;

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M5 12h14m-5-5 5 5-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <rect
        x="8"
        y="8"
        width="11"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export function RadioIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path
        d="M8.5 8.5a5 5 0 0 0 0 7m7-7a5 5 0 0 1 0 7M5.7 5.7a9 9 0 0 0 0 12.6m12.6-12.6a9 9 0 0 1 0 12.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.2a3 3 0 0 1 0 5.6M17 14a5 5 0 0 1 3.5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GhostMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        d="M9 39V21C9 12.2 15.7 5 24 5s15 7.2 15 16v18l-5-4-5 4-5-4-5 4-5-4-5 4Z"
        fill="currentColor"
      />
      <circle cx="18.5" cy="21" r="2.5" fill="#09070f" />
      <circle cx="29.5" cy="21" r="2.5" fill="#09070f" />
      <path
        d="M20 28.5c2.6 1.8 5.4 1.8 8 0"
        stroke="#09070f"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
