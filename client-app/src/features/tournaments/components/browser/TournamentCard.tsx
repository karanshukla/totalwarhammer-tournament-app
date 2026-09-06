import React from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  HStack,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuLogIn, LuEye, LuTrophy, LuSwords } from "react-icons/lu";
import { useNavigate } from "react-router";
import {
  statusColorMap,
  statusAccentMap,
  statusBarMap,
} from "@/shared/tournament/types";
import { stripMarkdownForPreview } from "./descriptionPreview";
import type { BrowserTournament } from "./types";

interface TournamentCardProps {
  tournament: BrowserTournament;
  joined: boolean;
  isAuthenticated: boolean;
}

/** One tournament tile in the browse grid, with status-aware actions. */
const TournamentCard: React.FC<TournamentCardProps> = ({
  tournament: t,
  joined,
  isAuthenticated,
}) => {
  const navigate = useNavigate();

  const full = t.participants.length >= t.playerCount;
  const canJoin = isAuthenticated && t.status === "pending" && !joined && !full;
  const canView = t.status === "pending" && canJoin;
  const fillPct = Math.round((t.participants.length / t.playerCount) * 100);

  return (
    <Card.Root
      bg="bg.panel"
      borderColor="border"
      borderTopColor={statusAccentMap[t.status]}
      borderTopWidth="2px"
      display="flex"
      flexDirection="column"
      transition="all 0.15s ease"
      _hover={{ borderColor: "border.emphasized", shadow: "md" }}
    >
      <Card.Body flex={1}>
        <VStack alignItems="flex-start" gap={2}>
          <HStack justifyContent="space-between" width="full">
            <Heading as="h3" size="md" truncate>
              {t.name}
            </Heading>
            <Badge
              colorPalette={statusColorMap[t.status]}
              size="sm"
              flexShrink={0}
            >
              {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
            </Badge>
          </HStack>
          <HStack gap={2} alignItems="center">
            <Text fontSize="sm" color="fg.muted">
              {t.tournamentType}
            </Text>
            {t.enable40kFactions && (
              <Badge
                size="xs"
                variant="subtle"
                bg="gold.subtle"
                color="gold.text"
              >
                40K
              </Badge>
            )}
          </HStack>
          {t.description && (
            <Text fontSize="sm" lineClamp={2} color="fg.muted">
              {stripMarkdownForPreview(t.description)}
            </Text>
          )}
          <Box width="full" pt={1}>
            <HStack
              justifyContent="space-between"
              fontSize="xs"
              color="fg.muted"
              mb={1}
            >
              <Text>
                {t.participants.length}/{t.playerCount} players
              </Text>
              <Text>{new Date(t.createdAt).toLocaleDateString()}</Text>
            </HStack>
            <Box
              bg="bg.muted"
              borderRadius="full"
              h="3px"
              w="full"
              overflow="hidden"
            >
              <Box bg={statusBarMap[t.status]} h="100%" w={`${fillPct}%`} />
            </Box>
          </Box>
        </VStack>
      </Card.Body>
      <Card.Footer pt={0} flexDirection="column" gap={2}>
        {joined && (
          <Badge
            colorPalette={t.status === "completed" ? "ink" : "verdigris"}
            variant="subtle"
            width="full"
            justifyContent="center"
          >
            {t.status === "completed" ? "Participated" : "Joined"}
          </Badge>
        )}
        {full && !joined && t.status === "pending" && (
          <Badge
            colorPalette="ink"
            variant="subtle"
            width="full"
            justifyContent="center"
          >
            Full
          </Badge>
        )}
        {canView && (
          <Button
            width="full"
            colorPalette="crimson"
            size="sm"
            onClick={() =>
              navigate(
                t.code ? `/matches/spectate/${t.code}` : `/tournament/${t._id}`,
              )
            }
          >
            <LuLogIn />
            Join Tournament
          </Button>
        )}
        {!isAuthenticated && t.status === "pending" && !full && (
          <HStack width="full" justifyContent="center" gap={1} py={1}>
            <Box color="fg.muted" display="inline-flex">
              <LuLogIn size={12} />
            </Box>
            <Text fontSize="xs" color="fg.muted">
              Sign in to join
            </Text>
          </HStack>
        )}
        {joined ? (
          <Button
            width="full"
            variant="outline"
            size="sm"
            colorPalette="verdigris"
            onClick={() =>
              navigate(
                t.code ? `/matches/tournament/${t.code}` : `/matches#${t._id}`,
              )
            }
          >
            <LuSwords />
            My Matches
          </Button>
        ) : (
          <Button
            width="full"
            variant="outline"
            size="sm"
            colorPalette="verdigris"
            onClick={() =>
              navigate(
                t.code ? `/matches/spectate/${t.code}` : `/tournament/${t._id}`,
              )
            }
          >
            {t.status === "completed" ? <LuTrophy /> : <LuEye />}
            {t.status === "completed" ? "View Results" : "Spectate"}
          </Button>
        )}
      </Card.Footer>
    </Card.Root>
  );
};

export default TournamentCard;
