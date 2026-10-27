import { RoomEvents } from "../domain/room-events.js";
import { RoomService } from "../domain/room-service.js";

export class MatchExpirationJob {
  readonly #roomService: RoomService;
  readonly #roomEvents: RoomEvents;
  readonly #intervalMs: number;
  #timer: NodeJS.Timeout | undefined;
  #running = false;

  constructor(
    roomService: RoomService,
    roomEvents: RoomEvents,
    intervalMs = 1_000,
  ) {
    this.#roomService = roomService;
    this.#roomEvents = roomEvents;
    this.#intervalMs = intervalMs;
  }

  start(): void {
    if (this.#timer) return;
    this.#timer = setInterval(() => void this.runOnce(), this.#intervalMs);
    this.#timer.unref();
  }

  stop(): void {
    if (!this.#timer) return;
    clearInterval(this.#timer);
    this.#timer = undefined;
  }

  async runOnce(): Promise<string[]> {
    if (this.#running) return [];
    this.#running = true;
    try {
      const expiredRoomIds = this.#roomService.expireDueRooms();
      await Promise.all(
        expiredRoomIds.map((roomId) =>
          this.#roomEvents.roomChanged(roomId, "EXPIRED"),
        ),
      );
      return expiredRoomIds;
    } finally {
      this.#running = false;
    }
  }
}
