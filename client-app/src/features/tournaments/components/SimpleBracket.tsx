import { useState } from "react";
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
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useDisclosure } from "@chakra-ui/react";
import {
  Participant,
  ParticipantList,
  TournamentBracket,
  ParticipantEditDialog,
} from "./bracket";
import { toaster } from "@/shared/ui/Toaster";
import { useTournamentStore } from "@/shared/stores/tournamentStore";

// Matches the `slot-${matchId}-${position}` id produced by
// MatchParticipantSlot's useDroppable(). Validating it here means a future
// change to the slot id scheme fails loudly instead of silently no-op'ing.
const SLOT_ID_PATTERN = /^slot-(.+)-(1|2)$/;

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
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const draggedParticipant = storeParticipants.find(
      (p) => p.id === active.id,
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

    const slotMatch = SLOT_ID_PATTERN.exec(overId);
    if (slotMatch) {
      const matchId = slotMatch[1];
      const positionString = slotMatch[2]; // "1" or "2"

      const matchExists = storeRounds.some((round) =>
        round.matches.some((m) => m.id === matchId),
      );

      if (!matchExists) {
        // The target match can disappear between dragStart and dragEnd (e.g. a
        // round/match deleted mid-drag). Surface it to the user, don't just log.
        console.error(
          `Could not find match with id: ${matchId} from slotId: ${overId}`,
        );
        toaster.error({
          title: "Drop target unavailable",
          description: "That match no longer exists.",
        });
      } else if (positionString === "1") {
        store.updateMatchParticipant(matchId, "participant1Id", activeId);
      } else if (positionString === "2") {
        store.updateMatchParticipant(matchId, "participant2Id", activeId);
      }
    } else if (overId.startsWith("slot-")) {
      // Looked like a slot but didn't match the `slot-<matchId>-<position>`
      // contract — a future ID scheme change would land here. Fail clearly
      // rather than silently no-op'ing on unvalidated string parsing.
      console.error(`Unrecognized slot id format: ${overId}`);
      toaster.error({
        title: "Invalid drop target",
        description: "That drop target could not be read.",
      });
    } else if (activeId !== overId) {
      const isActiveParticipant = storeParticipants.some(
        (p) => p.id === activeId,
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
            /* v8 ignore next */
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
