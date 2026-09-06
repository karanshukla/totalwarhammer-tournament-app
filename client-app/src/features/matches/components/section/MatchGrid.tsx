import React from "react";
import { For, SimpleGrid } from "@chakra-ui/react";
import type { Match } from "@/shared/tournament/types";
import MatchCard from "../MatchCard";
import {
  resolveMatchViewerRole,
  type MatchViewer,
} from "./resolveMatchViewerRole";

export interface MatchGridProps {
  matches: Match[];
  viewer: MatchViewer | null;
  isAdmin: boolean;
  isActive: boolean;
  actionLoading: boolean;
  overrideMatchId: string | null;
  overrideLoading: boolean;
  overrideWinnerId: string;
  overrideReason: string;
  onRecordResult: (matchId: string, winnerId: string) => void;
  onReportResult: (matchId: string, winnerId: string) => void;
  onResolveDispute: (matchId: string, winnerId: string) => void;
  onStartOverride: (matchId: string) => void;
  onCancelOverride: () => void;
  onSetOverrideWinner: (id: string) => void;
  onSetOverrideReason: (reason: string) => void;
  onConfirmOverride: () => void;
}

/** A responsive two-column grid of MatchCards for one round or bracket side. */
const MatchGrid: React.FC<MatchGridProps> = ({
  matches,
  viewer,
  isAdmin,
  isActive,
  actionLoading,
  overrideMatchId,
  overrideLoading,
  overrideWinnerId,
  overrideReason,
  onRecordResult,
  onReportResult,
  onResolveDispute,
  onStartOverride,
  onCancelOverride,
  onSetOverrideWinner,
  onSetOverrideReason,
  onConfirmOverride,
}) => (
  <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} alignItems="start">
    <For each={matches}>
      {(match) => {
        const { isP1, isP2, myReport, canParticipantReport } =
          resolveMatchViewerRole(match, viewer, isActive);
        return (
          <MatchCard
            key={match._id}
            match={match}
            isOverriding={overrideMatchId === match._id}
            isAdmin={isAdmin}
            isActive={isActive}
            myReport={myReport}
            canParticipantReport={canParticipantReport}
            isP1={isP1}
            isP2={isP2}
            actionLoading={actionLoading}
            overrideLoading={overrideLoading}
            overrideWinnerId={overrideWinnerId}
            overrideReason={overrideReason}
            onRecordResult={onRecordResult}
            onReportResult={onReportResult}
            onResolveDispute={onResolveDispute}
            onStartOverride={() => onStartOverride(match._id)}
            onCancelOverride={onCancelOverride}
            onSetOverrideWinner={onSetOverrideWinner}
            onSetOverrideReason={onSetOverrideReason}
            onConfirmOverride={onConfirmOverride}
          />
        );
      }}
    </For>
  </SimpleGrid>
);

export default MatchGrid;
