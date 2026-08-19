import type { Announcements } from "@dnd-kit/core";
import { SLOT_ID_PATTERN } from "./slotId";
import type { Participant, Round } from "./types";

/**
 * dnd-kit's default announcements read out the raw draggable id, so a keyboard
 * user hears "picked up draggable item slot-68f1…-2" instead of who or where.
 */
export const buildDragAnnouncements = (
  participants: Participant[],
  rounds: Round[],
): Announcements => {
  const describeDraggable = (id: string) =>
    participants.find((p) => p.id === id)?.name ?? "participant";

  const describeTarget = (id: string | undefined) => {
    if (!id) return null;

    const slot = SLOT_ID_PATTERN.exec(id);
    if (slot) {
      const [, matchId, position] = slot;
      const round = rounds.find((r) => r.matches.some((m) => m.id === matchId));
      const match = round?.matches.find((m) => m.id === matchId);
      return match
        ? `player ${position} of ${match.title} in ${round?.title}`
        : `player ${position} of a bracket match`;
    }

    const participant = participants.find((p) => p.id === id);
    return participant ? `the ${participant.name} position` : null;
  };

  return {
    onDragStart: ({ active }) =>
      `Picked up ${describeDraggable(String(active.id))}.`,
    onDragOver: ({ active, over }) => {
      const target = describeTarget(over ? String(over.id) : undefined);
      return target
        ? `${describeDraggable(String(active.id))} is over ${target}.`
        : `${describeDraggable(String(active.id))} is not over a drop target.`;
    },
    onDragEnd: ({ active, over }) => {
      const target = describeTarget(over ? String(over.id) : undefined);
      return target
        ? `Dropped ${describeDraggable(String(active.id))} on ${target}.`
        : `Dropped ${describeDraggable(String(active.id))}. No change.`;
    },
    onDragCancel: ({ active }) =>
      `Cancelled. ${describeDraggable(String(active.id))} was returned.`,
  };
};
