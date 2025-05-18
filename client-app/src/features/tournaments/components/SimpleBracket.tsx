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
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"; // Removed arrayMove
import { Box, Button, Dialog, Portal, useDisclosure } from "@chakra-ui/react";
import {
  Participant,
  // Round, // Round type might not be directly needed here if rounds are only from store
  FACTIONS, // FACTIONS needed for new participant default
  ParticipantList,
  TournamentBracket,
  ParticipantEditDialog,
  Match, // Match type is used for finding match details
} from "./bracket";
import { toaster } from "@/shared/ui/Toaster";
import { useTournamentStore } from "@/shared/stores/tournamentStore";

const SimpleBracket = () => {
  const store = useTournamentStore();

  const storeParticipants = useTournamentStore((state) => state.participants);
  const storeRounds = useTournamentStore((state) => state.rounds);

  const [activeParticipant, setActiveParticipant] =
    useState<Participant | null>(null);
  const [newParticipantCount, setNewParticipantCount] = useState<number>(1);
  const [editingParticipant, setEditingParticipant] =
    useState<Participant | null>(null);

  // For ParticipantEditDialog (Chakra Modal)
  const {
    open: isEditParticipantDialogOpen,
    onOpen: onEditParticipantDialogOnOpen,
    onClose: onEditParticipantDialogOnClose,
  } = useDisclosure();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const draggedParticipant = storeParticipants.find(
      (p) => p.id === active.id
    );
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
    const activeId = active.id as string;
    const overId = over.id as string;

    if (overId.startsWith("slot-")) {
      const parts = overId.split("-");
      const matchId = parts[1];
      const positionString = parts[2]; // "1" or "2"

      let matchExists = false;
      for (const round of storeRounds) {
        if (round.matches.some((m) => m.id === matchId)) {
          matchExists = true;
          break;
        }
      }

      if (matchExists) {
        if (positionString === "1") {
          store.updateMatchParticipant(matchId, "participant1Id", activeId);
        } else if (positionString === "2") {
          store.updateMatchParticipant(matchId, "participant2Id", activeId);
        }
      } else {
        console.error(
          `Could not find match with id: ${matchId} from slotId: ${overId}`
        );
      }
    } else if (activeId !== overId) {
      const isActiveParticipant = storeParticipants.some(
        (p) => p.id === activeId
      );
      const isOverParticipant = storeParticipants.some((p) => p.id === overId);
      if (isActiveParticipant && isOverParticipant) {
        store.reorderParticipants(activeId, overId);
      }
    }
    setActiveParticipant(null);
  };

  const saveParticipantEdits = (participantToSave: Participant) => {
    store.updateParticipant(participantToSave);
    onEditParticipantDialogOnClose();
    setEditingParticipant(null);
    toaster.success({
      description: `Participant ${participantToSave.name} updated.`,
    });
  };

  const openEditParticipantDialog = (participant: Participant) => {
    setEditingParticipant(participant);
    onEditParticipantDialogOnOpen();
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ParticipantList
        activeParticipant={activeParticipant}
        newParticipantCount={newParticipantCount}
        onSetNewParticipantCount={setNewParticipantCount}
        onEditParticipant={openEditParticipantDialog}
      />

      <TournamentBracket />
      {/* Removed props: rounds, participants, onAddRound, onAddMatchToRound, onRemoveMatch, onRemoveParticipantFromSlot */}

      {editingParticipant && (
        <ParticipantEditDialog
          isOpen={isEditParticipantDialogOpen}
          onClose={onEditParticipantDialogOnClose}
          participant={editingParticipant}
          onParticipantChange={setEditingParticipant} // Pass the state setter directly
          onSave={() => {
            if (editingParticipant) {
              saveParticipantEdits(editingParticipant);
            }
          }}
        />
      )}
    </DndContext>
  );
};

export default SimpleBracket;
