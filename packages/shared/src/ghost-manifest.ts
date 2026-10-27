export const MOBILE_MODEL_BUDGET = {
  maxBytes: 5_000_000,
  maxTriangles: 50_000,
} as const;

export const GHOST_MODEL_IDS = [
  "animal-company-ghost",
  "big-boo",
  "crocodillo-penisini",
  "halloween-pumpkin",
  "halloween-skull",
  "kuntilanak",
] as const;

export type GhostModelId = (typeof GHOST_MODEL_IDS)[number];
export type MobileReadiness = "CANDIDATE" | "REQUIRES_OPTIMIZATION";

export interface GhostModelDefinition {
  id: GhostModelId;
  title: string;
  assetPath: `/models/ghosts/${string}.glb`;
  byteSize: number;
  sha256: string;
  approximateTriangles: number;
  embeddedTextureCount: number;
  skinned: boolean;
  animationClips: readonly string[];
  mobileReadiness: MobileReadiness;
  displayScale: number | null;
  scaleStatus: "REQUIRES_AR_CALIBRATION";
  rightsReviewStatus: "NOT_REVIEWED";
  provenance: {
    author: string;
    sourceUrl: `https://sketchfab.com/${string}`;
    licenseName: "SKETCHFAB Standard";
    licenseUrl: "https://sketchfab.com/licenses";
  };
}

export const GHOST_MODEL_MANIFEST = [
  {
    id: "animal-company-ghost",
    title: "Animal-company-ghost",
    assetPath: "/models/ghosts/animal-company-ghost.glb",
    byteSize: 144_272,
    sha256: "7b1ef136914ec3164ffda2d2beae4140a776627803619b72e1a4563d23b2eb0c",
    approximateTriangles: 3_322,
    embeddedTextureCount: 0,
    skinned: true,
    animationClips: [],
    mobileReadiness: "CANDIDATE",
    displayScale: null,
    scaleStatus: "REQUIRES_AR_CALIBRATION",
    rightsReviewStatus: "NOT_REVIEWED",
    provenance: {
      author: "BlueJayJay_2 (https://sketchfab.com/BlueJayJay_2)",
      sourceUrl:
        "https://sketchfab.com/3d-models/animal-company-ghost-16edc0d673d046319903eb4a87ea6341",
      licenseName: "SKETCHFAB Standard",
      licenseUrl: "https://sketchfab.com/licenses",
    },
  },
  {
    id: "big-boo",
    title: "Big Boo Super Mario World (Custom)",
    assetPath: "/models/ghosts/big_boo_super_mario_world_custom.glb",
    byteSize: 518_916,
    sha256: "c5675c16e69672b64592174d6c17e960e80e37d82049047486b4364a9e8762d9",
    approximateTriangles: 17_384,
    embeddedTextureCount: 1,
    skinned: false,
    animationClips: [],
    mobileReadiness: "CANDIDATE",
    displayScale: null,
    scaleStatus: "REQUIRES_AR_CALIBRATION",
    rightsReviewStatus: "NOT_REVIEWED",
    provenance: {
      author: "StinkySkunk12 (https://sketchfab.com/Bearfnf)",
      sourceUrl:
        "https://sketchfab.com/3d-models/big-boo-super-mario-world-custom-46f17f7605c04add9aa310b575335a2b",
      licenseName: "SKETCHFAB Standard",
      licenseUrl: "https://sketchfab.com/licenses",
    },
  },
  {
    id: "crocodillo-penisini",
    title: "Crocodillo Penisini",
    assetPath: "/models/ghosts/crocodillo_penisini.glb",
    byteSize: 29_893_364,
    sha256: "d0a48014efb50b6824e0a36cd55df497d0c2daa32b22639acb81d34e007fb182",
    approximateTriangles: 844_269,
    embeddedTextureCount: 1,
    skinned: false,
    animationClips: [],
    mobileReadiness: "REQUIRES_OPTIMIZATION",
    displayScale: null,
    scaleStatus: "REQUIRES_AR_CALIBRATION",
    rightsReviewStatus: "NOT_REVIEWED",
    provenance: {
      author: "meshy00 (https://sketchfab.com/meshy00)",
      sourceUrl:
        "https://sketchfab.com/3d-models/crocodillo-penisini-a77114adcf114e7cb00cfe15feb7ec1d",
      licenseName: "SKETCHFAB Standard",
      licenseUrl: "https://sketchfab.com/licenses",
    },
  },
  {
    id: "halloween-pumpkin",
    title: "Halloween Pumpkin Low Poly",
    assetPath: "/models/ghosts/halloween_pumpkin_low_poly.glb",
    byteSize: 50_928,
    sha256: "d854dba345535eeee4d6ac35fe0b05004358e95c68798ff411ac9643ca9ca685",
    approximateTriangles: 632,
    embeddedTextureCount: 0,
    skinned: false,
    animationClips: [],
    mobileReadiness: "CANDIDATE",
    displayScale: null,
    scaleStatus: "REQUIRES_AR_CALIBRATION",
    rightsReviewStatus: "NOT_REVIEWED",
    provenance: {
      author: "WULF (https://sketchfab.com/vovchanski)",
      sourceUrl:
        "https://sketchfab.com/3d-models/halloween-pumpkin-low-poly-8259b8b0fbfa45f69dcfdb8a0d14e568",
      licenseName: "SKETCHFAB Standard",
      licenseUrl: "https://sketchfab.com/licenses",
    },
  },
  {
    id: "halloween-skull",
    title: "Halloween Skull",
    assetPath: "/models/ghosts/halloween_skull.glb",
    byteSize: 3_198_204,
    sha256: "3114bb2b7eed86e0eaa0db6a041219b969d70f57ef81ff369aed6bb64db9cdc3",
    approximateTriangles: 20_224,
    embeddedTextureCount: 2,
    skinned: false,
    animationClips: [],
    mobileReadiness: "CANDIDATE",
    displayScale: null,
    scaleStatus: "REQUIRES_AR_CALIBRATION",
    rightsReviewStatus: "NOT_REVIEWED",
    provenance: {
      author: "GreatShep (https://sketchfab.com/greatshep)",
      sourceUrl:
        "https://sketchfab.com/3d-models/halloween-skull-4c77d4d5c4974ec486f410dcb613a2fc",
      licenseName: "SKETCHFAB Standard",
      licenseUrl: "https://sketchfab.com/licenses",
    },
  },
  {
    id: "kuntilanak",
    title: "Kuntilanak",
    assetPath: "/models/ghosts/kuntilanak.glb",
    byteSize: 11_760_928,
    sha256: "f8dd98c74efddcd4e98fc7443cb50396550f6d4863b7aee22c7525de809fabe3",
    approximateTriangles: 97_271,
    embeddedTextureCount: 1,
    skinned: true,
    animationClips: [],
    mobileReadiness: "REQUIRES_OPTIMIZATION",
    displayScale: null,
    scaleStatus: "REQUIRES_AR_CALIBRATION",
    rightsReviewStatus: "NOT_REVIEWED",
    provenance: {
      author: "fdhlan21 (https://sketchfab.com/fdhlan21)",
      sourceUrl:
        "https://sketchfab.com/3d-models/kuntilanak-fc7c59c2c7414e37b66698dd8cfe2236",
      licenseName: "SKETCHFAB Standard",
      licenseUrl: "https://sketchfab.com/licenses",
    },
  },
] as const satisfies readonly GhostModelDefinition[];
