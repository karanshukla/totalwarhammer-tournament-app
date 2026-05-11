import { Server } from "socket.io";

import logger from "../utils/logger.js";
import { createRateLimiter } from "../utils/rate-limiter.js";

// 20 unique connections per IP per minute
const connectionLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });
// 60 events per connected socket per minute
const eventLimiter = createRateLimiter({ windowMs: 60_000, max: 60 });

let io = null;

export function initSocketIO(httpServer, corsOrigin) {
  logger.info(`[socket] initializing — corsOrigin: ${corsOrigin}`);

  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  io.engine.on("connection_error", (err) => {
    logger.error(
      `[socket] engine connection_error — code: ${err.code} message: ${err.message} context: ${JSON.stringify(err.context)} headers: ${JSON.stringify(err.req?.headers)}`,
    );
  });

  io.use((socket, next) => {
    const ip = socket.handshake.address;
    if (!connectionLimiter(ip)) {
      logger.warn(`Socket connection rate limit exceeded for ${ip}`);
      return next(new Error("Too many connections"));
    }
    next();
  });

  io.on("connection", (socket) => {
    logger.debug(`Socket connected: ${socket.id}`);

    socket.on("tournament:join", (tournamentId) => {
      if (!eventLimiter(socket.id)) {
        logger.warn(`Socket event rate limit exceeded for ${socket.id}`);
        socket.disconnect(true);
        return;
      }
      if (
        typeof tournamentId !== "string" ||
        !/^[a-f\d]{24}$/i.test(tournamentId)
      )
        return;
      socket.join(`tournament:${tournamentId}`);
      logger.debug(`Socket ${socket.id} joined tournament:${tournamentId}`);
    });

    socket.on("tournament:leave", (tournamentId) => {
      if (!eventLimiter(socket.id)) {
        logger.warn(`Socket event rate limit exceeded for ${socket.id}`);
        socket.disconnect(true);
        return;
      }
      if (
        typeof tournamentId !== "string" ||
        !/^[a-f\d]{24}$/i.test(tournamentId)
      )
        return;
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
