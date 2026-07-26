import assert from "node:assert";
import { describe, it, mock } from "node:test";

mock.module("node:dns", {
  defaultExport: { setServers: mock.fn() },
});

const mockConnect = mock.fn();
mock.module("mongoose", {
  defaultExport: { connect: mockConnect },
});

mock.module("../infrastructure/config/env.js", {
  namedExports: { mongoUri: undefined },
});

const { connectToDatabase } =
  await import("../infrastructure/db/connection.js");

describe("connection – no mongoUri configured", () => {
  it("falls back to process.env.MONGO_URI when the config has no URI", async () => {
    process.env.MONGO_URI = "mongodb://fallback/twt-app";
    mockConnect.mock.mockImplementationOnce(async () => {});

    await connectToDatabase();

    assert.deepStrictEqual(
      mockConnect.mock.calls[0].arguments[0],
      "mongodb://fallback/twt-app",
    );
    delete process.env.MONGO_URI;
  });

  it("exits the process when neither config nor MONGO_URI is set", async () => {
    delete process.env.MONGO_URI;
    const callsBefore = mockConnect.mock.calls.length;
    const originalExit = process.exit;
    const exitCalls = [];
    process.exit = (code) => exitCalls.push(code);

    try {
      await connectToDatabase();
    } finally {
      process.exit = originalExit;
    }

    assert.strictEqual(mockConnect.mock.calls.length, callsBefore);
    assert.deepStrictEqual(exitCalls, [1]);
  });
});
