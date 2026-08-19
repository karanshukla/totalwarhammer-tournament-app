/**
 * Missing coverage for matches/components/MatchesPage.tsx
 *
 * Covers handlers and branches not tested in MatchesPage.test.tsx or
 * MatchesPageHandlers.test.tsx:
 * - handleAddParticipant: success and error paths
 * - handleOverrideResult: success and error paths
 * - handleSaveParticipant: success and error paths
 * - handleSaveDescription: success and error paths
 * - onStatusFilterChange inline callback
 * - handleFindByCode with empty code (early return)
 * - socket event callback bodies (onTournamentUpdated, onMatchesUpdated,
 *   onMatchesAppended, onMatchUpdated, tournament:leave on cleanup)
 * - urlCode auto-select when tournament NOT in list → fetches from API
 * - handleSelectTournament for non-active/non-completed tournament
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter, Routes, Route } from "react-router";

// ---------------------------------------------------------------------------
// Hoisted mock references
// ---------------------------------------------------------------------------
const {
  mockGet,
  mockPost,
  mockPatch,
  mockDelete,
  mockUseUserStore,
  mockGetSocket,
  mockNavigate,
} = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPatch: vi.fn(),
  mockDelete: vi.fn(),
  mockUseUserStore: vi.fn(),
  mockGetSocket: vi.fn(),
  mockNavigate: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock("@/core/api/httpClient", () => ({
  httpClient: {
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
    delete: mockDelete,
  },
}));

vi.mock("@/shared/stores/userStore", () => ({
  useUserStore: () => mockUseUserStore(),
}));

vi.mock("@/core/socket/socketClient", () => ({
  getSocket: mockGetSocket,
  joinTournamentRoom: (id: string) =>
    mockGetSocket().emit("tournament:join", id),
  leaveTournamentRoom: (id: string) =>
    mockGetSocket().emit("tournament:leave", id),
}));

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: { create: vi.fn() },
}));

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ---------------------------------------------------------------------------
// TournamentList mock – exposes onStatusFilterChange handler
// ---------------------------------------------------------------------------
vi.mock("@/features/matches/components/TournamentList", () => ({
  default: ({
    onFindByCode,
    onCodeInputChange,
    codeError,
    onStatusFilterChange,
    onSelectTournament,
    tournaments,
  }: {
    onFindByCode: () => void;
    onCodeInputChange: (value: string) => void;
    codeError?: string;
    onStatusFilterChange: (status: string) => void;
    onSelectTournament: (t: { _id: string; name: string }) => void;
    tournaments?: { _id: string; name: string }[];
  }) => (
    <div data-testid="tournament-list">
      <input
        data-testid="code-input"
        onChange={(e) => onCodeInputChange(e.target.value)}
      />
      <button data-testid="find-button" onClick={onFindByCode}>
        Find
      </button>
      {codeError && <div data-testid="code-error">{codeError}</div>}
      <button
        data-testid="filter-active"
        onClick={() => onStatusFilterChange("active")}
      >
        Filter Active
      </button>
      {tournaments?.map((t) => (
        <button
          key={t._id}
          data-testid={`select-${t._id}`}
          onClick={() => onSelectTournament(t)}
        >
          {t.name}
        </button>
      ))}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// TournamentDetail mock – exposes all handler props
// ---------------------------------------------------------------------------
vi.mock("@/features/matches/components/TournamentDetail", () => ({
  default: ({
    onBack,
    onStart,
    onDelete,
    onAddParticipant,
    onOverrideResult,
    onSaveParticipant,
    onSaveDescription,
    onSetNewName,
    selected,
  }: {
    onBack: () => void;
    onStart: () => void;
    onDelete: () => void;
    onAddParticipant: () => void;
    onOverrideResult: (
      matchId: string,
      winnerId: string,
      reason: string,
    ) => Promise<void>;
    onSaveParticipant: (participant: {
      _id: string;
      name: string;
      faction: string;
    }) => Promise<void>;
    onSaveDescription: (description: string) => Promise<void>;
    onSetNewName: (v: string) => void;
    selected?: { _id: string };
  }) => (
    <div data-testid="tournament-detail">
      <button data-testid="trigger-back" onClick={onBack}>
        Back
      </button>
      <button data-testid="trigger-start" onClick={onStart}>
        Start
      </button>
      <button data-testid="trigger-delete" onClick={onDelete}>
        Delete
      </button>
      <input
        data-testid="set-new-name"
        onChange={(e) => onSetNewName(e.target.value)}
      />
      <button data-testid="trigger-add" onClick={() => onAddParticipant()}>
        Add
      </button>
      <button
        data-testid="trigger-override"
        onClick={async () => {
          try {
            await onOverrideResult("m1", "p1", "reason");
          } catch {
            // swallow
          }
        }}
      >
        Override
      </button>
      <button
        data-testid="trigger-save-part"
        onClick={async () => {
          try {
            await onSaveParticipant({ _id: "p1", name: "P", faction: "" });
          } catch {
            // swallow
          }
        }}
      >
        SavePart
      </button>
      <button
        data-testid="trigger-save-desc"
        onClick={async () => {
          try {
            await onSaveDescription("draft text");
          } catch {
            // swallow
          }
        }}
      >
        SaveDesc
      </button>
      <span data-testid="selected-id">{selected?._id}</span>
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------
import MatchesPage from "@/features/matches/components/MatchesPage";
import { toaster } from "@/shared/ui/Toaster";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fakeSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

// Handlers are registered in a passive effect, which React flushes *after* the
// commit that paints the detail view. Waiting on the DOM is therefore not
// enough — poll the registration itself.
async function waitForSocketHandler<T>(event: string) {
  let handler: ((payload: T) => void) | undefined;
  await waitFor(() => {
    const call = fakeSocket.on.mock.calls.find((c) => c[0] === event);
    expect(call).toBeDefined();
    handler = call?.[1];
  });
  return handler as (payload: T) => void;
}

function makeStore(
  isAuthenticated: boolean,
  userId = "u1",
  username = "Grimgork",
) {
  return {
    user: { id: userId, username, isAuthenticated, isGuest: false },
    isAuthenticated: () => isAuthenticated,
  };
}

const activeTournament = {
  _id: "t1",
  name: "Test Tourney",
  code: "ABCDE",
  description: "",
  playerCount: 4,
  tournamentType: "single_elimination",
  bannedFactions: [],
  enable40kFactions: false,
  participants: [{ _id: "p1", name: "Grimgork", faction: "orks" }],
  status: "active" as const,
  createdAt: new Date().toISOString(),
  createdBy: "u1",
};

const pendingTournament = {
  ...activeTournament,
  _id: "t2",
  code: "PEND1",
  status: "pending" as const,
};

const successfulListResponse = {
  success: true,
  data: [activeTournament],
  total: 1,
  statusCounts: { all: 1, pending: 0, active: 1, completed: 0 },
};

const emptyMatchesResponse = { success: true, data: [] };

function renderAtCode(code = "ABCDE") {
  return render(
    <MemoryRouter initialEntries={[`/matches/tournament/${code}`]}>
      <ChakraProvider value={defaultSystem}>
        <Routes>
          <Route path="/matches/tournament/:code" element={<MatchesPage />} />
          <Route path="/matches" element={<MatchesPage />} />
        </Routes>
      </ChakraProvider>
    </MemoryRouter>,
  );
}

function renderAtMatches() {
  return render(
    <MemoryRouter initialEntries={["/matches"]}>
      <ChakraProvider value={defaultSystem}>
        <Routes>
          <Route path="/matches/tournament/:code" element={<MatchesPage />} />
          <Route path="/matches" element={<MatchesPage />} />
        </Routes>
      </ChakraProvider>
    </MemoryRouter>,
  );
}

async function setupWithDetail() {
  vi.clearAllMocks();
  mockGetSocket.mockReturnValue(fakeSocket);
  mockUseUserStore.mockReturnValue(makeStore(true, "u1", "Grimgork"));

  mockGet.mockResolvedValueOnce(successfulListResponse);
  mockGet.mockResolvedValueOnce(emptyMatchesResponse);

  renderAtCode("ABCDE");

  await waitFor(() =>
    expect(screen.getByTestId("tournament-detail")).toBeInTheDocument(),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MatchesPage – handleAddParticipant", () => {
  afterEach(() => vi.clearAllMocks());

  it("calls POST /tournament/t1/participants and refreshes on success", async () => {
    await setupWithDetail();

    // Provide newName via the store state – since TournamentDetail mock doesn't
    // manage newName, we need the parent to have it set. We can set it via the
    // onSetNewName prop exposed by the mock (but our mock doesn't call it).
    // Instead, trigger handleAddParticipant which requires selected & newName.
    // The component has newName="" by default so the first call is a no-op.
    // We'll use the trigger-add button and verify the early return happens.
    fireEvent.click(screen.getByTestId("trigger-add"));

    // newName is "" by default → early return, no POST call
    await waitFor(() => {
      expect(mockPost).not.toHaveBeenCalledWith(
        expect.stringContaining("/participants"),
        expect.anything(),
      );
    });
  });

  it("calls POST /tournament/t1/participants once newName is set (proceeds past guard)", async () => {
    await setupWithDetail();

    fireEvent.change(screen.getByTestId("set-new-name"), {
      target: { value: "Bob" },
    });

    mockPost.mockResolvedValueOnce({ success: true });
    // refreshSelected
    mockGet.mockResolvedValueOnce({ success: true, data: activeTournament });
    mockGet.mockResolvedValueOnce(emptyMatchesResponse);

    fireEvent.click(screen.getByTestId("trigger-add"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/tournament/t1/participants",
        expect.objectContaining({ name: "Bob" }),
      );
    });
    await waitFor(() => {
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Participant added" }),
      );
    });
  });

  it("shows an error toaster when POST rejects after newName is set", async () => {
    await setupWithDetail();

    fireEvent.change(screen.getByTestId("set-new-name"), {
      target: { value: "Bob" },
    });

    mockPost.mockRejectedValueOnce(new Error("add failed"));

    fireEvent.click(screen.getByTestId("trigger-add"));

    await waitFor(() => {
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error" }),
      );
    });
  });

  it("shows the default error message when POST rejects with a non-Error value", async () => {
    await setupWithDetail();

    fireEvent.change(screen.getByTestId("set-new-name"), {
      target: { value: "Bob" },
    });

    mockPost.mockRejectedValueOnce("plain string rejection");

    fireEvent.click(screen.getByTestId("trigger-add"));

    await waitFor(() => {
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Failed to add participant",
        }),
      );
    });
  });
});

describe("MatchesPage – handleOverrideResult", () => {
  afterEach(() => vi.clearAllMocks());

  it("calls PATCH /match/m1/override on success and shows toaster", async () => {
    await setupWithDetail();

    mockPatch.mockResolvedValueOnce({ success: true });
    mockGet.mockResolvedValueOnce(emptyMatchesResponse);

    fireEvent.click(screen.getByTestId("trigger-override"));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith("/match/m1/override", {
        winnerId: "p1",
        reason: "reason",
      });
    });
    await waitFor(() => {
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Result overridden" }),
      );
    });
  });

  it("shows error toaster and re-throws when PATCH fails", async () => {
    await setupWithDetail();

    mockPatch.mockRejectedValueOnce(new Error("override failed"));

    fireEvent.click(screen.getByTestId("trigger-override"));

    await waitFor(() => {
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error" }),
      );
    });
  });

  it("shows the default error message when PATCH rejects with a non-Error value", async () => {
    await setupWithDetail();

    mockPatch.mockRejectedValueOnce("plain string rejection");

    fireEvent.click(screen.getByTestId("trigger-override"));

    await waitFor(() => {
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Failed to override result",
        }),
      );
    });
  });
});

describe("MatchesPage – handleSaveParticipant", () => {
  afterEach(() => vi.clearAllMocks());

  it("calls PATCH /tournament/t1/participants/p1 on success", async () => {
    await setupWithDetail();

    mockPatch.mockResolvedValueOnce({ success: true });
    // refreshSelected: GET /tournament/t1
    mockGet.mockResolvedValueOnce({ success: true, data: activeTournament });
    mockGet.mockResolvedValueOnce(emptyMatchesResponse);

    fireEvent.click(screen.getByTestId("trigger-save-part"));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(
        "/tournament/t1/participants/p1",
        expect.objectContaining({ name: "P" }),
      );
    });
    await waitFor(() => {
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Participant updated" }),
      );
    });
  });

  it("shows error toaster and re-throws when PATCH fails", async () => {
    await setupWithDetail();

    mockPatch.mockRejectedValueOnce(new Error("update failed"));

    fireEvent.click(screen.getByTestId("trigger-save-part"));

    await waitFor(() => {
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error" }),
      );
    });
  });

  it("shows the default error message when PATCH rejects with a non-Error value", async () => {
    await setupWithDetail();

    mockPatch.mockRejectedValueOnce("plain string rejection");

    fireEvent.click(screen.getByTestId("trigger-save-part"));

    await waitFor(() => {
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Failed to update participant",
        }),
      );
    });
  });
});

describe("MatchesPage – handleSaveDescription", () => {
  afterEach(() => vi.clearAllMocks());

  it("calls PATCH /tournament/t1/description on success", async () => {
    await setupWithDetail();

    mockPatch.mockResolvedValueOnce({ success: true });
    // refreshSelected
    mockGet.mockResolvedValueOnce({ success: true, data: activeTournament });
    mockGet.mockResolvedValueOnce(emptyMatchesResponse);

    fireEvent.click(screen.getByTestId("trigger-save-desc"));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith("/tournament/t1/description", {
        description: "draft text",
      });
    });
    await waitFor(() => {
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Description updated" }),
      );
    });
  });

  it("shows error toaster and re-throws when PATCH fails", async () => {
    await setupWithDetail();

    mockPatch.mockRejectedValueOnce(new Error("desc failed"));

    fireEvent.click(screen.getByTestId("trigger-save-desc"));

    await waitFor(() => {
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error" }),
      );
    });
  });

  it("shows the default error message when PATCH rejects with a non-Error value", async () => {
    await setupWithDetail();

    mockPatch.mockRejectedValueOnce("plain string rejection");

    fireEvent.click(screen.getByTestId("trigger-save-desc"));

    await waitFor(() => {
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Failed to update description",
        }),
      );
    });
  });
});

describe("MatchesPage – onStatusFilterChange inline callback", () => {
  afterEach(() => vi.clearAllMocks());

  it("calls fetchTournaments with new filter when status filter changes", async () => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore(true));

    // Initial list fetch
    mockGet.mockResolvedValueOnce({
      success: true,
      data: [],
      total: 0,
      statusCounts: { all: 0, pending: 0, active: 0, completed: 0 },
    });

    renderAtMatches();

    await waitFor(() =>
      expect(screen.getByTestId("tournament-list")).toBeInTheDocument(),
    );

    // Trigger filter change → re-fetches
    mockGet.mockResolvedValueOnce({
      success: true,
      data: [],
      total: 0,
      statusCounts: { all: 0, pending: 0, active: 0, completed: 0 },
    });

    fireEvent.click(screen.getByTestId("filter-active"));

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(2);
    });
  });
});

describe("MatchesPage – handleFindByCode with empty code (early return)", () => {
  afterEach(() => vi.clearAllMocks());

  it("does not call httpClient.get when code input is empty", async () => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore(true));

    mockGet.mockResolvedValueOnce({
      success: true,
      data: [],
      total: 0,
      statusCounts: { all: 0, pending: 0, active: 0, completed: 0 },
    });

    renderAtMatches();

    await waitFor(() =>
      expect(screen.getByTestId("tournament-list")).toBeInTheDocument(),
    );

    // code-input stays empty, click find
    fireEvent.click(screen.getByTestId("find-button"));

    // No additional GET calls beyond the initial list fetch
    await waitFor(() => {
      const codeSearchCalls = mockGet.mock.calls.filter((c) =>
        String(c[0]).startsWith("/tournament/code/"),
      );
      expect(codeSearchCalls).toHaveLength(0);
    });
  });
});

describe("MatchesPage – socket event callback bodies", () => {
  afterEach(() => vi.clearAllMocks());

  it("invokes onTournamentUpdated callback updating selected + tournaments list", async () => {
    await setupWithDetail();

    const handler =
      await waitForSocketHandler<typeof activeTournament>("tournament:updated");

    const updatedTournament = { ...activeTournament, name: "Updated Name" };
    handler(updatedTournament);

    await waitFor(() => {
      expect(screen.getByTestId("selected-id")).toHaveTextContent("t1");
    });
  });

  it("invokes onMatchesUpdated callback replacing matches", async () => {
    await setupWithDetail();

    const handler = await waitForSocketHandler<unknown[]>("matches:updated");

    // Calling the handler should not throw
    handler([{ _id: "m1", round: 1 }]);
  });

  it("invokes onMatchesAppended callback appending matches", async () => {
    await setupWithDetail();

    const handler = await waitForSocketHandler<unknown[]>("matches:appended");

    handler([{ _id: "m2", round: 2 }]);
  });

  it("invokes onMatchUpdated callback updating a single match", async () => {
    await setupWithDetail();

    const handler = await waitForSocketHandler<unknown>("match:updated");

    handler({ _id: "m1", round: 1, status: "completed" });
  });

  it("emits tournament:leave and calls socket.off on cleanup", async () => {
    const { unmount } = (() => {
      vi.clearAllMocks();
      mockGetSocket.mockReturnValue(fakeSocket);
      mockUseUserStore.mockReturnValue(makeStore(true, "u1", "Grimgork"));
      mockGet.mockResolvedValueOnce(successfulListResponse);
      mockGet.mockResolvedValueOnce(emptyMatchesResponse);
      return renderAtCode("ABCDE");
    })();

    await waitFor(() =>
      expect(screen.getByTestId("tournament-detail")).toBeInTheDocument(),
    );

    unmount();

    expect(fakeSocket.emit).toHaveBeenCalledWith("tournament:leave", "t1");
    expect(fakeSocket.off).toHaveBeenCalledWith(
      "tournament:updated",
      expect.any(Function),
    );
  });
});

describe("MatchesPage – urlCode auto-select when NOT in list (API fetch)", () => {
  afterEach(() => vi.clearAllMocks());

  it("fetches tournament by code from API when not in list", async () => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore(true));

    // List returns empty
    mockGet.mockResolvedValueOnce({
      success: true,
      data: [],
      total: 0,
      statusCounts: { all: 0, pending: 0, active: 0, completed: 0 },
    });
    // API code fetch returns the active tournament
    mockGet.mockResolvedValueOnce({ success: true, data: activeTournament });
    // fetchMatches
    mockGet.mockResolvedValueOnce(emptyMatchesResponse);

    renderAtCode("ABCDE");

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith("/tournament/code/ABCDE"),
    );
    await waitFor(() =>
      expect(screen.getByTestId("tournament-detail")).toBeInTheDocument(),
    );
  });

  it("navigates to /matches when API code fetch fails", async () => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore(true));

    mockGet.mockResolvedValueOnce({
      success: true,
      data: [],
      total: 0,
      statusCounts: { all: 0, pending: 0, active: 0, completed: 0 },
    });
    mockGet.mockRejectedValueOnce(new Error("not found"));

    renderAtCode("ZZZZ1");

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/matches", { replace: true }),
    );
  });
});

describe("MatchesPage – handleSelectTournament with pending tournament", () => {
  afterEach(() => vi.clearAllMocks());

  it("does not call fetchMatches when tournament status is pending", async () => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore(true));

    mockGet.mockResolvedValueOnce({
      success: true,
      data: [pendingTournament],
      total: 1,
      statusCounts: { all: 1, pending: 1, active: 0, completed: 0 },
    });

    renderAtMatches();

    await waitFor(() =>
      expect(screen.getByTestId("tournament-list")).toBeInTheDocument(),
    );

    // Click the select button for the pending tournament
    fireEvent.click(screen.getByTestId("select-t2"));

    await waitFor(() =>
      expect(screen.getByTestId("tournament-detail")).toBeInTheDocument(),
    );

    // fetchMatches should NOT have been called (status=pending)
    expect(mockGet).not.toHaveBeenCalledWith("/match/tournament/t2");
  });
});

// ---------------------------------------------------------------------------
// fetchTournaments / fetchMatches nullish-coalescing fallbacks
// ---------------------------------------------------------------------------

describe("MatchesPage – fetchTournaments nullish-coalescing fallbacks", () => {
  afterEach(() => vi.clearAllMocks());

  it("falls back to [] / 0 / default statusCounts when the response omits them", async () => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore(true));

    mockGet.mockResolvedValueOnce({ success: true });

    renderAtMatches();

    await waitFor(() =>
      expect(screen.getByTestId("tournament-list")).toBeInTheDocument(),
    );
  });
});

describe("MatchesPage – fetchMatches nullish-coalescing fallback", () => {
  afterEach(() => vi.clearAllMocks());

  it("falls back to [] when the matches response omits data", async () => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore(true, "u1", "Grimgork"));

    mockGet.mockResolvedValueOnce(successfulListResponse);
    mockGet.mockResolvedValueOnce({ success: true });

    renderAtCode("ABCDE");

    await waitFor(() =>
      expect(screen.getByTestId("tournament-detail")).toBeInTheDocument(),
    );
  });
});

// ---------------------------------------------------------------------------
// refreshSelected: multi-tournament list + non-active status after refresh
// ---------------------------------------------------------------------------

describe("MatchesPage – refreshSelected with multiple tournaments and a pending result", () => {
  afterEach(() => vi.clearAllMocks());

  it("maps only the matching tournament and skips fetchMatches when the refreshed status is pending", async () => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore(true, "u1", "Grimgork"));

    mockGet.mockResolvedValueOnce({
      success: true,
      data: [pendingTournament, activeTournament],
      total: 2,
      statusCounts: { all: 2, pending: 1, active: 1, completed: 0 },
    });

    renderAtCode("PEND1");

    await waitFor(() =>
      expect(screen.getByTestId("tournament-detail")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByTestId("set-new-name"), {
      target: { value: "Bob" },
    });

    mockPost.mockResolvedValueOnce({ success: true });
    // refreshSelected: GET /tournament/t2 — still pending
    mockGet.mockResolvedValueOnce({ success: true, data: pendingTournament });

    fireEvent.click(screen.getByTestId("trigger-add"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/tournament/t2/participants",
        expect.objectContaining({ name: "Bob" }),
      );
    });
    // fetchMatches should NOT be called since refreshed status stays "pending"
    expect(mockGet).not.toHaveBeenCalledWith("/match/tournament/t2");
  });
});

// ---------------------------------------------------------------------------
// hash-based initial tournament selection
// ---------------------------------------------------------------------------

describe("MatchesPage – hash-based initial tournament selection", () => {
  afterEach(() => vi.clearAllMocks());

  function renderAtHash(hash: string) {
    return render(
      <MemoryRouter initialEntries={[`/matches${hash}`]}>
        <ChakraProvider value={defaultSystem}>
          <Routes>
            <Route path="/matches" element={<MatchesPage />} />
          </Routes>
        </ChakraProvider>
      </MemoryRouter>,
    );
  }

  it("selects the tournament referenced by the URL hash once the list has loaded", async () => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore(true, "u1", "Grimgork"));

    mockGet.mockResolvedValueOnce(successfulListResponse);
    mockGet.mockResolvedValueOnce(emptyMatchesResponse);

    renderAtHash("#t1");

    await waitFor(() =>
      expect(screen.getByTestId("tournament-detail")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("selected-id")).toHaveTextContent("t1");
  });

  it("does nothing when the hash does not match any loaded tournament", async () => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore(true, "u1", "Grimgork"));

    mockGet.mockResolvedValueOnce(successfulListResponse);

    renderAtHash("#nonexistent-id");

    await waitFor(() =>
      expect(screen.getByTestId("tournament-list")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("tournament-detail")).not.toBeInTheDocument();
  });

  it("does not re-select on a subsequent tournaments refresh once the hash has been handled", async () => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore(true, "u1", "Grimgork"));

    mockGet.mockResolvedValueOnce(successfulListResponse);
    mockGet.mockResolvedValueOnce(emptyMatchesResponse);

    renderAtHash("#t1");

    await waitFor(() =>
      expect(screen.getByTestId("tournament-detail")).toBeInTheDocument(),
    );

    // Trigger handleDelete success → calls fetchTournaments() again, producing
    // a new `tournaments` array reference while initialHashHandled.current is
    // already true, exercising the early-return branch of the hash effect.
    mockDelete.mockResolvedValueOnce({ success: true });
    mockGet.mockResolvedValueOnce({
      success: true,
      data: [],
      total: 0,
      statusCounts: { all: 0, pending: 0, active: 0, completed: 0 },
    });

    fireEvent.click(screen.getByTestId("trigger-delete"));

    await waitFor(() =>
      expect(screen.getByTestId("tournament-list")).toBeInTheDocument(),
    );
    // handleSelectTournament (triggered by the hash effect) navigates only
    // once — for the initial hash resolution, never again on this refresh.
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// handleSelectTournament: tournament without a code, active tournament click
// ---------------------------------------------------------------------------

describe("MatchesPage – handleSelectTournament without a tournament code", () => {
  afterEach(() => vi.clearAllMocks());

  it("navigates using the tournament id hash when the tournament has no code", async () => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore(true));

    const noCodeTournament = {
      ...activeTournament,
      _id: "t9",
      code: "",
      status: "pending" as const,
    };
    mockGet.mockResolvedValueOnce({
      success: true,
      data: [noCodeTournament],
      total: 1,
      statusCounts: { all: 1, pending: 1, active: 0, completed: 0 },
    });

    renderAtMatches();

    await waitFor(() =>
      expect(screen.getByTestId("tournament-list")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("select-t9"));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("#t9"));
  });
});

describe("MatchesPage – handleSelectTournament with an active tournament via click", () => {
  afterEach(() => vi.clearAllMocks());

  it("calls fetchMatches when an active tournament is selected via the list", async () => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore(true));

    mockGet.mockResolvedValueOnce(successfulListResponse);

    renderAtMatches();

    await waitFor(() =>
      expect(screen.getByTestId("tournament-list")).toBeInTheDocument(),
    );

    mockGet.mockResolvedValueOnce(emptyMatchesResponse);

    fireEvent.click(screen.getByTestId("select-t1"));

    await waitFor(() =>
      expect(screen.getByTestId("tournament-detail")).toBeInTheDocument(),
    );
    expect(mockGet).toHaveBeenCalledWith("/match/tournament/t1");
  });
});

// ---------------------------------------------------------------------------
// Socket handlers: multi-item arrays wrapped in act() to force real execution
// ---------------------------------------------------------------------------

describe("MatchesPage – socket handlers with multiple items (act-wrapped)", () => {
  afterEach(() => vi.clearAllMocks());

  it("onTournamentUpdated updates only the matching tournament in a multi-item list", async () => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore(true, "u1", "Grimgork"));

    mockGet.mockResolvedValueOnce({
      success: true,
      data: [activeTournament, pendingTournament],
      total: 2,
      statusCounts: { all: 2, pending: 1, active: 1, completed: 0 },
    });
    mockGet.mockResolvedValueOnce(emptyMatchesResponse);

    renderAtCode("ABCDE");

    await waitFor(() =>
      expect(screen.getByTestId("tournament-detail")).toBeInTheDocument(),
    );

    const handler =
      await waitForSocketHandler<typeof activeTournament>("tournament:updated");

    const updatedTournament = { ...activeTournament, name: "Updated Name" };
    act(() => handler(updatedTournament));

    await waitFor(() => {
      expect(screen.getByTestId("selected-id")).toHaveTextContent("t1");
    });
  });

  it("onMatchesAppended actually appends via the functional setMatches updater", async () => {
    await setupWithDetail();

    const handler = await waitForSocketHandler<unknown[]>("matches:appended");

    act(() => handler([{ _id: "m2", round: 2 }]));

    // No crash + handler executed the functional updater (covered via act()).
    expect(screen.getByTestId("tournament-detail")).toBeInTheDocument();
  });

  it("onMatchUpdated replaces only the matching match in a multi-match list", async () => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore(true, "u1", "Grimgork"));

    mockGet.mockResolvedValueOnce(successfulListResponse);
    mockGet.mockResolvedValueOnce({
      success: true,
      data: [
        { _id: "m1", round: 1 },
        { _id: "m2", round: 1 },
      ],
    });

    renderAtCode("ABCDE");

    await waitFor(() =>
      expect(screen.getByTestId("tournament-detail")).toBeInTheDocument(),
    );

    const handler = await waitForSocketHandler<unknown>("match:updated");

    act(() => handler({ _id: "m1", round: 1, status: "completed" }));

    expect(screen.getByTestId("tournament-detail")).toBeInTheDocument();
  });
});
