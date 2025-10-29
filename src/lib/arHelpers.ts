import { getRandomModelForRarity, getRarityForMarker, getRarityConfig } from './rarity'

export interface GhostSpawnData {
  markerId: number
  modelPath: string
  rarity: string
  clicksRequired: number
  points: number
  position: { x: number; y: number; z: number }
}

export function createGhostSpawnData(markerId: number): GhostSpawnData {
  const rarity = getRarityForMarker(markerId)
  const config = getRarityConfig(rarity)
  const modelPath = getRandomModelForRarity(rarity)
  
  // Random offset around marker position
  const offsetX = (Math.random() - 0.5) * 0.2 // ±0.1m
  const offsetZ = (Math.random() - 0.5) * 0.2 // ±0.1m
  const offsetY = 0.1 + Math.random() * 0.1 // 0.1-0.2m above marker
  
  return {
    markerId,
    modelPath,
    rarity,
    clicksRequired: config.clicks,
    points: config.points,
    position: {
      x: offsetX,
      y: offsetY,
      z: offsetZ
    }
  }
}

export function generateGhostId(markerId: number): string {
  return `ghost-${markerId}-${Date.now()}`
}

export function createRiseAnimation(): string {
  return `
    property: position;
    to: 0 0.3 0;
    dur: 1000;
    easing: easeOutQuad;
    loop: false;
  `
}

export function createHoverAnimation(): string {
  return `
    property: position;
    to: 0 0.35 0;
    dur: 2000;
    easing: easeInOutSine;
    loop: true;
    dir: alternate;
  `
}

export function createTapAnimation(): string {
  return `
    property: scale;
    to: 1.2 1.2 1.2;
    dur: 200;
    easing: easeOutQuad;
    loop: false;
    dir: alternate;
  `
}

export function createCatchAnimation(): string {
  return `
    property: scale, opacity;
    to: 0 0 0, 0;
    dur: 500;
    easing: easeInQuad;
    loop: false;
  `
}
