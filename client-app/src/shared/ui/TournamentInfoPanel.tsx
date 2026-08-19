import React from "react";
import {
  Badge,
  Button,
  For,
  HStack,
  Icon,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  LuAward,
  LuCalendar,
  LuCircleCheck,
  LuClock,
  LuCopy,
  LuHash,
  LuSwords,
  LuTrendingUp,
  LuTrophy,
  LuUsers,
} from "react-icons/lu";
import PanelCard from "@/shared/ui/PanelCard";
import TournamentCode from "@/shared/ui/TournamentCode";
import { toaster } from "@/shared/ui/Toaster";
import { championOf } from "@/shared/tournament/outcome";
import type { Match, Tournament } from "@/shared/tournament/types";
import { statusColorMap } from "@/shared/tournament/types";

interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
  iconColor?: string;
}

const InfoRow: React.FC<InfoRowProps> = ({
  icon,
  label,
  children,
  iconColor,
}) => (
  <HStack justifyContent="space-between" gap={4} minH="24px">
    <HStack gap={2} minW={0}>
      <Icon as={icon} boxSize="14px" color={iconColor ?? "fg.muted"} />
      <Text color="fg.muted" fontSize="sm">
        {label}
      </Text>
    </HStack>
    {children}
  </HStack>
);

interface TournamentInfoPanelProps {
  tournament: Tournament;
  matches?: Match[];
}

const TournamentInfoPanel: React.FC<TournamentInfoPanelProps> = ({
  tournament,
  matches = [],
}) => {
  const isRoundRobin = tournament.tournamentType === "Round Robin";
  const isActive = tournament.status === "active";
  const roundCount = new Set(matches.map((m) => m.round)).size;
  const bracketRounds = matches.filter(
    (m) => m.bracketSide !== "losers" && m.bracketSide !== "grand_final",
  );
  const champion =
    tournament.status === "completed"
      ? championOf(tournament.tournamentType, tournament.participants, matches)
      : null;

  const copyCode = () => {
    navigator.clipboard.writeText(tournament.code);
    toaster.create({
      title: "Copied!",
      description: "Tournament code copied to clipboard",
      type: "success",
    });
  };

  return (
    <PanelCard icon={LuTrophy} title="Tournament Info">
      <VStack gap={3} alignItems="stretch" separator={<Separator />}>
        <InfoRow icon={LuHash} label="Code">
          <HStack gap={1}>
            <TournamentCode code={tournament.code} />
            <Button
              size="xs"
              variant="ghost"
              aria-label="Copy tournament code"
              onClick={copyCode}
            >
              <LuCopy size={14} />
            </Button>
          </HStack>
        </InfoRow>

        <InfoRow icon={LuSwords} label="Format">
          <Text fontWeight="medium">{tournament.tournamentType}</Text>
        </InfoRow>

        <InfoRow icon={LuUsers} label="Players">
          <Text fontWeight="medium">
            {tournament.participants.length}/{tournament.playerCount}
          </Text>
        </InfoRow>

        {isActive && bracketRounds.length > 0 && !isRoundRobin && (
          <InfoRow icon={LuTrendingUp} label="Current Round">
            <Text fontWeight="medium">
              {Math.max(...bracketRounds.map((m) => m.round))} of {roundCount}
            </Text>
          </InfoRow>
        )}

        {matches.length > 0 && (
          <InfoRow icon={LuCircleCheck} label="Matches Completed">
            <Text fontWeight="medium">
              {matches.filter((m) => m.status === "completed").length}/
              {matches.length}
            </Text>
          </InfoRow>
        )}

        {tournament.status === "completed" && (
          <InfoRow icon={LuAward} label="Champion" iconColor="gold.text">
            <Text fontWeight="bold" color="gold.text">
              {champion?.name ?? "-"}
            </Text>
          </InfoRow>
        )}

        <InfoRow icon={LuClock} label="Status">
          <Badge colorPalette={statusColorMap[tournament.status]}>
            {tournament.status.charAt(0).toUpperCase() +
              tournament.status.slice(1)}
          </Badge>
        </InfoRow>

        <InfoRow icon={LuCalendar} label="Created">
          <Text fontSize="sm">
            {new Date(tournament.createdAt).toLocaleDateString()}
          </Text>
        </InfoRow>

        {tournament.bannedFactions.length > 0 && (
          <VStack alignItems="flex-start" gap={1}>
            <Text color="fg.muted" fontSize="sm">
              Banned Factions
            </Text>
            <HStack wrap="wrap" gap={1}>
              <For each={tournament.bannedFactions}>
                {(f) => (
                  <Badge key={f} colorPalette="ink" size="sm" variant="subtle">
                    {f}
                  </Badge>
                )}
              </For>
            </HStack>
          </VStack>
        )}
      </VStack>
    </PanelCard>
  );
};

export default TournamentInfoPanel;
