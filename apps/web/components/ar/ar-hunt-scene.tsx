"use client";

import {
  GHOST_MODEL_MANIFEST,
  MARKER_MANIFEST,
  type EncounterSnapshot,
  type MarkerId,
} from "@ghost-hunt/shared";
import { useEffect, useRef, useState } from "react";

const STABLE_MARKER_MS = 500;
const MODEL_TARGET_SIZE = 0.82;
const AR_DETECTION_WIDTH = 640;
const AR_DETECTION_HEIGHT = 480;
const MARKER_MIN_CONFIDENCE = 0.55;

interface VectorLike {
  x: number;
  y: number;
  z: number;
}

interface Object3DLike {
  position: { set: (x: number, y: number, z: number) => void };
  scale: { setScalar: (value: number) => void };
}

interface Box3Like {
  min: VectorLike;
  setFromObject: (object: Object3DLike) => Box3Like;
  getCenter: (target: VectorLike) => VectorLike;
  getSize: (target: VectorLike) => VectorLike;
}

interface ThreeLike {
  Box3: new () => Box3Like;
  Vector3: new () => VectorLike;
}

interface ArWindow extends Window {
  AFRAME?: { components?: Record<string, unknown> };
  THREE?: ThreeLike;
}

type AFrameEntity = HTMLElement & { object3D?: Object3DLike };
type ArSceneElement = HTMLElement & {
  systems?: {
    arjs?: { _arProfile?: unknown };
    artoolkit?: { _arProfile?: unknown };
  };
};

interface ArHuntSceneProps {
  activeEncounter: EncounterSnapshot | null;
  hitSignal: number;
  defeatSignal: number;
  disabled: boolean;
  onMarkerStable: (markerId: MarkerId) => void;
  onMarkerVisibility: (markerId: MarkerId, visible: boolean) => void;
  onAttack: () => void;
  onRuntimeState: (state: "LOADING" | "READY" | "ERROR") => void;
}

let aframePromise: Promise<void> | null = null;
let arjsPromise: Promise<void> | null = null;

function loadBrowserScript(
  source: string,
  globalReady: () => boolean,
): Promise<void> {
  if (globalReady()) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${source}"]`,
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Unable to load ${source}`)),
        {
          once: true,
        },
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = source;
    script.async = false;
    script.dataset.arRuntime = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => {
        script.remove();
        reject(new Error(`Unable to load ${source}`));
      },
      { once: true },
    );
    document.head.append(script);
  });
}

async function loadArRuntime(): Promise<void> {
  const arWindow = window as ArWindow;
  aframePromise ??= loadBrowserScript(
    "/vendor/aframe/aframe-v1.6.0.min.js",
    () => Boolean(arWindow.AFRAME),
  );
  await aframePromise;
  arjsPromise ??= loadBrowserScript("/vendor/arjs/aframe-ar-3.4.8.js", () =>
    Boolean(arWindow.AFRAME?.components?.arjs),
  );
  await arjsPromise;
}

function createFallbackGhost(): HTMLElement {
  const group = document.createElement("a-entity");
  group.dataset.fallbackGhost = "true";

  const body = document.createElement("a-sphere");
  body.setAttribute("radius", "0.34");
  body.setAttribute("scale", "1 1.22 0.82");
  body.setAttribute("position", "0 0.44 0");
  body.setAttribute("material", "color: #d4ccdc; roughness: 0.78");
  group.append(body);

  for (const x of [-0.13, 0.13]) {
    const eye = document.createElement("a-sphere");
    eye.setAttribute("radius", "0.045");
    eye.setAttribute("position", `${x} 0.52 0.28`);
    eye.setAttribute("material", "color: #09070f; roughness: 1");
    group.append(eye);
  }

  return group;
}

function normalizeModel(model: AFrameEntity): boolean {
  const three = (window as ArWindow).THREE;
  if (!three || !model.object3D) return false;

  const box = new three.Box3().setFromObject(model.object3D);
  const size = box.getSize(new three.Vector3());
  const largestDimension = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(largestDimension) || largestDimension <= 0) return false;

  model.object3D.scale.setScalar(MODEL_TARGET_SIZE / largestDimension);
  const scaledBox = new three.Box3().setFromObject(model.object3D);
  const center = scaledBox.getCenter(new three.Vector3());
  model.object3D.position.set(-center.x, -scaledBox.min.y, -center.z);
  return true;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function stopInjectedCamera(): void {
  for (const video of document.querySelectorAll<HTMLVideoElement>("video")) {
    const stream = video.srcObject;
    if (stream instanceof MediaStream) {
      for (const track of stream.getTracks()) track.stop();
      video.remove();
    }
  }
}

export function ArHuntScene({
  activeEncounter,
  hitSignal,
  defeatSignal,
  disabled,
  onMarkerStable,
  onMarkerVisibility,
  onAttack,
  onRuntimeState,
}: ArHuntSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerElementsRef = useRef(new Map<MarkerId, HTMLElement>());
  const visibleMarkersRef = useRef(new Map<MarkerId, number>());
  const attemptedMarkersRef = useRef(new Set<MarkerId>());
  const ghostRootRef = useRef<HTMLElement | null>(null);
  const encounterRef = useRef(activeEncounter);
  const disabledRef = useRef(disabled);
  const callbacksRef = useRef({
    onMarkerStable,
    onMarkerVisibility,
    onAttack,
    onRuntimeState,
  });
  const [runtimeError, setRuntimeError] = useState(false);
  const [sceneReadyToken, setSceneReadyToken] = useState(0);

  useEffect(() => {
    encounterRef.current = activeEncounter;
  }, [activeEncounter]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    callbacksRef.current = {
      onMarkerStable,
      onMarkerVisibility,
      onAttack,
      onRuntimeState,
    };
  }, [onAttack, onMarkerStable, onMarkerVisibility, onRuntimeState]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const markerElements = markerElementsRef.current;
    const visibleMarkers = visibleMarkersRef.current;
    const attemptedMarkers = attemptedMarkersRef.current;
    let disposed = false;
    const stableTimers = new Set<number>();
    let cameraReadyTimer: number | null = null;

    callbacksRef.current.onRuntimeState("LOADING");

    void loadArRuntime()
      .then(() => {
        if (disposed) return;

        const scene = document.createElement("a-scene") as ArSceneElement;
        scene.setAttribute("embedded", "");
        scene.setAttribute("vr-mode-ui", "enabled: false");
        scene.setAttribute(
          "renderer",
          "antialias: true; alpha: true; precision: medium",
        );
        scene.setAttribute(
          "arjs",
          `sourceType: webcam; debugUIEnabled: false; detectionMode: mono; maxDetectionRate: 30; canvasWidth: ${AR_DETECTION_WIDTH}; canvasHeight: ${AR_DETECTION_HEIGHT}`,
        );
        scene.style.position = "absolute";
        scene.style.inset = "0";
        scene.style.width = "100%";
        scene.style.height = "100%";
        scene.style.setProperty("z-index", "1", "important");

        const installMarkers = (): void => {
          for (const definition of MARKER_MANIFEST) {
            const marker = document.createElement("a-marker");
            marker.setAttribute("type", "pattern");
            marker.setAttribute("url", definition.patternPath);
            marker.setAttribute("emitevents", "true");
            marker.setAttribute(
              "min-confidence",
              String(MARKER_MIN_CONFIDENCE),
            );
            marker.setAttribute("smooth", "true");
            marker.setAttribute("smooth-count", "5");
            marker.setAttribute("smooth-tolerance", "0.01");
            marker.setAttribute("smooth-threshold", "2");
            marker.dataset.markerId = definition.id;

            marker.addEventListener("markerFound", () => {
              const foundAt = performance.now();
              visibleMarkers.set(definition.id, foundAt);
              callbacksRef.current.onMarkerVisibility(definition.id, true);

              const timer = window.setTimeout(() => {
                stableTimers.delete(timer);
                if (disposed || encounterRef.current) return;
                if (!visibleMarkers.has(definition.id)) return;

                const stableCandidates = [...visibleMarkers.entries()]
                  .filter(
                    ([, timestamp]) =>
                      performance.now() - timestamp >= STABLE_MARKER_MS,
                  )
                  .sort(([leftId, leftTime], [rightId, rightTime]) => {
                    if (leftTime === rightTime)
                      return leftId.localeCompare(rightId);
                    return rightTime - leftTime;
                  });
                const selected = stableCandidates[0]?.[0];
                if (!selected || attemptedMarkers.has(selected)) return;
                attemptedMarkers.add(selected);
                callbacksRef.current.onMarkerStable(selected);
              }, STABLE_MARKER_MS);
              stableTimers.add(timer);
            });

            marker.addEventListener("markerLost", () => {
              visibleMarkers.delete(definition.id);
              attemptedMarkers.delete(definition.id);
              callbacksRef.current.onMarkerVisibility(definition.id, false);
            });

            markerElements.set(definition.id, marker);
            scene.append(marker);
          }
        };

        const camera = document.createElement("a-entity");
        camera.setAttribute("camera", "");
        camera.setAttribute("cursor", "rayOrigin: mouse; fuse: false");
        camera.setAttribute("raycaster", "objects: .attackable; far: 20");
        scene.append(camera);

        scene.addEventListener(
          "loaded",
          () => {
            const deadline = performance.now() + 10_000;
            const confirmRuntimeReady = (): void => {
              if (disposed) return;
              const video = [
                ...document.querySelectorAll<HTMLVideoElement>("video"),
              ].find((candidate) => {
                const stream = candidate.srcObject;
                return (
                  stream instanceof MediaStream &&
                  stream
                    .getVideoTracks()
                    .some((track) => track.readyState === "live")
                );
              });
              const arSystem = scene.systems?.arjs ?? scene.systems?.artoolkit;
              if (video && arSystem?._arProfile) {
                video.playsInline = true;
                video.muted = true;
                video.autoplay = true;
                video.dataset.ghostHuntCamera = "true";
                container.prepend(video);
                video.style.setProperty("position", "absolute", "important");
                video.style.setProperty("inset", "0", "important");
                video.style.setProperty("margin", "0", "important");
                video.style.setProperty("width", "100vw", "important");
                video.style.setProperty("max-width", "100vw", "important");
                video.style.setProperty("height", "100dvh", "important");
                video.style.setProperty("object-fit", "cover", "important");
                video.style.setProperty("z-index", "0", "important");
                const canvas = scene.querySelector<HTMLCanvasElement>("canvas");
                canvas?.style.setProperty("width", "100%", "important");
                canvas?.style.setProperty("height", "100%", "important");
                canvas?.style.setProperty("z-index", "1", "important");
                installMarkers();
                setSceneReadyToken((value) => value + 1);
                callbacksRef.current.onRuntimeState("READY");
                return;
              }
              if (performance.now() >= deadline) {
                setRuntimeError(true);
                callbacksRef.current.onRuntimeState("ERROR");
                return;
              }
              cameraReadyTimer = window.setTimeout(confirmRuntimeReady, 100);
            };
            confirmRuntimeReady();
          },
          { once: true },
        );

        container.append(scene);
      })
      .catch(() => {
        if (disposed) return;
        setRuntimeError(true);
        callbacksRef.current.onRuntimeState("ERROR");
      });

    return () => {
      disposed = true;
      if (cameraReadyTimer !== null) window.clearTimeout(cameraReadyTimer);
      for (const timer of stableTimers) window.clearTimeout(timer);
      markerElements.clear();
      visibleMarkers.clear();
      attemptedMarkers.clear();
      ghostRootRef.current = null;
      stopInjectedCamera();
      container.replaceChildren();
    };
  }, []);

  useEffect(() => {
    ghostRootRef.current?.remove();
    ghostRootRef.current = null;
    const encounter = encounterRef.current;
    if (!encounter) return;

    const marker = markerElementsRef.current.get(encounter.markerId);
    const modelDefinition = GHOST_MODEL_MANIFEST.find(
      (definition) => definition.id === encounter.ghostModelId,
    );
    if (!marker || !modelDefinition) return;

    const root = document.createElement("a-entity");
    root.setAttribute("position", "0 0.06 0");
    if (!prefersReducedMotion()) {
      root.setAttribute(
        "animation__float",
        "property: position; from: 0 0.06 0; to: 0 0.16 0; dir: alternate; dur: 1150; loop: true; easing: easeInOutSine",
      );
    }

    const fallback = createFallbackGhost();
    root.append(fallback);

    const model = document.createElement("a-entity") as AFrameEntity;
    model.setAttribute("gltf-model", modelDefinition.assetPath);
    model.classList.add("attackable");
    model.addEventListener("click", () => {
      if (!disabledRef.current) callbacksRef.current.onAttack();
    });
    model.addEventListener(
      "model-loaded",
      () => {
        if (normalizeModel(model)) fallback.setAttribute("visible", "false");
      },
      { once: true },
    );
    root.append(model);

    const hitTarget = document.createElement("a-box");
    hitTarget.classList.add("attackable");
    hitTarget.setAttribute("position", "0 0.42 0");
    hitTarget.setAttribute("width", "0.9");
    hitTarget.setAttribute("height", "1");
    hitTarget.setAttribute("depth", "0.7");
    hitTarget.setAttribute(
      "material",
      "transparent: true; opacity: 0.001; depthWrite: false",
    );
    hitTarget.addEventListener("click", () => {
      if (!disabledRef.current) callbacksRef.current.onAttack();
    });
    root.append(hitTarget);

    marker.append(root);
    ghostRootRef.current = root;

    return () => {
      root.remove();
      if (ghostRootRef.current === root) ghostRootRef.current = null;
    };
  }, [
    activeEncounter?.encounterId,
    activeEncounter?.ghostModelId,
    activeEncounter?.markerId,
    sceneReadyToken,
  ]);

  useEffect(() => {
    const ghost = ghostRootRef.current;
    if (!ghost || hitSignal === 0 || prefersReducedMotion()) return;
    ghost.setAttribute("scale", "1.14 0.88 1.14");
    const timer = window.setTimeout(
      () => ghost.setAttribute("scale", "1 1 1"),
      110,
    );
    return () => window.clearTimeout(timer);
  }, [hitSignal]);

  useEffect(() => {
    const ghost = ghostRootRef.current;
    if (!ghost || defeatSignal === 0) return;
    if (prefersReducedMotion()) {
      ghost.setAttribute("visible", "false");
      return;
    }
    ghost.setAttribute(
      "animation__defeat",
      "property: scale; from: 1 1 1; to: 0.08 1.45 0.08; dur: 480; easing: easeInBack",
    );
    ghost.setAttribute(
      "animation__fade",
      "property: object3D.visible; from: true; to: false; delay: 430; dur: 1",
    );
  }, [defeatSignal]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 overflow-hidden bg-[#09070f]"
      aria-hidden="true"
    >
      {runtimeError ? (
        <div className="grid h-full place-items-center px-8 text-center text-[#ffb36b]">
          The AR runtime could not start. Use Resume camera to try again.
        </div>
      ) : null}
    </div>
  );
}
