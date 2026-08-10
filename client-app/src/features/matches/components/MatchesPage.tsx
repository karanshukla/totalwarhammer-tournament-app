import React, { useState, useEffect, useCallback, useRef } from "react";
import { Container, VStack, Text, Spinner } from "@chakra-ui/react";
import { useNavigate, useLocation, useMatch } from "react-router";
import { httpClient } from "@/core/api/httpClient";
import { getSocket } from "@/core/socket/socketClient";
import { useUserStore } from "@/shared/stores/userStore";
import { toaster } from "@/shared/ui/Toaster";
import { Match, Participant, Tournament } from "./types";
import TournamentList, { type GameFilter } from "./TournamentList";
import TournamentDetail from "./TournamentDetail";

const PAGE_SIZE = 12;

const MatchesPage: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const hasEverLoaded = useRef(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { user, isAuthenticated } = useUserStore();

  const [newName, setNewName] = useState("");
  const [newFaction, setNewFaction] = useState("");

  const [matches, setMatches] = useState<Match[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);

  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "active" | "completed"
  >("all");
  const [gameFilter, setGameFilter] = useState<GameFilter>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<
    Record<"all" | "pending" | "active" | "completed", number>
  >({ all: 0, pending: 0, active: 0, completed: 0 });

  const navigate = useNavigate();
  const { hash } = useLocation();
  const initialHashHandled = useRef(false);
  const tournamentRoute = useMatch("/matches/tournament/:code");
  const urlCode = tournamentRoute?.params.code?.toUpperCase() ?? null;

  const fetchTournaments = useCallback(async () => {
    if (!isAuthenticated()) {
      setLoading(false);
      setTournaments([]);
      return;
    }
    if (hasEverLoaded.current) {
      setListLoading(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(PAGE_SIZE),
      };
      if (statusFilter !== "all") params.status = statusFilter;
      if (gameFilter !== "all") params.game = gameFilter;
      const res = (await httpClient.get("/tournament/mine", { params })) as {
        success: boolean;
        data: Tournament[];
        total: number;
        statusCounts: Record<
          "all" | "pending" | "active" | "completed",
          number
        >;
      };
      hasEverLoaded.current = true;
      setTournaments(res.data ?? []);
      setTotal(res.total ?? 0);
      setStatusCounts(
        res.statusCounts ?? { all: 0, pending: 0, active: 0, completed: 0 },
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load tournaments",
      );
    } finally {
      setLoading(false);
      setListLoading(false);
    }
  }, [isAuthenticated, page, statusFilter, gameFilter]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const fetchMatches = useCallback(async (tournamentId: string) => {
    setMatchLoading(true);
    try {
      const res = (await httpClient.get(
        `/match/tournament/${tournamentId}`,
      )) as { success: boolean; data: Match[] };
      setMatches(res.data ?? []);
    } catch {
      setMatches([]);
    } finally {
      setMatchLoading(false);
    }
  }, []);

  const refreshSelected = useCallback(
    async (id: string) => {
      try {
        const res = (await httpClient.get(`/tournament/${id}`)) as {
          success: boolean;
          data: Tournament;
        };
        setSelected(res.data);
        setTournaments((prev) =>
          prev.map((t) => (t._id === id ? res.data : t)),
        );
        if (res.data.status === "active" || res.data.status === "completed") {
          await fetchMatches(id);
        }
      } catch {
        // silently fail
      }
    },
    [fetchMatches],
  );

  const handleFindByCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setCodeLoading(true);
    setCodeError(null);
    try {
      const res = (await httpClient.get(`/tournament/code/${code}`)) as {
        success: boolean;
        data: { _id: string; participants: { name: string }[] };
      };
      const t = res.data;
      const lowerName = user?.username?.trim().toLowerCase();
      const isParticipant = t.participants?.some(
        (p) => p.name.trim().toLowerCase() === lowerName || p.name === user?.id,
      );
      navigate(
        isParticipant
          ? `/matches/tournament/${code}`
          : `/matches/spectate/${code}`,
      );
      setCodeInput("");
    } catch {
      setCodeError("No tournament found with that code.");
    } finally {
      setCodeLoading(false);
    }
  };

  const handleAddParticipant = async () => {
    if (!selected || !newName.trim()) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await httpClient.post(`/tournament/${selected._id}/participants`, {
        name: newName.trim(),
        faction: newFaction,
      });
      setNewName("");
      setNewFaction("");
      await refreshSelected(selected._id);
      toaster.create({ title: "Participant added", type: "success" });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to add participant";
      setActionError(msg);
      toaster.create({ title: "Error", description: msg, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!selected) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await httpClient.delete(
        `/tournament/${selected._id}/participants/${participantId}`,
      );
      await refreshSelected(selected._id);
      toaster.create({ title: "Participant removed", type: "success" });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to remove participant";
      setActionError(msg);
      toaster.create({ title: "Error", description: msg, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordResult = async (matchId: string, winnerId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await httpClient.patch(`/match/${matchId}/result`, { winnerId });
      if (selected) await fetchMatches(selected._id);
      toaster.create({ title: "Result recorded", type: "success" });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to record result";
      setActionError(msg);
      toaster.create({ title: "Error", description: msg, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportResult = async (matchId: string, winnerId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await httpClient.patch(`/match/${matchId}/report`, { winnerId });
      if (selected) await fetchMatches(selected._id);
      toaster.create({
        title: "Result reported",
        description: "Waiting for opponent confirmation",
        type: "success",
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to report result";
      setActionError(msg);
      toaster.create({ title: "Error", description: msg, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOverrideResult = async (
    matchId: string,
    winnerId: string,
    reason: string,
  ) => {
    setActionError(null);
    try {
      await httpClient.patch(`/match/${matchId}/override`, {
        winnerId,
        reason,
      });
      if (selected) await fetchMatches(selected._id);
      toaster.create({ title: "Result overridden", type: "success" });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to override result";
      setActionError(msg);
      toaster.create({ title: "Error", description: msg, type: "error" });
      throw err;
    }
  };

  const handleStart = async () => {
    if (!selected) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await httpClient.post(`/tournament/${selected._id}/start`, {});
      await refreshSelected(selected._id);
      toaster.create({ title: "Tournament started!", type: "success" });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to start tournament";
      setActionError(msg);
      toaster.create({ title: "Error", description: msg, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveParticipant = async (participant: Participant) => {
    if (!selected) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await httpClient.patch(
        `/tournament/${selected._id}/participants/${participant._id}`,
        { name: participant.name, faction: participant.faction },
      );
      await refreshSelected(selected._id);
      toaster.create({ title: "Participant updated", type: "success" });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to update participant";
      setActionError(msg);
      toaster.create({ title: "Error", description: msg, type: "error" });
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveDispute = async (matchId: string, winnerId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await httpClient.patch(`/match/${matchId}/resolve`, { winnerId });
      if (selected) await fetchMatches(selected._id);
      toaster.create({ title: "Dispute resolved", type: "success" });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to resolve dispute";
      setActionError(msg);
      toaster.create({ title: "Error", description: msg, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdvanceRound = async () => {
    if (!selected) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = (await httpClient.post(
        `/tournament/${selected._id}/advance`,
        {},
      )) as { completed?: boolean };
      await refreshSelected(selected._id);
      if (res.completed) {
        toaster.create({
          title: "Tournament completed!",
          description: "Final standings are ready.",
          type: "success",
        });
      } else {
        toaster.create({ title: "Round advanced", type: "success" });
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to advance round";
      setActionError(msg);
      toaster.create({ title: "Error", description: msg, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveDescription = async (draft: string) => {
    if (!selected) return;
    setActionError(null);
    try {
      await httpClient.patch(`/tournament/${selected._id}/description`, {
        description: draft,
      });
      await refreshSelected(selected._id);
      toaster.create({ title: "Description updated", type: "success" });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to update description";
      setActionError(msg);
      toaster.create({ title: "Error", description: msg, type: "error" });
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await httpClient.delete(`/tournament/${selected._id}`);
      setSelected(null);
      await fetchTournaments();
      toaster.create({ title: "Tournament deleted", type: "success" });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete tournament";
      setActionError(msg);
      toaster.create({ title: "Error", description: msg, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectTournament = useCallback(
    async (t: Tournament) => {
      setSelected(t);
      setActionError(null);
      navigate(t.code ? `/matches/tournament/${t.code}` : `#${t._id}`);
      if (t.status === "active" || t.status === "completed") {
        await fetchMatches(t._id);
      } else {
        setMatches([]);
      }
    },
    [fetchMatches, navigate],
  );

  useEffect(() => {
    if (initialHashHandled.current) return;
    if (!loading && tournaments.length > 0 && hash) {
      const id = hash.slice(1);
      const found = tournaments.find((t) => t._id === id);
      if (found) {
        initialHashHandled.current = true;
        handleSelectTournament(found);
      }
    }
  }, [loading, tournaments, hash, handleSelectTournament]);

  useEffect(() => {
    if (!hash && !urlCode) {
      setSelected(null);
      setMatches([]);
    }
  }, [hash, urlCode]);

  // Auto-select tournament when arriving via /matches/tournament/:code
  useEffect(() => {
    if (!urlCode) return;
    if (loading) return;
    if (selected?.code?.toUpperCase() === urlCode) return;

    const found = tournaments.find((t) => t.code?.toUpperCase() === urlCode);
    if (found) {
      setSelected(found);
      if (found.status === "active" || found.status === "completed") {
        fetchMatches(found._id);
      }
      return;
    }

    httpClient
      .get<{ success: boolean; data: Tournament }>(
        `/tournament/code/${urlCode}`,
      )
      .then((res) => {
        const t = res.data;
        setSelected(t);
        if (t.status === "active" || t.status === "completed") {
          fetchMatches(t._id);
        }
      })
      .catch(() => navigate("/matches", { replace: true }));
  }, [urlCode, loading, tournaments, selected?.code, fetchMatches, navigate]);

  const selectedId = selected?._id;
  useEffect(() => {
    if (!selectedId) return;
    const socket = getSocket();
    socket.emit("tournament:join", selectedId);

    const onTournamentUpdated = (data: Tournament) => {
      setSelected(data);
      setTournaments((prev) =>
        prev.map((t) => (t._id === data._id ? data : t)),
      );
    };
    const onMatchesUpdated = (data: Match[]) => setMatches(data);
    const onMatchesAppended = (newMatches: Match[]) =>
      setMatches((prev) => [...prev, ...newMatches]);
    const onMatchUpdated = (updated: Match) =>
      setMatches((prev) =>
        prev.map((m) => (m._id === updated._id ? updated : m)),
      );

    socket.on("tournament:updated", onTournamentUpdated);
    socket.on("matches:updated", onMatchesUpdated);
    socket.on("matches:appended", onMatchesAppended);
    socket.on("match:updated", onMatchUpdated);

    return () => {
      socket.emit("tournament:leave", selectedId);
      socket.off("tournament:updated", onTournamentUpdated);
      socket.off("matches:updated", onMatchesUpdated);
      socket.off("matches:appended", onMatchesAppended);
      socket.off("match:updated", onMatchUpdated);
    };
  }, [selectedId]);

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack gap={4} py={16}>
          <Spinner size="xl" role="status" aria-label="Loading matches" />
          <Text color="fg.muted">Loading Matches...</Text>
        </VStack>
      </Container>
    );
  }

  if (selected) {
    return (
      <TournamentDetail
        selected={selected}
        matches={matches}
        user={user}
        newName={newName}
        newFaction={newFaction}
        actionLoading={actionLoading}
        actionError={actionError}
        matchLoading={matchLoading}
        onBack={() => {
          setSelected(null);
          navigate("/matches", { replace: true });
        }}
        onStart={handleStart}
        onDelete={handleDelete}
        onAddParticipant={handleAddParticipant}
        onRemoveParticipant={handleRemoveParticipant}
        onRecordResult={handleRecordResult}
        onReportResult={handleReportResult}
        onOverrideResult={handleOverrideResult}
        onResolveDispute={handleResolveDispute}
        onAdvanceRound={handleAdvanceRound}
        onSaveDescription={handleSaveDescription}
        onSaveParticipant={handleSaveParticipant}
        onSetNewName={setNewName}
        onSetNewFaction={setNewFaction}
      />
    );
  }

  return (
    <TournamentList
      tournaments={tournaments}
      statusCounts={statusCounts}
      page={page}
      total={total}
      pageSize={PAGE_SIZE}
      statusFilter={statusFilter}
      listLoading={listLoading}
      error={error}
      codeInput={codeInput}
      codeLoading={codeLoading}
      codeError={codeError}
      isAuthenticated={isAuthenticated()}
      gameFilter={gameFilter}
      onSelectTournament={handleSelectTournament}
      onFindByCode={handleFindByCode}
      onCodeInputChange={setCodeInput}
      onStatusFilterChange={(s) => {
        setStatusFilter(s);
        setPage(1);
      }}
      onGameFilterChange={setGameFilter}
      onPageChange={setPage}
    />
  );
};

export default MatchesPage;
