"use client";

import { useEffect, useState } from "react";

export function useMatchCountdown(
  endsAt: number | null,
  serverTime: number,
): number | null {
  const [estimatedServerNow, setEstimatedServerNow] = useState(serverTime);

  useEffect(() => {
    if (endsAt === null) return;
    const sampledAt = Date.now();
    const timer = window.setInterval(
      () => setEstimatedServerNow(serverTime + (Date.now() - sampledAt)),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [endsAt, serverTime]);

  if (endsAt === null) return null;
  return Math.max(0, endsAt - Math.max(serverTime, estimatedServerNow));
}
