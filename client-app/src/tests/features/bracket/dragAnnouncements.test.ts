import { describe, it, expect } from "vitest";
import { buildDragAnnouncements } from "@/features/tournaments/components/bracket/dragAnnouncements";
import type {
  Participant,
  Round,
} from "@/features/tournaments/components/bracket/types";

const participants: Participant[] = [
  { id: "p1", name: "Karl Franz", faction: "Empire" },
  { id: "p2", name: "Grimgor", faction: "Greenskins" },
];

const rounds: Round[] = [
  {
    id: "r1",
    title: "Round 1",
    matches: [
      {
        id: "m1",
        title: "Match 1",
        roundId: "r1",
        bestOf: 3,
        participant1Id: null,
        participant2Id: null,
        winnerId: null,
      },
    ],
  },
];

const announcements = buildDragAnnouncements(participants, rounds);
const active = { id: "p1" } as never;

describe("buildDragAnnouncements", () => {
  it("names the participant instead of the raw id", () => {
    expect(announcements.onDragStart({ active })).toBe("Picked up Karl Franz.");
  });

  it("describes a bracket slot by match and round", () => {
    expect(
      announcements.onDragEnd({ active, over: { id: "slot-m1-2" } as never }),
    ).toBe("Dropped Karl Franz on player 2 of Match 1 in Round 1.");
  });

  it("describes a reorder target by participant name", () => {
    expect(
      announcements.onDragOver({ active, over: { id: "p2" } as never }),
    ).toBe("Karl Franz is over the Grimgor position.");
  });

  it("reports a drop with no target", () => {
    expect(announcements.onDragEnd({ active, over: null })).toBe(
      "Dropped Karl Franz. No change.",
    );
  });
});
