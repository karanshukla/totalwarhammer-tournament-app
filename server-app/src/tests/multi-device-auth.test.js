import assert from "node:assert";
import { describe, it, beforeEach, mock } from "node:test";

import AuthStateService from "../infrastructure/services/auth-state-service.js";

const CHROME_WINDOWS_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const FIREFOX_MAC_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.1; rv:120.0) Gecko/20100101 Firefox/120.0";
const SAFARI_IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

function makeDevice(userAgent) {
  return {
    session: { cookie: {} },
    get: (header) => (header === "user-agent" ? userAgent : null),
  };
}

const USER = {
  _id: "user1",
  email: "test@example.com",
  username: "testuser",
  role: "user",
};

describe("multi-device auth", () => {
  let service;

  beforeEach(() => {
    service = new AuthStateService();
  });

  describe("concurrent sessions for the same user", () => {
    it("two devices can be authenticated simultaneously", async () => {
      const deviceA = makeDevice(CHROME_WINDOWS_UA);
      const deviceB = makeDevice(FIREFOX_MAC_UA);

      await service.createUserAuthState(deviceA, USER);
      await service.createUserAuthState(deviceB, USER);

      assert.strictEqual(deviceA.session.isAuthenticated, true);
      assert.strictEqual(deviceB.session.isAuthenticated, true);
    });

    it("sessions are independent objects", async () => {
      const deviceA = makeDevice(CHROME_WINDOWS_UA);
      const deviceB = makeDevice(FIREFOX_MAC_UA);

      await service.createUserAuthState(deviceA, USER);
      await service.createUserAuthState(deviceB, USER);

      assert.notStrictEqual(deviceA.session, deviceB.session);
    });

    it("each device gets its own UA fingerprint", async () => {
      const deviceA = makeDevice(CHROME_WINDOWS_UA);
      const deviceB = makeDevice(FIREFOX_MAC_UA);

      await service.createUserAuthState(deviceA, USER);
      await service.createUserAuthState(deviceB, USER);

      assert.deepStrictEqual(deviceA.session.fingerprint, {
        browser: "Chrome",
        os: "Windows",
      });
      assert.deepStrictEqual(deviceB.session.fingerprint, {
        browser: "Firefox",
        os: "macOS",
      });
    });

    it("each device remains authenticated independently", async () => {
      const deviceA = makeDevice(CHROME_WINDOWS_UA);
      const deviceB = makeDevice(FIREFOX_MAC_UA);

      await service.createUserAuthState(deviceA, USER);
      await service.createUserAuthState(deviceB, USER);

      assert.strictEqual(service.isAuthenticated(deviceA), true);
      assert.strictEqual(service.isAuthenticated(deviceB), true);
    });

    it("mobile device session is independent of desktop sessions", async () => {
      const desktop = makeDevice(CHROME_WINDOWS_UA);
      const mobile = makeDevice(SAFARI_IOS_UA);

      await service.createUserAuthState(desktop, USER);
      await service.createUserAuthState(mobile, USER);

      assert.strictEqual(service.isAuthenticated(desktop), true);
      assert.strictEqual(service.isAuthenticated(mobile), true);
    });

    it("three concurrent sessions all remain valid", async () => {
      const deviceA = makeDevice(CHROME_WINDOWS_UA);
      const deviceB = makeDevice(FIREFOX_MAC_UA);
      const deviceC = makeDevice(SAFARI_IOS_UA);

      await service.createUserAuthState(deviceA, USER);
      await service.createUserAuthState(deviceB, USER);
      await service.createUserAuthState(deviceC, USER);

      assert.strictEqual(service.isAuthenticated(deviceA), true);
      assert.strictEqual(service.isAuthenticated(deviceB), true);
      assert.strictEqual(service.isAuthenticated(deviceC), true);
    });
  });

  describe("per-device logout isolation", () => {
    it("logging out device A does not affect device B", async () => {
      const deviceA = makeDevice(CHROME_WINDOWS_UA);
      const deviceB = makeDevice(FIREFOX_MAC_UA);

      await service.createUserAuthState(deviceA, USER);
      await service.createUserAuthState(deviceB, USER);

      const destroyMock = mock.fn((cb) => {
        deviceA.session.isAuthenticated = false;
        cb();
      });
      deviceA.session.destroy = destroyMock;
      service.clearAuthState(deviceA, () => {});

      assert.strictEqual(service.isAuthenticated(deviceB), true);
    });

    it("device B retains user data after device A session is destroyed", async () => {
      const deviceA = makeDevice(CHROME_WINDOWS_UA);
      const deviceB = makeDevice(FIREFOX_MAC_UA);

      await service.createUserAuthState(deviceA, USER);
      await service.createUserAuthState(deviceB, USER);

      const savedSessionB = deviceB.session;

      deviceA.session.destroy = mock.fn((cb) => {
        deviceA.session = null;
        cb();
      });
      service.clearAuthState(deviceA, () => {});

      assert.strictEqual(savedSessionB.user.id, "user1");
      assert.strictEqual(savedSessionB.isAuthenticated, true);
    });

    it("logging out all devices clears each session independently", async () => {
      const deviceA = makeDevice(CHROME_WINDOWS_UA);
      const deviceB = makeDevice(FIREFOX_MAC_UA);

      await service.createUserAuthState(deviceA, USER);
      await service.createUserAuthState(deviceB, USER);

      const callbackA = mock.fn();
      const callbackB = mock.fn();

      deviceA.session.destroy = mock.fn((cb) => cb());
      deviceB.session.destroy = mock.fn((cb) => cb());

      service.clearAuthState(deviceA, callbackA);
      service.clearAuthState(deviceB, callbackB);

      assert.strictEqual(callbackA.mock.calls.length, 1);
      assert.strictEqual(callbackB.mock.calls.length, 1);
    });
  });

  describe("cross-device fingerprint validation", () => {
    it("device A request is rejected if its UA changes to a different browser", async () => {
      const deviceA = makeDevice(CHROME_WINDOWS_UA);
      await service.createUserAuthState(deviceA, USER);

      deviceA.get = (h) => (h === "user-agent" ? FIREFOX_MAC_UA : null);

      assert.strictEqual(service.isAuthenticated(deviceA), false);
    });

    it("device B with different browser is valid regardless of device A fingerprint", async () => {
      const deviceA = makeDevice(CHROME_WINDOWS_UA);
      const deviceB = makeDevice(FIREFOX_MAC_UA);

      await service.createUserAuthState(deviceA, USER);
      await service.createUserAuthState(deviceB, USER);

      assert.strictEqual(service.isAuthenticated(deviceA), true);
      assert.strictEqual(service.isAuthenticated(deviceB), true);
    });

    it("fingerprint mismatch on device A does not invalidate device B", async () => {
      const deviceA = makeDevice(CHROME_WINDOWS_UA);
      const deviceB = makeDevice(FIREFOX_MAC_UA);

      await service.createUserAuthState(deviceA, USER);
      await service.createUserAuthState(deviceB, USER);

      // Device A's UA changes mid-session (different browser family)
      deviceA.get = (h) => (h === "user-agent" ? SAFARI_IOS_UA : null);

      assert.strictEqual(service.isAuthenticated(deviceA), false);
      assert.strictEqual(service.isAuthenticated(deviceB), true);
    });
  });

  describe("per-session remember-me", () => {
    it("device A can use remember-me while device B uses default timeout", async () => {
      const deviceA = makeDevice(CHROME_WINDOWS_UA);
      const deviceB = makeDevice(FIREFOX_MAC_UA);

      await service.createUserAuthState(deviceA, { ...USER, rememberMe: true });
      await service.createUserAuthState(deviceB, { ...USER, rememberMe: false });

      assert.strictEqual(
        deviceA.session.cookie.maxAge,
        service.REMEMBER_ME_TIMEOUT,
      );
      assert.strictEqual(
        deviceB.session.cookie.maxAge,
        service.DEFAULT_AUTH_STATE_TIMEOUT,
      );
    });

    it("remember-me on device A does not change device B cookie maxAge", async () => {
      const deviceA = makeDevice(CHROME_WINDOWS_UA);
      const deviceB = makeDevice(FIREFOX_MAC_UA);

      await service.createUserAuthState(deviceA, { ...USER, rememberMe: true });
      await service.createUserAuthState(deviceB, USER);

      assert.strictEqual(
        deviceA.session.cookie.maxAge,
        service.REMEMBER_ME_TIMEOUT,
      );
      assert.strictEqual(
        deviceB.session.cookie.maxAge,
        service.DEFAULT_AUTH_STATE_TIMEOUT,
      );
    });
  });
});
