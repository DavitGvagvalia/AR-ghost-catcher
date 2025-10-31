import { useCallback, useMemo } from "react";
import { Entity, Scene } from "aframe-react";
import "./GamePage.css";
import HUD from "../components/HUD";

const CONFIG = {
  models: [
    { marker: 0, name: "ghost1" },
    { marker: 1, name: "ghost2" },
    { marker: 2, name: "ghost3" },
    { marker: 3, name: "ghost4" },
    { marker: 4, name: "ghost4" },
    { marker: 5, name: "ghost5" },
    { marker: 6, name: "ghost6" },
    { marker: 7, name: "ghost7" },
    { marker: 8, name: "ghost1" },
    { marker: 9, name: "ghost2" },
    { marker: 10, name: "ghost3" },
    { marker: 11, name: "ghost4" },
    { marker: 12, name: "ghost4" },
    { marker: 13, name: "ghost5" },
    { marker: 14, name: "ghost6" },
    { marker: 15, name: "ghost7" },
    { marker: 16, name: "ghost1" },
    { marker: 17, name: "ghost2" },
    { marker: 18, name: "ghost3" },
    { marker: 19, name: "ghost4" },
    { marker: 20, name: "ghost5" },
    { marker: 21, name: "ghost6" },
    { marker: 22, name: "ghost7" },
    { marker: 23, name: "ghost1" },
    { marker: 24, name: "ghost2" },
    { marker: 25, name: "ghost3" },
    { marker: 26, name: "ghost4" }

    
  ],
  mindar: { imageTargetSrc: "/assets/markers/targets.mind" },
  sounds: {
    click: "/sounds/hit.mp3",
    caught: "/sounds/catch.mp3",
  },
  model: { rotation: "0 0 0", position: "0 0 0", scale: "0.4 0.4 0.4" },
  hitbox: {
    shape: "box",      // "box" | "sphere" — pick what matches your model best
    size: "0.6 0.6 0.6", // a bit larger than the model scale for easier clicks
    offset: "0 0 0",   // adjust if your model’s origin isn’t centered
  },
};

function Ghost({ marker, name, modelConfig, onHit }) {
  return (
    <Entity mindar-image-target={`targetIndex: ${marker}`}>
      {/* The actual model (can be rebuilt by MindAR; no click binding here) */}
      <Entity
        primitive="a-gltf-model"
        src={`#${name}`}
        rotation={modelConfig.rotation}
        position={modelConfig.position}
        scale={modelConfig.scale}
      />

      {/* Stable, invisible hitbox that receives clicks; React onClick stays bound */}
      <Entity
        className="clickable"
        geometry={`primitive: ${CONFIG.hitbox.shape}; depth: ${CONFIG.hitbox.size.split(" ")[2]}; height: ${CONFIG.hitbox.size.split(" ")[1]}; width: ${CONFIG.hitbox.size.split(" ")[0]}`}
        position={CONFIG.hitbox.offset}
        material="opacity: 0.001; transparent: true; color: #ffffff"
        onClick={onHit}
      />
    </Entity>
  );
}

export default function GamePage({ score, changeScore }) {
  const playSound = useCallback((src) => {
    const sound = new Audio(src);
    sound.currentTime = 0;
    sound.play().catch(() => {});
  }, []);

  const handleGhostClick = useCallback(() => {
    playSound(CONFIG.sounds.click);
    setTimeout(() => playSound(CONFIG.sounds.caught), 800);
  }, [playSound]);

  const mindarAttr = useMemo(
    () => `imageTargetSrc: ${CONFIG.mindar.imageTargetSrc}; uiScanning: false; uiLoading: false`,
    []
  );

  return (
    <div className="scanning-screen">
      <Scene
        mindar-image={mindarAttr}
        cursor="fuse: false; rayOrigin: mouse"
        raycaster="objects: .clickable"
        renderer="colorManagement: true; antialias: true; alpha: true"
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: false"
      >
        {/* Preload models */}
        <Entity primitive="a-assets">
          {CONFIG.models.map(({ name }) => (
            <Entity
              key={name}
              primitive="a-asset-item"
              id={name}
              src={`/models/${name}.glb`}
              crossOrigin="anonymous"
            />
          ))}
        </Entity>

        {/* One marker → one model + stable hitbox */}
        {CONFIG.models.map(({ marker, name }) => (
          <Ghost
            key={marker}
            marker={marker}
            name={name}
            modelConfig={CONFIG.model}
            onHit={handleGhostClick}
          />
        ))}

        <Entity primitive="a-camera" position="0 0 0" look-controls="enabled: false" />
      </Scene>
      <HUD score={score} />
    </div>
  );
}
