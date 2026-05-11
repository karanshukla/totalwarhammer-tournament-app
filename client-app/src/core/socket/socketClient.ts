import { io, Socket } from "socket.io-client";
import { apiConfig } from "../config/apiConfig";

let socket: Socket | null = null;

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
  }
  return socket;
}
