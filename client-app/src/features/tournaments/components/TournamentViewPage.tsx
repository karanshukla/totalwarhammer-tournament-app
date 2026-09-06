import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { Container, Text, VStack, Button, Spinner } from "@chakra-ui/react";
import { LuChevronLeft } from "react-icons/lu";
import { httpClient } from "@/core/api/httpClient";
import {
  getSocket,
  joinTournamentRoom,
  leaveTournamentRoom,
} from "@/core/socket/socketClient";
import { useUserStore } from "@/shared/stores/userStore";
import { displayName } from "@/shared/utils/displayName";
import ChampionBanner from "@/shared/ui/ChampionBanner";
import SidebarLayout from "@/shared/ui/SidebarLayout";
import { championOf } from "@/shared/tournament/outcome";
import type { Match, Tournament } from "@/shared/tournament/types";
import { isSameUser } from "@/shared/tournament/participants";
import TournamentHeader from "./view/TournamentHeader";
import ParticipantsCard from "./view/ParticipantsCard";
import TournamentInfoCard from "./view/TournamentInfoCard";
import JoinTournamentCard from "./view/JoinTournamentCard";
import SpectatorMatchList from "./view/SpectatorMatchList";

const TournamentViewPage: React.FC<{ id?: string }> = ({ id: propId }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const id = propId ?? paramId;
  const navigate = useNavigate();
  const { user, isAuthenticated } = useUserStore();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinFaction, setJoinFaction] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);

  const fetchTournament = useCallback(
    async (silent = false) => {
      if (!id) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = (await httpClient.get(`/tournament/${id}`)) as {
          success: boolean;
          data: Tournament;
        };
        setTournament(res.data);

        if (res.data.status === "active" || res.data.status === "completed") {
          try {
            const mRes = (await httpClient.get(`/match/tournament/${id}`)) as {
              success: boolean;
              data: Match[];
            };
            setMatches(mRes.data ?? []);
          } catch {
            setMatches([]);
          }
        }
      } catch {
        if (!silent) setError("Tournament not found or could not be loaded.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    joinTournamentRoom(id);

    const onTournamentUpdated = (data: Tournament) => setTournament(data);
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
      leaveTournamentRoom(id);
      socket.off("tournament:updated", onTournamentUpdated);
      socket.off("matches:updated", onMatchesUpdated);
      socket.off("matches:appended", onMatchesAppended);
      socket.off("match:updated", onMatchUpdated);
    };
  }, [id]);

  const handleJoin = async () => {
    if (!tournament) return;
    setJoining(true);
    setJoinError(null);
    try {
      await httpClient.post(`/tournament/${tournament._id}/join`, {
        faction: joinFaction,
      });
      setJoinSuccess(true);
      await fetchTournament();
      navigate(`/matches/tournament/${tournament.code}`);
    } catch (err) {
      setJoinError(
        err instanceof Error ? err.message : "Failed to join tournament",
      );
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <Container maxW="7xl" py={16}>
        <VStack gap={4}>
          <Spinner size="xl" role="status" aria-label="Loading tournament" />
          <Text color="fg.muted">Loading tournament...</Text>
        </VStack>
      </Container>
    );
  }

  if (error || !tournament) {
    return (
      <Container maxW="7xl" py={8}>
        <VStack gap={4} py={16} alignItems="center">
          <Text fontSize="xl" fontWeight="bold">
            Tournament Not Found
          </Text>
          <Text color="fg.muted">{error}</Text>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <LuChevronLeft /> Go Back
          </Button>
        </VStack>
      </Container>
    );
  }

  const isFull = tournament.participants.length >= tournament.playerCount;
  const isPending = tournament.status === "pending";
  const showsMatches =
    tournament.status === "active" || tournament.status === "completed";
  const alreadyJoined = tournament.participants.some((p) =>
    isSameUser(p, user),
  );
  const isOwner =
    !!user &&
    (tournament.createdBy === user.id ||
      tournament.createdBy?.toString() === user.id?.toString());
  const viewer = isOwner
    ? "owner"
    : alreadyJoined
      ? "participant"
      : "spectator";
  const goToMatches = () => navigate(`/matches/tournament/${tournament.code}`);

  const champion =
    tournament.status === "completed"
      ? championOf(tournament.tournamentType, tournament.participants, matches)
      : null;

  return (
    <Container maxW="7xl" py={8}>
      <Button
        variant="ghost"
        size="sm"
        mb={6}
        onClick={() => (viewer === "spectator" ? navigate(-1) : goToMatches())}
      >
        <LuChevronLeft /> Back
      </Button>

      <ChampionBanner champion={champion} displayName={displayName} mb={6} />

      <TournamentHeader
        tournament={tournament}
        viewer={viewer}
        onManage={goToMatches}
      />

      <SidebarLayout
        sidebar={
          <>
            <TournamentInfoCard tournament={tournament} matches={matches} />

            {isPending && (
              <JoinTournamentCard
                tournament={tournament}
                joined={alreadyJoined || joinSuccess}
                isFull={isFull}
                isAuthenticated={isAuthenticated()}
                joinFaction={joinFaction}
                joining={joining}
                joinError={joinError}
                onFactionChange={setJoinFaction}
                onJoin={handleJoin}
                onGoToMatches={goToMatches}
              />
            )}
          </>
        }
      >
        <ParticipantsCard
          participants={tournament.participants}
          playerCount={tournament.playerCount}
          isYou={(p) => alreadyJoined && isSameUser(p, user)}
        />

        {showsMatches && <SpectatorMatchList matches={matches} />}
      </SidebarLayout>
    </Container>
  );
};

export default TournamentViewPage;
