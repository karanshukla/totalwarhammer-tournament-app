import React from "react";
import { Badge, Button, Field, Text, VStack } from "@chakra-ui/react";
import { LuLogIn, LuSwords } from "react-icons/lu";
import PanelCard from "@/shared/ui/PanelCard";
import FactionSelect from "@/shared/ui/FactionSelect";
import type { Tournament } from "@/shared/tournament/types";
import Callout from "@/shared/ui/Callout";

interface JoinTournamentCardProps {
  tournament: Tournament;
  joined: boolean;
  isFull: boolean;
  isAuthenticated: boolean;
  joinFaction: string;
  joining: boolean;
  joinError: string | null;
  onFactionChange: (faction: string) => void;
  onJoin: () => void;
  onGoToMatches: () => void;
}

const JoinTournamentCard: React.FC<JoinTournamentCardProps> = ({
  tournament,
  joined,
  isFull,
  isAuthenticated,
  joinFaction,
  joining,
  joinError,
  onFactionChange,
  onJoin,
  onGoToMatches,
}) => (
  <PanelCard icon={LuLogIn} title={joined ? "You're In!" : "Join Tournament"}>
    {joined ? (
      <VStack gap={3} py={4} alignItems="center">
        <Badge colorPalette="verdigris" size="lg" px={4} py={2}>
          Registered
        </Badge>
        <Text fontSize="sm" color="fg.muted" textAlign="center">
          You are registered for this tournament.
        </Text>
        <Button
          colorPalette="crimson"
          size="sm"
          width="full"
          onClick={onGoToMatches}
        >
          <LuSwords />
          Go to Your Matches
        </Button>
      </VStack>
    ) : isFull ? (
      <Text color="fg.muted" textAlign="center" py={4}>
        This tournament is full.
      </Text>
    ) : !isAuthenticated ? (
      <Text color="fg.muted" textAlign="center" py={4}>
        Sign In to Join This Tournament.
      </Text>
    ) : (
      <VStack gap={4}>
        {joinError && (
          <Callout tone="error" fontSize="sm" width="full">
            {joinError}
          </Callout>
        )}
        <Field.Root>
          <Field.Label fontSize="sm">
            Faction{" "}
            <Text as="span" color="fg.muted">
              (optional)
            </Text>
          </Field.Label>
          <FactionSelect
            tournament={tournament}
            value={joinFaction}
            onChange={onFactionChange}
          />
        </Field.Root>
        <Button
          width="full"
          colorPalette="crimson"
          onClick={onJoin}
          loading={joining}
        >
          <LuLogIn />
          Join Tournament
        </Button>
      </VStack>
    )}
  </PanelCard>
);

export default JoinTournamentCard;
