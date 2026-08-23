import assert from "node:assert";
import { describe, it, beforeEach, mock } from "node:test";

const mockSetServers = mock.fn();
mock.module("node:dns", {
  defaultExport: { setServers: mockSetServers },
});

const mockConnect = mock.fn();
mock.module("mongoose", {
  defaultExport: { connect: mockConnect },
});

mock.module("../infrastructure/config/env.js", {
  namedExports: { mongoUri: "mongodb://localhost:27017/twt-app" },
});

const { connectToDatabase } =
  await import("../infrastructure/db/connection.js");

describe("connection", () => {
  beforeEach(() => {
    mockConnect.mock.resetCalls();
  });

  it("forces public DNS resolvers on module load", () => {
    assert.deepStrictEqual(mockSetServers.mock.calls[0].arguments[0], [
      "8.8.8.8",
      "8.8.4.4",
      "1.1.1.1",
    ]);
  });

  it("connects to mongoose using the configured URI", async () => {
    mockConnect.mock.mockImplementationOnce(async () => {});

    await connectToDatabase();

    assert.strictEqual(mockConnect.mock.calls.length, 1);
    assert.deepStrictEqual(mockConnect.mock.calls[0].arguments, [
      "mongodb://localhost:27017/twt-app",
      { dbName: "twt-app", maxPoolSize: 10 },
    ]);
  });

  it("exits the process when mongoose.connect rejects", async () => {
    mockConnect.mock.mockImplementationOnce(async () => {
      throw new Error("connect failed");
    });
    const originalExit = process.exit;
    const exitCalls = [];
    process.exit = (code) => exitCalls.push(code);

    try {
      await connectToDatabase();
    } finally {
      process.exit = originalExit;
    }

    assert.deepStrictEqual(exitCalls, [1]);
  });
});
