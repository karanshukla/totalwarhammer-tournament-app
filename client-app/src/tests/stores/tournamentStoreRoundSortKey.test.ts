import { describe, it, expect, beforeEach } from "vitest";
import { useTournamentStore } from "@/shared/stores/tournamentStore";
import type { Round } from "@/features/tournaments/components/bracket/types";

describe("tournamentStore – getRoundSortKey via sortRounds", () => {
  beforeEach(() => {
    useTournamentStore.getState().resetParticipantsAndBracket();
  });

  const makeRound = (id: string, title: string): Round => ({
    id,
    title,
    matches: [],
  });

  it("sorts 'Bronze Final' (key 99) after regular rounds but before Finals (key 100)", () => {
    useTournamentStore.setState({
      rounds: [
        makeRound("r-finals", "Finals"),
        makeRound("r-bronze", "Bronze Final"),
        makeRound("r-round1", "Round 1"),
      ],
    });

    // Trigger addRound which calls sortRounds internally
    useTournamentStore.getState().addRound();

    const titles = useTournamentStore.getState().rounds.map((r) => r.title);
    const bronzeIdx = titles.indexOf("Bronze Final");
    const finalsIdx = titles.indexOf("Finals");
    const round1Idx = titles.indexOf("Round 1");

    // Round 1 (key 11) < Bronze Final (key 99) < Finals (key 100)
    expect(round1Idx).toBeLessThan(bronzeIdx);
    expect(bronzeIdx).toBeLessThan(finalsIdx);
  });

  it("sorts '3rd Place' (key 99) identically to 'Bronze Final'", () => {
    useTournamentStore.setState({
      rounds: [
        makeRound("r-finals", "Finals"),
        makeRound("r-3rd", "3rd Place"),
        makeRound("r-semi", "Semi-Final"),
      ],
    });

    useTournamentStore.getState().addRound();

    const titles = useTournamentStore.getState().rounds.map((r) => r.title);
    const thirdPlaceIdx = titles.indexOf("3rd Place");
    const finalsIdx = titles.indexOf("Finals");
    const semiIdx = titles.indexOf("Semi-Final");

    // Semi-Final (90) < 3rd Place (99) < Finals (100)
    expect(semiIdx).toBeLessThan(thirdPlaceIdx);
    expect(thirdPlaceIdx).toBeLessThan(finalsIdx);
  });

  it("sorts unmatched title (key 50) between numbered rounds and special stages", () => {
    useTournamentStore.setState({
      rounds: [
        makeRound("r-finals", "Finals"),
        makeRound("r-custom", "Group Stage"), // unmatched → key 50
        makeRound("r-round5", "Round 5"), // key 15
      ],
    });

    useTournamentStore.getState().addRound();

    const titles = useTournamentStore.getState().rounds.map((r) => r.title);
    const groupIdx = titles.indexOf("Group Stage");
    const finalsIdx = titles.indexOf("Finals");
    const round5Idx = titles.indexOf("Round 5");

    // Round 5 (key 15) < Group Stage (key 50) < Finals (key 100)
    expect(round5Idx).toBeLessThan(groupIdx);
    expect(groupIdx).toBeLessThan(finalsIdx);
  });

  it("sorts 'Quarter-Final' (key 80) between semi-finals and regular rounds", () => {
    useTournamentStore.setState({
      rounds: [
        makeRound("r-semi", "Semi-Final"),
        makeRound("r-quarter", "Quarter-Final"),
        makeRound("r-round1", "Round 1"),
      ],
    });

    useTournamentStore.getState().addRound();

    const titles = useTournamentStore.getState().rounds.map((r) => r.title);
    const quarterIdx = titles.indexOf("Quarter-Final");
    const semiIdx = titles.indexOf("Semi-Final");
    const round1Idx = titles.indexOf("Round 1");

    // Round 1 (11) < Quarter-Final (80) < Semi-Final (90)
    expect(round1Idx).toBeLessThan(quarterIdx);
    expect(quarterIdx).toBeLessThan(semiIdx);
  });

  it("resetBracket resets to default state with all default rounds", () => {
    useTournamentStore.getState().addRound();
    useTournamentStore.getState().resetBracket();
    const state = useTournamentStore.getState();
    // Default has Round 1, Semi-Finals, Finals
    const titles = state.rounds.map((r) => r.title);
    expect(titles).toContain("Round 1");
    expect(titles.some((t) => t.toLowerCase().includes("final"))).toBe(true);
  });
});
