/**
 * Server-side Socket.IO room membership lives on the socket instance, so a
 * reconnect produces a socket that belongs to no rooms. Nothing re-emitted the
 * join, so after any transient drop the page went silently deaf to live
 * updates while continuing to look healthy.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSocketInstance, mockIo, mockApiConfig } = vi.hoisted(() => {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  const inst = {
    emit: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handler;
    }),
    io: { on: vi.fn(), engine: { on: vi.fn(), transport: { name: "ws" } } },
    id: "socket-1",
    __handlers: handlers,
  };
  return {
    mockSocketInstance: inst,
    mockIo: vi.fn().mockReturnValue(inst),
    mockApiConfig: { baseUrl: "" },
  };
});

vi.mock("socket.io-client", () => ({ io: mockIo }));
vi.mock("@/core/config/apiConfig", () => ({ apiConfig: mockApiConfig }));

function emittedRoomEvents() {
  return mockSocketInstance.emit.mock.calls.filter(
    ([event]) => event === "tournament:join" || event === "tournament:leave",
  );
}

describe("tournament room membership across reconnects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    for (const key of Object.keys(mockSocketInstance.__handlers)) {
      delete mockSocketInstance.__handlers[key];
    }
    mockIo.mockReturnValue(mockSocketInstance);
  });

  it("re-emits joins for every tracked room when the socket reconnects", async () => {
    const { joinTournamentRoom } = await import("@/core/socket/socketClient");

    joinTournamentRoom("aaaaaaaaaaaaaaaaaaaaaaaa");
    joinTournamentRoom("bbbbbbbbbbbbbbbbbbbbbbbb");
    mockSocketInstance.emit.mockClear();

    mockSocketInstance.__handlers.connect?.();

    expect(emittedRoomEvents()).toEqual([
      ["tournament:join", "aaaaaaaaaaaaaaaaaaaaaaaa"],
      ["tournament:join", "bbbbbbbbbbbbbbbbbbbbbbbb"],
    ]);
  });

  it("does not re-join a room the caller has left", async () => {
    const { joinTournamentRoom, leaveTournamentRoom } =
      await import("@/core/socket/socketClient");

    joinTournamentRoom("aaaaaaaaaaaaaaaaaaaaaaaa");
    joinTournamentRoom("bbbbbbbbbbbbbbbbbbbbbbbb");
    leaveTournamentRoom("aaaaaaaaaaaaaaaaaaaaaaaa");
    mockSocketInstance.emit.mockClear();

    mockSocketInstance.__handlers.connect?.();

    expect(emittedRoomEvents()).toEqual([
      ["tournament:join", "bbbbbbbbbbbbbbbbbbbbbbbb"],
    ]);
  });

  it("emits the join immediately, not only on the next connect", async () => {
    const { joinTournamentRoom } = await import("@/core/socket/socketClient");

    joinTournamentRoom("aaaaaaaaaaaaaaaaaaaaaaaa");

    expect(emittedRoomEvents()).toEqual([
      ["tournament:join", "aaaaaaaaaaaaaaaaaaaaaaaa"],
    ]);
  });
});
