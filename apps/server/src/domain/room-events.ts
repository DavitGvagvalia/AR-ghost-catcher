export type RoomChangeKind = "STATE" | "STARTED" | "EXPIRED" | "FINISHED";
export type RoomChangedListener = (
  roomId: string,
  kind: RoomChangeKind,
) => void | Promise<void>;

export class RoomEvents {
  #listener: RoomChangedListener | undefined;

  setListener(listener: RoomChangedListener): void {
    this.#listener = listener;
  }

  async roomChanged(
    roomId: string,
    kind: RoomChangeKind = "STATE",
  ): Promise<void> {
    await this.#listener?.(roomId, kind);
  }
}
