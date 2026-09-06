import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, useMatch } from "react-router";
import { httpClient } from "@/core/api/httpClient";
import {
  getSocket,
  joinTournamentRoom,
  leaveTournamentRoom,
} from "@/core/socket/socketClient";
import { toaster } from "@/shared/ui/toasterStore";
import type { Match, Participant, Tournament } from "../types";

interface UseTournamentWorkspaceOptions {
  tournaments: Tournament[];
  tournamentsLoading: boolean;
  setTournaments: React.Dispatch<React.SetStateAction<Tournament[]>>;
  fetchTournaments: () => Promise<void>;
}

/**
 * Owns the tournament a user has drilled into: its matches, the participant
 * form inputs, and every mutating action (start, delete, report a result,
 * etc.), plus the routing/realtime plumbing that keeps it in sync.
 */
export function useTournamentWorkspace({
  tournaments,
  tournamentsLoading,
  setTournaments,
  fetchTournaments,
}: UseTournamentWorkspaceOptions) {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const tournamentRoute = useMatch("/matches/tournament/:code");
  const urlCode = tournamentRoute?.params.code?.toUpperCase() ?? null;
  const initialHashHandled = useRef(false);

  const [selected, setSelected] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newFaction, setNewFaction] = useState("");

  const matchFetchSeq = useRef(0);
  const fetchMatches = useCallback(async (tournamentId: string) => {
    const seq = ++matchFetchSeq.current;
    setMatchLoading(true);
    try {
      const res = (await httpClient.get(
        `/match/tournament/${tournamentId}`,
      )) as { success: boolean; data: Match[] };
      if (seq === matchFetchSeq.current) setMatches(res.data ?? []);
    } catch {
      if (seq === matchFetchSeq.current) setMatches([]);
    } finally {
      if (seq === matchFetchSeq.current) setMatchLoading(false);
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
        // The organiser's own action already reported its own error via a
        // toast; a failed refresh here would just be a stale-view issue.
      }
    },
    [fetchMatches, setTournaments],
  );

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

  const handleBack = useCallback(() => {
    setSelected(null);
    navigate("/matches", { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (initialHashHandled.current) return;
    if (!tournamentsLoading && tournaments.length > 0 && hash) {
      const id = hash.slice(1);
      const found = tournaments.find((t) => t._id === id);
      if (found) {
        initialHashHandled.current = true;
        handleSelectTournament(found);
      }
    }
  }, [tournamentsLoading, tournaments, hash, handleSelectTournament]);

  useEffect(() => {
    if (!hash && !urlCode) {
      setSelected(null);
      setMatches([]);
    }
  }, [hash, urlCode]);

  useEffect(() => {
    if (!urlCode) return;
    if (tournamentsLoading) return;
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
  }, [
    urlCode,
    tournamentsLoading,
    tournaments,
    selected?.code,
    fetchMatches,
    navigate,
  ]);

  const selectedId = selected?._id;
  useEffect(() => {
    if (!selectedId) return;
    const socket = getSocket();
    joinTournamentRoom(selectedId);

    const onTournamentUpdated = (data: Tournament) => {
      setSelected(data);
      setTournaments((prev) =>
        prev.map((t) => (t._id === data._id ? data : t)),
      );
    };
    const onMatchesUpdated = (data: Match[]) => setMatches(data);
    // The organiser who triggered the advance also refetches over HTTP, and
    // the broadcast can land after that response — appending blindly would
    // render the new round twice with duplicate React keys. Also covers a
    // redelivered frame after a reconnect.
    const onMatchesAppended = (newMatches: Match[]) =>
      setMatches((prev) => {
        const known = new Set(prev.map((m) => m._id));
        return [...prev, ...newMatches.filter((m) => !known.has(m._id))];
      });
    const onMatchUpdated = (updated: Match) =>
      setMatches((prev) =>
        prev.map((m) => (m._id === updated._id ? updated : m)),
      );

    socket.on("tournament:updated", onTournamentUpdated);
    socket.on("matches:updated", onMatchesUpdated);
    socket.on("matches:appended", onMatchesAppended);
    socket.on("match:updated", onMatchUpdated);

    return () => {
      leaveTournamentRoom(selectedId);
      socket.off("tournament:updated", onTournamentUpdated);
      socket.off("matches:updated", onMatchesUpdated);
      socket.off("matches:appended", onMatchesAppended);
      socket.off("match:updated", onMatchUpdated);
    };
  }, [selectedId, setTournaments]);

  /** Runs a tournament action inside the shared loading/error state, mirroring the pattern every mutating handler below follows. */
  const runAction = useCallback(async (action: () => Promise<void>) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await action();
    } finally {
      setActionLoading(false);
    }
  }, []);

  const handleAddParticipant = async () => {
    // The name input stays enabled while the POST is in flight and Enter also
    // submits, so two quick presses added the participant twice.
    if (actionLoading) return;
    if (!selected || !newName.trim()) return;
    await runAction(async () => {
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
      }
    });
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!selected) return;
    await runAction(async () => {
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
      }
    });
  };

  const handleRecordResult = async (matchId: string, winnerId: string) => {
    await runAction(async () => {
      try {
        await httpClient.patch(`/match/${matchId}/result`, { winnerId });
        if (selected) await fetchMatches(selected._id);
        toaster.create({ title: "Result recorded", type: "success" });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to record result";
        setActionError(msg);
        toaster.create({ title: "Error", description: msg, type: "error" });
      }
    });
  };

  const handleReportResult = async (matchId: string, winnerId: string) => {
    await runAction(async () => {
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
      }
    });
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
    await runAction(async () => {
      try {
        await httpClient.post(`/tournament/${selected._id}/start`, {});
        await refreshSelected(selected._id);
        toaster.create({ title: "Tournament started!", type: "success" });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to start tournament";
        setActionError(msg);
        toaster.create({ title: "Error", description: msg, type: "error" });
      }
    });
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
    await runAction(async () => {
      try {
        await httpClient.patch(`/match/${matchId}/resolve`, { winnerId });
        if (selected) await fetchMatches(selected._id);
        toaster.create({ title: "Dispute resolved", type: "success" });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to resolve dispute";
        setActionError(msg);
        toaster.create({ title: "Error", description: msg, type: "error" });
      }
    });
  };

  const handleAdvanceRound = async () => {
    if (!selected) return;
    await runAction(async () => {
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
      }
    });
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
    await runAction(async () => {
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
      }
    });
  };

  return {
    selected,
    matches,
    matchLoading,
    actionLoading,
    actionError,
    newName,
    newFaction,
    setNewName,
    setNewFaction,
    handleSelectTournament,
    handleBack,
    handleStart,
    handleDelete,
    handleAddParticipant,
    handleRemoveParticipant,
    handleRecordResult,
    handleReportResult,
    handleOverrideResult,
    handleResolveDispute,
    handleAdvanceRound,
    handleSaveDescription,
    handleSaveParticipant,
  };
}
