/** The droppable id for one player slot of a bracket match. */
export const slotIdFor = (matchId: string, position: 1 | 2) =>
  `slot-${matchId}-${position}`;

// Validating against this means a future change to the id scheme fails loudly
// instead of silently no-op'ing.
export const SLOT_ID_PATTERN = /^slot-(.+)-(1|2)$/;
