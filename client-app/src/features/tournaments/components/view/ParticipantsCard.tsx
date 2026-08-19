import React from "react";
import ParticipantRosterCard from "@/shared/ui/ParticipantRosterCard";
import type { Participant } from "@/shared/tournament/types";

interface ParticipantsCardProps {
  participants: Participant[];
  playerCount: number;
  isYou: (participant: Participant) => boolean;
}

const ParticipantsCard: React.FC<ParticipantsCardProps> = ({
  participants,
  playerCount,
  isYou,
}) => (
  <ParticipantRosterCard
    participants={participants}
    playerCount={playerCount}
    isYou={isYou}
  />
);

export default ParticipantsCard;
