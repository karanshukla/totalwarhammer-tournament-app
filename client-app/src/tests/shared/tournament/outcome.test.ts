import { describe, it, expect } from "vitest";
import {
  championOf,
  computeStandings,
  decidingMatch,
  isLeagueFormat,
  winnerSlotOf,
} from "@/shared/tournament/outcome";
import type { Match, Participant } from "@/shared/tournament/types";

const slot = (participantId: string, name: string, faction = "Empire") => ({
  participantId,
  name,
  faction,
});

let matchSeq = 0;
const match = (overrides: Partial<Match> = {}): Match =>
  ({
    _id: `m${++matchSeq}`,
    round: 1,
    matchNumber: 1,
    player1: slot("p1", "Alice"),
    player2: slot("p2", "Bob"),
    winnerId: null,
    loserId: null,
    status: "completed",
    notes: "",
    reportedResults: [],
    resultOverrides: [],
    completedAt: null,
    bracketSide: null,
    ...overrides,
  }) as Match;

const participant = (id: string, name: string, faction = "Empire") =>
  ({ _id: id, name, faction }) as Participant;

describe("isLeagueFormat", () => {
  it("treats round robin and swiss as league formats", () => {
    expect(isLeagueFormat("Round Robin")).toBe(true);
    expect(isLeagueFormat("Swiss System")).toBe(true);
  });

  it("treats elimination formats as knockout", () => {
    expect(isLeagueFormat("Single Elimination")).toBe(false);
    expect(isLeagueFormat("Double Elimination")).toBe(false);
  });
});

describe("winnerSlotOf", () => {
  it("returns null when the match has no winner", () => {
    expect(winnerSlotOf(match({ winnerId: null }))).toBeNull();
  });

  it("returns player1 when player1 won", () => {
    expect(winnerSlotOf(match({ winnerId: "p1" }))?.name).toBe("Alice");
  });

  it("returns player2 when player2 won", () => {
    expect(winnerSlotOf(match({ winnerId: "p2" }))?.name).toBe("Bob");
  });

  it("returns null when the winnerId matches neither slot", () => {
    expect(winnerSlotOf(match({ winnerId: "orphaned" }))).toBeNull();
  });
});

describe("decidingMatch", () => {
  it("returns null when nothing is decided yet", () => {
    expect(decidingMatch([match({ status: "pending" })])).toBeNull();
    expect(decidingMatch([])).toBeNull();
  });

  it("picks the highest round for single elimination", () => {
    const matches = [
      match({ round: 1, winnerId: "p1", bracketSide: "winners" }),
      match({
        round: 2,
        winnerId: "p3",
        bracketSide: "winners",
        player1: slot("p3", "Carol"),
        player2: slot("p4", "Dave"),
      }),
    ];
    expect(decidingMatch(matches)?.round).toBe(2);
  });

  it("prefers the grand final over a higher-numbered winners round", () => {
    const matches = [
      match({ round: 1, winnerId: "p1", bracketSide: "winners" }),
      match({ round: 2, winnerId: "p1", bracketSide: "winners" }),
      match({ round: 3, winnerId: "p1", bracketSide: "winners" }),
      match({
        round: 1,
        winnerId: "p9",
        bracketSide: "grand_final",
        player1: slot("p1", "Alice"),
        player2: slot("p9", "Zara"),
      }),
    ];
    expect(winnerSlotOf(decidingMatch(matches)!)?.name).toBe("Zara");
  });

  it("uses the reset grand final when the bracket was reset", () => {
    const matches = [
      match({ round: 3, winnerId: "p1", bracketSide: "winners" }),
      match({
        round: 1,
        winnerId: "p9",
        bracketSide: "grand_final",
        player1: slot("p1", "Alice"),
        player2: slot("p9", "Zara"),
      }),
      match({
        round: 2,
        winnerId: "p1",
        bracketSide: "grand_final",
        player1: slot("p1", "Alice"),
        player2: slot("p9", "Zara"),
      }),
    ];
    expect(winnerSlotOf(decidingMatch(matches)!)?.name).toBe("Alice");
  });

  it("never lets a losers-bracket match decide the tournament", () => {
    const matches = [
      match({ round: 1, winnerId: "p1", bracketSide: "winners" }),
      match({
        round: 5,
        winnerId: "p7",
        bracketSide: "losers",
        player1: slot("p7", "Loser Finalist"),
        player2: slot("p8", "Someone"),
      }),
    ];
    expect(decidingMatch(matches)?.bracketSide).toBe("winners");
  });

  it("ignores an undecided grand final and falls back to nothing", () => {
    const matches = [
      match({
        round: 1,
        winnerId: null,
        status: "pending",
        bracketSide: "grand_final",
      }),
    ];
    expect(decidingMatch(matches)).toBeNull();
  });
});

describe("computeStandings", () => {
  const participants = [
    participant("p1", "Alice"),
    participant("p2", "Bob"),
    participant("p3", "Carol"),
  ];

  it("counts wins, losses and games played", () => {
    const matches = [
      match({
        winnerId: "p1",
        player1: slot("p1", "Alice"),
        player2: slot("p2", "Bob"),
      }),
      match({
        winnerId: "p1",
        player1: slot("p1", "Alice"),
        player2: slot("p3", "Carol"),
      }),
      match({
        winnerId: "p2",
        player1: slot("p2", "Bob"),
        player2: slot("p3", "Carol"),
      }),
    ];
    const [first, second, third] = computeStandings(participants, matches);
    expect(first).toMatchObject({
      name: "Alice",
      wins: 2,
      losses: 0,
      played: 2,
    });
    expect(second).toMatchObject({
      name: "Bob",
      wins: 1,
      losses: 1,
      played: 2,
    });
    expect(third).toMatchObject({
      name: "Carol",
      wins: 0,
      losses: 2,
      played: 2,
    });
  });

  it("skips byes so they do not inflate a record", () => {
    const matches = [
      match({
        winnerId: "p1",
        player1: slot("p1", "Alice"),
        player2: { participantId: "", name: "BYE", faction: "" },
      }),
    ];
    expect(computeStandings(participants, matches)[0].played).toBe(0);
  });

  it("skips matches that are not completed", () => {
    const matches = [match({ winnerId: "p1", status: "disputed" })];
    expect(computeStandings(participants, matches)[0].played).toBe(0);
  });

  it("ignores results for players who are not participants", () => {
    const matches = [
      match({
        winnerId: "ghost",
        player1: slot("ghost", "Ghost"),
        player2: slot("p1", "Alice"),
      }),
    ];
    const alice = computeStandings(participants, matches).find(
      (s) => s.name === "Alice",
    );
    expect(alice).toMatchObject({ wins: 0, losses: 1 });
  });
});

describe("championOf", () => {
  const participants = [
    participant("p1", "Alice"),
    participant("p9", "Zara", "Skaven"),
  ];

  it("returns null with no matches", () => {
    expect(championOf("Single Elimination", participants, [])).toBeNull();
  });

  it("crowns the grand final winner in double elimination", () => {
    const matches = [
      match({ round: 3, winnerId: "p1", bracketSide: "winners" }),
      match({
        round: 1,
        winnerId: "p9",
        bracketSide: "grand_final",
        player1: slot("p1", "Alice"),
        player2: slot("p9", "Zara", "Skaven"),
      }),
    ];
    expect(championOf("Double Elimination", participants, matches)).toEqual({
      name: "Zara",
      faction: "Skaven",
    });
  });

  it("crowns the standings leader in a round robin", () => {
    const matches = [
      match({
        winnerId: "p9",
        player1: slot("p1", "Alice"),
        player2: slot("p9", "Zara", "Skaven"),
      }),
    ];
    expect(championOf("Round Robin", participants, matches)).toEqual({
      name: "Zara",
      faction: "Skaven",
    });
  });

  it("returns null for a league with no completed games", () => {
    const matches = [match({ status: "pending", winnerId: null })];
    expect(championOf("Swiss System", participants, matches)).toBeNull();
  });

  it("returns null for a knockout with no decided match", () => {
    const matches = [match({ status: "pending", winnerId: null })];
    expect(championOf("Single Elimination", participants, matches)).toBeNull();
  });

  it("returns null when the deciding match points at an orphaned winner", () => {
    const matches = [match({ winnerId: "orphaned", bracketSide: "winners" })];
    expect(championOf("Single Elimination", participants, matches)).toBeNull();
  });
});
