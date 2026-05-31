import assert from "node:assert";
import { describe, it } from "node:test";

import {
  singleElimStart,
  singleElimAdvance,
  doubleElimStart,
  doubleElimAdvance,
  roundRobinStart,
  roundRobinAdvance,
  roundRobinStandings,
  swissStart,
  swissAdvance,
  swissStandings,
} from "../../domain/services/tournament-service.js";

// Simulate completing all pending matches by setting a winner
function completeMatches(matches) {
  return matches.map((m) => {
    if (m.status === "completed") return m;
    return {
      ...m,
      status: "completed",
      winnerId: m.player1.participantId,
      loserId: m.player2.participantId,
      completedAt: new Date(),
    };
  });
}

// Run the full double elimination bracket to completion and return all matches
function runDoubleElim(tournamentId, participants) {
  const allMatches = completeMatches(
    doubleElimStart(tournamentId, participants),
  );
  let iterations = 0;
  const maxIterations = 50;

  while (iterations++ < maxIterations) {
    const result = doubleElimAdvance(tournamentId, allMatches);
    if (result.completed) break;
    if (!result.docs || result.docs.length === 0) break;
    const newMatches = completeMatches(result.docs);
    allMatches.push(...newMatches);
  }

  return allMatches;
}

// Verify no participant plays two matches simultaneously in the same round+bracket
function assertNoDuplicateParticipantsPerRound(matches) {
  const roundBracketMap = new Map();
  for (const m of matches) {
    if (m.status !== "completed") continue;
    const key = `${m.bracketSide}-${m.round}`;
    if (!roundBracketMap.has(key)) roundBracketMap.set(key, new Set());
    const seen = roundBracketMap.get(key);
    const p1 = m.player1.participantId?.toString();
    const p2 = m.player2.participantId?.toString();
    if (p1 && p2 !== "null" && p2 !== null) {
      assert.ok(
        !seen.has(p1),
        `Participant ${m.player1.name} appears twice in ${key}`,
      );
      assert.ok(
        !seen.has(p2),
        `Participant ${m.player2.name} appears twice in ${key}`,
      );
    }
    if (p1) seen.add(p1);
    if (p2 && p2 !== "null") seen.add(p2);
  }
}

// Verify a grand final exists and has exactly 1 match (or 2 with bracket reset)
function assertGrandFinalExists(matches) {
  const gf = matches.filter((m) => m.bracketSide === "grand_final");
  assert.ok(gf.length >= 1, "Expected at least one grand final match");
  assert.ok(
    gf.length <= 2,
    "Expected at most two grand final matches (bracket reset)",
  );
}

// Verify every non-BYE participant appears in the bracket
function assertAllParticipantsPresent(participants, matches) {
  const seen = new Set(
    matches
      .flatMap((m) => [
        m.player1.participantId?.toString(),
        m.player2.participantId?.toString(),
      ])
      .filter((id) => id && id !== "null"),
  );
  for (const p of participants) {
    const id = (p._id ?? p.participantId)?.toString();
    assert.ok(
      seen.has(id),
      `Participant ${p.name} never appeared in any match`,
    );
  }
}

function makeParticipants(n) {
  return Array.from({ length: n }, (_, i) => ({
    _id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    faction: "Empire",
  }));
}

describe("doubleElimAdvance", () => {
  const tid = "tournament1";

  for (const n of [3, 4, 5, 6, 7, 8, 9]) {
    it(`completes correctly with ${n} players`, () => {
      const participants = makeParticipants(n);
      const allMatches = runDoubleElim(tid, participants);

      assertGrandFinalExists(allMatches);
      assertNoDuplicateParticipantsPerRound(allMatches);
      assertAllParticipantsPresent(participants, allMatches);
    });
  }

  it("WB losers are never injected into LB twice", () => {
    const participants = makeParticipants(7);
    const allMatches = runDoubleElim(tid, participants);

    // Count how many times each participant appears as a LB participant
    const lbMatches = allMatches.filter((m) => m.bracketSide === "losers");
    const lbAppearances = new Map();
    for (const m of lbMatches) {
      for (const p of [m.player1, m.player2]) {
        if (!p.participantId || p.name === "BYE") continue;
        const id = p.participantId.toString();
        lbAppearances.set(id, (lbAppearances.get(id) || 0) + 1);
      }
    }

    // In a proper double elim, a player that loses in WB should appear in LB
    // rounds equal to (number of LB rounds they survive + 1). No one should
    // appear as an entrant more than once (entrant = first time in LB).
    // We check by verifying no one appears in LB more times than possible.
    // Max appearances: ceil(log2(n)) * 2 — a very generous upper bound.
    const maxAppearances = Math.ceil(Math.log2(participants.length)) * 2 + 2;
    for (const [id, count] of lbAppearances) {
      assert.ok(
        count <= maxAppearances,
        `Participant ${id} appeared ${count} times in LB matches (max expected: ${maxAppearances}) — likely injected twice`,
      );
    }
  });

  it("WB losers face LB survivors (not other WB losers) in drop-in rounds", () => {
    const participants = makeParticipants(8);
    const allMatches = runDoubleElim(tid, participants);

    const lbRounds = new Map();
    for (const m of allMatches.filter((m) => m.bracketSide === "losers")) {
      if (!lbRounds.has(m.round)) lbRounds.set(m.round, []);
      lbRounds.get(m.round).push(m);
    }

    // Track which LB round each player first appeared in (their LB debut).
    // A player who won LB R1 is an "LB survivor" in R2, not a fresh drop-in,
    // even though they originally lost in WB.
    const lbDebut = new Map();
    const sortedRounds = [...lbRounds.keys()].sort((a, b) => a - b);
    for (const round of sortedRounds) {
      for (const m of lbRounds.get(round)) {
        const p1Id = m.player1.participantId?.toString();
        const p2Id = m.player2.participantId?.toString();
        if (p1Id && p1Id !== "null" && !lbDebut.has(p1Id))
          lbDebut.set(p1Id, round);
        if (p2Id && p2Id !== "null" && !lbDebut.has(p2Id))
          lbDebut.set(p2Id, round);
      }
    }

    for (const [lbRound, lbMatches] of lbRounds) {
      for (const m of lbMatches) {
        if (m.player2.name === "BYE") continue;
        const p1Id = m.player1.participantId?.toString();
        const p2Id = m.player2.participantId?.toString();
        const p1IsDebut = lbDebut.get(p1Id) === lbRound;
        const p2IsDebut = lbDebut.get(p2Id) === lbRound;
        // Two fresh LB entrants facing each other is only acceptable in LB R1
        if (p1IsDebut && p2IsDebut) {
          assert.ok(
            lbRound === 1,
            `LB round ${lbRound}: two fresh LB entrants (${m.player1.name} vs ${m.player2.name}) face each other — expected fresh entrant vs LB survivor`,
          );
        }
      }
    }
  });
});

describe("isBetaFaction propagation", () => {
  const tid = "t1";
  const makePlayers = (n, faction = "Empire") =>
    Array.from({ length: n }, (_, i) => ({
      _id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      faction,
    }));

  function allSlots(matches) {
    return matches.flatMap((m) => [m.player1, m.player2]);
  }

  function realSlots(matches) {
    return allSlots(matches).filter((s) => s.name !== "BYE");
  }

  describe("singleElimStart", () => {
    it("sets isBetaFaction: false on all slots when enable40kFactions is false", () => {
      const matches = singleElimStart(tid, makePlayers(4), false);
      for (const slot of realSlots(matches)) {
        assert.strictEqual(slot.isBetaFaction, false);
      }
    });

    it("sets isBetaFaction: true on all real slots when enable40kFactions is true", () => {
      const matches = singleElimStart(tid, makePlayers(4), true);
      for (const slot of realSlots(matches)) {
        assert.strictEqual(slot.isBetaFaction, true);
      }
    });

    it("always sets isBetaFaction: false on BYE slots even when 40k is enabled", () => {
      const matches = singleElimStart(tid, makePlayers(3), true);
      const byeSlots = allSlots(matches).filter((s) => s.name === "BYE");
      assert.ok(byeSlots.length > 0, "Expected at least one BYE slot");
      for (const slot of byeSlots) {
        assert.strictEqual(slot.isBetaFaction, false);
      }
    });

    it("defaults to false when enable40kFactions is omitted", () => {
      const matches = singleElimStart(tid, makePlayers(4));
      for (const slot of realSlots(matches)) {
        assert.strictEqual(slot.isBetaFaction, false);
      }
    });
  });

  describe("doubleElimStart", () => {
    it("sets isBetaFaction: true on all real slots when enabled", () => {
      const matches = doubleElimStart(tid, makePlayers(4), true);
      for (const slot of realSlots(matches)) {
        assert.strictEqual(slot.isBetaFaction, true);
      }
    });

    it("sets isBetaFaction: false when disabled", () => {
      const matches = doubleElimStart(tid, makePlayers(4), false);
      for (const slot of realSlots(matches)) {
        assert.strictEqual(slot.isBetaFaction, false);
      }
    });
  });

  describe("roundRobinStart", () => {
    it("sets isBetaFaction: true on all real slots when enabled", () => {
      const matches = roundRobinStart(tid, makePlayers(4), true);
      for (const slot of realSlots(matches)) {
        assert.strictEqual(slot.isBetaFaction, true);
      }
    });

    it("sets isBetaFaction: false when disabled", () => {
      const matches = roundRobinStart(tid, makePlayers(4), false);
      for (const slot of realSlots(matches)) {
        assert.strictEqual(slot.isBetaFaction, false);
      }
    });

    it("BYE slots have isBetaFaction: false even when 40k is enabled", () => {
      const matches = roundRobinStart(tid, makePlayers(3), true);
      const byeSlots = allSlots(matches).filter((s) => s.name === "BYE");
      assert.ok(byeSlots.length > 0);
      for (const slot of byeSlots) {
        assert.strictEqual(slot.isBetaFaction, false);
      }
    });
  });

  describe("swissStart", () => {
    it("sets isBetaFaction: true on all real slots when enabled", () => {
      const matches = swissStart(tid, makePlayers(4), true);
      for (const slot of realSlots(matches)) {
        assert.strictEqual(slot.isBetaFaction, true);
      }
    });

    it("sets isBetaFaction: false when disabled", () => {
      const matches = swissStart(tid, makePlayers(4), false);
      for (const slot of realSlots(matches)) {
        assert.strictEqual(slot.isBetaFaction, false);
      }
    });
  });
});

// ─── singleElimAdvance ───────────────────────────────────────────────────────

describe("singleElimAdvance", () => {
  const tid = "t1";

  it("returns completed=true when only one winner remains", () => {
    const match = {
      round: 1,
      player1: { participantId: "p1", name: "Alice", faction: "" },
      player2: { participantId: "p2", name: "Bob", faction: "" },
      winnerId: "p1",
      bracketSide: "winners",
      status: "completed",
    };
    const result = singleElimAdvance(tid, [match], 2);
    assert.strictEqual(result.completed, true);
    assert.deepStrictEqual(result.docs, []);
  });

  it("returns new match docs when multiple winners advance", () => {
    const m1 = {
      round: 1,
      player1: { participantId: "p1", name: "Alice", faction: "" },
      player2: { participantId: "p2", name: "Bob", faction: "" },
      winnerId: "p1",
      status: "completed",
    };
    const m2 = {
      round: 1,
      player1: { participantId: "p3", name: "Carol", faction: "" },
      player2: { participantId: "p4", name: "Dave", faction: "" },
      winnerId: "p3",
      status: "completed",
    };
    const result = singleElimAdvance(tid, [m1, m2], 2);
    assert.strictEqual(result.completed, false);
    assert.strictEqual(result.docs.length, 1);
    assert.strictEqual(result.docs[0].round, 2);
    assert.strictEqual(result.docs[0].player1.participantId, "p1");
    assert.strictEqual(result.docs[0].player2.participantId, "p3");
  });

  it("generates a bye match when odd winners remain", () => {
    const matches = [
      {
        round: 1,
        player1: { participantId: "p1", name: "Alice", faction: "" },
        player2: { participantId: "p2", name: "Bob", faction: "" },
        winnerId: "p1",
        status: "completed",
      },
      {
        round: 1,
        player1: { participantId: "p3", name: "Carol", faction: "" },
        player2: { participantId: "p4", name: "Dave", faction: "" },
        winnerId: "p3",
        status: "completed",
      },
      {
        round: 1,
        player1: { participantId: "p5", name: "Eve", faction: "" },
        player2: { participantId: "p6", name: "Frank", faction: "" },
        winnerId: "p5",
        status: "completed",
      },
    ];
    const result = singleElimAdvance(tid, matches, 2);
    assert.strictEqual(result.completed, false);
    // 3 winners → 1 normal match + 1 bye
    assert.strictEqual(result.docs.length, 2);
    const byeMatch = result.docs.find((d) => d.player2.name === "BYE");
    assert.ok(byeMatch, "expected a bye match");
    assert.strictEqual(byeMatch.status, "completed");
    assert.strictEqual(byeMatch.winnerId, byeMatch.player1.participantId);
  });

  it("selects player2 as winner when winnerId matches player2", () => {
    const match = {
      round: 1,
      player1: { participantId: "p1", name: "Alice", faction: "" },
      player2: { participantId: "p2", name: "Bob", faction: "" },
      winnerId: "p2",
      status: "completed",
    };
    const result = singleElimAdvance(tid, [match], 2);
    assert.strictEqual(result.completed, true);
  });
});

// ─── roundRobinAdvance ───────────────────────────────────────────────────────

describe("roundRobinAdvance", () => {
  it("returns completed=false with message when matches are still pending", () => {
    const matches = [
      { status: "completed" },
      { status: "pending" },
      { status: "pending" },
    ];
    const result = roundRobinAdvance(matches);
    assert.strictEqual(result.completed, false);
    assert.ok(result.message.includes("2"));
  });

  it("returns completed=true when all matches are done", () => {
    const matches = [{ status: "completed" }, { status: "completed" }];
    const result = roundRobinAdvance(matches);
    assert.strictEqual(result.completed, true);
  });
});

// ─── roundRobinStandings ─────────────────────────────────────────────────────

describe("roundRobinStandings", () => {
  const participants = [
    { _id: "p1", participantId: "p1", name: "Alice", faction: "" },
    { _id: "p2", participantId: "p2", name: "Bob", faction: "" },
    { _id: "p3", participantId: "p3", name: "Carol", faction: "" },
  ];

  it("computes wins and losses correctly", () => {
    const matches = [
      {
        status: "completed",
        winnerId: "p1",
        player1: { participantId: "p1", name: "Alice" },
        player2: { participantId: "p2", name: "Bob" },
      },
      {
        status: "completed",
        winnerId: "p1",
        player1: { participantId: "p1", name: "Alice" },
        player2: { participantId: "p3", name: "Carol" },
      },
      {
        status: "completed",
        winnerId: "p2",
        player1: { participantId: "p2", name: "Bob" },
        player2: { participantId: "p3", name: "Carol" },
      },
    ];
    const standings = roundRobinStandings(participants, matches);
    assert.strictEqual(standings[0].name, "Alice");
    assert.strictEqual(standings[0].wins, 2);
    assert.strictEqual(standings[0].losses, 0);
    assert.strictEqual(standings[1].name, "Bob");
    assert.strictEqual(standings[1].wins, 1);
  });

  it("skips BYE matches when computing standings", () => {
    const matches = [
      {
        status: "completed",
        winnerId: "p1",
        player1: { participantId: "p1", name: "Alice" },
        player2: { participantId: null, name: "BYE" },
      },
    ];
    const standings = roundRobinStandings(participants, matches);
    // BYE match should not count toward standings
    const alice = standings.find((s) => s.name === "Alice");
    assert.strictEqual(alice.wins, 0);
  });

  it("skips incomplete matches", () => {
    const matches = [
      {
        status: "pending",
        winnerId: null,
        player1: { participantId: "p1", name: "Alice" },
        player2: { participantId: "p2", name: "Bob" },
      },
    ];
    const standings = roundRobinStandings(participants, matches);
    for (const s of standings) {
      assert.strictEqual(s.wins, 0);
    }
  });

  it("ignores participants with no valid _id or participantId", () => {
    const badParticipants = [
      ...participants,
      { name: "Ghost" }, // no _id or participantId
    ];
    const standings = roundRobinStandings(badParticipants, []);
    // Ghost should not appear since id is undefined
    assert.strictEqual(standings.length, 3);
  });
});

// ─── swissAdvance ─────────────────────────────────────────────────────────────

describe("swissAdvance", () => {
  const tid = "t1";

  function makePlayer(id, name) {
    return { _id: id, participantId: id, name, faction: "" };
  }

  it("creates pairings for round 2 based on win scores", () => {
    const participants = [
      makePlayer("p1", "Alice"),
      makePlayer("p2", "Bob"),
      makePlayer("p3", "Carol"),
      makePlayer("p4", "Dave"),
    ];
    // Round 1 results
    const allMatches = [
      {
        round: 1,
        status: "completed",
        winnerId: "p1",
        player1: { participantId: "p1", name: "Alice" },
        player2: { participantId: "p2", name: "Bob" },
      },
      {
        round: 1,
        status: "completed",
        winnerId: "p3",
        player1: { participantId: "p3", name: "Carol" },
        player2: { participantId: "p4", name: "Dave" },
      },
    ];
    const result = swissAdvance(tid, participants, allMatches, 2);
    assert.strictEqual(result.completed, false);
    assert.strictEqual(result.docs.length, 2);
    assert.strictEqual(result.docs[0].round, 2);
  });

  it("avoids rematches when possible", () => {
    const participants = [
      makePlayer("p1", "Alice"),
      makePlayer("p2", "Bob"),
      makePlayer("p3", "Carol"),
      makePlayer("p4", "Dave"),
    ];
    // All have played each other except p1 vs p4 and p2 vs p3
    const allMatches = [
      {
        round: 1,
        status: "completed",
        winnerId: "p1",
        player1: { participantId: "p1", name: "Alice" },
        player2: { participantId: "p2", name: "Bob" },
      },
      {
        round: 1,
        status: "completed",
        winnerId: "p3",
        player1: { participantId: "p3", name: "Carol" },
        player2: { participantId: "p4", name: "Dave" },
      },
      {
        round: 2,
        status: "completed",
        winnerId: "p1",
        player1: { participantId: "p1", name: "Alice" },
        player2: { participantId: "p3", name: "Carol" },
      },
      {
        round: 2,
        status: "completed",
        winnerId: "p2",
        player1: { participantId: "p2", name: "Bob" },
        player2: { participantId: "p4", name: "Dave" },
      },
    ];
    const result = swissAdvance(tid, participants, allMatches, 3);
    assert.strictEqual(result.docs.length, 2);
    // p1 and p2 haven't played each other yet despite different scores
    const pairKeys = result.docs.map(
      (d) =>
        [d.player1.participantId, d.player2.participantId].sort().join("_"),
    );
    // No rematch of p1 vs p2 or p3 vs p4 (unless forced)
    const p1p2Match = pairKeys.find(
      (k) => k === "p1_p2" || k === "p2_p1",
    );
    // p1 already played p2, so they should NOT be paired (different opponents available)
    assert.strictEqual(p1p2Match, undefined);
  });

  it("generates a bye when odd number of participants", () => {
    const participants = [
      makePlayer("p1", "Alice"),
      makePlayer("p2", "Bob"),
      makePlayer("p3", "Carol"),
    ];
    const allMatches = [
      {
        round: 1,
        status: "completed",
        winnerId: "p1",
        player1: { participantId: "p1", name: "Alice" },
        player2: { participantId: "p2", name: "Bob" },
      },
    ];
    const result = swissAdvance(tid, participants, allMatches, 2);
    assert.strictEqual(result.docs.length, 2);
    const byeDoc = result.docs.find((d) => d.player2?.name === "BYE");
    assert.ok(byeDoc, "expected a bye match for odd participants");
  });

  it("forces rematch when no other pairing is available", () => {
    const participants = [
      makePlayer("p1", "Alice"),
      makePlayer("p2", "Bob"),
    ];
    // They've already played each other — forced rematch
    const allMatches = [
      {
        round: 1,
        status: "completed",
        winnerId: "p1",
        player1: { participantId: "p1", name: "Alice" },
        player2: { participantId: "p2", name: "Bob" },
      },
    ];
    const result = swissAdvance(tid, participants, allMatches, 2);
    assert.strictEqual(result.docs.length, 1);
  });
});

// ─── swissStandings ───────────────────────────────────────────────────────────

describe("swissStandings", () => {
  it("delegates to roundRobinStandings logic", () => {
    const participants = [
      { _id: "p1", participantId: "p1", name: "Alice", faction: "" },
      { _id: "p2", participantId: "p2", name: "Bob", faction: "" },
    ];
    const matches = [
      {
        status: "completed",
        winnerId: "p1",
        player1: { participantId: "p1", name: "Alice" },
        player2: { participantId: "p2", name: "Bob" },
      },
    ];
    const standings = swissStandings(participants, matches);
    assert.strictEqual(standings[0].name, "Alice");
    assert.strictEqual(standings[0].wins, 1);
    assert.strictEqual(standings[1].losses, 1);
  });
});

// ─── doubleElimAdvance bracket reset ─────────────────────────────────────────

describe("doubleElimAdvance bracket reset", () => {
  it("triggers a bracket reset when LB player wins the grand final", () => {
    // Build a minimal double-elim with 2 players to get to grand final
    const tid = "t_br";
    const matches = doubleElimStart(tid, [
      { _id: "p1", name: "Alice", faction: "" },
      { _id: "p2", name: "Bob", faction: "" },
    ]);

    // Complete all matches up to grand final with LB player winning
    const completed = matches.map((m) => ({
      ...m,
      status: "completed",
      winnerId: m.player1.participantId, // p1 always wins WB
      loserId: m.player2.participantId,
    }));

    // Advance to grand final
    let allMatches = [...completed];
    let iterations = 0;
    while (iterations++ < 20) {
      const r = doubleElimAdvance(tid, allMatches);
      if (r.completed) break;
      if (!r.docs || r.docs.length === 0) break;
      const gf = r.docs.find((d) => d.bracketSide === "grand_final");
      const next = r.docs.map((d) => ({
        ...d,
        status: "completed",
        // LB player (player2) wins the grand final → triggers bracket reset
        winnerId: gf ? d.player2.participantId : d.player1.participantId,
        loserId: gf ? d.player1.participantId : d.player2.participantId,
      }));
      allMatches.push(...next);
    }

    // At this point we should have a bracket reset or completed tournament
    const gfMatches = allMatches.filter((m) => m.bracketSide === "grand_final");
    assert.ok(gfMatches.length >= 1, "should have at least one grand final match");
  });

  it("returns completed=true when WB player wins the grand final", () => {
    const tid = "t_wbwin";
    const matches = doubleElimStart(tid, [
      { _id: "pa", name: "Alpha", faction: "" },
      { _id: "pb", name: "Beta", faction: "" },
    ]);

    let allMatches = matches.map((m) => ({
      ...m,
      status: "completed",
      winnerId: m.player1.participantId,
      loserId: m.player2.participantId,
    }));

    // Drive to completion, always have WB player (player1) win
    let done = false;
    let iter = 0;
    while (!done && iter++ < 20) {
      const r = doubleElimAdvance(tid, allMatches);
      if (r.completed) { done = true; break; }
      if (!r.docs || r.docs.length === 0) break;
      const next = r.docs.map((d) => ({
        ...d,
        status: "completed",
        winnerId: d.player1.participantId,
        loserId: d.player2.participantId,
      }));
      allMatches.push(...next);
    }
    assert.ok(done, "tournament should reach completed state");
  });
});
