import { io, Socket } from "socket.io-client";
import { apiConfig } from "../config/apiConfig";

let socket: Socket | null = null;

// Server-side room membership lives on the socket instance, so a reconnect
// lands in a brand-new socket that belongs to no rooms. Callers that joined
// before the drop would go silently deaf — the UI looks healthy and simply
// stops receiving updates. Tracking the rooms here lets us replay the joins
// on every `connect`.
const joinedTournamentRooms = new Set<string>();

export function joinTournamentRoom(tournamentId: string): void {
  joinedTournamentRooms.add(tournamentId);
  getSocket().emit("tournament:join", tournamentId);
}

export function leaveTournamentRoom(tournamentId: string): void {
  joinedTournamentRooms.delete(tournamentId);
  getSocket().emit("tournament:leave", tournamentId);
}

export function getSocket(): Socket {
  if (!socket) {
    // Use only the origin — if apiConfig.baseUrl includes a path (e.g. /api
    // for production Caddy routing), socket.io-client would treat it as a
    // namespace and fail to connect to the default "/" namespace on the server.
    let socketUrl: string;
    try {
      socketUrl = apiConfig.baseUrl
        ? new URL(apiConfig.baseUrl).origin
        : window.location.origin;
    } catch {
      socketUrl = window.location.origin;
    }

    socket = io(socketUrl, {
      withCredentials: true,
      autoConnect: true,
      transports: ["websocket", "polling"],
    });

    console.debug("[socket] init — url:", socketUrl);

    socket.on("connect", () => {
      console.debug(
        "[socket] connected — id:",
        socket?.id,
        "transport:",
        socket?.io.engine.transport.name,
      );
      for (const tournamentId of joinedTournamentRooms) {
        socket?.emit("tournament:join", tournamentId);
      }
    });
    socket.on("connect_error", (err) => {
      console.error("[socket] connect_error —", err.message, err);
    });
    socket.on("disconnect", (reason, details) => {
      console.warn("[socket] disconnect —", reason, details);
    });
    socket.io.on("reconnect_attempt", (n) => {
      console.debug("[socket] reconnect attempt #" + n);
    });
    socket.io.engine.on("upgrade", (transport) => {
      console.debug("[socket] transport upgraded to:", transport.name);
    });
  }
  return socket;
}
