import React from "react";
import TournamentInfoPanel from "@/shared/ui/TournamentInfoPanel";
import type { Match, Tournament } from "@/shared/tournament/types";

interface ManagedInfoCardProps {
  tournament: Tournament;
  matches: Match[];
}

const ManagedInfoCard: React.FC<ManagedInfoCardProps> = ({
  tournament,
  matches,
}) => <TournamentInfoPanel tournament={tournament} matches={matches} />;

export default ManagedInfoCard;
