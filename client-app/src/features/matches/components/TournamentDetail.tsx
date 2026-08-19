import React, { useState } from "react";
import { Container, SimpleGrid, VStack, Button } from "@chakra-ui/react";
import {
  LuTrash2,
  LuPlay,
  LuChevronLeft,
  LuEye,
  LuChevronsRight,
} from "react-icons/lu";
import { useNavigate } from "react-router";
import ChampionBanner from "@/shared/ui/ChampionBanner";
import TournamentPageHeader from "@/shared/ui/TournamentPageHeader";
import { championOf, isLeagueFormat } from "@/shared/tournament/outcome";
import { Match, Participant, Tournament } from "./types";
import MatchesSection from "./MatchesSection";
import EditParticipantDialog from "./EditParticipantDialog";
import AddParticipantCard from "./detail/AddParticipantCard";
import DescriptionEditor from "./detail/DescriptionEditor";
import ManagedInfoCard from "./detail/ManagedInfoCard";
import ManagedParticipantsCard from "./detail/ManagedParticipantsCard";
import { canAdvanceRound } from "./detail/roundProgress";
import Callout from "@/shared/ui/Callout";

interface Props {
  selected: Tournament;
  matches: Match[];
  user: { id: string; username?: string; isGuest?: boolean } | null;
  newName: string;
  newFaction: string;
  actionLoading: boolean;
  actionError: string | null;
  matchLoading: boolean;
  onBack: () => void;
  onStart: () => void;
  onDelete: () => void;
  onAddParticipant: () => void;
  onRemoveParticipant: (id: string) => void;
  onRecordResult: (matchId: string, winnerId: string) => void;
  onReportResult: (matchId: string, winnerId: string) => void;
  onOverrideResult: (
    matchId: string,
    winnerId: string,
    reason: string,
  ) => Promise<void>;
  onResolveDispute: (matchId: string, winnerId: string) => void;
  onAdvanceRound: () => void;
  onSaveDescription: (draft: string) => Promise<void>;
  onSaveParticipant: (participant: Participant) => Promise<void>;
  onSetNewName: (v: string) => void;
  onSetNewFaction: (v: string) => void;
}

const TournamentDetail: React.FC<Props> = ({
  selected,
  matches,
  user,
  newName,
  newFaction,
  actionLoading,
  actionError,
  matchLoading,
  onBack,
  onStart,
  onDelete,
  onAddParticipant,
  onRemoveParticipant,
  onRecordResult,
  onReportResult,
  onOverrideResult,
  onResolveDispute,
  onAdvanceRound,
  onSaveDescription,
  onSaveParticipant,
  onSetNewName,
  onSetNewFaction,
}) => {
  const navigate = useNavigate();

  const [editingParticipant, setEditingParticipant] =
    useState<Participant | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const isAdmin =
    !!user &&
    (selected.createdBy === user.id ||
      selected.createdBy?.toString() === user.id?.toString());
  const isFull = selected.participants.length >= selected.playerCount;
  const isPending = selected.status === "pending";
  const isActive = selected.status === "active";
  const isCompleted = selected.status === "completed";

  const canStart = isAdmin && isPending && selected.participants.length >= 2;
  const canDelete = isAdmin && isPending;
  const canAdvance =
    isAdmin && isActive && canAdvanceRound(selected.tournamentType, matches);

  const roundNumbers = [...new Set(matches.map((m) => m.round))].sort(
    (a, b) => a - b,
  );
  const isFinalRound =
    isLeagueFormat(selected.tournamentType) &&
    (selected.tournamentType === "Round Robin" ||
      Math.max(...matches.map((m) => m.round)) >= roundNumbers.length);

  const champion = isCompleted
    ? championOf(selected.tournamentType, selected.participants, matches)
    : null;

  const handleUpdateParticipant = async () => {
    if (!editingParticipant) return;
    try {
      await onSaveParticipant(editingParticipant);
      setEditDialogOpen(false);
      setEditingParticipant(null);
    } catch {
      // error shown via actionError from parent
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Button variant="ghost" size="sm" mb={6} onClick={onBack}>
        <LuChevronLeft />
        Back to Matches View
      </Button>

      <TournamentPageHeader
        tournament={selected}
        actions={
          <>
            <Button
              size="sm"
              variant="ghost"
              colorPalette="verdigris"
              onClick={() => navigate(`/matches/spectate/${selected.code}`)}
            >
              <LuEye />
              Spectator View
            </Button>
            {canStart && (
              <Button
                colorPalette="verdigris"
                size="sm"
                onClick={onStart}
                loading={actionLoading}
              >
                <LuPlay />
                Start Tournament
              </Button>
            )}
            {canAdvance && (
              <Button
                colorPalette="brass"
                size="sm"
                onClick={onAdvanceRound}
                loading={actionLoading}
              >
                <LuChevronsRight />
                {isFinalRound ? "Finalize Tournament" : "Advance Round"}
              </Button>
            )}
            {canDelete && (
              <Button
                colorPalette="crimson"
                variant="outline"
                size="sm"
                onClick={onDelete}
                loading={actionLoading}
              >
                <LuTrash2 />
                Delete
              </Button>
            )}
          </>
        }
      >
        <DescriptionEditor
          description={selected.description}
          editable={isAdmin && !isCompleted}
          onSave={onSaveDescription}
        />
      </TournamentPageHeader>

      {actionError && (
        <Callout tone="error" mb={6}>
          {actionError}
        </Callout>
      )}

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6} alignItems="start">
        <ManagedParticipantsCard
          participants={selected.participants}
          playerCount={selected.playerCount}
          user={user}
          isAdmin={isAdmin}
          isPending={isPending}
          actionLoading={actionLoading}
          onEdit={(p) => {
            setEditingParticipant(p);
            setEditDialogOpen(true);
          }}
          onRemove={onRemoveParticipant}
        />

        <VStack gap={6} alignItems="stretch">
          {isAdmin && isPending && (
            <AddParticipantCard
              tournament={selected}
              isFull={isFull}
              name={newName}
              faction={newFaction}
              actionLoading={actionLoading}
              onNameChange={onSetNewName}
              onFactionChange={onSetNewFaction}
              onAdd={onAddParticipant}
            />
          )}
          <ManagedInfoCard tournament={selected} matches={matches} />
        </VStack>

        <ChampionBanner champion={champion} gridColumn={{ lg: "1 / -1" }} />

        {(isActive || isCompleted) && (
          <MatchesSection
            matches={matches}
            selected={selected}
            user={user}
            isAdmin={isAdmin}
            isActive={isActive}
            actionLoading={actionLoading}
            matchLoading={matchLoading}
            onRecordResult={onRecordResult}
            onReportResult={onReportResult}
            onOverrideResult={onOverrideResult}
            onResolveDispute={onResolveDispute}
            onAdvanceRound={onAdvanceRound}
          />
        )}
      </SimpleGrid>

      <EditParticipantDialog
        open={editDialogOpen}
        participant={editingParticipant}
        actionLoading={actionLoading}
        tournament={selected}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingParticipant(null);
        }}
        onParticipantChange={setEditingParticipant}
        onSave={handleUpdateParticipant}
      />
    </Container>
  );
};

export default TournamentDetail;
