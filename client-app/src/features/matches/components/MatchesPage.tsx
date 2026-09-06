import React from "react";
import { Container, VStack, Text, Spinner } from "@chakra-ui/react";
import { useUserStore } from "@/shared/stores/userStore";
import TournamentList from "./TournamentList";
import TournamentDetail from "./TournamentDetail";
import { useTournamentsList, PAGE_SIZE } from "./page/useTournamentsList";
import { useTournamentWorkspace } from "./page/useTournamentWorkspace";
import { useTournamentCodeLookup } from "./page/useTournamentCodeLookup";

const MatchesPage: React.FC = () => {
  const { user, isAuthenticated } = useUserStore();

  const list = useTournamentsList(isAuthenticated);
  const workspace = useTournamentWorkspace({
    tournaments: list.tournaments,
    tournamentsLoading: list.loading,
    setTournaments: list.setTournaments,
    fetchTournaments: list.fetchTournaments,
  });
  const codeLookup = useTournamentCodeLookup(user);

  if (list.loading) {
    return (
      <Container maxW="7xl" py={8}>
        <VStack gap={4} py={16}>
          <Spinner size="xl" role="status" aria-label="Loading matches" />
          <Text color="fg.muted">Loading Matches...</Text>
        </VStack>
      </Container>
    );
  }

  if (workspace.selected) {
    return (
      <TournamentDetail
        selected={workspace.selected}
        matches={workspace.matches}
        user={user}
        newName={workspace.newName}
        newFaction={workspace.newFaction}
        actionLoading={workspace.actionLoading}
        actionError={workspace.actionError}
        matchLoading={workspace.matchLoading}
        onBack={workspace.handleBack}
        onStart={workspace.handleStart}
        onDelete={workspace.handleDelete}
        onAddParticipant={workspace.handleAddParticipant}
        onRemoveParticipant={workspace.handleRemoveParticipant}
        onRecordResult={workspace.handleRecordResult}
        onReportResult={workspace.handleReportResult}
        onOverrideResult={workspace.handleOverrideResult}
        onResolveDispute={workspace.handleResolveDispute}
        onAdvanceRound={workspace.handleAdvanceRound}
        onSaveDescription={workspace.handleSaveDescription}
        onSaveParticipant={workspace.handleSaveParticipant}
        onSetNewName={workspace.setNewName}
        onSetNewFaction={workspace.setNewFaction}
      />
    );
  }

  return (
    <TournamentList
      tournaments={list.tournaments}
      statusCounts={list.statusCounts}
      page={list.page}
      total={list.total}
      pageSize={PAGE_SIZE}
      statusFilter={list.statusFilter}
      listLoading={list.listLoading}
      error={list.error}
      codeInput={codeLookup.codeInput}
      codeLoading={codeLookup.codeLoading}
      codeError={codeLookup.codeError}
      isAuthenticated={isAuthenticated()}
      gameFilter={list.gameFilter}
      onSelectTournament={workspace.handleSelectTournament}
      onFindByCode={codeLookup.handleFindByCode}
      onCodeInputChange={codeLookup.setCodeInput}
      onStatusFilterChange={list.changeStatusFilter}
      onGameFilterChange={list.changeGameFilter}
      onPageChange={list.setPage}
    />
  );
};

export default MatchesPage;
