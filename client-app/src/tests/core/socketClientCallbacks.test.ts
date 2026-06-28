/**
 * Callback invocation coverage for core/socket/socketClient.ts
 *
 * The existing socketClient.test.ts verifies that event handlers are
 * registered but never invokes their bodies. This file calls each
 * registered callback to cover lines 29, 37, 40, 43, and 46.
 *
 * Lines:
 *   29  – console.debug inside socket.on("connect")
 *   37  – console.error inside socket.on("connect_error")
 *   40  – console.warn  inside socket.on("disconnect")
 *   43  – console.debug inside socket.io.on("reconnect_attempt")
 *   46  – console.debug inside socket.io.engine.on("upgrade")
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSocketInstance, mockIo } = vi.hoisted(() => {
  const inst = {
    id: "socket-id-123",
    on: vi.fn(),
    io: {
      on: vi.fn(),
      engine: {
        on: vi.fn(),
        transport: { name: "websocket" },
      },
    },
  };
  return {
    mockSocketInstance: inst,
    mockIo: vi.fn().mockReturnValue(inst),
  };
});

vi.mock("socket.io-client", () => ({ io: mockIo }));
vi.mock("@/core/config/apiConfig", () => ({ apiConfig: { baseUrl: "" } }));

describe("getSocket – event handler callback bodies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockIo.mockReturnValue(mockSocketInstance);
  });

  it("connect callback logs [socket] connected with id and transport (line 29)", async () => {
    const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const { getSocket } = await import("@/core/socket/socketClient");
    getSocket();

    // Find and invoke the 'connect' handler
    const connectCall = mockSocketInstance.on.mock.calls.find(
      (c) => c[0] === "connect",
    );
    expect(connectCall).toBeDefined();
    connectCall?.[1]?.();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[socket] connected"),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
    consoleSpy.mockRestore();
  });

  it("connect_error callback logs [socket] connect_error (line 37)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { getSocket } = await import("@/core/socket/socketClient");
    getSocket();

    const errCall = mockSocketInstance.on.mock.calls.find(
      (c) => c[0] === "connect_error",
    );
    expect(errCall).toBeDefined();
    const fakeError = new Error("connection refused");
    errCall?.[1]?.(fakeError);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[socket] connect_error"),
      fakeError.message,
      fakeError,
    );
    consoleSpy.mockRestore();
  });

  it("disconnect callback logs [socket] disconnect (line 40)", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { getSocket } = await import("@/core/socket/socketClient");
    getSocket();

    const discCall = mockSocketInstance.on.mock.calls.find(
      (c) => c[0] === "disconnect",
    );
    expect(discCall).toBeDefined();
    discCall?.[1]?.("transport close", { description: "server closed" });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[socket] disconnect"),
      "transport close",
      { description: "server closed" },
    );
    consoleSpy.mockRestore();
  });

  it("reconnect_attempt callback logs [socket] reconnect attempt (line 43)", async () => {
    const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const { getSocket } = await import("@/core/socket/socketClient");
    getSocket();

    const reconnCall = mockSocketInstance.io.on.mock.calls.find(
      (c) => c[0] === "reconnect_attempt",
    );
    expect(reconnCall).toBeDefined();
    reconnCall?.[1]?.(3);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[socket] reconnect attempt #3"),
    );
    consoleSpy.mockRestore();
  });

  it("engine upgrade callback logs [socket] transport upgraded (line 46)", async () => {
    const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const { getSocket } = await import("@/core/socket/socketClient");
    getSocket();

    const upgradeCall = mockSocketInstance.io.engine.on.mock.calls.find(
      (c) => c[0] === "upgrade",
    );
    expect(upgradeCall).toBeDefined();
    upgradeCall?.[1]?.({ name: "websocket" });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[socket] transport upgraded to:"),
      "websocket",
    );
    consoleSpy.mockRestore();
  });
});
