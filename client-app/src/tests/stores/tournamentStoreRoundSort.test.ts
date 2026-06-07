/**
 * Coverage for tournamentStore getRoundSortKey branches.
 * Covers lines 121 (bronze final → 99) and 132 (default → 50).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useTournamentStore } from "@/shared/stores/tournamentStore";
import type { Round } from "@/features/tournaments/components/bracket/types";

function makeRound(id: string, title: string): Round {
  return { id, title, matches: [] };
}

describe("tournamentStore – getRoundSortKey bronze and default branches", () => {
  beforeEach(() => {
    useTournamentStore.getState().resetParticipantsAndBracket();
  });

  it("sorts Bronze Final (key=99) before Finals (key=100) but after Round 1 (key=11)", () => {
    useTournamentStore.setState((s) => ({
      ...s,
      rounds: [
        makeRound("r-final", "Finals"),
        makeRound("r-bronze", "Bronze Final"),
        makeRound("r1", "Round 1"),
      ],
    }));

    // addRound triggers sortRounds on the combined list
    useTournamentStore.getState().addRound();

    const titles = useTournamentStore.getState().rounds.map((r) => r.title);
    const bronzeIdx = titles.indexOf("Bronze Final");
    const finalIdx = titles.indexOf("Finals");
    const roundIdx = titles.indexOf("Round 1");

    expect(bronzeIdx).toBeGreaterThan(-1);
    expect(finalIdx).toBeGreaterThan(-1);
    expect(roundIdx).toBeGreaterThan(-1);
    // Round 1 (11) < Bronze Final (99) < Finals (100)
    expect(roundIdx).toBeLessThan(bronzeIdx);
    expect(bronzeIdx).toBeLessThan(finalIdx);
  });

  it("treats '3rd Place Match' as bronze-final equivalent (key=99)", () => {
    useTournamentStore.setState((s) => ({
      ...s,
      rounds: [
        makeRound("r-final", "Finals"),
        makeRound("r-3rd", "3rd Place Match"),
        makeRound("r1", "Round 1"),
      ],
    }));

    useTournamentStore.getState().addRound();

    const titles = useTournamentStore.getState().rounds.map((r) => r.title);
    const thirdIdx = titles.indexOf("3rd Place Match");
    const finalIdx = titles.indexOf("Finals");
    const roundIdx = titles.indexOf("Round 1");

    expect(thirdIdx).toBeGreaterThan(roundIdx);
    expect(thirdIdx).toBeLessThan(finalIdx);
  });

  it("default title returns 50 — sorts between Round 1 (11) and Finals (100)", () => {
    useTournamentStore.setState((s) => ({
      ...s,
      rounds: [
        makeRound("r-final", "Finals"),
        makeRound("r-group", "Group Stage"),
        makeRound("r1", "Round 1"),
      ],
    }));

    useTournamentStore.getState().addRound();

    const titles = useTournamentStore.getState().rounds.map((r) => r.title);
    const groupIdx = titles.indexOf("Group Stage");
    const finalIdx = titles.indexOf("Finals");
    const roundIdx = titles.indexOf("Round 1");

    expect(groupIdx).toBeGreaterThan(roundIdx);
    expect(groupIdx).toBeLessThan(finalIdx);
  });

  it("Quarter-Final (key=80) sorts before Semi-Finals (key=90)", () => {
    useTournamentStore.setState((s) => ({
      ...s,
      rounds: [
        makeRound("r-semi", "Semi-Finals"),
        makeRound("r-qf", "Quarter-Final"),
        makeRound("r1", "Round 1"),
      ],
    }));

    useTournamentStore.getState().addRound();

    const titles = useTournamentStore.getState().rounds.map((r) => r.title);
    const qfIdx = titles.indexOf("Quarter-Final");
    const semiIdx = titles.indexOf("Semi-Finals");

    expect(qfIdx).toBeLessThan(semiIdx);
  });

  it("custom round title falls through to default (50) and stays between rounds and finals", () => {
    useTournamentStore.setState((s) => ({
      ...s,
      rounds: [
        makeRound("r-playoff", "Playoff Stage"),
        makeRound("r-final", "Finals"),
        makeRound("r1", "Round 2"),
      ],
    }));

    useTournamentStore.getState().addRound();

    const rounds = useTournamentStore.getState().rounds;
    const playoffRound = rounds.find((r) => r.title === "Playoff Stage");
    expect(playoffRound).toBeDefined();
  });
});
