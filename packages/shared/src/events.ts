export const CLIENT_EVENTS = {
  roomSubscribe: "room:subscribe",
  markerClaim: "marker:claim",
  encounterHit: "encounter:hit",
  encounterAbandon: "encounter:abandon",
  roomSync: "room:sync",
} as const;

export const SERVER_EVENTS = {
  roomState: "room:state",
  roomStarted: "room:started",
  roomExpired: "room:expired",
  roomFinished: "room:finished",
  markerState: "marker:state",
  encounterClaimed: "encounter:claimed",
  encounterHitResult: "encounter:hit-result",
  encounterDefeated: "encounter:defeated",
  scoreUpdated: "score:updated",
  gameError: "game:error",
} as const;
