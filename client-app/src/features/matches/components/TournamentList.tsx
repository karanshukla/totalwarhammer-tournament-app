import React from "react";
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
  Separator,
  For,
} from "@chakra-ui/react";
import { LuTrophy, LuUsers, LuSearch, LuFlaskConical } from "react-icons/lu";
import { Tournament, statusColorMap } from "./types";

interface Props {
  tournaments: Tournament[];
  statusCounts: Record<"all" | "pending" | "active" | "completed", number>;
  page: number;
  total: number;
  pageSize: number;
  statusFilter: "all" | "pending" | "active" | "completed";
  listLoading: boolean;
  error: string | null;
  codeInput: string;
  codeLoading: boolean;
  codeError: string | null;
  isAuthenticated: boolean;
  onSelectTournament: (t: Tournament) => void;
  onFindByCode: () => void;
  onCodeInputChange: (v: string) => void;
  onStatusFilterChange: (s: "all" | "pending" | "active" | "completed") => void;
  onPageChange: (p: number) => void;
}

const cardBg = "bg.panel";
const borderColor = "border";
const selectedBg = "brass.subtle";

const TournamentList: React.FC<Props> = ({
  tournaments,
  statusCounts,
  page,
  total,
  pageSize,
  statusFilter,
  listLoading,
  error,
  codeInput,
  codeLoading,
  codeError,
  isAuthenticated,
  onSelectTournament,
  onFindByCode,
  onCodeInputChange,
  onStatusFilterChange,
  onPageChange,
}) => {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <Container maxW="container.xl" py={8}>
      <HStack mb={4} gap={4} wrap="wrap" alignItems="flex-end">
        <Heading as="h1" size="xl" flex={1}>
          Matches
        </Heading>
        <VStack alignItems="flex-end" gap={1}>
          <HStack gap={2}>
            <Input
              placeholder="e.g., ABC123"
              value={codeInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onCodeInputChange(e.target.value)
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                e.key === "Enter" && onFindByCode()
              }
              maxW="220px"
              size="sm"
              fontFamily="mono"
            />
            <Button
              size="sm"
              colorPalette="verdigris"
              onClick={onFindByCode}
              loading={codeLoading}
              gap={2}
            >
              <LuSearch /> Find Tournament
            </Button>
          </HStack>
          {codeError && (
            <Text fontSize="xs" color="status.loss">
              {codeError}
            </Text>
          )}
        </VStack>
      </HStack>

      {error && (
        <Box
          mb={4}
          p={3}
          bg="status.loss.subtle"
          borderRadius="md"
          borderWidth={1}
          borderColor="status.loss.border"
        >
          <Text color="status.loss">{error}</Text>
        </Box>
      )}

      {statusCounts.all > 0 && (
        <HStack mb={4} gap={2} wrap="wrap">
          {(["all", "pending", "active", "completed"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "solid" : "outline"}
              colorPalette={
                s === "all"
                  ? "ink"
                  : s === "pending"
                    ? "brass"
                    : s === "active"
                      ? "verdigris"
                      : "ink"
              }
              onClick={() => {
                onStatusFilterChange(s);
                onPageChange(1);
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              <Badge ml={1} size="sm" variant="subtle" colorPalette="ink">
                {statusCounts[s]}
              </Badge>
            </Button>
          ))}
        </HStack>
      )}

      {statusCounts.all === 0 ? (
        <Card.Root>
          <Card.Body py={16}>
            <VStack gap={4}>
              <Box opacity={0.3}>
                <LuTrophy size={48} />
              </Box>
              <Text color="fg.muted" fontSize="lg">
                {isAuthenticated
                  ? "You haven't created or joined any tournaments yet."
                  : "Sign in to view your tournaments."}
              </Text>
              <Text color="fg.muted" fontSize="sm">
                {isAuthenticated ? (
                  <>
                    Go to the <strong>Tournaments</strong> page to create or
                    join one.
                  </>
                ) : (
                  <Button
                    size="sm"
                    colorPalette="crimson"
                    onClick={() =>
                      document.dispatchEvent(
                        new CustomEvent("auth-event", {
                          detail: { type: "open-drawer" },
                        }),
                      )
                    }
                  >
                    Sign In
                  </Button>
                )}
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      ) : tournaments.length === 0 ? (
        <Card.Root>
          <Card.Body py={12}>
            <VStack gap={2}>
              <Text color="fg.muted">No {statusFilter} tournaments.</Text>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onStatusFilterChange("all")}
              >
                Show all
              </Button>
            </VStack>
          </Card.Body>
        </Card.Root>
      ) : (
        <VStack gap={4} alignItems="stretch">
          <SimpleGrid
            columns={{ base: 1, md: 2, lg: 3 }}
            gap={4}
            pointerEvents={listLoading ? "none" : "auto"}
          >
            <For each={tournaments}>
              {(t) => (
                <Card.Root
                  key={t._id}
                  cursor="pointer"
                  onClick={() => onSelectTournament(t)}
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
                            <LuFlaskConical size={9} />
                            40K Beta
                          </Badge>
                        )}
                      </HStack>
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
                onClick={() => onPageChange(Math.max(1, page - 1))}
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
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
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

export default TournamentList;
