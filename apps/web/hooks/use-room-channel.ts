"use client";

import type { RoomState } from "@ghost-hunt/shared";
import { useEffect, useState } from "react";
import { getGameSocket } from "@/lib/socket";

type ConnectionState = "CONNECTING" | "CONNECTED" | "DISCONNECTED";

export function useRoomChannel(roomCode: string, initialState: RoomState) {
  const [roomState, setRoomState] = useState(initialState);
  const [connectionState, setConnectionState] = useState<ConnectionState>("CONNECTING");
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const socket = getGameSocket();
    function subscribe() {
      setConnectionState("CONNECTED");
      setConnectionError(null);
      socket.emit("room:subscribe", { roomCode }, (result) => {
        if (result.ok) setRoomState(result.state);
        else setConnectionError(result.error.message);
      });
    }
    function disconnect() { setConnectionState("DISCONNECTED"); }
    function connectError() {
      setConnectionState("DISCONNECTED");
      setConnectionError("Live updates are reconnecting…");
    }

    socket.on("connect", subscribe);
    socket.on("disconnect", disconnect);
    socket.on("connect_error", connectError);
    socket.on("room:state", setRoomState);
    if (socket.connected) subscribe(); else socket.connect();

    return () => {
      socket.off("connect", subscribe);
      socket.off("disconnect", disconnect);
      socket.off("connect_error", connectError);
      socket.off("room:state", setRoomState);
      socket.disconnect();
    };
  }, [roomCode]);

  return {
    roomState,
    connectionState,
    connectionError,
    replaceRoomState: setRoomState,
  };
}
