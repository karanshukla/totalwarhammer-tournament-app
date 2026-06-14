/**
 * Branch coverage for core/socket/socketClient.ts:
 * - getSocket(): !socket (first call) → creates new socket via io()
 * - getSocket(): socket exists (second call) → returns same instance
 * - apiConfig.baseUrl truthy + valid URL → uses new URL(baseUrl).origin
 * - apiConfig.baseUrl empty → uses window.location.origin
 * - apiConfig.baseUrl invalid URL → catch block → uses window.location.origin
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSocketInstance, mockIo, mockApiConfig } = vi.hoisted(() => {
  const inst = {
    on: vi.fn(),
    io: {
      on: vi.fn(),
      engine: { on: vi.fn() },
    },
  };
  return {
    mockSocketInstance: inst,
    mockIo: vi.fn().mockReturnValue(inst),
    mockApiConfig: { baseUrl: "" },
  };
});

vi.mock("socket.io-client", () => ({ io: mockIo }));
vi.mock("@/core/config/apiConfig", () => ({ apiConfig: mockApiConfig }));

describe("getSocket – singleton and URL logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockIo.mockReturnValue(mockSocketInstance);
  });

  it("creates socket on first call and returns the instance", async () => {
    mockApiConfig.baseUrl = "";
    const { getSocket } = await import("@/core/socket/socketClient");
    const s = getSocket();
    expect(s).toBe(mockSocketInstance);
    expect(mockIo).toHaveBeenCalledTimes(1);
  });

  it("returns the same socket instance on subsequent calls (singleton)", async () => {
    mockApiConfig.baseUrl = "";
    const { getSocket } = await import("@/core/socket/socketClient");
    const s1 = getSocket();
    const s2 = getSocket();
    expect(s1).toBe(s2);
    expect(mockIo).toHaveBeenCalledTimes(1);
  });

  it("uses origin of apiConfig.baseUrl when baseUrl is a valid URL", async () => {
    mockApiConfig.baseUrl = "http://api.example.com/api/v1";
    const { getSocket } = await import("@/core/socket/socketClient");
    getSocket();
    expect(mockIo).toHaveBeenCalledWith(
      "http://api.example.com",
      expect.any(Object),
    );
  });

  it("uses window.location.origin when baseUrl is empty string", async () => {
    mockApiConfig.baseUrl = "";
    const { getSocket } = await import("@/core/socket/socketClient");
    getSocket();
    expect(mockIo).toHaveBeenCalledWith(
      window.location.origin,
      expect.any(Object),
    );
  });

  it("falls back to window.location.origin when baseUrl is not a valid URL (catch branch)", async () => {
    mockApiConfig.baseUrl = "not-a-valid-url";
    const { getSocket } = await import("@/core/socket/socketClient");
    getSocket();
    expect(mockIo).toHaveBeenCalledWith(
      window.location.origin,
      expect.any(Object),
    );
  });
});
