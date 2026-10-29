"use client";

import type { MarkerId } from "@ghost-hunt/shared";
import Link from "next/link";
import { useCallback, useState } from "react";

import { ArHuntScene } from "@/components/ar/ar-hunt-scene";
import { Brand } from "@/components/ui/brand";

type CameraPhase = "GATE" | "STARTING" | "ACTIVE" | "ERROR";

function cameraFailureMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Camera access was denied. Allow it in browser settings, then try again.";
    }
    if (
      error.name === "NotFoundError" ||
      error.name === "OverconstrainedError"
    ) {
      return "No compatible rear camera is available on this device.";
    }
    if (error.name === "NotReadableError" || error.name === "AbortError") {
      return "The camera is busy or was interrupted. Close other camera apps, then try again.";
    }
  }
  return "The camera could not start. Check browser permission and try again.";
}

export default function MarkerTestPage() {
  const [cameraPhase, setCameraPhase] = useState<CameraPhase>("GATE");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const [runtimeState, setRuntimeState] = useState<
    "LOADING" | "READY" | "ERROR"
  >("LOADING");
  const [stableMarker, setStableMarker] = useState<MarkerId | null>(null);
  const [visibleMarkers, setVisibleMarkers] = useState<ReadonlySet<MarkerId>>(
    () => new Set(),
  );

  const startCamera = useCallback(async (): Promise<void> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "This browser does not provide the camera access required for AR.",
      );
      setCameraPhase("ERROR");
      return;
    }

    setCameraPhase("STARTING");
    setCameraError(null);
    setRuntimeState("LOADING");
    setStableMarker(null);
    try {
      const permissionStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      for (const track of permissionStream.getTracks()) track.stop();
      setCameraKey((value) => value + 1);
      setCameraPhase("ACTIVE");
    } catch (error) {
      setCameraError(cameraFailureMessage(error));
      setCameraPhase("ERROR");
    }
  }, []);

  const handleVisibility = useCallback(
    (markerId: MarkerId, visible: boolean): void => {
      if (!visible) {
        setStableMarker((current) => (current === markerId ? null : current));
      }
      setVisibleMarkers((current) => {
        const next = new Set(current);
        if (visible) next.add(markerId);
        else next.delete(markerId);
        return next;
      });
    },
    [],
  );

  if (cameraPhase !== "ACTIVE") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <Brand />
          <Link
            href="/host"
            className="min-h-11 rounded-xl border border-[#3a3349] px-4 py-3 text-sm font-bold text-[#d4ccdc]"
          >
            Back to host
          </Link>
        </header>
        <section className="my-auto max-w-2xl py-12">
          <h1 className="max-w-xl text-5xl font-black tracking-[-0.04em] sm:text-7xl">
            Verify every marker.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#d4ccdc]">
            Camera-only operator check: this page identifies the printed pattern
            seen by AR.js. It never claims a marker, creates an encounter, or
            changes a score.
          </p>
          {cameraError ? (
            <p role="alert" className="mt-6 max-w-lg text-[#ffb36b]">
              {cameraError}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void startCamera()}
            disabled={cameraPhase === "STARTING"}
            className="mt-8 min-h-14 rounded-xl bg-[#ff7a1a] px-7 font-extrabold text-[#120b06] transition-colors hover:bg-[#ff9144] disabled:cursor-wait disabled:bg-[#5b351d] disabled:text-[#aaa2b7]"
          >
            {cameraPhase === "STARTING"
              ? "Requesting camera…"
              : cameraPhase === "ERROR"
                ? "Try camera again"
                : "Start marker test"}
          </button>
          <p className="mt-5 max-w-lg text-sm leading-6 text-[#aaa2b7]">
            Use the final HTTPS event URL or localhost. Print the pack at 100%
            and keep the full black border in frame.
          </p>
        </section>
      </main>
    );
  }

  const visibleList = [...visibleMarkers].sort();

  return (
    <main className="relative isolate min-h-dvh overflow-hidden bg-[#09070f]">
      <ArHuntScene
        key={cameraKey}
        activeEncounter={null}
        hitSignal={0}
        defeatSignal={0}
        disabled={false}
        onMarkerStable={setStableMarker}
        onMarkerVisibility={handleVisibility}
        onAttack={() => undefined}
        onRuntimeState={(state) => {
          setRuntimeState(state);
          if (state === "ERROR") {
            setCameraError(
              "The AR runtime could not start. Check camera permission and retry.",
            );
            setCameraPhase("ERROR");
          }
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-[#09070f]/95 via-[#09070f]/70 to-transparent px-4 pb-16 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <div className="mx-auto flex max-w-4xl items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#b9a4ff]">
              Marker test
            </p>
            <p role="status" className="mt-1 text-lg font-black text-[#f6f0e6]">
              {runtimeState === "READY" ? "Camera ready" : "Starting camera…"}
            </p>
          </div>
          <Link
            href="/host"
            className="pointer-events-auto min-h-11 rounded-xl border border-[#3a3349] bg-[#12101b]/90 px-4 py-3 text-sm font-bold"
          >
            Exit test
          </Link>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#09070f] via-[#09070f]/92 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-24 sm:px-6">
        <section className="mx-auto max-w-lg rounded-2xl border border-[#3a3349] bg-[#12101b]/94 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#aaa2b7]">
            Stable recognition
          </p>
          <p className="mt-2 font-mono text-3xl font-black tracking-[0.08em] text-[#7df9e7]">
            {stableMarker ?? "No marker"}
          </p>
          <p className="mt-3 text-sm leading-6 text-[#d4ccdc]">
            {visibleList.length > 0
              ? `Visible now: ${visibleList.join(", ")}`
              : "Hold one complete printed marker steady in the frame."}
          </p>
        </section>
      </div>
    </main>
  );
}
