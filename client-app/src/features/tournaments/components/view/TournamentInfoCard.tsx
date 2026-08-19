import React from "react";
import TournamentInfoPanel from "@/shared/ui/TournamentInfoPanel";
import type { Match, Tournament } from "@/shared/tournament/types";

interface TournamentInfoCardProps {
  tournament: Tournament;
  matches?: Match[];
}

const TournamentInfoCard: React.FC<TournamentInfoCardProps> = ({
  tournament,
  matches,
}) => <TournamentInfoPanel tournament={tournament} matches={matches} />;

export default TournamentInfoCard;
