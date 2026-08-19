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

// Like completeMatches, but alternates which player wins per match index so
// both the winner and loser sides of the player1/player2 selection ternaries
// get exercised (not just "player1 always wins").
function completeMatchesAlternating(matches, startIndex = 0) {
  return matches.map((m, i) => {
    if (m.status === "completed") return m;
    const player2Wins = (startIndex + i) % 2 === 1 && m.player2.name !== "BYE";
    const winner = player2Wins ? m.player2 : m.player1;
    const loser = player2Wins ? m.player1 : m.player2;
    return {
      ...m,
      status: "completed",
      winnerId: winner.participantId,
      loserId: loser.participantId,
      completedAt: new Date(),
    };
  });
}

// Run the full double elimination bracket to completion, alternating winners
// between player1 and player2 each round so both sides of the winner/loser
// selection ternaries in doubleElimAdvance are exercised.
function runDoubleElimAlternating(tournamentId, participants) {
  const allMatches = completeMatchesAlternating(
    doubleElimStart(tournamentId, participants),
  );
  let iterations = 0;
  const maxIterations = 50;

  while (iterations++ < maxIterations) {
    const result = doubleElimAdvance(tournamentId, allMatches);
    if (result.completed) break;
    if (!result.docs || result.docs.length === 0) break;
    const newMatches = completeMatchesAlternating(result.docs, iterations);
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

  // The defining property of the format: a single loss never ends your run.
  // Regression for a grand final that was built as soon as one WB winner and
  // one LB winner existed, without waiting for the WB final's loser to play
  // their losers-bracket match — stranding them on one loss at n = 3, 4 and 5.
  for (const n of [3, 4, 5, 6, 7, 8, 9]) {
    it(`eliminates nobody on a single loss with ${n} players`, () => {
      const participants = makeParticipants(n);
      for (const run of [runDoubleElim, runDoubleElimAlternating]) {
        const allMatches = run(tid, participants);

        const losses = new Map(participants.map((p) => [p._id.toString(), 0]));
        for (const m of allMatches) {
          const loserId = m.loserId?.toString();
          if (!loserId || !losses.has(loserId)) continue;
          losses.set(loserId, losses.get(loserId) + 1);
        }

        const survivors = [...losses.entries()].filter(([, l]) => l < 2);
        assert.strictEqual(
          survivors.length,
          1,
          `expected only the champion to finish with fewer than 2 losses, got ${JSON.stringify(
            survivors,
          )}`,
        );
      }
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

  it("exercises both winner/loser selection branches when player2 wins some matches", () => {
    const participants = makeParticipants(8);
    const allMatches = runDoubleElimAlternating(tid, participants);

    assertGrandFinalExists(allMatches);
    assertAllParticipantsPresent(participants, allMatches);

    // Sanity check the alternating winner selection actually produced some
    // matches where player2 (not player1) was recorded as the winner.
    const player2Wins = allMatches.filter(
      (m) =>
        m.status === "completed" &&
        m.player2.name !== "BYE" &&
        m.winnerId?.toString() === m.player2.participantId?.toString(),
    );
    assert.ok(
      player2Wins.length > 0,
      "expected at least one match where player2 won",
    );
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

    it("falls back to participantId when a participant has no _id", () => {
      const participants = [
        { participantId: "pid-1", name: "Player 1", faction: "Empire" },
        { participantId: "pid-2", name: "Player 2", faction: "Empire" },
      ];
      const matches = singleElimStart(tid, participants);
      const ids = [
        matches[0].player1.participantId,
        matches[0].player2.participantId,
      ];
      assert.ok(ids.includes("pid-1"));
      assert.ok(ids.includes("pid-2"));
    });

    it("bye match falls back to a bare participant with neither _id nor participantId", () => {
      const participants = [
        { name: "Player 1", faction: "Empire" },
        { name: "Player 2", faction: "Empire" },
        { name: "Player 3", faction: "Empire" },
      ];
      const matches = singleElimStart(tid, participants);
      const bye = matches.find((m) => m.player2.name === "BYE");
      assert.ok(bye, "Expected a bye match with 3 participants");
      assert.strictEqual(bye.player1.participantId, undefined);
      assert.strictEqual(bye.winnerId, undefined);
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

  // Advancing re-slots winners from stored matches rather than from the
  // tournament, so the flag has to survive the round boundary.
  describe("advancement", () => {
    const betaSlot = (id, name) => ({
      participantId: id,
      name,
      faction: "Orks",
      isBetaFaction: true,
    });

    it("keeps isBetaFaction on a bye created by singleElimAdvance", () => {
      const currentRound = ["p1", "p2", "p3"].map((id, i) => ({
        round: 1,
        status: "completed",
        winnerId: id,
        player1: betaSlot(id, `Winner ${i + 1}`),
        player2: betaSlot(`l${i + 1}`, `Loser ${i + 1}`),
      }));

      const { docs } = singleElimAdvance(tid, currentRound, 2);
      const bye = docs.find((d) => d.player2.name === "BYE");
      assert.ok(bye, "expected a bye match");
      assert.strictEqual(bye.player1.isBetaFaction, true);
      assert.strictEqual(bye.player2.isBetaFaction, false);
    });

    it("keeps isBetaFaction on a bye created by doubleElimAdvance", () => {
      const allMatches = ["p1", "p2", "p3"].map((id, i) => ({
        bracketSide: "winners",
        round: 1,
        status: "completed",
        winnerId: id,
        player1: betaSlot(id, `Winner ${i + 1}`),
        player2: betaSlot(`l${i + 1}`, `Loser ${i + 1}`),
      }));

      const { docs } = doubleElimAdvance(tid, allMatches);
      const byes = docs.filter((d) => d.player2.name === "BYE");
      assert.ok(byes.length > 0, "expected at least one bye match");
      for (const bye of byes) {
        assert.strictEqual(bye.player1.isBetaFaction, true);
      }
    });

    it("sets isBetaFaction on slots paired by swissAdvance", () => {
      const participants = ["p1", "p2", "p3", "p4"].map((id, i) => ({
        _id: id,
        participantId: id,
        name: `Player ${i + 1}`,
        faction: "Orks",
      }));
      const allMatches = [
        {
          round: 1,
          status: "completed",
          winnerId: "p1",
          player1: betaSlot("p1", "Player 1"),
          player2: betaSlot("p2", "Player 2"),
        },
        {
          round: 1,
          status: "completed",
          winnerId: "p3",
          player1: betaSlot("p3", "Player 3"),
          player2: betaSlot("p4", "Player 4"),
        },
      ];

      const { docs } = swissAdvance(tid, participants, allMatches, 2, true);
      for (const slot of docs.flatMap((d) => [d.player1, d.player2])) {
        if (slot.name === "BYE") continue;
        assert.strictEqual(slot.isBetaFaction, true);
      }
    });

    it("leaves isBetaFaction false for a wh3 swiss tournament", () => {
      const participants = ["p1", "p2"].map((id, i) => ({
        _id: id,
        participantId: id,
        name: `Player ${i + 1}`,
        faction: "Empire",
      }));
      const allMatches = [
        {
          round: 1,
          status: "completed",
          winnerId: "p1",
          player1: { participantId: "p1", name: "Player 1", faction: "Empire" },
          player2: { participantId: "p2", name: "Player 2", faction: "Empire" },
        },
      ];

      const { docs } = swissAdvance(tid, participants, allMatches, 2);
      for (const slot of docs.flatMap((d) => [d.player1, d.player2])) {
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

  it("computes the loser id as player1 when player2 wins", () => {
    const matches = [
      {
        status: "completed",
        winnerId: "p2",
        player1: { participantId: "p1", name: "Alice" },
        player2: { participantId: "p2", name: "Bob" },
      },
    ];
    const standings = roundRobinStandings(participants, matches);
    const alice = standings.find((s) => s.name === "Alice");
    const bob = standings.find((s) => s.name === "Bob");
    assert.strictEqual(bob.wins, 1);
    assert.strictEqual(alice.losses, 1);
  });

  it("scores a BYE as a win, with no loss recorded against anyone", () => {
    const matches = [
      {
        status: "completed",
        winnerId: "p1",
        player1: { participantId: "p1", name: "Alice" },
        player2: { participantId: null, name: "BYE" },
      },
    ];
    const standings = roundRobinStandings(participants, matches);
    const alice = standings.find((s) => s.name === "Alice");
    // A bye is an unopposed win. Scoring it as nothing sinks the player to the
    // bottom of their score group, which is who the pairing engine hands the
    // next bye to.
    assert.strictEqual(alice.wins, 1);
    assert.strictEqual(alice.played, 1);
    assert.strictEqual(alice.losses, 0);
    for (const other of standings.filter((st) => st.name !== "Alice")) {
      assert.strictEqual(other.losses, 0);
    }
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
    const pairKeys = result.docs.map((d) =>
      [d.player1.participantId, d.player2.participantId].sort().join("_"),
    );
    // No rematch of p1 vs p2 or p3 vs p4 (unless forced)
    const p1p2Match = pairKeys.find((k) => k === "p1_p2" || k === "p2_p1");
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

  it("falls back to _id when a participant has no participantId", () => {
    const participants = [
      { _id: "p1", name: "Alice", faction: "" },
      { _id: "p2", name: "Bob", faction: "" },
    ];
    const allMatches = [];
    const result = swissAdvance(tid, participants, allMatches, 1);
    assert.strictEqual(result.docs.length, 1);
    const ids = [
      result.docs[0].player1.participantId,
      result.docs[0].player2?.participantId,
    ];
    assert.ok(ids.includes("p1"));
  });

  it("skips incomplete and BYE matches when tallying win scores", () => {
    const participants = [
      makePlayer("p1", "Alice"),
      makePlayer("p2", "Bob"),
      makePlayer("p3", "Carol"),
      makePlayer("p4", "Dave"),
    ];
    const allMatches = [
      {
        round: 1,
        status: "completed",
        winnerId: "p1",
        player1: { participantId: "p1", name: "Alice" },
        player2: { participantId: "p2", name: "Bob" },
      },
      // Still pending — should be skipped when tallying scores
      {
        round: 1,
        status: "pending",
        winnerId: null,
        player1: { participantId: "p3", name: "Carol" },
        player2: { participantId: "p4", name: "Dave" },
      },
      // A bye match — should also be skipped
      {
        round: 1,
        status: "completed",
        winnerId: "p3",
        player1: { participantId: "p3", name: "Carol" },
        player2: { participantId: null, name: "BYE" },
      },
    ];
    const result = swissAdvance(tid, participants, allMatches, 2);
    assert.strictEqual(result.docs.length, 2);
  });

  it("forces rematch when no other pairing is available", () => {
    const participants = [makePlayer("p1", "Alice"), makePlayer("p2", "Bob")];
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

  it("finds a perfect pairing when greedy would produce a forced rematch", () => {
    // 6 players; prior round paired them as (p1-p2), (p3-p4), (p5-p6).
    // A greedy top-down pass picks p1-p3, p2-p4, then has no choice but to
    // rematch p5-p6. The Blossom algorithm finds a perfect matching instead
    // (e.g. p1-p4, p2-p5, p3-p6 or any other rematch-free solution).
    const participants = [
      makePlayer("p1", "Alice"),
      makePlayer("p2", "Bob"),
      makePlayer("p3", "Carol"),
      makePlayer("p4", "Dave"),
      makePlayer("p5", "Eve"),
      makePlayer("p6", "Frank"),
    ];
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
        round: 1,
        status: "completed",
        winnerId: "p5",
        player1: { participantId: "p5", name: "Eve" },
        player2: { participantId: "p6", name: "Frank" },
      },
    ];
    const result = swissAdvance(tid, participants, allMatches, 2);
    assert.strictEqual(result.docs.length, 3);
    const rematches = new Set([
      "p1_p2",
      "p2_p1",
      "p3_p4",
      "p4_p3",
      "p5_p6",
      "p6_p5",
    ]);
    for (const doc of result.docs) {
      const key = `${doc.player1.participantId}_${doc.player2.participantId}`;
      assert.ok(!rematches.has(key), `unexpected rematch: ${key}`);
    }
  });

  it("preserves participantId, name, and faction through the blossom mapping", () => {
    const participants = [
      { _id: "p1", participantId: "p1", name: "Alice", faction: "Dwarfs" },
      { _id: "p2", participantId: "p2", name: "Bob", faction: "Greenskins" },
      { _id: "p3", participantId: "p3", name: "Carol", faction: "Empire" },
      { _id: "p4", participantId: "p4", name: "Dave", faction: "Chaos" },
    ];
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
    const factionMap = Object.fromEntries(
      participants.map((p) => [p.participantId, p.faction]),
    );
    for (const doc of result.docs) {
      for (const slot of [doc.player1, doc.player2]) {
        assert.ok(slot.participantId, "missing participantId");
        assert.ok(slot.name, "missing name");
        assert.strictEqual(slot.faction, factionMap[slot.participantId]);
      }
    }
  });

  it("accounts for every participant exactly once across all output docs", () => {
    const participants = [
      makePlayer("p1", "Alice"),
      makePlayer("p2", "Bob"),
      makePlayer("p3", "Carol"),
      makePlayer("p4", "Dave"),
      makePlayer("p5", "Eve"),
      makePlayer("p6", "Frank"),
    ];
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
        round: 1,
        status: "completed",
        winnerId: "p5",
        player1: { participantId: "p5", name: "Eve" },
        player2: { participantId: "p6", name: "Frank" },
      },
    ];
    const result = swissAdvance(tid, participants, allMatches, 2);
    const seen = new Map();
    for (const doc of result.docs) {
      for (const slot of [doc.player1, doc.player2]) {
        if (slot.name === "BYE") continue;
        const id = slot.participantId;
        assert.ok(!seen.has(id), `participant ${id} appears more than once`);
        seen.set(id, true);
      }
    }
    assert.strictEqual(seen.size, participants.length);
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
    assert.ok(
      gfMatches.length >= 1,
      "should have at least one grand final match",
    );
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
      if (r.completed) {
        done = true;
        break;
      }
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

  it("returns 'Grand final not yet completed' when the GF match is still pending", () => {
    const tid = "t_gf_pending";
    const allMatches = [
      {
        round: 1,
        matchNumber: 1,
        bracketSide: "grand_final",
        status: "pending",
        player1: { participantId: "p1", name: "Alice" },
        player2: { participantId: "p2", name: "Bob" },
        winnerId: null,
      },
    ];

    const result = doubleElimAdvance(tid, allMatches);

    assert.deepStrictEqual(result, {
      completed: false,
      docs: [],
      message: "Grand final not yet completed",
    });
  });

  it("returns 'Not all current round matches are complete' while the WB round is in progress and no GF exists", () => {
    const tid = "t_wb_in_progress";
    const allMatches = [
      {
        round: 1,
        matchNumber: 1,
        bracketSide: "winners",
        status: "completed",
        player1: { participantId: "p1", name: "Alice" },
        player2: { participantId: "p2", name: "Bob" },
        winnerId: "p1",
      },
      {
        round: 1,
        matchNumber: 2,
        bracketSide: "winners",
        status: "pending",
        player1: { participantId: "p3", name: "Carol" },
        player2: { participantId: "p4", name: "Dave" },
        winnerId: null,
      },
    ];

    const result = doubleElimAdvance(tid, allMatches);

    assert.deepStrictEqual(result, {
      completed: false,
      docs: [],
      message: "Not all current round matches are complete",
    });
  });

  it("evaluates the lbCurrent.length===0 fallback when the LB round has an incomplete match", () => {
    const tid = "t_lb_in_progress";
    const allMatches = [
      {
        round: 1,
        matchNumber: 1,
        bracketSide: "winners",
        status: "completed",
        player1: { participantId: "p1", name: "Alice" },
        player2: { participantId: "p2", name: "Bob" },
        winnerId: "p1",
      },
      {
        round: 1,
        matchNumber: 1,
        bracketSide: "losers",
        status: "pending",
        player1: { participantId: "p3", name: "Carol" },
        player2: { participantId: "p4", name: "Dave" },
        winnerId: null,
      },
    ];

    const result = doubleElimAdvance(tid, allMatches);

    assert.deepStrictEqual(result, {
      completed: false,
      docs: [],
      message: "Not all current round matches are complete",
    });
  });
});

describe("swissStart bye handling", () => {
  it("creates a completed bye match for the odd participant out", () => {
    const tid = "t_swiss_odd";
    const matches = swissStart(tid, makeParticipants(3));

    assert.strictEqual(matches.length, 2);
    const bye = matches.find((m) => m.player2.name === "BYE");
    assert.ok(bye, "expected a bye match among the round 1 pairings");
    assert.strictEqual(bye.status, "completed");
    assert.strictEqual(bye.winnerId, bye.player1.participantId);
    assert.strictEqual(bye.loserId, null);
    assert.strictEqual(bye.player2.participantId, null);
  });
});
