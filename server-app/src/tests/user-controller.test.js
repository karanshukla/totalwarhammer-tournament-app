import assert from "node:assert";
import { describe, it, beforeEach, mock } from "node:test";

const mockUserFindOne = mock.fn();
const mockUserCreate = mock.fn();
const mockUserFindByIdAndUpdate = mock.fn();
const mockUserFindById = mock.fn();

mock.module("../domain/models/user.js", {
  defaultExport: {
    findOne: mockUserFindOne,
    create: mockUserCreate,
    findByIdAndUpdate: mockUserFindByIdAndUpdate,
    findById: mockUserFindById,
  },
});

mock.module("bcrypt", {
  defaultExport: {
    hash: mock.fn(async (pw) => "hashed_" + pw),
  },
});

const { userExists, register, updateUsername, updatePassword } = await import(
  "../interfaces/http/controllers/user-controller.js"
);

function mockRes() {
  const res = {};
  res.status = mock.fn(() => res);
  res.json = mock.fn(() => res);
  return res;
}

function mockReq(overrides = {}) {
  return {
    body: {},
    query: {},
    params: {},
    user: { id: "u1" },
    ...overrides,
  };
}

describe("user-controller", () => {
  beforeEach(() => {
    mockUserFindOne.mock.resetCalls();
    mockUserCreate.mock.resetCalls();
    mockUserFindByIdAndUpdate.mock.resetCalls();
    mockUserFindById.mock.resetCalls();
  });

  describe("userExists", () => {
    it("should return 400 if identifier missing", async () => {
      const req = mockReq();
      const res = mockRes();
      await userExists(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should return exists: true if user found", async () => {
      mockUserFindOne.mock.mockImplementation(() => ({ username: "test" }));
      const req = mockReq({ query: { identifier: "test" } });
      const res = mockRes();
      await userExists(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(res.json.mock.calls[0].arguments[0].data.exists, true);
    });

    it("should return exists: false if user not found", async () => {
      mockUserFindOne.mock.mockImplementation(() => null);
      const req = mockReq({ query: { identifier: "missing" } });
      const res = mockRes();
      await userExists(req, res);
      assert.strictEqual(res.json.mock.calls[0].arguments[0].data.exists, false);
    });
  });

  describe("register", () => {
    it("should return 400 if email already in use", async () => {
      mockUserFindOne.mock.mockImplementation(() => ({ email: "exists@test.com" }));
      const req = mockReq({
        body: { username: "new", email: "exists@test.com", password: "pw" },
      });
      const res = mockRes();
      await register(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should create user and return 201", async () => {
      mockUserFindOne.mock.mockImplementation(() => null);
      mockUserCreate.mock.mockImplementation(async (data) => ({ ...data, id: "u1" }));
      const req = mockReq({
        body: { username: "new", email: "new@test.com", password: "pw" },
      });
      const res = mockRes();
      await register(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 201);
      assert.strictEqual(mockUserCreate.mock.calls.length, 1);
    });
  });

  describe("updateUsername", () => {
    it("should return 400 if username taken", async () => {
      mockUserFindOne.mock.mockImplementation(() => ({ username: "taken" }));
      const req = mockReq({ body: { username: "taken" } });
      const res = mockRes();
      await updateUsername(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    });

    it("should update and return 200", async () => {
      mockUserFindOne.mock.mockImplementation(() => null);
      mockUserFindByIdAndUpdate.mock.mockImplementation(async (id, data) => ({
        id,
        username: "new",
        email: "e@t.com",
      }));
      const req = mockReq({
        body: { username: "new" },
        session: { user: {}, save: mock.fn((cb) => cb()) },
      });
      const res = mockRes();
      await updateUsername(req, res);
      assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
      assert.strictEqual(res.json.mock.calls[0].arguments[0].data.username, "new");
    });
  });
});
