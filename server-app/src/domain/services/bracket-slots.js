/**
 * Building blocks shared by every bracket-format module (single/double
 * elimination, round robin, swiss): seeding, the participant→match-slot shape,
 * and bye handling.
 */

/** Fisher-Yates shuffle (in-place, returns array). */
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Slot object from a participant subdoc or from an existing match slot.
 *
 * `isBetaFaction` defaults to whatever the source already carries so that
 * re-slotting a winner into the next round preserves it. Advance functions
 * work from stored match slots and have no tournament flag to hand.
 */
export function slot(
  participant,
  isBetaFaction = participant.isBetaFaction ?? false,
) {
  return {
    participantId: participant._id ?? participant.participantId,
    name: participant.name,
    faction: participant.faction || "",
    isBetaFaction,
  };
}

export const byeSlot = () => ({
  participantId: null,
  name: "BYE",
  faction: "",
  isBetaFaction: false,
});

/** Bye match — player1 wins automatically. */
export function byeMatch(
  tournamentId,
  round,
  matchNumber,
  participant,
  bracketSide = null,
) {
  const player1 = slot(participant);
  return {
    tournament: tournamentId,
    round,
    matchNumber,
    player1,
    player2: byeSlot(),
    winnerId: player1.participantId,
    loserId: null,
    status: "completed",
    completedAt: new Date(),
    bracketSide,
  };
}
