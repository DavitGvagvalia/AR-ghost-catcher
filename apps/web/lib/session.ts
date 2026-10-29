const PLAYER_ROOM_KEY = "ghost-hunt.player-room";
const HOST_ROOM_KEY = "ghost-hunt.host-room";

function read(key: string): string | null {
  return typeof window === "undefined"
    ? null
    : window.localStorage.getItem(key);
}

function write(key: string, value: string): void {
  window.localStorage.setItem(key, value);
}

export const roomMemory = {
  getPlayerRoom: () => read(PLAYER_ROOM_KEY),
  setPlayerRoom: (code: string) => write(PLAYER_ROOM_KEY, code),
  getHostRoom: () => read(HOST_ROOM_KEY),
  setHostRoom: (code: string) => write(HOST_ROOM_KEY, code),
};
