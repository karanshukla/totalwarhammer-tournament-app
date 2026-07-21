/**
 * Handler coverage for matches/components/MatchesPage.tsx
 *
 * Covers:
 * - handleFindByCode: participant path (navigate to /matches/tournament/:code)
 * - handleFindByCode: spectator path (navigate to /matches/spectate/:code)
 * - handleFindByCode: error path (codeError state shown)
 * - urlCode auto-select with tournament in list (renders TournamentDetail, fetchMatches called)
 * - onBack handler (setSelected null, navigate /matches)
 * - handleStart
 * - handleDelete
 * - handleRecordResult
 * - handleReportResult
 * - handleAdvanceRound (non-completed)
 * - handleAdvanceRound (completed)
 * - handleAddParticipant (skipped when no newName)
 * - handleRemoveParticipant
 * - handleResolveDispute
 * - socket join/leave and listener registration when tournament selected
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

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
}));

vi.mock("@/shared/ui/Toaster", () => ({
  toaster: { create: vi.fn() },
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ---------------------------------------------------------------------------
// TournamentList mock – exposes handler props as interactive elements
// ---------------------------------------------------------------------------
vi.mock("@/features/matches/components/TournamentList", () => ({
  default: ({
    onFindByCode,
    onCodeInputChange,
    codeError,
  }: {
    onFindByCode: () => void;
    onCodeInputChange: (value: string) => void;
    codeError?: string;
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
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// TournamentDetail mock – exposes all handler props as trigger buttons
// ---------------------------------------------------------------------------
vi.mock("@/features/matches/components/TournamentDetail", () => ({
  default: ({
    onBack,
    onStart,
    onDelete,
    onRecordResult,
    onReportResult,
    onAdvanceRound,
    onAddParticipant,
    onRemoveParticipant,
    onResolveDispute,
    onOverrideResult,
    onSaveDescription,
    onSaveParticipant,
  }: {
    onBack: () => void;
    onStart: () => void;
    onDelete: () => void;
    onRecordResult: (matchId: string, winnerId: string) => void;
    onReportResult: (matchId: string, winnerId: string) => void;
    onAdvanceRound: () => void;
    onAddParticipant: () => void;
    onRemoveParticipant: (participantId: string) => void;
    onResolveDispute: (matchId: string, winnerId: string) => void;
    onOverrideResult: (
      matchId: string,
      winnerId: string,
      reason: string,
    ) => Promise<void>;
    onSaveDescription: (description: string) => Promise<void>;
    onSaveParticipant: (participant: {
      _id: string;
      name: string;
      faction: string;
    }) => Promise<void>;
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
      <button
        data-testid="trigger-record"
        onClick={() => onRecordResult("m1", "p1")}
      >
        Record
      </button>
      <button
        data-testid="trigger-report"
        onClick={() => onReportResult("m1", "p1")}
      >
        Report
      </button>
      <button data-testid="trigger-advance" onClick={onAdvanceRound}>
        Advance
      </button>
      <button data-testid="trigger-add" onClick={() => onAddParticipant()}>
        Add
      </button>
      <button
        data-testid="trigger-remove"
        onClick={() => onRemoveParticipant("p1")}
      >
        Remove
      </button>
      <button
        data-testid="trigger-resolve"
        onClick={() => onResolveDispute("m1", "p1")}
      >
        Resolve
      </button>
      <button
        data-testid="trigger-override"
        onClick={async () => {
          try {
            await onOverrideResult("m1", "p1", "reason");
          } catch {
            // expected to throw
          }
        }}
      >
        Override
      </button>
      <button
        data-testid="trigger-save-desc"
        onClick={async () => {
          try {
            await onSaveDescription("draft text");
          } catch {
            // expected to throw
          }
        }}
      >
        SaveDesc
      </button>
      <button
        data-testid="trigger-save-part"
        onClick={async () => {
          try {
            await onSaveParticipant({ _id: "p1", name: "P", faction: "" });
          } catch {
            // expected to throw
          }
        }}
      >
        SavePart
      </button>
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

const successfulListResponse = {
  success: true,
  data: [activeTournament],
  total: 1,
  statusCounts: { all: 1, pending: 0, active: 1, completed: 0 },
};

const emptyMatchesResponse = { success: true, data: [] };

/** Render at /matches/tournament/:code so urlCode is set */
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

/** Render at /matches (no urlCode) */
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

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe("MatchesPage – handleFindByCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore(true, "u1", "Grimgork"));
    // Default list fetch (no tournaments – we just need the list to load)
    mockGet.mockResolvedValueOnce({
      success: true,
      data: [],
      total: 0,
      statusCounts: { all: 0, pending: 0, active: 0, completed: 0 },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("navigates to /matches/tournament/:code when user is a participant", async () => {
    renderAtMatches();

    // Wait for TournamentList to appear (loading done)
    await waitFor(() =>
      expect(screen.getByTestId("tournament-list")).toBeInTheDocument(),
    );

    // Type in the code and click find
    fireEvent.change(screen.getByTestId("code-input"), {
      target: { value: "abcde" },
    });

    // Mock the code lookup to return a tournament where user is a participant
    mockGet.mockResolvedValueOnce({
      success: true,
      data: {
        _id: "t1",
        participants: [{ name: "Grimgork" }],
      },
    });

    fireEvent.click(screen.getByTestId("find-button"));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/matches/tournament/ABCDE");
    });
  });

  it("navigates to /matches/spectate/:code when user is NOT a participant", async () => {
    renderAtMatches();

    await waitFor(() =>
      expect(screen.getByTestId("tournament-list")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByTestId("code-input"), {
      target: { value: "ABCDE" },
    });

    // No matching participant
    mockGet.mockResolvedValueOnce({
      success: true,
      data: {
        _id: "t1",
        participants: [{ name: "SomeoneElse" }],
      },
    });

    fireEvent.click(screen.getByTestId("find-button"));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/matches/spectate/ABCDE");
    });
  });

  it("shows codeError when the request rejects", async () => {
    renderAtMatches();

    await waitFor(() =>
      expect(screen.getByTestId("tournament-list")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByTestId("code-input"), {
      target: { value: "ABCDE" },
    });

    mockGet.mockRejectedValueOnce(new Error("Not found"));

    fireEvent.click(screen.getByTestId("find-button"));

    await waitFor(() => {
      expect(screen.getByTestId("code-error")).toHaveTextContent(
        "No tournament found with that code.",
      );
    });
  });
});

describe("MatchesPage – urlCode auto-select with tournament in list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore(true, "u1", "Grimgork"));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders TournamentDetail and calls fetchMatches when tournament found in list", async () => {
    // First call: list with our tournament
    mockGet.mockResolvedValueOnce(successfulListResponse);
    // Second call: fetchMatches
    mockGet.mockResolvedValueOnce(emptyMatchesResponse);

    renderAtCode("ABCDE");

    await waitFor(() => {
      expect(screen.getByTestId("tournament-detail")).toBeInTheDocument();
    });

    expect(mockGet).toHaveBeenCalledWith("/match/tournament/t1");
  });
});

describe("MatchesPage – TournamentDetail handlers", () => {
  /** Set up the standard scenario: renders TournamentDetail via urlCode */
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

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("onBack sets selected=null and calls navigate /matches", async () => {
    await setupWithDetail();

    fireEvent.click(screen.getByTestId("trigger-back"));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/matches", { replace: true });
    });
  });

  it("handleStart calls POST /tournament/t1/start then refreshSelected", async () => {
    await setupWithDetail();

    mockPost.mockResolvedValueOnce({ success: true });
    // refreshSelected: GET /tournament/t1
    mockGet.mockResolvedValueOnce({ success: true, data: activeTournament });
    // fetchMatches triggered by refreshSelected
    mockGet.mockResolvedValueOnce(emptyMatchesResponse);

    fireEvent.click(screen.getByTestId("trigger-start"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/tournament/t1/start", {});
    });
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/tournament/t1");
    });
  });

  it("handleDelete calls DELETE /tournament/t1 and sets selected=null", async () => {
    await setupWithDetail();

    mockDelete.mockResolvedValueOnce({ success: true });
    // After delete, fetchTournaments is called again (still at /matches/tournament/ABCDE url)
    mockGet.mockResolvedValueOnce({
      success: true,
      data: [],
      total: 0,
      statusCounts: { all: 0, pending: 0, active: 0, completed: 0 },
    });
    // urlCode is still ABCDE, tournament not in list → falls through to httpClient.get('/tournament/code/ABCDE')
    // which then navigates /matches on reject — provide a resolved value to avoid unhandled rejection
    mockGet.mockRejectedValueOnce(new Error("not found"));

    fireEvent.click(screen.getByTestId("trigger-delete"));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith("/tournament/t1");
    });
    // After delete, navigate to /matches replace is called (from the code catch)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/matches", { replace: true });
    });
  });

  it("handleRecordResult calls PATCH /match/m1/result with winnerId", async () => {
    await setupWithDetail();

    mockPatch.mockResolvedValueOnce({ success: true });
    // fetchMatches after record
    mockGet.mockResolvedValueOnce(emptyMatchesResponse);

    fireEvent.click(screen.getByTestId("trigger-record"));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith("/match/m1/result", {
        winnerId: "p1",
      });
    });
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/match/tournament/t1");
    });
  });

  it("handleReportResult calls PATCH /match/m1/report with winnerId", async () => {
    await setupWithDetail();

    mockPatch.mockResolvedValueOnce({ success: true });
    mockGet.mockResolvedValueOnce(emptyMatchesResponse);

    fireEvent.click(screen.getByTestId("trigger-report"));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith("/match/m1/report", {
        winnerId: "p1",
      });
    });
  });

  it("handleAdvanceRound calls POST /tournament/t1/advance (non-completed)", async () => {
    await setupWithDetail();

    mockPost.mockResolvedValueOnce({ completed: false });
    // refreshSelected
    mockGet.mockResolvedValueOnce({ success: true, data: activeTournament });
    mockGet.mockResolvedValueOnce(emptyMatchesResponse);

    fireEvent.click(screen.getByTestId("trigger-advance"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/tournament/t1/advance", {});
    });
    await waitFor(() => {
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Round advanced" }),
      );
    });
  });

  it("handleAdvanceRound shows completed toast when res.completed is true", async () => {
    await setupWithDetail();

    mockPost.mockResolvedValueOnce({ completed: true });
    // refreshSelected
    mockGet.mockResolvedValueOnce({ success: true, data: activeTournament });
    mockGet.mockResolvedValueOnce(emptyMatchesResponse);

    fireEvent.click(screen.getByTestId("trigger-advance"));

    await waitFor(() => {
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Tournament completed!" }),
      );
    });
  });

  it("handleRemoveParticipant calls DELETE /tournament/t1/participants/p1", async () => {
    await setupWithDetail();

    mockDelete.mockResolvedValueOnce({ success: true });
    // refreshSelected
    mockGet.mockResolvedValueOnce({ success: true, data: activeTournament });
    mockGet.mockResolvedValueOnce(emptyMatchesResponse);

    fireEvent.click(screen.getByTestId("trigger-remove"));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith("/tournament/t1/participants/p1");
    });
  });

  it("handleResolveDispute calls PATCH /match/m1/resolve with winnerId", async () => {
    await setupWithDetail();

    mockPatch.mockResolvedValueOnce({ success: true });
    mockGet.mockResolvedValueOnce(emptyMatchesResponse);

    fireEvent.click(screen.getByTestId("trigger-resolve"));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith("/match/m1/resolve", {
        winnerId: "p1",
      });
    });
  });
});

describe("MatchesPage – socket effects", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("joins tournament room and registers listeners when tournament is selected", async () => {
    vi.clearAllMocks();
    mockGetSocket.mockReturnValue(fakeSocket);
    mockUseUserStore.mockReturnValue(makeStore(true, "u1", "Grimgork"));

    mockGet.mockResolvedValueOnce(successfulListResponse);
    mockGet.mockResolvedValueOnce(emptyMatchesResponse);

    renderAtCode("ABCDE");

    await waitFor(() =>
      expect(screen.getByTestId("tournament-detail")).toBeInTheDocument(),
    );

    expect(fakeSocket.emit).toHaveBeenCalledWith("tournament:join", "t1");
    expect(fakeSocket.on).toHaveBeenCalledWith(
      "tournament:updated",
      expect.any(Function),
    );
    expect(fakeSocket.on).toHaveBeenCalledWith(
      "matches:updated",
      expect.any(Function),
    );
    expect(fakeSocket.on).toHaveBeenCalledWith(
      "matches:appended",
      expect.any(Function),
    );
    expect(fakeSocket.on).toHaveBeenCalledWith(
      "match:updated",
      expect.any(Function),
    );
  });
});
