import React, { useState, useEffect, useRef } from "react";
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
import { Box, Button, Dialog, Portal, useDisclosure } from "@chakra-ui/react";
import {
  Participant,
  Round,
  FACTIONS,
  ParticipantList,
  TournamentBracket,
  ParticipantEditDialog,
} from "./bracket";
import { toaster } from "@/shared/ui/Toaster";

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
  // Initialize bracket with default participants
  const populateDefaultBracket = () => {
    const defaultRounds: Round[] = [
      {
        id: "r1",
        title: "Round 1",
        matches: [
          {
            id: "m1",
            title: "Match 1",
            bestOf: 3,
            roundId: "r1",
            participant1Id: "p1", // Player 1
            participant2Id: "p2", // Player 2
            winnerId: null,
          },
          {
            id: "m2",
            title: "Match 2",
            bestOf: 3,
            roundId: "r1",
            participant1Id: "p3", // Player 3
            participant2Id: "p4", // Player 4
            winnerId: null,
          },
          {
            id: "m3",
            title: "Match 3",
            bestOf: 3,
            roundId: "r1",
            participant1Id: "p5", // Player 5
            participant2Id: "p6", // Player 6
            winnerId: null,
          },
          {
            id: "m4",
            title: "Match 4",
            bestOf: 3,
            roundId: "r1",
            participant1Id: "p7", // Player 7
            participant2Id: "p8", // Player 8
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
    ];

    return defaultRounds;
  };

  // Load saved tournament data from localStorage on component mount
  useEffect(() => {
    try {
      const savedTournament = localStorage.getItem("tournament");
      if (savedTournament) {
        const tournamentData = JSON.parse(savedTournament);
        setParticipants(tournamentData.participants);
        setRounds(tournamentData.rounds);
        console.log("Tournament loaded from local storage");
      } else {
        // If no saved tournament data, initialize with default populated bracket
        setRounds(populateDefaultBracket());
        console.log("Initialized default bracket with participants");
      }
    } catch (error) {
      console.error("Error loading saved tournament:", error);
    }
  }, []);
  // Initialize with empty rounds, will be populated in useEffect
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

  // Confirmation dialogs for Reset actions
  const resetBracketDisclosure = useDisclosure();
  const resetParticipantsDisclosure = useDisclosure();

  const resetBracketCancelRef = useRef<HTMLButtonElement>(null);
  const resetParticipantsCancelRef = useRef<HTMLButtonElement>(null);

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
    // Find the highest numeric round number
    const numericRounds = rounds
      .map((r) => {
        const match = r.title.match(/Round\s+(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));

    const highestRoundNumber =
      numericRounds.length > 0 ? Math.max(...numericRounds) : 0;

    const nextRoundNumber = highestRoundNumber + 1;
    const newRoundId = `r${Date.now()}`;

    setRounds((prevRounds) => [
      ...prevRounds,
      {
        id: newRoundId,
        title: `Round ${nextRoundNumber}`,
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
  const saveTournament = () => {
    const tournamentData = {
      participants,
      rounds,
      lastUpdated: new Date().toISOString(),
    };

    try {
      localStorage.setItem("tournament", JSON.stringify(tournamentData));
      toaster.success({
        title: "Simple Bracket saved",
        description: "Your bracket has been saved successfully.",
      });
    } catch (error) {
      toaster.error({
        title: "Error saving tournament",
        description: error,
      });
    }
  };
  // Function to initiate bracket reset (opens confirmation dialog)
  const confirmResetBracket = () => {
    resetBracketDisclosure.onOpen();
  }; // Function to actually reset the bracket after confirmation
  const resetBracket = () => {
    // Initialize the populated bracket structure
    const populatedRounds = populateDefaultBracket();

    // Update state
    setRounds(populatedRounds);

    // Update localStorage to persist the changes
    try {
      const tournamentData = {
        participants,
        rounds: populatedRounds,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem("tournament", JSON.stringify(tournamentData));
    } catch (error) {
      console.error("Error saving reset bracket to local storage:", error);
    } // Show success notification
    toaster.success({
      title: "Bracket reset",
      description: "The bracket has been reset with default player matchups.",
    });

    // Close the dialog
    resetBracketDisclosure.onClose();
  };

  // Function to initiate participants reset (opens confirmation dialog)
  const confirmResetParticipants = () => {
    resetParticipantsDisclosure.onOpen();
  }; // Function to actually reset the participants list after confirmation
  const resetParticipants = () => {
    const defaultParticipants = [
      { id: "p1", name: "Player 1", faction: "Empire" },
      { id: "p2", name: "Player 2", faction: "Dwarfs" },
      { id: "p3", name: "Player 3", faction: "Greenskins" },
      { id: "p4", name: "Player 4", faction: "Vampire Counts" },
      { id: "p5", name: "Player 5", faction: "Bretonnia" },
      { id: "p6", name: "Player 6", faction: "High Elves" },
      { id: "p7", name: "Player 7", faction: "Dark Elves" },
      { id: "p8", name: "Player 8", faction: "Lizardmen" },
    ];

    setParticipants(defaultParticipants);

    // Reset rounds to the populated bracket state
    const populatedRounds = populateDefaultBracket();
    setRounds(populatedRounds);

    // Save the reset state to localStorage
    try {
      const tournamentData = {
        participants: defaultParticipants,
        rounds: populatedRounds,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem("tournament", JSON.stringify(tournamentData));
    } catch (error) {
      console.error("Error saving reset tournament to local storage:", error);
    }

    // Show success notification
    toaster.success({
      title: "Participants and Bracket Reset",
      description: "The tournament has been fully reset to default state.",
    });

    // Close the dialog
    resetParticipantsDisclosure.onClose();
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
      toaster.success({
        title: "Participant updated",
        description: `${editingParticipant.name} has been updated.`,
      });
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
        {" "}
        <ParticipantList
          participants={participants}
          activeParticipant={activeParticipant}
          newParticipantCount={newParticipantCount}
          onSetNewParticipantCount={setNewParticipantCount}
          onAddParticipants={addParticipants}
          onSaveTournament={saveTournament}
          onResetBracket={confirmResetBracket}
          onResetParticipants={confirmResetParticipants}
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
      {/* Reset Bracket Confirmation Dialog */}
      <Dialog.Root
        open={resetBracketDisclosure.open}
        onOpenChange={(e: { open: boolean }) =>
          !e.open && resetBracketDisclosure.onClose()
        }
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxWidth="400px">
              <Dialog.Header>
                <Dialog.Title>Reset Bracket</Dialog.Title>
              </Dialog.Header>{" "}
              <Dialog.Body>
                Are you sure you want to reset the bracket? This will reset the
                bracket to the default matchups with the first round
                pre-populated.
              </Dialog.Body>
              <Dialog.Footer gap={3}>
                <Button
                  ref={resetBracketCancelRef}
                  onClick={resetBracketDisclosure.onClose}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button colorScheme="red" onClick={resetBracket}>
                  Reset Bracket
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>{" "}
      {/* Reset Participants Confirmation Dialog */}
      <Dialog.Root
        open={resetParticipantsDisclosure.open}
        onOpenChange={(e: { open: boolean }) =>
          !e.open && resetParticipantsDisclosure.onClose()
        }
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxWidth="400px">
              <Dialog.Header>
                <Dialog.Title>Reset Participants</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                Are you sure you want to reset the participants list? This will
                restore all participants to the default list and clear the
                bracket.
              </Dialog.Body>
              <Dialog.Footer gap={3}>
                <Button
                  ref={resetParticipantsCancelRef}
                  onClick={resetParticipantsDisclosure.onClose}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button colorScheme="orange" onClick={resetParticipants}>
                  Reset Participants
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  );
};

export default SimpleBracket;
