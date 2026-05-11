import { Server } from "socket.io";
import logger from "../utils/logger.js";

let io = null;

export function initSocketIO(httpServer, corsOrigin) {
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    logger.debug(`Socket connected: ${socket.id}`);

    socket.on("tournament:join", (tournamentId) => {
      socket.join(`tournament:${tournamentId}`);
      logger.debug(`Socket ${socket.id} joined tournament:${tournamentId}`);
    });

    socket.on("tournament:leave", (tournamentId) => {
      socket.leave(`tournament:${tournamentId}`);
    });

    socket.on("disconnect", () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function emitTournamentUpdated(tournamentId, tournament) {
  if (!io) return;
  io.to(`tournament:${tournamentId}`).emit("tournament:updated", tournament);
}

export function emitMatchesUpdated(tournamentId, matches) {
  if (!io) return;
  io.to(`tournament:${tournamentId}`).emit("matches:updated", matches);
}

export function emitMatchesAppended(tournamentId, newMatches) {
  if (!io) return;
  io.to(`tournament:${tournamentId}`).emit("matches:appended", newMatches);
}

export function emitMatchUpdated(tournamentId, match) {
  if (!io) return;
  io.to(`tournament:${tournamentId}`).emit("match:updated", match);
}
