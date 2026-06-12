import React, { useState, useEffect } from "react";
import {
  Flex,
  HStack,
  VStack,
  Button,
  Input,
  Card,
  Field,
  Text,
  Box,
  Badge,
  Separator,
} from "@chakra-ui/react";
import { LuSearch, LuSwords, LuEye } from "react-icons/lu";
import { useNavigate, Link } from "react-router-dom";
import { httpClient } from "@/core/api/httpClient";
import { useUserStore } from "@/shared/stores/userStore";

interface ActiveTournament {
  _id: string;
  code?: string;
  name: string;
  tournamentType: string;
  playerCount: number;
  status: "pending" | "active";
  participants: { _id: string; name: string; faction: string }[];
}

const TournamentLookup: React.FC = () => {
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [activeTournaments, setActiveTournaments] = useState<
    ActiveTournament[]
  >([]);
  const navigate = useNavigate();
  const { user } = useUserStore();

  useEffect(() => {
    httpClient
      .get<{ success: boolean; data: ActiveTournament[] }>(
        "/tournament?status=active,pending",
      )
      .then((res) => setActiveTournaments(res.data ?? []))
      .catch(() => {});
  }, []);

  const handleFindByCode = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setCodeLoading(true);
    setCodeError(null);
    try {
      const res = (await httpClient.get(`/tournament/code/${trimmed}`)) as {
        success: boolean;
        data: { _id: string; participants: { name: string }[] };
      };
      const t = res.data;
      const lowerName = user?.username?.trim().toLowerCase();
      const guestFallback =
        user?.isGuest && user?.id ? `guest_${user.id.substring(0, 6)}` : null;
      const isParticipant = t.participants?.some((p) => {
        const ln = p.name.trim().toLowerCase();
        return (
          (lowerName && ln === lowerName) ||
          (guestFallback && ln === guestFallback) ||
          p.name === user?.id
        );
      });
      if (isParticipant) {
        navigate(`/matches/tournament/${trimmed}`);
      } else {
        navigate(`/matches/spectate/${trimmed}`);
      }
    } catch {
      setCodeError("No tournament found with that code.");
    } finally {
      setCodeLoading(false);
    }
  };

  return (
    <Card.Root variant="outline" bg="bg.panel">
      <Card.Header>
        <Card.Title>
          <HStack gap={2}>
            <LuSearch />
            View a Tournament
          </HStack>
        </Card.Title>
        <Card.Description>
          Enter a tournament code or select an ongoing tournament below
        </Card.Description>
      </Card.Header>
      <Card.Body>
        <Flex
          align="start"
          gap={{ base: 4, lg: 8 }}
          direction={{ base: "column", lg: "row" }}
        >
          <VStack
            align="stretch"
            gap={4}
            flexShrink={0}
            w={{ base: "full", lg: "auto" }}
          >
            <Field.Root invalid={!!codeError}>
              <Field.Label>Tournament Code</Field.Label>
              <Input
                placeholder="e.g., ABC123"
                value={code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCode(e.target.value)
                }
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                  e.key === "Enter" && handleFindByCode()
                }
                fontFamily="mono"
                textTransform="uppercase"
                w={{ base: "full", lg: "2xs" }}
              />
              {codeError ? (
                <Field.ErrorText>{codeError}</Field.ErrorText>
              ) : (
                <Field.HelperText>
                  Enter the code provided by the tournament organizer
                </Field.HelperText>
              )}
            </Field.Root>
            <Button
              colorPalette="verdigris"
              onClick={handleFindByCode}
              loading={codeLoading}
              alignSelf="start"
            >
              View Tournament
            </Button>
          </VStack>

          {activeTournaments.length > 0 && (
            <>
              <Separator
                display={{ base: "none", lg: "block" }}
                orientation="vertical"
                h="auto"
                alignSelf="stretch"
              />
              <Box flex={1} minW={0} w={{ base: "full", lg: "auto" }}>
                <Text fontWeight="semibold" mb={3} fontSize="sm">
                  Tournaments
                </Text>
                <VStack align="stretch" gap={2}>
                  {activeTournaments.slice(0, 6).map((t) => (
                    <HStack
                      key={t._id}
                      justify="space-between"
                      p={2}
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="border.subtle"
                      bg="bg.subtle"
                    >
                      <HStack gap={2} minW={0}>
                        <Box
                          p={1}
                          borderRadius="sm"
                          bg="bg.subtle"
                          color="fg.secondary"
                          flexShrink={0}
                        >
                          <LuSwords size={12} />
                        </Box>
                        <VStack align="start" gap={0} minW={0}>
                          <HStack gap={1.5}>
                            <Text
                              fontWeight="medium"
                              fontSize="sm"
                              lineClamp={1}
                            >
                              {t.name}
                            </Text>
                            <Badge
                              size="xs"
                              colorPalette={
                                t.status === "pending" ? "yellow" : "green"
                              }
                              flexShrink={0}
                            >
                              {t.status === "pending" ? "Pending" : "Active"}
                            </Badge>
                          </HStack>
                          <Text fontSize="xs" color="fg.muted">
                            {t.tournamentType} &middot; {t.participants.length}/
                            {t.playerCount} players
                          </Text>
                        </VStack>
                      </HStack>
                      <Button
                        size="xs"
                        variant="outline"
                        flexShrink={0}
                        onClick={() => navigate(t.code ? `/matches/spectate/${t.code}` : `/tournament/${t._id}`)}
                      >
                        <LuEye /> View
                      </Button>
                    </HStack>
                  ))}
                </VStack>
                {activeTournaments.length > 6 && (
                  <Button variant="ghost" size="sm" mt={2} asChild>
                    <Link to="/tournaments">View all tournaments</Link>
                  </Button>
                )}
              </Box>
            </>
          )}
        </Flex>
      </Card.Body>
    </Card.Root>
  );
};

export default TournamentLookup;
