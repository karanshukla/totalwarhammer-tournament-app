import { io, Socket } from "socket.io-client";
import { apiConfig } from "../config/apiConfig";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(apiConfig.baseUrl || window.location.origin, {
      path: "/api/socket.io/",
      withCredentials: true,
      autoConnect: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}
