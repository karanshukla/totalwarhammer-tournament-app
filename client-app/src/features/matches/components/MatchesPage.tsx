// REWRITTEN - clean version
import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  Container,
  Heading,
  Text,
  Box,
  VStack,
  HStack,
  SimpleGrid,
  Card,
  Badge,
  Button,
  Input,
  Field,
  Spinner,
  Separator,
  For,
  chakra,
  Dialog,
  Portal,
  Table,
  Flex,
  Textarea,
} from "@chakra-ui/react";
import {
  LuTrophy,
  LuTrash2,
  LuPlay,
  LuUserPlus,
  LuUsers,
  LuX,
  LuChevronLeft,
  LuSwords,
  LuShieldAlert,
  LuCopy,
  LuEye,
  LuPencil,
  LuChevronsRight,
  LuClock,
  LuCircleCheck,
  LuCalendar,
  LuTrendingUp,
  LuAward,
  LuHash,
  LuFilePen,
  LuCheck,
} from "react-icons/lu";
import { useNavigate, useLocation } from "react-router-dom";
import { httpClient } from "@/core/api/httpClient";
import { getSocket } from "@/core/socket/socketClient";
import { useUserStore } from "@/shared/stores/userStore";
import { toaster } from "@/shared/ui/Toaster";
import MatchCard from "./MatchCard";

const warhammer3Factions = [
  "Empire",
  "Dwarfs",
  "Greenskins",
  "Vampire Counts",
  "Chaos Warriors",
  "Bretonnia",
  "Wood Elves",
  "Beastmen",
  "Skaven",
  "Lizardmen",
  "High Elves",
  "Dark Elves",
  "Tomb Kings",
  "Ogre Kingdoms",
  "Deamons of Chaos",
  "Norsca",
  "Nurgle",
  "Tzeentch",
  "Slaanesh",
  "Khorne",
  "Grand Cathay",
  "Kislev",
  "Ogres",
  "Chaos Dwarfs",
];

interface Match {
  _id: string;
  round: number;
  matchNumber: number;
  player1: { participantId: string; name: string; faction: string };
  player2: { participantId: string; name: string; faction: string };
  winnerId: string | null;
  loserId: string | null;
  status: "pending" | "in_progress" | "completed" | "disputed";
  notes: string;
  reportedResults: {
    reportedBy: string;
    reportedByName: string;
    winnerId: string;
  }[];
  resultOverrides: {
    previousWinnerId: string | null;
    newWinnerId: string;
    overriddenBy: string;
    reason: string;
    overriddenAt: string;
  }[];
  completedAt: string | null;
  bracketSide: "winners" | "losers" | "grand_final" | null;
}

interface Participant {
  _id: string;
  name: string;
  faction: string;
}

interface Tournament {
  _id: string;
  name: string;
  code: string;
  description: string;
  playerCount: number;
  tournamentType: string;
  bannedFactions: string[];
  participants: Participant[];
  status: "pending" | "active" | "completed";
  createdAt: string;
  createdBy: string;
}

const statusColorMap: Record<string, string> = {
  pending: "yellow",
  active: "green",
  completed: "gray",
};

const MatchesPage: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { user, isAuthenticated } = useUserStore();

  const [newName, setNewName] = useState("");
  const [newFaction, setNewFaction] = useState("");

  const [matches, setMatches] = useState<Match[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [overrideMatchId, setOverrideMatchId] = useState<string | null>(null);
  const [overrideWinnerId, setOverrideWinnerId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideLoading, setOverrideLoading] = useState(false);

  const [editingParticipant, setEditingParticipant] =
    useState<Participant | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const navigate = useNavigate();
  const { hash } = useLocation();
  const initialHashHandled = useRef(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "active" | "completed"
  >("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [descriptionLoading, setDescriptionLoading] = useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const cardBg = "bg.panel";
  const borderColor = "border";
  const selectedBg = "blue.subtle";
  const mutedBg = "bg.subtle";

  const fetchTournaments = useCallback(async () => {
    if (!isAuthenticated()) {
      setLoading(false);
      setTournaments([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = (await httpClient.get("/tournament/mine")) as {
        success: boolean;
        data: Tournament[];
      };
      setTournaments(res.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load tournaments",
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

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
        // silently fail — list will still show
      }
    },
    [fetchMatches],
  );

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

  const handleOverrideResult = async () => {
    if (!overrideMatchId || !overrideWinnerId) return;
    setOverrideLoading(true);
    setActionError(null);
    try {
      await httpClient.patch(`/match/${overrideMatchId}/override`, {
        winnerId: overrideWinnerId,
        reason: overrideReason,
      });
      setOverrideMatchId(null);
      setOverrideWinnerId("");
      setOverrideReason("");
      if (selected) await fetchMatches(selected._id);
      toaster.create({ title: "Result overridden", type: "success" });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to override result";
      setActionError(msg);
      toaster.create({ title: "Error", description: msg, type: "error" });
    } finally {
      setOverrideLoading(false);
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

  const handleUpdateParticipant = async () => {
    if (!selected || !editingParticipant) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await httpClient.patch(
        `/tournament/${selected._id}/participants/${editingParticipant._id}`,
        { name: editingParticipant.name, faction: editingParticipant.faction },
      );
      setEditDialogOpen(false);
      setEditingParticipant(null);
      await refreshSelected(selected._id);
      toaster.create({ title: "Participant updated", type: "success" });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to update participant";
      setActionError(msg);
      toaster.create({ title: "Error", description: msg, type: "error" });
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

  const handleUpdateDescription = async () => {
    if (!selected) return;
    setDescriptionLoading(true);
    setActionError(null);
    try {
      await httpClient.patch(`/tournament/${selected._id}/description`, {
        description: descriptionDraft,
      });
      await refreshSelected(selected._id);
      setEditingDescription(false);
      toaster.create({ title: "Description updated", type: "success" });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to update description";
      setActionError(msg);
      toaster.create({ title: "Error", description: msg, type: "error" });
    } finally {
      setDescriptionLoading(false);
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
      navigate(`#${t._id}`, { replace: true });
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
          <Spinner size="xl" />
          <Text color="fg.muted">Loading Matches...</Text>
        </VStack>
      </Container>
    );
  }

  if (selected) {
    const isFull = selected.participants.length >= selected.playerCount;
    const isAdmin =
      !!user &&
      (selected.createdBy === user.id ||
        selected.createdBy?.toString() === user.id?.toString());
    const canStart =
      isAdmin &&
      selected.status === "pending" &&
      selected.participants.length >= 2;
    const canDelete = isAdmin && selected.status === "pending";
    const isPending = selected.status === "pending";
    const isActive = selected.status === "active";
    const roundNumbers = [...new Set(matches.map((m) => m.round))].sort(
      (a, b) => a - b,
    );
    const tournamentType = selected.tournamentType;
    const isDoubleElim = tournamentType === "Double Elimination";
    const isRoundRobin = tournamentType === "Round Robin";
    const isSwiss = tournamentType === "Swiss System";
    const isRROrSwiss = isRoundRobin || isSwiss;

    // Standings for RR / Swiss
    const standings = isRROrSwiss
      ? (() => {
          const map = new Map<
            string,
            {
              name: string;
              faction: string;
              wins: number;
              losses: number;
              played: number;
            }
          >();
          for (const p of selected.participants) {
            map.set(p._id, {
              name: p.name,
              faction: p.faction,
              wins: 0,
              losses: 0,
              played: 0,
            });
          }
          for (const m of matches) {
            if (
              m.status !== "completed" ||
              !m.winnerId ||
              m.player2.name === "BYE"
            )
              continue;
            const wId = m.winnerId;
            const lId =
              wId === m.player1.participantId
                ? m.player2.participantId
                : m.player1.participantId;
            if (map.has(wId)) {
              const e = map.get(wId)!;
              e.wins++;
              e.played++;
            }
            if (lId && map.has(lId)) {
              const e = map.get(lId)!;
              e.losses++;
              e.played++;
            }
          }
          return [...map.values()].sort(
            (a, b) => b.wins - a.wins || a.losses - b.losses,
          );
        })()
      : [];

    // Double elim bracket splits
    const wbMatches = isDoubleElim
      ? matches.filter((m) => m.bracketSide === "winners")
      : [];
    const lbMatches = isDoubleElim
      ? matches.filter((m) => m.bracketSide === "losers")
      : [];
    const gfMatches = isDoubleElim
      ? matches.filter((m) => m.bracketSide === "grand_final")
      : [];
    const wbRounds = [...new Set(wbMatches.map((m) => m.round))].sort(
      (a, b) => a - b,
    );
    const lbRounds = [...new Set(lbMatches.map((m) => m.round))].sort(
      (a, b) => a - b,
    );

    return (
      <Container maxW="container.xl" py={8}>
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          mb={6}
          onClick={() => {
            setSelected(null);
            navigate("/matches", { replace: true });
          }}
        >
          <LuChevronLeft />
          Back to Match Management View
        </Button>

        {/* Header */}
        <HStack mb={6} gap={4} wrap="wrap" alignItems="flex-start">
          <VStack alignItems="flex-start" gap={1} flex={1}>
            <HStack gap={3} wrap="wrap">
              <Heading as="h1" size="xl">
                {selected.name}
              </Heading>
              <Badge colorPalette={statusColorMap[selected.status]} size="lg">
                {selected.status.charAt(0).toUpperCase() +
                  selected.status.slice(1)}
              </Badge>
            </HStack>
            <HStack gap={3} color="fg.muted" fontSize="sm" wrap="wrap">
              <Text>{selected.tournamentType}</Text>
              <Text>·</Text>
              <Text>
                {selected.participants.length}/{selected.playerCount} players
              </Text>
              {selected.code && (
                <>
                  <Text>·</Text>
                  <Text
                    fontFamily="mono"
                    fontWeight="bold"
                    letterSpacing="wider"
                  >
                    Code: {selected.code}
                  </Text>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => handleCopyCode(selected.code)}
                    colorPalette={codeCopied ? "green" : "gray"}
                  >
                    <LuCopy />
                    {codeCopied ? "Copied!" : "Copy"}
                  </Button>
                </>
              )}
            </HStack>
            {isAdmin && editingDescription ? (
              <VStack mt={2} gap={2} alignItems="stretch" w="full">
                <Textarea
                  value={descriptionDraft}
                  onChange={(e) =>
                    setDescriptionDraft(e.target.value.slice(0, 2000))
                  }
                  placeholder="Tournament description (Markdown supported)"
                  minH="240px"
                  h="240px"
                  resize="vertical"
                  fontSize="sm"
                  maxLength={2000}
                />
                <Text
                  fontSize="xs"
                  color={
                    descriptionDraft.length >= 2000 ? "red.fg" : "fg.muted"
                  }
                  textAlign="right"
                >
                  {descriptionDraft.length}/2000
                </Text>
                <HStack gap={2}>
                  <Button
                    size="xs"
                    colorPalette="blue"
                    onClick={handleUpdateDescription}
                    loading={descriptionLoading}
                  >
                    <LuCheck />
                    Save
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setEditingDescription(false)}
                  >
                    Cancel
                  </Button>
                </HStack>
              </VStack>
            ) : (
              <VStack mt={1} gap={2} alignItems="flex-start">
                {selected.description ? (
                  <Box
                    w="full"
                    fontSize="sm"
                    color="fg.muted"
                    css={{
                      "& h1,& h2,& h3,& h4,& h5,& h6": {
                        fontWeight: "bold",
                        lineHeight: 1.3,
                        marginTop: "0.75rem",
                        marginBottom: "0.25rem",
                      },
                      "& h1": { fontSize: "1.25rem" },
                      "& h2": { fontSize: "1.125rem" },
                      "& h3": { fontSize: "1rem" },
                      "& p": { marginBottom: "0.5rem", lineHeight: 1.6 },
                      "& ul,& ol": {
                        paddingLeft: "1.25rem",
                        marginBottom: "0.5rem",
                      },
                      "& li": { marginBottom: "0.25rem" },
                      "& strong": { fontWeight: "bold" },
                      "& em": { fontStyle: "italic" },
                      "& code": {
                        fontFamily: "monospace",
                        background: "var(--chakra-colors-bg-muted)",
                        padding: "0 4px",
                        borderRadius: "3px",
                        fontSize: "0.8em",
                      },
                      "& pre": {
                        background: "var(--chakra-colors-bg-muted)",
                        padding: "0.75rem",
                        borderRadius: "6px",
                        overflowX: "auto",
                        marginBottom: "0.5rem",
                        fontSize: "0.8em",
                      },
                      "& blockquote": {
                        borderLeft: "3px solid var(--chakra-colors-border)",
                        paddingLeft: "0.75rem",
                        color: "var(--chakra-colors-fg-muted)",
                        margin: "0.5rem 0",
                      },
                      "& a": {
                        color: "var(--chakra-colors-blue-fg)",
                        textDecoration: "underline",
                      },
                    }}
                  >
                    <ReactMarkdown>{selected.description}</ReactMarkdown>
                  </Box>
                ) : isAdmin && selected.status !== "completed" ? (
                  <Text color="fg.subtle" fontSize="sm" fontStyle="italic">
                    No description - click Edit Description to add one.
                  </Text>
                ) : null}
                {isAdmin && selected.status !== "completed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    alignSelf="flex-start"
                    onClick={() => {
                      setDescriptionDraft(selected.description ?? "");
                      setEditingDescription(true);
                    }}
                  >
                    <LuFilePen />
                    Edit Description
                  </Button>
                )}
              </VStack>
            )}
          </VStack>
          <HStack gap={2}>
            <Button
              size="sm"
              variant="ghost"
              colorPalette="blue"
              onClick={() => navigate(`/matches/spectate/${selected._id}`)}
            >
              <LuEye />
              Spectator View
            </Button>
            {canStart && (
              <Button
                colorPalette="green"
                size="sm"
                onClick={handleStart}
                loading={actionLoading}
              >
                <LuPlay />
                Start Tournament
              </Button>
            )}
            {isAdmin &&
              isActive &&
              matches.length > 0 &&
              (() => {
                if (isDoubleElim) {
                  const wbMax = Math.max(
                    ...matches
                      .filter((m) => m.bracketSide === "winners")
                      .map((m) => m.round),
                    0,
                  );
                  const lbMax = Math.max(
                    ...matches
                      .filter((m) => m.bracketSide === "losers")
                      .map((m) => m.round),
                    0,
                  );
                  const gfLast = matches
                    .filter((m) => m.bracketSide === "grand_final")
                    .slice(-1)[0];
                  const wbDone = matches
                    .filter(
                      (m) => m.bracketSide === "winners" && m.round === wbMax,
                    )
                    .every((m) => m.status === "completed");
                  const lbDone =
                    lbMax === 0 ||
                    matches
                      .filter(
                        (m) => m.bracketSide === "losers" && m.round === lbMax,
                      )
                      .every((m) => m.status === "completed");
                  const gfDone = !gfLast || gfLast.status === "completed";
                  return wbDone && lbDone && gfDone;
                }
                const maxRound = Math.max(...matches.map((m) => m.round));
                return matches
                  .filter((m) => m.round === maxRound)
                  .every((m) => m.status === "completed");
              })() && (
                <Button
                  colorPalette="blue"
                  size="sm"
                  onClick={handleAdvanceRound}
                  loading={actionLoading}
                >
                  <LuChevronsRight />
                  {isRoundRobin
                    ? "Finalize Tournament"
                    : isSwiss &&
                        Math.max(...matches.map((m) => m.round)) >=
                          roundNumbers.length
                      ? "Finalize Tournament"
                      : "Advance Round"}
                </Button>
              )}
            {canDelete && (
              <Button
                colorPalette="red"
                variant="outline"
                size="sm"
                onClick={handleDelete}
                loading={actionLoading}
              >
                <LuTrash2 />
                Delete
              </Button>
            )}
          </HStack>
        </HStack>

        {actionError && (
          <Box
            mb={6}
            p={3}
            bg="red.subtle"
            borderRadius="md"
            borderWidth={1}
            borderColor="red.muted"
          >
            <Text color="red.fg">{actionError}</Text>
          </Box>
        )}

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
          {/* Participants */}
          <Card.Root bg={cardBg}>
            <Card.Header>
              <HStack gap={2}>
                <LuUsers />
                <Heading size="md">
                  Participants ({selected.participants.length}/
                  {selected.playerCount})
                </Heading>
              </HStack>
            </Card.Header>
            <Card.Body>
              {selected.participants.length === 0 ? (
                <Text color="fg.muted" textAlign="center" py={4}>
                  No Participants Yet
                </Text>
              ) : (
                <VStack gap={2} alignItems="stretch">
                  <For each={selected.participants}>
                    {(p) => (
                      <HStack
                        key={p._id}
                        p={3}
                        borderRadius="md"
                        borderWidth={1}
                        borderColor={borderColor}
                        bg={selectedBg}
                        justifyContent="space-between"
                      >
                        <VStack alignItems="flex-start" gap={0}>
                          <Text fontWeight="medium">{p.name}</Text>
                          {p.faction && (
                            <Text fontSize="xs" color="fg.muted">
                              {p.faction}
                            </Text>
                          )}
                        </VStack>
                        <HStack gap={1}>
                          {isAdmin && (
                            <Button
                              size="xs"
                              variant="ghost"
                              colorPalette="blue"
                              onClick={() => {
                                setEditingParticipant(p);
                                setEditDialogOpen(true);
                              }}
                              aria-label="Edit participant"
                            >
                              <LuPencil />
                            </Button>
                          )}
                          {isAdmin && isPending && (
                            <Button
                              size="xs"
                              variant="ghost"
                              colorPalette="red"
                              onClick={() => handleRemoveParticipant(p._id)}
                              loading={actionLoading}
                              aria-label="Remove participant"
                            >
                              <LuX />
                            </Button>
                          )}
                        </HStack>
                      </HStack>
                    )}
                  </For>
                </VStack>
              )}
            </Card.Body>
          </Card.Root>

          {/* Add Participant (admin only, pending) or Tournament Info (active/completed) */}
          {isAdmin && isPending ? (
            <Card.Root bg={cardBg}>
              <Card.Header>
                <Heading size="md">Add Participant</Heading>
                {isFull && (
                  <Text fontSize="sm" color="orange.fg" mt={1}>
                    Tournament is full
                  </Text>
                )}
              </Card.Header>
              <Card.Body>
                <VStack gap={4}>
                  <Field.Root>
                    <Field.Label>Player Name</Field.Label>
                    <Input
                      placeholder="Enter player name"
                      value={newName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewName(e.target.value)
                      }
                      disabled={isFull}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                        e.key === "Enter" && handleAddParticipant()
                      }
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>
                      Faction{" "}
                      <Text as="span" color="fg.muted" fontSize="sm">
                        (optional)
                      </Text>
                    </Field.Label>
                    <chakra.select
                      value={newFaction}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setNewFaction(e.target.value)
                      }
                      disabled={isFull}
                      w="full"
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="border"
                      fontSize="sm"
                      color="fg"
                      p={2}
                    >
                      <option value="">No Faction</option>
                      {warhammer3Factions
                        .filter((f) => !selected.bannedFactions.includes(f))
                        .map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                    </chakra.select>
                  </Field.Root>
                  <Button
                    width="full"
                    colorPalette="blue"
                    onClick={handleAddParticipant}
                    disabled={!newName.trim() || isFull}
                    loading={actionLoading}
                  >
                    <LuUserPlus />
                    Add Participant
                  </Button>
                </VStack>
              </Card.Body>
            </Card.Root>
          ) : (
            <Card.Root bg={cardBg}>
              <Card.Header>
                <HStack gap={2}>
                  <LuTrophy />
                  <Heading size="md">Tournament Info</Heading>
                </HStack>
              </Card.Header>
              <Card.Body>
                <VStack gap={3} alignItems="stretch">
                  {/* Tournament Code */}
                  <HStack justifyContent="space-between">
                    <HStack gap={1}>
                      <LuHash size={14} />
                      <Text color="fg.muted" fontSize="sm">
                        Code
                      </Text>
                    </HStack>
                    <HStack gap={1}>
                      <Text fontWeight="medium" fontFamily="mono">
                        {selected.code}
                      </Text>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(selected.code);
                          toaster.create({
                            title: "Copied!",
                            description: "Tournament code copied to clipboard",
                            type: "success",
                          });
                        }}
                      >
                        <LuCopy size={14} />
                      </Button>
                    </HStack>
                  </HStack>
                  <Separator />

                  {/* Format */}
                  <HStack justifyContent="space-between">
                    <HStack gap={1}>
                      <LuSwords size={14} />
                      <Text color="fg.muted" fontSize="sm">
                        Format
                      </Text>
                    </HStack>
                    <Text fontWeight="medium">{selected.tournamentType}</Text>
                  </HStack>
                  <Separator />

                  {/* Players */}
                  <HStack justifyContent="space-between">
                    <HStack gap={1}>
                      <LuUsers size={14} />
                      <Text color="fg.muted" fontSize="sm">
                        Players
                      </Text>
                    </HStack>
                    <Text fontWeight="medium">
                      {selected.participants.length}/{selected.playerCount}
                    </Text>
                  </HStack>
                  <Separator />

                  {/* Current Round (for active Swiss/DE tournaments) */}
                  {isActive && matches.length > 0 && !isRoundRobin && (
                    <>
                      <HStack justifyContent="space-between">
                        <HStack gap={1}>
                          <LuTrendingUp size={14} />
                          <Text color="fg.muted" fontSize="sm">
                            Current Round
                          </Text>
                        </HStack>
                        <Text fontWeight="medium">
                          {Math.max(
                            ...matches
                              .filter(
                                (m) =>
                                  m.bracketSide !== "losers" &&
                                  m.bracketSide !== "grand_final",
                              )
                              .map((m) => m.round),
                          )}{" "}
                          of {roundNumbers.length}
                        </Text>
                      </HStack>
                      <Separator />
                    </>
                  )}

                  {/* Match Progress */}
                  {matches.length > 0 && (
                    <>
                      <HStack justifyContent="space-between">
                        <HStack gap={1}>
                          <LuCircleCheck size={14} />
                          <Text color="fg.muted" fontSize="sm">
                            Matches Completed
                          </Text>
                        </HStack>
                        <Text fontWeight="medium">
                          {
                            matches.filter((m) => m.status === "completed")
                              .length
                          }
                          / {matches.length}
                        </Text>
                      </HStack>
                      <Separator />
                    </>
                  )}

                  {/* Champion (for completed tournaments) */}
                  {selected.status === "completed" && (
                    <>
                      <HStack justifyContent="space-between">
                        <HStack gap={1}>
                          <Box
                            as="span"
                            color="yellow.fg"
                            display="inline-flex"
                          >
                            <LuAward size={14} />
                          </Box>
                          <Text color="fg.muted" fontSize="sm">
                            Champion
                          </Text>
                        </HStack>
                        {(() => {
                          const finalMatch = matches.find(
                            (m) =>
                              m.winnerId &&
                              m.round ===
                                Math.max(...matches.map((x) => x.round)),
                          );
                          if (!finalMatch)
                            return <Text fontWeight="medium">-</Text>;
                          const champion =
                            finalMatch.winnerId ===
                            finalMatch.player1.participantId
                              ? finalMatch.player1
                              : finalMatch.player2;
                          return (
                            <Text fontWeight="bold" color="yellow.fg">
                              {champion.name}
                            </Text>
                          );
                        })()}
                      </HStack>
                      <Separator />
                    </>
                  )}

                  {/* Status */}
                  <HStack justifyContent="space-between">
                    <HStack gap={1}>
                      <LuClock size={14} />
                      <Text color="fg.muted" fontSize="sm">
                        Status
                      </Text>
                    </HStack>
                    <Badge colorPalette={statusColorMap[selected.status]}>
                      {selected.status.charAt(0).toUpperCase() +
                        selected.status.slice(1)}
                    </Badge>
                  </HStack>
                  <Separator />

                  {/* Created */}
                  <HStack justifyContent="space-between">
                    <HStack gap={1}>
                      <LuCalendar size={14} />
                      <Text color="fg.muted" fontSize="sm">
                        Created
                      </Text>
                    </HStack>
                    <Text fontSize="sm">
                      {new Date(selected.createdAt).toLocaleDateString()}
                    </Text>
                  </HStack>
                  {selected.bannedFactions.length > 0 && (
                    <>
                      <Separator />
                      <VStack alignItems="flex-start" gap={1}>
                        <Text color="fg.muted" fontSize="sm">
                          Banned Factions
                        </Text>
                        <HStack wrap="wrap" gap={1}>
                          <For each={selected.bannedFactions}>
                            {(f) => (
                              <Badge
                                key={f}
                                colorPalette="red"
                                size="sm"
                                variant="subtle"
                              >
                                {f}
                              </Badge>
                            )}
                          </For>
                        </HStack>
                      </VStack>
                    </>
                  )}
                </VStack>
              </Card.Body>
            </Card.Root>
          )}

          {/* Champion banner for completed tournaments */}
          {selected.status === "completed" &&
            (() => {
              const finalRound = Math.max(...matches.map((m) => m.round));
              const finalMatch = matches.find(
                (m) => m.round === finalRound && m.winnerId,
              );
              if (!finalMatch) return null;
              const champion =
                finalMatch.winnerId === finalMatch.player1.participantId
                  ? finalMatch.player1
                  : finalMatch.player2;
              return (
                <Box
                  mb={0}
                  p={5}
                  borderRadius="lg"
                  bg="yellow.subtle"
                  borderWidth={1}
                  borderColor="yellow.muted"
                  textAlign="center"
                  gridColumn={{ lg: "1 / -1" }}
                >
                  <HStack justifyContent="center" gap={3}>
                    <LuTrophy
                      size={24}
                      color="var(--chakra-colors-yellow-500)"
                    />
                    <VStack gap={0}>
                      <Text
                        fontSize="xs"
                        fontWeight="semibold"
                        textTransform="uppercase"
                        letterSpacing="wider"
                        color="fg.muted"
                      >
                        Tournament Champion
                      </Text>
                      <Text fontSize="2xl" fontWeight="bold">
                        {champion.name}
                      </Text>
                      {champion.faction && (
                        <Text fontSize="sm" color="fg.muted">
                          {champion.faction}
                        </Text>
                      )}
                    </VStack>
                    <LuTrophy
                      size={24}
                      color="var(--chakra-colors-yellow-500)"
                    />
                  </HStack>
                </Box>
              );
            })()}

          {/* Matches */}
          {(isActive || selected.status === "completed") && (
            <Card.Root gridColumn={{ lg: "1 / -1" }} bg={cardBg}>
              <Card.Header>
                <HStack justifyContent="space-between">
                  <HStack gap={2}>
                    <LuSwords />
                    <Heading size="md">Matches</Heading>
                    {matches.length > 0 && !isDoubleElim && !isRROrSwiss && (
                      <Badge colorPalette="gray" variant="subtle">
                        Round {Math.max(...matches.map((m) => m.round))} of{" "}
                        {roundNumbers.length}
                      </Badge>
                    )}
                    {isRoundRobin && (
                      <Badge colorPalette="teal" variant="subtle">
                        Round Robin
                      </Badge>
                    )}
                    {isSwiss && (
                      <Badge colorPalette="purple" variant="subtle">
                        Swiss System
                      </Badge>
                    )}
                    {isDoubleElim && (
                      <Badge colorPalette="blue" variant="subtle">
                        Double Elimination
                      </Badge>
                    )}
                  </HStack>
                  {matchLoading && <Spinner size="sm" />}
                </HStack>
              </Card.Header>
              <Card.Body>
                {matches.length === 0 ? (
                  <Text color="fg.muted" textAlign="center" py={4}>
                    No Matches Generated Yet
                  </Text>
                ) : (
                  <VStack gap={6} alignItems="stretch">
                    {/* ── Standings table for RR / Swiss ── */}
                    {isRROrSwiss && standings.length > 0 && (
                      <Box>
                        <Text
                          fontWeight="semibold"
                          fontSize="sm"
                          color="fg.muted"
                          textTransform="uppercase"
                          letterSpacing="wider"
                          mb={2}
                        >
                          Standings
                        </Text>
                        <Table.Root size="sm" variant="outline">
                          <Table.Header>
                            <Table.Row>
                              <Table.ColumnHeader>#</Table.ColumnHeader>
                              <Table.ColumnHeader>Player</Table.ColumnHeader>
                              <Table.ColumnHeader>Faction</Table.ColumnHeader>
                              <Table.ColumnHeader textAlign="center">
                                W
                              </Table.ColumnHeader>
                              <Table.ColumnHeader textAlign="center">
                                L
                              </Table.ColumnHeader>
                              <Table.ColumnHeader textAlign="center">
                                Played
                              </Table.ColumnHeader>
                            </Table.Row>
                          </Table.Header>
                          <Table.Body>
                            {standings.map((s, i) => (
                              <Table.Row key={s.name}>
                                <Table.Cell color="fg.muted">
                                  {i + 1}
                                </Table.Cell>
                                <Table.Cell
                                  fontWeight={i === 0 ? "bold" : "normal"}
                                >
                                  {s.name}
                                </Table.Cell>
                                <Table.Cell color="fg.muted">
                                  {s.faction || "-"}
                                </Table.Cell>
                                <Table.Cell textAlign="center" color="green.fg">
                                  {s.wins}
                                </Table.Cell>
                                <Table.Cell textAlign="center" color="red.fg">
                                  {s.losses}
                                </Table.Cell>
                                <Table.Cell textAlign="center">
                                  {s.played}
                                </Table.Cell>
                              </Table.Row>
                            ))}
                          </Table.Body>
                        </Table.Root>
                        <Separator mt={4} />
                      </Box>
                    )}

                    {/* ── Double Elimination: separate WB / LB / GF sections ── */}
                    {isDoubleElim && (
                      <>
                        {wbRounds.length > 0 && (
                          <Box>
                            <HStack mb={3} gap={2}>
                              <Text
                                fontWeight="semibold"
                                fontSize="sm"
                                textTransform="uppercase"
                                letterSpacing="wider"
                                color="blue.fg"
                              >
                                Winners Bracket
                              </Text>
                              <Badge
                                colorPalette="blue"
                                size="sm"
                                variant="subtle"
                              >
                                W
                              </Badge>
                            </HStack>
                            <VStack gap={4} alignItems="stretch">
                              {wbRounds.map((round) => (
                                <Box key={`wb-${round}`}>
                                  <Text
                                    fontSize="xs"
                                    color="fg.muted"
                                    fontWeight="medium"
                                    mb={2}
                                  >
                                    Round {round}
                                  </Text>
                                  <SimpleGrid
                                    columns={{ base: 1, md: 2 }}
                                    gap={3}
                                  >
                                    <For
                                      each={wbMatches.filter(
                                        (m) => m.round === round,
                                      )}
                                    >
                                      {(m) => {
                                        const p1Won =
                                          m.winnerId ===
                                          m.player1.participantId;
                                        const p2Won =
                                          m.winnerId ===
                                          m.player2.participantId;
                                        const isOverriding =
                                          overrideMatchId === m._id;
                                        const uName = user?.username
                                          ?.trim()
                                          .toLowerCase();
                                        const uId = user?.id;
                                        const guestFallback =
                                          user?.isGuest && uId
                                            ? `guest_${uId.substring(0, 6)}`
                                            : null;
                                        const nameMatchFn = (n: string) => {
                                          const ln = n.trim().toLowerCase();
                                          return (
                                            (uName && ln === uName) ||
                                            (guestFallback &&
                                              ln === guestFallback)
                                          );
                                        };
                                        const isP1 =
                                          m.player1.participantId === uId ||
                                          nameMatchFn(m.player1.name) ||
                                          m.player1.name === uId;
                                        const isP2 =
                                          m.player2.participantId === uId ||
                                          nameMatchFn(m.player2.name) ||
                                          m.player2.name === uId;
                                        const myRep = m.reportedResults?.find(
                                          (r) =>
                                            r.reportedBy ===
                                              (isP1
                                                ? m.player1.participantId
                                                : m.player2.participantId) ||
                                            r.reportedByName === uName,
                                        );
                                        const canPR =
                                          !isAdmin &&
                                          (isP1 || isP2) &&
                                          isActive &&
                                          m.status !== "completed" &&
                                          m.status !== "disputed";
                                        return (
                                          <MatchCard
                                            key={m._id}
                                            m={m}
                                            p1Won={p1Won}
                                            p2Won={p2Won}
                                            isOverriding={isOverriding}
                                            isAdmin={isAdmin}
                                            isActive={isActive}
                                            myReport={myRep}
                                            canParticipantReport={canPR}
                                            isP1={!!isP1}
                                            isP2={!!isP2}
                                            actionLoading={actionLoading}
                                            overrideLoading={overrideLoading}
                                            overrideWinnerId={overrideWinnerId}
                                            overrideReason={overrideReason}
                                            borderColor={borderColor}
                                            mutedBg={mutedBg}
                                            onRecordResult={handleRecordResult}
                                            onReportResult={handleReportResult}
                                            onResolveDispute={
                                              handleResolveDispute
                                            }
                                            onStartOverride={() => {
                                              setOverrideMatchId(m._id);
                                              setOverrideWinnerId("");
                                              setOverrideReason("");
                                            }}
                                            onCancelOverride={() =>
                                              setOverrideMatchId(null)
                                            }
                                            onSetOverrideWinner={
                                              setOverrideWinnerId
                                            }
                                            onSetOverrideReason={
                                              setOverrideReason
                                            }
                                            onConfirmOverride={
                                              handleOverrideResult
                                            }
                                          />
                                        );
                                      }}
                                    </For>
                                  </SimpleGrid>
                                </Box>
                              ))}
                            </VStack>
                          </Box>
                        )}
                        {lbRounds.length > 0 && (
                          <Box>
                            <HStack mb={3} gap={2}>
                              <Text
                                fontWeight="semibold"
                                fontSize="sm"
                                textTransform="uppercase"
                                letterSpacing="wider"
                                color="orange.fg"
                              >
                                Losers Bracket
                              </Text>
                              <Badge
                                colorPalette="orange"
                                size="sm"
                                variant="subtle"
                              >
                                L
                              </Badge>
                            </HStack>
                            <VStack gap={4} alignItems="stretch">
                              {lbRounds.map((round) => (
                                <Box key={`lb-${round}`}>
                                  <Text
                                    fontSize="xs"
                                    color="fg.muted"
                                    fontWeight="medium"
                                    mb={2}
                                  >
                                    Round {round}
                                  </Text>
                                  <SimpleGrid
                                    columns={{ base: 1, md: 2 }}
                                    gap={3}
                                  >
                                    <For
                                      each={lbMatches.filter(
                                        (m) => m.round === round,
                                      )}
                                    >
                                      {(m) => {
                                        const p1Won =
                                          m.winnerId ===
                                          m.player1.participantId;
                                        const p2Won =
                                          m.winnerId ===
                                          m.player2.participantId;
                                        const isOverriding =
                                          overrideMatchId === m._id;
                                        const uName = user?.username
                                          ?.trim()
                                          .toLowerCase();
                                        const uId = user?.id;
                                        const guestFallback =
                                          user?.isGuest && uId
                                            ? `guest_${uId.substring(0, 6)}`
                                            : null;
                                        const nameMatchFn = (n: string) => {
                                          const ln = n.trim().toLowerCase();
                                          return (
                                            (uName && ln === uName) ||
                                            (guestFallback &&
                                              ln === guestFallback)
                                          );
                                        };
                                        const isP1 =
                                          m.player1.participantId === uId ||
                                          nameMatchFn(m.player1.name) ||
                                          m.player1.name === uId;
                                        const isP2 =
                                          m.player2.participantId === uId ||
                                          nameMatchFn(m.player2.name) ||
                                          m.player2.name === uId;
                                        const myRep = m.reportedResults?.find(
                                          (r) =>
                                            r.reportedBy ===
                                              (isP1
                                                ? m.player1.participantId
                                                : m.player2.participantId) ||
                                            r.reportedByName === uName,
                                        );
                                        const canPR =
                                          !isAdmin &&
                                          (isP1 || isP2) &&
                                          isActive &&
                                          m.status !== "completed" &&
                                          m.status !== "disputed";
                                        return (
                                          <MatchCard
                                            key={m._id}
                                            m={m}
                                            p1Won={p1Won}
                                            p2Won={p2Won}
                                            isOverriding={isOverriding}
                                            isAdmin={isAdmin}
                                            isActive={isActive}
                                            myReport={myRep}
                                            canParticipantReport={canPR}
                                            isP1={!!isP1}
                                            isP2={!!isP2}
                                            actionLoading={actionLoading}
                                            overrideLoading={overrideLoading}
                                            overrideWinnerId={overrideWinnerId}
                                            overrideReason={overrideReason}
                                            borderColor={borderColor}
                                            mutedBg={mutedBg}
                                            onRecordResult={handleRecordResult}
                                            onReportResult={handleReportResult}
                                            onResolveDispute={
                                              handleResolveDispute
                                            }
                                            onStartOverride={() => {
                                              setOverrideMatchId(m._id);
                                              setOverrideWinnerId("");
                                              setOverrideReason("");
                                            }}
                                            onCancelOverride={() =>
                                              setOverrideMatchId(null)
                                            }
                                            onSetOverrideWinner={
                                              setOverrideWinnerId
                                            }
                                            onSetOverrideReason={
                                              setOverrideReason
                                            }
                                            onConfirmOverride={
                                              handleOverrideResult
                                            }
                                          />
                                        );
                                      }}
                                    </For>
                                  </SimpleGrid>
                                </Box>
                              ))}
                            </VStack>
                          </Box>
                        )}
                        {gfMatches.length > 0 && (
                          <Box>
                            <HStack mb={3} gap={2}>
                              <LuTrophy />
                              <Text
                                fontWeight="semibold"
                                fontSize="sm"
                                textTransform="uppercase"
                                letterSpacing="wider"
                                color="yellow.fg"
                              >
                                Grand Final
                              </Text>
                              {gfMatches.length > 1 && (
                                <Badge
                                  colorPalette="yellow"
                                  size="sm"
                                  variant="subtle"
                                >
                                  Bracket Reset
                                </Badge>
                              )}
                            </HStack>
                            <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                              <For each={gfMatches}>
                                {(m) => {
                                  const p1Won =
                                    m.winnerId === m.player1.participantId;
                                  const p2Won =
                                    m.winnerId === m.player2.participantId;
                                  const isOverriding =
                                    overrideMatchId === m._id;
                                  const uName = user?.username
                                    ?.trim()
                                    .toLowerCase();
                                  const uId = user?.id;
                                  const guestFallback =
                                    user?.isGuest && uId
                                      ? `guest_${uId.substring(0, 6)}`
                                      : null;
                                  const nameMatchFn = (n: string) => {
                                    const ln = n.trim().toLowerCase();
                                    return (
                                      (uName && ln === uName) ||
                                      (guestFallback && ln === guestFallback)
                                    );
                                  };
                                  const isP1 =
                                    m.player1.participantId === uId ||
                                    nameMatchFn(m.player1.name) ||
                                    m.player1.name === uId;
                                  const isP2 =
                                    m.player2.participantId === uId ||
                                    nameMatchFn(m.player2.name) ||
                                    m.player2.name === uId;
                                  const myRep = m.reportedResults?.find(
                                    (r) =>
                                      r.reportedBy ===
                                        (isP1
                                          ? m.player1.participantId
                                          : m.player2.participantId) ||
                                      r.reportedByName === uName,
                                  );
                                  const canPR =
                                    !isAdmin &&
                                    (isP1 || isP2) &&
                                    isActive &&
                                    m.status !== "completed" &&
                                    m.status !== "disputed";
                                  return (
                                    <MatchCard
                                      key={m._id}
                                      m={m}
                                      p1Won={p1Won}
                                      p2Won={p2Won}
                                      isOverriding={isOverriding}
                                      isAdmin={isAdmin}
                                      isActive={isActive}
                                      myReport={myRep}
                                      canParticipantReport={canPR}
                                      isP1={!!isP1}
                                      isP2={!!isP2}
                                      actionLoading={actionLoading}
                                      overrideLoading={overrideLoading}
                                      overrideWinnerId={overrideWinnerId}
                                      overrideReason={overrideReason}
                                      borderColor={borderColor}
                                      mutedBg={mutedBg}
                                      onRecordResult={handleRecordResult}
                                      onReportResult={handleReportResult}
                                      onResolveDispute={handleResolveDispute}
                                      onStartOverride={() => {
                                        setOverrideMatchId(m._id);
                                        setOverrideWinnerId("");
                                        setOverrideReason("");
                                      }}
                                      onCancelOverride={() =>
                                        setOverrideMatchId(null)
                                      }
                                      onSetOverrideWinner={setOverrideWinnerId}
                                      onSetOverrideReason={setOverrideReason}
                                      onConfirmOverride={handleOverrideResult}
                                    />
                                  );
                                }}
                              </For>
                            </SimpleGrid>
                          </Box>
                        )}
                      </>
                    )}

                    {/* ── SE / Round Robin / Swiss: standard round-by-round ── */}
                    {!isDoubleElim && (
                      <For each={roundNumbers}>
                        {(round) => {
                          const maxRound = Math.max(
                            ...matches.map((m) => m.round),
                          );
                          const isCurrentRound = round === maxRound && isActive;
                          return (
                            <Box key={round}>
                              <HStack mb={3} gap={2}>
                                <Text
                                  fontWeight="semibold"
                                  fontSize="sm"
                                  color={
                                    isCurrentRound ? "blue.fg" : "fg.muted"
                                  }
                                  textTransform="uppercase"
                                  letterSpacing="wider"
                                >
                                  {isRROrSwiss
                                    ? `Round ${round} of ${roundNumbers.length}`
                                    : `Round ${round}`}
                                </Text>
                                {isCurrentRound && !isRROrSwiss && (
                                  <Badge
                                    colorPalette="blue"
                                    size="sm"
                                    variant="subtle"
                                  >
                                    Current
                                  </Badge>
                                )}
                                {!isCurrentRound &&
                                  round < maxRound &&
                                  !isRROrSwiss && (
                                    <Badge
                                      colorPalette="gray"
                                      size="sm"
                                      variant="subtle"
                                    >
                                      Completed
                                    </Badge>
                                  )}
                              </HStack>
                              <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                                <For
                                  each={matches.filter(
                                    (m) => m.round === round,
                                  )}
                                >
                                  {(m) => {
                                    const p1Won =
                                      m.winnerId === m.player1.participantId;
                                    const p2Won =
                                      m.winnerId === m.player2.participantId;
                                    const isOverriding =
                                      overrideMatchId === m._id;
                                    const userName = user?.username
                                      ?.trim()
                                      .toLowerCase();
                                    const userId = user?.id;
                                    const guestFallback =
                                      user?.isGuest && userId
                                        ? `guest_${userId.substring(0, 6)}`
                                        : null;
                                    const nameMatchFn = (n: string) => {
                                      const ln = n.trim().toLowerCase();
                                      return (
                                        (userName && ln === userName) ||
                                        (guestFallback && ln === guestFallback)
                                      );
                                    };
                                    const isP1 =
                                      m.player1.participantId === userId ||
                                      nameMatchFn(m.player1.name) ||
                                      m.player1.name === userId;
                                    const isP2 =
                                      m.player2.participantId === userId ||
                                      nameMatchFn(m.player2.name) ||
                                      m.player2.name === userId;
                                    const myReport = m.reportedResults?.find(
                                      (r) =>
                                        r.reportedBy ===
                                          (isP1
                                            ? m.player1.participantId
                                            : m.player2.participantId) ||
                                        r.reportedByName === userName,
                                    );
                                    const canParticipantReport =
                                      !isAdmin &&
                                      (isP1 || isP2) &&
                                      isActive &&
                                      m.status !== "completed" &&
                                      m.status !== "disputed";
                                    return (
                                      <MatchCard
                                        key={m._id}
                                        m={m}
                                        p1Won={p1Won}
                                        p2Won={p2Won}
                                        isOverriding={isOverriding}
                                        isAdmin={isAdmin}
                                        isActive={isActive}
                                        myReport={myReport}
                                        canParticipantReport={
                                          canParticipantReport
                                        }
                                        isP1={!!isP1}
                                        isP2={!!isP2}
                                        actionLoading={actionLoading}
                                        overrideLoading={overrideLoading}
                                        overrideWinnerId={overrideWinnerId}
                                        overrideReason={overrideReason}
                                        borderColor={borderColor}
                                        mutedBg={mutedBg}
                                        onRecordResult={handleRecordResult}
                                        onReportResult={handleReportResult}
                                        onResolveDispute={handleResolveDispute}
                                        onStartOverride={() => {
                                          setOverrideMatchId(m._id);
                                          setOverrideWinnerId("");
                                          setOverrideReason("");
                                        }}
                                        onCancelOverride={() =>
                                          setOverrideMatchId(null)
                                        }
                                        onSetOverrideWinner={
                                          setOverrideWinnerId
                                        }
                                        onSetOverrideReason={setOverrideReason}
                                        onConfirmOverride={handleOverrideResult}
                                      />
                                    );
                                  }}
                                </For>
                              </SimpleGrid>
                            </Box>
                          );
                        }}
                      </For>
                    )}
                  </VStack>
                )}
              </Card.Body>
              {/* Sticky footer for admin actions */}
              {isAdmin && isActive && matches.length > 0 && (
                <Card.Footer
                  position="sticky"
                  bottom={4}
                  bg="bg.panel"
                  borderTopWidth="1px"
                  borderColor="border"
                  py={3}
                  px={4}
                  boxShadow="0 -4px 6px -1px rgba(0, 0, 0, 0.1)"
                  zIndex={10}
                >
                  <Flex
                    justifyContent="space-between"
                    alignItems="center"
                    w="full"
                  >
                    <HStack gap={2}>
                      <Text fontSize="sm" color="fg.muted">
                        {isRoundRobin
                          ? `${matches.filter((m) => m.status === "completed").length} / ${matches.length} matches`
                          : `Round ${Math.max(...matches.filter((m) => m.bracketSide !== "losers" && m.bracketSide !== "grand_final").map((m) => m.round))} of ${roundNumbers.length}`}
                      </Text>
                      <Badge colorPalette="blue" variant="subtle" size="sm">
                        {matches.filter((m) => m.status === "completed").length}
                        / {matches.length} matches done
                      </Badge>
                    </HStack>
                    <Button
                      colorPalette="blue"
                      size="sm"
                      onClick={handleAdvanceRound}
                      loading={actionLoading}
                    >
                      <LuChevronsRight />
                      {isRoundRobin
                        ? "Finalize Tournament"
                        : isSwiss &&
                            Math.max(...matches.map((m) => m.round)) >=
                              Math.ceil(
                                Math.log2(
                                  Math.max(selected.participants.length, 2),
                                ),
                              )
                          ? "Finalize Tournament"
                          : "Advance Round"}
                    </Button>
                  </Flex>
                </Card.Footer>
              )}
            </Card.Root>
          )}
        </SimpleGrid>

        {/* Edit participant dialog */}
        <Dialog.Root
          open={editDialogOpen}
          onOpenChange={(e: { open: boolean }) => {
            if (!e.open) {
              setEditDialogOpen(false);
              setEditingParticipant(null);
            }
          }}
        >
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content maxWidth="400px" width="95%">
                <Dialog.Header
                  borderBottomWidth="1px"
                  borderColor={borderColor}
                >
                  <Dialog.Title>Edit Participant</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body py={4}>
                  <VStack gap={4} align="stretch">
                    <Field.Root>
                      <Field.Label>Name</Field.Label>
                      <Input
                        value={editingParticipant?.name ?? ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEditingParticipant((prev) =>
                            prev ? { ...prev, name: e.target.value } : prev,
                          )
                        }
                        autoFocus
                      />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Faction</Field.Label>
                      <chakra.select
                        value={editingParticipant?.faction ?? ""}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          setEditingParticipant((prev) =>
                            prev ? { ...prev, faction: e.target.value } : prev,
                          )
                        }
                        w="full"
                        borderRadius="md"
                        borderWidth="1px"
                        borderColor="border"
                        fontSize="sm"
                        color="fg"
                        p={2}
                      >
                        <option value="">No Faction</option>
                        {warhammer3Factions.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </chakra.select>
                    </Field.Root>
                  </VStack>
                </Dialog.Body>
                <Dialog.Footer
                  borderTopWidth="1px"
                  borderColor={borderColor}
                  gap={3}
                >
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditDialogOpen(false);
                      setEditingParticipant(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    colorPalette="blue"
                    onClick={handleUpdateParticipant}
                    loading={actionLoading}
                    disabled={!editingParticipant?.name?.trim()}
                  >
                    Save
                  </Button>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      </Container>
    );
  }

  const filteredTournaments =
    statusFilter === "all"
      ? tournaments
      : tournaments.filter((t) => t.status === statusFilter);

  const totalPages = Math.ceil(filteredTournaments.length / PAGE_SIZE);
  const pagedTournaments = filteredTournaments.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const filterCounts = {
    all: tournaments.length,
    pending: tournaments.filter((t) => t.status === "pending").length,
    active: tournaments.filter((t) => t.status === "active").length,
    completed: tournaments.filter((t) => t.status === "completed").length,
  };

  return (
    <Container maxW="container.xl" py={8}>
      <HStack mb={4} justifyContent="space-between">
        <Heading as="h1" size="xl">
          Match Management
        </Heading>
        <Button variant="outline" size="sm" onClick={fetchTournaments}>
          Refresh
        </Button>
      </HStack>

      {error && (
        <Box
          mb={4}
          p={3}
          bg="red.subtle"
          borderRadius="md"
          borderWidth={1}
          borderColor="red.muted"
        >
          <Text color="red.fg">{error}</Text>
        </Box>
      )}

      {tournaments.length > 0 && (
        <HStack mb={4} gap={2} wrap="wrap">
          {(["all", "pending", "active", "completed"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "solid" : "outline"}
              colorPalette={
                s === "all"
                  ? "gray"
                  : s === "pending"
                    ? "yellow"
                    : s === "active"
                      ? "green"
                      : "gray"
              }
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              <Badge
                ml={1}
                size="sm"
                variant="subtle"
                colorPalette={statusFilter === s ? "white" : "gray"}
              >
                {filterCounts[s]}
              </Badge>
            </Button>
          ))}
        </HStack>
      )}

      {tournaments.length === 0 ? (
        <Card.Root>
          <Card.Body py={16}>
            <VStack gap={4}>
              <Box opacity={0.3}>
                <LuTrophy size={48} />
              </Box>
              <Text color="fg.muted" fontSize="lg">
                {isAuthenticated()
                  ? "You haven't created or joined any tournaments yet."
                  : "Sign in to view your tournaments."}
              </Text>
              <Text color="fg.muted" fontSize="sm">
                {isAuthenticated() ? (
                  <>
                    Go to the <strong>Tournaments</strong> page to create or
                    join one.
                  </>
                ) : (
                  <Button
                    size="sm"
                    colorPalette="blue"
                    onClick={() => navigate("/login")}
                  >
                    Sign In
                  </Button>
                )}
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      ) : filteredTournaments.length === 0 ? (
        <Card.Root>
          <Card.Body py={12}>
            <VStack gap={2}>
              <Text color="fg.muted">No {statusFilter} tournaments.</Text>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStatusFilter("all")}
              >
                Show all
              </Button>
            </VStack>
          </Card.Body>
        </Card.Root>
      ) : (
        <VStack gap={4} alignItems="stretch">
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            <For each={pagedTournaments}>
              {(t) => (
                <Card.Root
                  key={t._id}
                  cursor="pointer"
                  onClick={() => handleSelectTournament(t)}
                  bg={cardBg}
                  borderColor={borderColor}
                  _hover={{ shadow: "md", bg: selectedBg }}
                  transition="all 0.15s ease"
                >
                  <Card.Body>
                    <VStack alignItems="flex-start" gap={2}>
                      <HStack justifyContent="space-between" width="full">
                        <Text fontWeight="semibold" fontSize="md" truncate>
                          {t.name}
                        </Text>
                        <Badge
                          colorPalette={statusColorMap[t.status]}
                          size="sm"
                          flexShrink={0}
                        >
                          {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                        </Badge>
                      </HStack>
                      <Text fontSize="sm" color="fg.muted">
                        {t.tournamentType}
                      </Text>
                      <Separator />
                      <HStack gap={4} fontSize="sm" color="fg.muted">
                        <HStack gap={1}>
                          <LuUsers />
                          <Text>
                            {t.participants.length}/{t.playerCount}
                          </Text>
                        </HStack>
                      </HStack>
                    </VStack>
                  </Card.Body>
                </Card.Root>
              )}
            </For>
          </SimpleGrid>
          {totalPages > 1 && (
            <HStack justifyContent="center" gap={3} pt={2}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Text fontSize="sm" color="fg.muted">
                Page {page} of {totalPages}
              </Text>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </HStack>
          )}
        </VStack>
      )}
    </Container>
  );
};

export default MatchesPage;
