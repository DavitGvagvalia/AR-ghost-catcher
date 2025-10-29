export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export interface RarityConfig {
  clicks: number
  points: number
  models: string[]
}

export const RARITY_CONFIG: Record<Rarity, RarityConfig> = {
  common: {
    clicks: 1,
    points: 1,
    models: [
      '/models/common/ghost1/scene.gltf',
      '/models/common/ghost2/scene.gltf',
      '/models/common/ghost3/scene.gltf',
      '/models/common/ghost4/scene.gltf'
    ]
  },
  uncommon: {
    clicks: 3,
    points: 3,
    models: [
      '/models/uncommon/ghost1/scene.gltf',
      '/models/uncommon/ghost2/scene.gltf',
      '/models/uncommon/ghost3/scene.gltf',
      '/models/uncommon/ghost4/scene.gltf'
    ]
  },
  rare: {
    clicks: 5,
    points: 5,
    models: [
      '/models/rare/ghost1/scene.gltf',
      '/models/rare/ghost2/scene.gltf',
      '/models/rare/ghost3/scene.gltf',
      '/models/rare/ghost4/scene.gltf'
    ]
  },
  epic: {
    clicks: 10,
    points: 10,
    models: [
      '/models/epic/ghost1/scene.gltf',
      '/models/epic/ghost2/scene.gltf',
      '/models/epic/ghost3/scene.gltf',
      '/models/epic/ghost4/scene.gltf'
    ]
  },
  legendary: {
    clicks: 20,
    points: 20,
    models: [
      '/models/legendary/ghost1/scene.gltf',
      '/models/legendary/ghost2/scene.gltf',
      '/models/legendary/ghost3/scene.gltf',
      '/models/legendary/ghost4/scene.gltf'
    ]
  }
}

// Map marker IDs to rarities (1-5)
export const MARKER_RARITY_MAP: Record<number, Rarity> = {
  1: 'common',
  2: 'uncommon', 
  3: 'rare',
  4: 'epic',
  5: 'legendary'
}

export function getRarityForMarker(markerId: number): Rarity {
  return MARKER_RARITY_MAP[markerId] || 'common'
}

export function getRandomModelForRarity(rarity: Rarity): string {
  const config = RARITY_CONFIG[rarity]
  const randomIndex = Math.floor(Math.random() * config.models.length)
  return config.models[randomIndex]
}

export function getRarityConfig(rarity: Rarity): RarityConfig {
  return RARITY_CONFIG[rarity]
}
