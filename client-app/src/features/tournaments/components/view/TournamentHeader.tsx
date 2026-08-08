import React from "react";
import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuCopy, LuEye, LuSettings, LuUsers } from "react-icons/lu";
import { toaster } from "@/shared/ui/Toaster";
import GameSystemBadge from "@/shared/ui/GameSystemBadge";
import MarkdownContent from "@/shared/ui/MarkdownContent";
import type { Tournament } from "@/shared/tournament/types";
import { statusColorMap } from "@/shared/tournament/types";

type Viewer = "owner" | "participant" | "spectator";

const viewerBadges: Record<
  Viewer,
  { label: string; palette: string; Icon: React.ElementType }
> = {
  owner: { label: "Owner", palette: "brass", Icon: LuSettings },
  participant: { label: "Participant", palette: "verdigris", Icon: LuUsers },
  spectator: { label: "Spectating", palette: "ink", Icon: LuEye },
};

interface TournamentHeaderProps {
  tournament: Tournament;
  viewer: Viewer;
  onManage: () => void;
}

const TournamentHeader: React.FC<TournamentHeaderProps> = ({
  tournament,
  viewer,
  onManage,
}) => {
  const { label, palette, Icon } = viewerBadges[viewer];

  const copyCode = () => {
    navigator.clipboard.writeText(tournament.code);
    toaster.create({
      title: "Copied!",
      description: "Tournament code copied to clipboard",
      type: "success",
    });
  };

  return (
    <HStack mb={6} gap={4} wrap="wrap" alignItems="flex-start">
      <VStack alignItems="flex-start" gap={1} flex={1}>
        <HStack gap={3} wrap="wrap">
          <Heading as="h1" size="xl">
            {tournament.name}
          </Heading>
          <Badge colorPalette={statusColorMap[tournament.status]} size="lg">
            {tournament.status.charAt(0).toUpperCase() +
              tournament.status.slice(1)}
          </Badge>
          <Badge variant="outline" size="sm" colorPalette={palette}>
            <Icon />
            {label}
          </Badge>
        </HStack>

        <HStack gap={3} color="fg.muted" fontSize="sm">
          <Text>{tournament.tournamentType}</Text>
          <GameSystemBadge enable40kFactions={tournament.enable40kFactions} />
          <Text>·</Text>
          <Text>
            {tournament.participants.length}/{tournament.playerCount} players
          </Text>
          <Text>·</Text>
          <HStack gap={1} alignItems="center">
            <Text color="fg.muted" fontSize="xs">
              Code:
            </Text>
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
              color="fg.muted"
              p={1}
              minW="auto"
              h="auto"
              onClick={copyCode}
              aria-label="Copy tournament code"
            >
              <LuCopy size={12} />
            </Button>
          </HStack>
        </HStack>

        {tournament.description && (
          <MarkdownContent mt={1}>{tournament.description}</MarkdownContent>
        )}
      </VStack>

      {viewer === "owner" && (
        <Button
          colorPalette="verdigris"
          size="sm"
          alignSelf="flex-start"
          onClick={onManage}
        >
          <LuSettings />
          Manage Tournament
        </Button>
      )}
    </HStack>
  );
};

export default TournamentHeader;
