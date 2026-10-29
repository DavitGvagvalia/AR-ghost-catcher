import type { PlayerSummary } from "@ghost-hunt/shared";

export function RoomRoster({
  players,
  currentPlayerId,
}: {
  players: PlayerSummary[];
  currentPlayerId: string | null;
}) {
  if (players.length === 0) {
    return (
      <div className="grid min-h-40 place-items-center border border-dashed border-[#3b354b] px-6 text-center text-sm text-[#8d869b]">
        No hunters yet. Share the room code to bring the crew in.
      </div>
    );
  }

  return (
    <ul
      className="divide-y divide-[#2b2639] border-y border-[#2b2639]"
      aria-label="Players in room"
    >
      {players.map((player, index) => (
        <li key={player.id} className="flex min-h-16 items-center gap-4 py-3">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full bg-[#221c30] text-sm font-extrabold text-[#b9a4ff]"
            aria-hidden="true"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-[#f6f0e6]">
              {player.nickname}
              {player.id === currentPlayerId ? (
                <span className="ml-2 text-xs font-semibold text-[#7df9e7]">
                  You
                </span>
              ) : null}
            </p>
            <p className="text-xs text-[#8d869b]">
              {player.isConnected ? "Ready in the lobby" : "Connection lost"}
            </p>
          </div>
          <span
            className={`size-2.5 shrink-0 rounded-full ${player.isConnected ? "bg-[#7df9e7] shadow-[0_0_12px_rgba(125,249,231,0.65)]" : "bg-[#514a5e]"}`}
          >
            <span className="sr-only">
              {player.isConnected ? "Connected" : "Disconnected"}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
