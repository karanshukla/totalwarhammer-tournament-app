import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Box } from "@chakra-ui/react";
import { useDisclosure } from "@chakra-ui/react";
import {
  Participant,
  Round,
  FACTIONS,
  ParticipantList,
  TournamentBracket,
  ParticipantEditDialog,
} from "./bracket";
// Import React Icons that might be used in the components
import { LuPlus, LuPen, LuDelete } from "react-icons/lu";

const SimpleBracket = () => {
  const [participants, setParticipants] = useState<Participant[]>([
    { id: "p1", name: "Player 1", faction: "Empire" },
    { id: "p2", name: "Player 2", faction: "Dwarfs" },
    { id: "p3", name: "Player 3", faction: "Greenskins" },
    { id: "p4", name: "Player 4", faction: "Vampire Counts" },
    { id: "p5", name: "Player 5", faction: "Bretonnia" },
    { id: "p6", name: "Player 6", faction: "High Elves" },
    { id: "p7", name: "Player 7", faction: "Dark Elves" },
    { id: "p8", name: "Player 8", faction: "Lizardmen" },
  ]);

  const [rounds, setRounds] = useState<Round[]>([
    {
      id: "r1",
      title: "Round 1",
      matches: [
        {
          id: "m1",
          title: "Match 1",
          bestOf: 3,
          roundId: "r1",
          participant1Id: null,
          participant2Id: null,
          winnerId: null,
        },
        {
          id: "m2",
          title: "Match 2",
          bestOf: 3,
          roundId: "r1",
          participant1Id: null,
          participant2Id: null,
          winnerId: null,
        },
        {
          id: "m3",
          title: "Match 3",
          bestOf: 3,
          roundId: "r1",
          participant1Id: null,
          participant2Id: null,
          winnerId: null,
        },
        {
          id: "m4",
          title: "Match 4",
          bestOf: 3,
          roundId: "r1",
          participant1Id: null,
          participant2Id: null,
          winnerId: null,
        },
      ],
    },
    {
      id: "r2",
      title: "Semi-Finals",
      matches: [
        {
          id: "m5",
          title: "Match 5",
          bestOf: 3,
          roundId: "r2",
          participant1Id: null,
          participant2Id: null,
          winnerId: null,
        },
        {
          id: "m6",
          title: "Match 6",
          bestOf: 3,
          roundId: "r2",
          participant1Id: null,
          participant2Id: null,
          winnerId: null,
        },
      ],
    },
    {
      id: "r3",
      title: "Finals",
      matches: [
        {
          id: "m7",
          title: "Final Match",
          bestOf: 5,
          roundId: "r3",
          participant1Id: null,
          participant2Id: null,
          winnerId: null,
        },
      ],
    },
  ]);

  const [activeParticipant, setActiveParticipant] =
    useState<Participant | null>(null);
  const [newParticipantCount, setNewParticipantCount] = useState<number>(1);
  const [editingParticipant, setEditingParticipant] =
    useState<Participant | null>(null);

  // Modal for editing participants
  const { open: isDialogOpen, onOpen, onClose } = useDisclosure();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Function to handle dragging participants
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const draggedParticipant = participants.find((p) => p.id === active.id);

    if (draggedParticipant) {
      setActiveParticipant(draggedParticipant);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveParticipant(null);
      return;
    }

    const overId = over.id as string;

    // If dropping a participant onto a participant slot in the bracket
    if (overId.startsWith("slot-")) {
      const [_, matchId, position] = overId.split("-");

      setRounds((prevRounds) => {
        return prevRounds.map((round) => {
          return {
            ...round,
            matches: round.matches.map((match) => {
              if (match.id === matchId) {
                return {
                  ...match,
                  [position === "1" ? "participant1Id" : "participant2Id"]:
                    active.id as string,
                };
              }
              return match;
            }),
          };
        });
      });
    }
    // If reordering the participants list
    else if (
      active.id !== over.id &&
      participants.find((p) => p.id === active.id) &&
      participants.find((p) => p.id === over.id)
    ) {
      setParticipants((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }

    setActiveParticipant(null);
  };

  // Function to add an empty match to a round
  const addMatchToRound = (roundId: string) => {
    setRounds((prevRounds) => {
      return prevRounds.map((round) => {
        if (round.id === roundId) {
          const newMatchId = `m${Date.now()}`;
          return {
            ...round,
            matches: [
              ...round.matches,
              {
                id: newMatchId,
                title: `Match ${round.matches.length + 1}`,
                bestOf: 3,
                roundId,
                participant1Id: null,
                participant2Id: null,
                winnerId: null,
              },
            ],
          };
        }
        return round;
      });
    });
  };

  // Function to add a new round
  const addRound = () => {
    const newRoundId = `r${rounds.length + 1}`;
    setRounds((prevRounds) => [
      ...prevRounds,
      {
        id: newRoundId,
        title: `Round ${rounds.length + 1}`,
        matches: [],
      },
    ]);
  };

  // Function to remove a match
  const removeMatch = (matchId: string) => {
    setRounds((prevRounds) => {
      return prevRounds.map((round) => {
        return {
          ...round,
          matches: round.matches.filter((match) => match.id !== matchId),
        };
      });
    });
  };

  // Function to remove a participant from a match slot
  const removeParticipantFromSlot = (matchId: string, position: 1 | 2) => {
    setRounds((prevRounds) => {
      return prevRounds.map((round) => {
        return {
          ...round,
          matches: round.matches.map((match) => {
            if (match.id === matchId) {
              return {
                ...match,
                [position === 1 ? "participant1Id" : "participant2Id"]: null,
              };
            }
            return match;
          }),
        };
      });
    });
  };

  // Function to randomize participants
  const handleRandomize = () => {
    setParticipants((items) => [...items].sort(() => Math.random() - 0.5));
  };

  // Function to add new participants
  const addParticipants = () => {
    const currentCount = participants.length;
    const newParticipants: Participant[] = [];

    for (let i = 0; i < newParticipantCount; i++) {
      newParticipants.push({
        id: `p${currentCount + i + 1}`,
        name: `Player ${currentCount + i + 1}`,
        faction: FACTIONS[Math.floor(Math.random() * FACTIONS.length)],
      });
    }

    setParticipants([...participants, ...newParticipants]);
    setNewParticipantCount(1);
  };

  // Function to open the edit participant modal
  const openEditParticipantModal = (participant: Participant) => {
    setEditingParticipant({ ...participant });
    onOpen();
  };

  // Function to save participant edits
  const saveParticipantEdits = () => {
    if (editingParticipant) {
      setParticipants((prevParticipants) =>
        prevParticipants.map((p) =>
          p.id === editingParticipant.id ? editingParticipant : p
        )
      );
      onClose();
    }
  };

  // Function to delete a participant
  const deleteParticipant = (participantId: string) => {
    setParticipants((prevParticipants) =>
      prevParticipants.filter((p) => p.id !== participantId)
    );

    // Also remove this participant from any matches
    setRounds((prevRounds) => {
      return prevRounds.map((round) => {
        return {
          ...round,
          matches: round.matches.map((match) => {
            return {
              ...match,
              participant1Id:
                match.participant1Id === participantId
                  ? null
                  : match.participant1Id,
              participant2Id:
                match.participant2Id === participantId
                  ? null
                  : match.participant2Id,
              winnerId:
                match.winnerId === participantId ? null : match.winnerId,
            };
          }),
        };
      });
    });
  };

  return (
    <Box>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <ParticipantList
          participants={participants}
          activeParticipant={activeParticipant}
          newParticipantCount={newParticipantCount}
          onSetNewParticipantCount={setNewParticipantCount}
          onAddParticipants={addParticipants}
          onRandomize={handleRandomize}
          onEditParticipant={openEditParticipantModal}
          onDeleteParticipant={deleteParticipant}
        />

        <TournamentBracket
          rounds={rounds}
          participants={participants}
          onAddRound={addRound}
          onAddMatchToRound={addMatchToRound}
          onRemoveMatch={removeMatch}
          onRemoveParticipantFromSlot={removeParticipantFromSlot}
        />
      </DndContext>

      <ParticipantEditDialog
        isOpen={isDialogOpen}
        onClose={onClose}
        participant={editingParticipant}
        onParticipantChange={setEditingParticipant}
        onSave={saveParticipantEdits}
      />
    </Box>
  );
};

export default SimpleBracket;
