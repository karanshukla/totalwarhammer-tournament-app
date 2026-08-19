import React, { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Flex,
  Heading,
  HStack,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuCopy } from "react-icons/lu";
import GameSystemBadge from "@/shared/ui/GameSystemBadge";
import TournamentCode from "@/shared/ui/TournamentCode";
import type { Tournament } from "@/shared/tournament/types";
import { statusColorMap } from "@/shared/tournament/types";

const COPIED_LABEL_DURATION_MS = 2000;

const CopyCodeButton: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_LABEL_DURATION_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Button
      size="xs"
      variant="ghost"
      colorPalette={copied ? "verdigris" : "ink"}
      onClick={() => {
        navigator.clipboard.writeText(code);
        setCopied(true);
      }}
    >
      <LuCopy />
      {copied ? "Copied!" : "Copy"}
    </Button>
  );
};

const MetaDot: React.FC = () => (
  <Text as="span" aria-hidden="true" color="border.emphasized">
    ·
  </Text>
);

interface TournamentPageHeaderProps {
  tournament: Tournament;
  /** Role badge shown beside the status badge, e.g. Owner or Spectating. */
  roleBadge?: React.ReactNode;
  /** Primary actions, right-aligned on the title row. */
  actions?: React.ReactNode;
  /** Description block rendered beneath the title and meta line. */
  children?: React.ReactNode;
}

const TournamentPageHeader: React.FC<TournamentPageHeaderProps> = ({
  tournament,
  roleBadge,
  actions,
  children,
}) => (
  <VStack alignItems="stretch" gap={4} mb={6}>
    <Flex
      gap={4}
      wrap="wrap"
      alignItems="flex-start"
      justifyContent="space-between"
    >
      <VStack alignItems="flex-start" gap={2} flex="1" minW="18rem">
        <HStack gap={3} wrap="wrap">
          <Heading as="h1" size="xl">
            {tournament.name}
          </Heading>
          <Badge colorPalette={statusColorMap[tournament.status]} size="lg">
            {tournament.status.charAt(0).toUpperCase() +
              tournament.status.slice(1)}
          </Badge>
          {roleBadge}
        </HStack>

        <HStack gap={2} color="fg.muted" fontSize="sm" wrap="wrap">
          <Text>{tournament.tournamentType}</Text>
          {tournament.enable40kFactions && (
            <GameSystemBadge enable40kFactions />
          )}
          <MetaDot />
          <Text>
            {tournament.participants.length}/{tournament.playerCount} players
          </Text>
          <MetaDot />
          <HStack gap={1} alignItems="center">
            <Text fontSize="xs">Code:</Text>
            <TournamentCode code={tournament.code} />
            <CopyCodeButton code={tournament.code} />
          </HStack>
        </HStack>
      </VStack>

      {actions && (
        <HStack gap={2} wrap="wrap" flexShrink={0}>
          {actions}
        </HStack>
      )}
    </Flex>

    {children}

    <Separator />
  </VStack>
);

export default TournamentPageHeader;
