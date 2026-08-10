import React from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  For,
  Heading,
  HStack,
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
  icon: Icon,
  label,
  children,
  iconColor,
}) => (
  <HStack justifyContent="space-between">
    <HStack gap={1}>
      <Box as="span" color={iconColor} display="inline-flex">
        <Icon size={14} />
      </Box>
      <Text color="fg.muted" fontSize="sm">
        {label}
      </Text>
    </HStack>
    {children}
  </HStack>
);

interface ManagedInfoCardProps {
  tournament: Tournament;
  matches: Match[];
  roundCount: number;
  isActive: boolean;
}

const ManagedInfoCard: React.FC<ManagedInfoCardProps> = ({
  tournament,
  matches,
  roundCount,
  isActive,
}) => {
  const isRoundRobin = tournament.tournamentType === "Round Robin";
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
    <Card.Root bg="bg.panel">
      <Card.Header>
        <HStack gap={2}>
          <LuTrophy />
          <Heading size="md">Tournament Info</Heading>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack gap={3} alignItems="stretch">
          <InfoRow icon={LuHash} label="Code">
            <HStack gap={1}>
              <Box
                px={2}
                py="1px"
                bg="gold.subtle"
                color="gold.text"
                borderRadius="sm"
                fontSize="xs"
                fontWeight="bold"
                letterSpacing="widest"
                border="1px solid"
                borderColor="gold.border"
                textTransform="uppercase"
              >
                {tournament.code}
              </Box>
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
          <Separator />

          <InfoRow icon={LuSwords} label="Format">
            <Text fontWeight="medium">{tournament.tournamentType}</Text>
          </InfoRow>
          <Separator />

          <InfoRow icon={LuUsers} label="Players">
            <Text fontWeight="medium">
              {tournament.participants.length}/{tournament.playerCount}
            </Text>
          </InfoRow>
          <Separator />

          {isActive && bracketRounds.length > 0 && !isRoundRobin && (
            <>
              <InfoRow icon={LuTrendingUp} label="Current Round">
                <Text fontWeight="medium">
                  {Math.max(...bracketRounds.map((m) => m.round))} of{" "}
                  {roundCount}
                </Text>
              </InfoRow>
              <Separator />
            </>
          )}

          {matches.length > 0 && (
            <>
              <InfoRow icon={LuCircleCheck} label="Matches Completed">
                <Text fontWeight="medium">
                  {matches.filter((m) => m.status === "completed").length}/
                  {matches.length}
                </Text>
              </InfoRow>
              <Separator />
            </>
          )}

          {tournament.status === "completed" && (
            <>
              <InfoRow icon={LuAward} label="Champion" iconColor="gold.text">
                <Text fontWeight="bold" color="gold.text">
                  {champion?.name ?? "-"}
                </Text>
              </InfoRow>
              <Separator />
            </>
          )}

          <InfoRow icon={LuClock} label="Status">
            <Badge colorPalette={statusColorMap[tournament.status]}>
              {tournament.status.charAt(0).toUpperCase() +
                tournament.status.slice(1)}
            </Badge>
          </InfoRow>
          <Separator />

          <InfoRow icon={LuCalendar} label="Created">
            <Text fontSize="sm">
              {new Date(tournament.createdAt).toLocaleDateString()}
            </Text>
          </InfoRow>

          {tournament.bannedFactions.length > 0 && (
            <>
              <Separator />
              <VStack alignItems="flex-start" gap={1}>
                <Text color="fg.muted" fontSize="sm">
                  Banned Factions
                </Text>
                <HStack wrap="wrap" gap={1}>
                  <For each={tournament.bannedFactions}>
                    {(f) => (
                      <Badge
                        key={f}
                        colorPalette="ink"
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
  );
};

export default ManagedInfoCard;
