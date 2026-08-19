import React from "react";
import { Button } from "@chakra-ui/react";
import { LuPencil, LuX } from "react-icons/lu";
import ParticipantRosterCard from "@/shared/ui/ParticipantRosterCard";
import {
  isSameUser,
  type ParticipantViewer,
} from "@/shared/tournament/participants";
import type { Participant } from "@/shared/tournament/types";

interface ManagedParticipantsCardProps {
  participants: Participant[];
  playerCount: number;
  user: ParticipantViewer;
  isAdmin: boolean;
  isPending: boolean;
  actionLoading: boolean;
  onEdit: (participant: Participant) => void;
  onRemove: (participantId: string) => void;
}

const ManagedParticipantsCard: React.FC<ManagedParticipantsCardProps> = ({
  participants,
  playerCount,
  user,
  isAdmin,
  isPending,
  actionLoading,
  onEdit,
  onRemove,
}) => (
  <ParticipantRosterCard
    participants={participants}
    playerCount={playerCount}
    isYou={(p) => isSameUser(p, user)}
    renderActions={(p) =>
      isAdmin && (
        <>
          <Button
            size="xs"
            variant="ghost"
            colorPalette="ink"
            onClick={() => onEdit(p)}
            aria-label="Edit participant"
          >
            <LuPencil />
          </Button>
          {isPending && (
            <Button
              size="xs"
              variant="ghost"
              colorPalette="crimson"
              onClick={() => onRemove(p._id)}
              loading={actionLoading}
              aria-label="Remove participant"
            >
              <LuX />
            </Button>
          )}
        </>
      )
    }
  />
);

export default ManagedParticipantsCard;
