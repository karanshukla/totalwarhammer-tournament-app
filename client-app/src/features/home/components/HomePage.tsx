import React, { useState, useEffect } from "react";
import {
  Container,
  VStack,
  HStack,
  SimpleGrid,
  Button,
  Input,
  Card,
  Field,
  Text,
  Box,
  Heading,
  Badge,
  Separator,
} from "@chakra-ui/react";
import {
  LuSearch,
  LuUsers,
  LuTrophy,
  LuSwords,
  LuChartBar,
  LuShield,
  LuGitBranch,
  LuRepeat,
  LuCircleDot,
  LuHash,
  LuUserPlus,
  LuPlay,
  LuChevronsRight,
  LuEye,
} from "react-icons/lu";
import { useNavigate, Link } from "react-router-dom";
import { httpClient } from "@/core/api/httpClient";
import { useUserStore } from "@/shared/stores/userStore";

const tournamentTypes = [
  {
    icon: LuGitBranch,
    name: "Single Elimination",
    color: "blue",
    desc: "Classic knockout format. Lose once and you're out - fast-paced and decisive.",
  },
  {
    icon: LuRepeat,
    name: "Double Elimination",
    color: "purple",
    desc: "Two chances to prove yourself. Losers drop to a second bracket before being eliminated.",
  },
  {
    icon: LuCircleDot,
    name: "Round Robin",
    color: "green",
    desc: "Everyone plays everyone. The player with the most wins takes the crown.",
  },
  {
    icon: LuHash,
    name: "Swiss System",
    color: "orange",
    desc: "Paired by performance each round. No eliminations - the best record wins.",
  },
];

const features = [
  {
    icon: LuTrophy,
    title: "Run Tournaments",
    color: "yellow",
    desc: "Create and manage brackets for your community with full control over format and participants.",
  },
  {
    icon: LuSwords,
    title: "Track Matches",
    color: "red",
    desc: "Record results, advance rounds, and follow live progress across all active tournaments.",
  },
  {
    icon: LuChartBar,
    title: "View Statistics",
    color: "blue",
    desc: "Explore win rates, top players, and faction performance across all recorded tournaments.",
  },
  {
    icon: LuShield,
    title: "Guest Friendly",
    color: "green",
    desc: "No account required to participate. Jump in as a guest and join tournaments instantly.",
  },
];

const steps = [
  { icon: LuUserPlus, label: "Register or join as a guest" },
  { icon: LuTrophy, label: "Create a tournament or get a join code" },
  { icon: LuUsers, label: "Invite participants and fill the bracket" },
  { icon: LuPlay, label: "Start the tournament and record results" },
  { icon: LuChevronsRight, label: "Advance rounds until a winner is crowned" },
];

const HomePage: React.FC = () => {
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useUserStore();

  interface ActiveTournament {
    _id: string;
    name: string;
    tournamentType: string;
    playerCount: number;
    status: "pending" | "active";
    participants: { _id: string; name: string; faction: string }[];
  }

  const [activeTournaments, setActiveTournaments] = useState<
    ActiveTournament[]
  >([]);

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
        navigate(`/matches#${t._id}`);
      } else {
        navigate(`/matches/spectate/${t._id}`);
      }
    } catch {
      setCodeError("No tournament found with that code.");
    } finally {
      setCodeLoading(false);
    }
  };

  return (
    <Container maxW="7xl" py={10} px={{ base: 4, md: 8, lg: 12 }}>
      <VStack gap={12} align="stretch">
        {/* ── Hero ── */}
        <Box textAlign="center" py={8}>
          <Badge
            colorPalette="red"
            mb={4}
            px={3}
            py={1}
            fontSize="xs"
            textTransform="uppercase"
            letterSpacing="wider"
          >
            Total War: Warhammer
          </Badge>
          <Heading
            as="h1"
            size="4xl"
            fontWeight="bold"
            lineHeight="tight"
            mb={4}
          >
            TW Tournament App
          </Heading>
          <Text
            fontSize="lg"
            color="fg.muted"
            maxW="2xl"
            mx="auto"
            lineHeight="relaxed"
            mb={8}
          >
            Create custom brackets, participate in Total War Warhammer
            tournaments within the multiplayer community, and view statistics
            for recorded matchups.
          </Text>
          <HStack gap={3} justify="center">
            <Button colorPalette="blue" size="lg" asChild>
              <Link to="/tournaments">View Ongoing Tournaments</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() =>
                document.dispatchEvent(
                  new CustomEvent("auth-event", {
                    detail: { type: "open-drawer" },
                  }),
                )
              }
            >
              Create Account
            </Button>
          </HStack>
        </Box>

        <Separator />

        {/* ── Features ── */}
        <Box>
          <Heading as="h2" size="xl" mb={2}>
            What you can do
          </Heading>
          <Text color="fg.muted" mb={6}>
            Everything you need to run a community tournament.
          </Text>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={4}>
            {features.map((f) => (
              <Card.Root key={f.title} variant="outline" bg="bg.panel">
                <Card.Body>
                  <VStack align="start" gap={3}>
                    <Box
                      p={2}
                      borderRadius="md"
                      bg={`${f.color}.subtle`}
                      color={`${f.color}.fg`}
                      fontSize="xl"
                    >
                      <f.icon />
                    </Box>
                    <Text fontWeight="semibold">{f.title}</Text>
                    <Text fontSize="sm" color="fg.muted">
                      {f.desc}
                    </Text>
                  </VStack>
                </Card.Body>
              </Card.Root>
            ))}
          </SimpleGrid>
        </Box>

        {/* ── Tournament Lookup ── */}
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
            <HStack align="start" gap={8}>
              {/* Left: code input */}
              <VStack align="stretch" gap={4} flexShrink={0}>
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
                    w="2xs"
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
                  colorPalette="blue"
                  onClick={handleFindByCode}
                  loading={codeLoading}
                  alignSelf="start"
                >
                  View Tournament
                </Button>
              </VStack>

              {/* Right: ongoing tournaments */}
              {activeTournaments.length > 0 && (
                <>
                  <Separator
                    orientation="vertical"
                    h="auto"
                    alignSelf="stretch"
                  />
                  <Box flex={1} minW={0}>
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
                              bg="blue.subtle"
                              color="blue.fg"
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
                                  {t.status === "pending"
                                    ? "Pending"
                                    : "Active"}
                                </Badge>
                              </HStack>
                              <Text fontSize="xs" color="fg.muted">
                                {t.tournamentType} &middot;{" "}
                                {t.participants.length}/{t.playerCount} players
                              </Text>
                            </VStack>
                          </HStack>
                          <Button
                            size="xs"
                            variant="outline"
                            flexShrink={0}
                            onClick={() =>
                              navigate(`/matches/spectate/${t._id}`)
                            }
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
            </HStack>
          </Card.Body>
        </Card.Root>

        {/* ── Tournament Formats ── */}
        <Box>
          <Heading as="h2" size="xl" mb={2}>
            Tournament formats
          </Heading>
          <Text color="fg.muted" mb={6}>
            Choose the format that fits your community.
          </Text>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={4}>
            {tournamentTypes.map((t) => (
              <Card.Root key={t.name} variant="outline" bg="bg.panel">
                <Card.Body>
                  <VStack align="start" gap={3}>
                    <HStack gap={2}>
                      <Box
                        p={2}
                        borderRadius="md"
                        bg={`${t.color}.subtle`}
                        color={`${t.color}.fg`}
                        fontSize="lg"
                      >
                        <t.icon />
                      </Box>
                      <Text fontWeight="semibold" fontSize="sm">
                        {t.name}
                      </Text>
                    </HStack>
                    <Text fontSize="sm" color="fg.muted">
                      {t.desc}
                    </Text>
                  </VStack>
                </Card.Body>
              </Card.Root>
            ))}
          </SimpleGrid>
        </Box>

        {/* ── How it works ── */}
        <Card.Root variant="subtle">
          <Card.Header>
            <Card.Title>
              <HStack gap={2}>
                <LuUsers />
                How it works
              </HStack>
            </Card.Title>
          </Card.Header>
          <Card.Body>
            <SimpleGrid columns={{ base: 1, sm: 2, md: 5 }} gap={4}>
              {steps.map((s, i) => (
                <VStack key={i} align="center" gap={2} textAlign="center">
                  <Box
                    w={10}
                    h={10}
                    borderRadius="full"
                    bg="blue.subtle"
                    color="blue.fg"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="lg"
                    flexShrink={0}
                  >
                    <s.icon />
                  </Box>
                  <Box
                    w={5}
                    h={5}
                    borderRadius="full"
                    bg="blue.muted"
                    color="blue.fg"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="xs"
                    fontWeight="bold"
                  >
                    {i + 1}
                  </Box>
                  <Text fontSize="sm" color="fg.muted">
                    {s.label}
                  </Text>
                </VStack>
              ))}
            </SimpleGrid>
          </Card.Body>
          <Card.Footer>
            <HStack gap={3}>
              <Button colorPalette="blue" asChild>
                <Link to="/tournaments">View Ongoing Tournaments</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  document.dispatchEvent(
                    new CustomEvent("auth-event", {
                      detail: { type: "open-drawer" },
                    }),
                  )
                }
              >
                Create Account
              </Button>
            </HStack>
          </Card.Footer>
        </Card.Root>
      </VStack>
    </Container>
  );
};

export default HomePage;
