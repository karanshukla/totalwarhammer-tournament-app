import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Heading,
  Container,
  SimpleGrid,
  Text,
  VStack,
  HStack,
  Card,
  Icon,
  Input,
  Button,
} from "@chakra-ui/react";
import {
  LuBrackets,
  LuTrophy,
  LuHistory,
  LuClock,
  LuSearch,
} from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import SimpleBracket from "./SimpleBracket";
import CreateTournamentForm from "./CreateTournamentForm";
import TournamentBrowser from "./TournamentBrowser";
import { useColorModeValue } from "@/shared/ui/ColorMode";
import { httpClient } from "@/core/api/httpClient";
import { useUserStore } from "@/shared/stores/userStore";

const TournamentsPage: React.FC = () => {
  const { user } = useUserStore();
  const isGuest = !user || user.isGuest;

  const tabs = useMemo(
    () => [
      {
        id: "brackets",
        icon: LuBrackets,
        label: "Create a Simple Bracket",
        content: "Create a simple bracket tournament",
      },
      // Only show create tournament for registered users
      ...(!isGuest
        ? [
            {
              id: "createTournament",
              icon: LuTrophy,
              label: "Create a Tournament",
              content: "Create a new Tournament",
            },
          ]
        : []),
      {
        id: "currentTournaments",
        icon: LuClock,
        label: "View Ongoing Tournaments",
        content: "Check ongoing tournaments",
      },
      {
        id: "pastTournaments",
        icon: LuHistory,
        label: "View Past Tournaments",
        content: "Check past tournaments",
      },
    ],
    [isGuest],
  );

  // Define colors for light and dark modes
  const activeBg = useColorModeValue("blue.50", "gray.700");
  const inactiveBg = useColorModeValue("white", "gray.800"); // Adjusted for dark mode
  const activeBorderColor = useColorModeValue("blue.400", "blue.300");
  const inactiveBorderColor = useColorModeValue("gray.200", "gray.600"); // Adjusted for dark mode

  const activeIconColor = useColorModeValue("blue.600", "blue.200");
  const inactiveIconColor = useColorModeValue("gray.500", "gray.400");

  const activeTextColor = useColorModeValue("blue.700", "blue.200");
  const inactiveTextColor = useColorModeValue("gray.700", "gray.300");

  const hoverActiveBorderColor = useColorModeValue("blue.500", "blue.200");
  const hoverInactiveBorderColor = useColorModeValue("gray.300", "gray.500"); // Adjusted for dark mode
  const hoverInactiveBg = useColorModeValue("gray.50", "gray.700"); // Added for hover on inactive cards

  const getInitialTab = useCallback(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash && tabs.some((tab) => tab.id === hash)) {
      return hash;
    }
    return tabs[0].id;
  }, [tabs]);

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const navigate = useNavigate();

  const handleFindByCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setCodeLoading(true);
    setCodeError(null);
    try {
      const res = (await httpClient.get(`/tournament/code/${code}`)) as {
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

  // Effect 1: Update URL hash when activeTab changes (e.g., from a click)
  useEffect(() => {
    const currentHash = window.location.hash.replace("#", "");
    if (currentHash !== activeTab) {
      window.location.hash = `#${activeTab}`;
    }
  }, [activeTab]);

  // Effect 2: Update activeTab when URL hash changes (e.g., back/forward button, manual URL edit)
  useEffect(() => {
    const handleHashChange = () => {
      const newHash = window.location.hash.replace("#", "");
      if (newHash && tabs.some((tab) => tab.id === newHash)) {
        if (activeTab !== newHash) {
          setActiveTab(newHash);
        }
      } else if (!newHash && activeTab !== tabs[0].id) {
        setActiveTab(tabs[0].id);
      } else if (
        newHash &&
        !tabs.some((tab) => tab.id === newHash) &&
        activeTab !== tabs[0].id
      ) {
        setActiveTab(tabs[0].id);
      }
    };

    window.addEventListener("hashchange", handleHashChange);

    if (window.location.hash.replace("#", "") !== activeTab) {
      window.location.hash = `#${activeTab}`;
    }

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [tabs, activeTab, setActiveTab]);

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={6} align="stretch">
        <HStack gap={4} wrap="wrap" alignItems="flex-end">
          <Heading as="h1" size="xl" flex={1}>
            Tournaments
          </Heading>
          <VStack alignItems="flex-end" gap={1}>
            <HStack gap={2}>
              <Input
                placeholder="Tournament Code"
                value={codeInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCodeInput(e.target.value)
                }
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                  e.key === "Enter" && handleFindByCode()
                }
                maxW="220px"
                size="sm"
                fontFamily="mono"
              />
              <Button
                size="sm"
                colorPalette="blue"
                onClick={handleFindByCode}
                loading={codeLoading}
                gap={2}
              >
                <LuSearch /> Find Tournament
              </Button>
            </HStack>
            {codeError && (
              <Text fontSize="xs" color="fg.error">
                {codeError}
              </Text>
            )}
          </VStack>
        </HStack>

        {/* Navigation Cards - Touch & Mouse Friendly */}
        <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
          {tabs.map((tab) => (
            <Card.Root
              key={tab.id}
              onClick={() => setActiveTab(tab.id)} // This will trigger the useEffect to update the hash
              cursor="pointer"
              borderWidth={1}
              borderRadius="md"
              bg={activeTab === tab.id ? activeBg : inactiveBg}
              borderColor={
                activeTab === tab.id ? activeBorderColor : inactiveBorderColor
              }
              shadow={activeTab === tab.id ? "sm" : "none"}
              _hover={{
                shadow: "md",
                borderColor:
                  activeTab === tab.id
                    ? hoverActiveBorderColor
                    : hoverInactiveBorderColor,
                bg: activeTab === tab.id ? activeBg : hoverInactiveBg, // Apply hover background for inactive cards
              }}
              transition="all 0.2s ease-in-out"
            >
              <Card.Body p={4}>
                <VStack gap={3} alignItems="center">
                  <Icon
                    as={tab.icon}
                    boxSize={6}
                    color={
                      activeTab === tab.id ? activeIconColor : inactiveIconColor
                    }
                    transition="color 0.2s"
                  />
                  <Text
                    fontSize="md"
                    fontWeight="medium"
                    textAlign="center"
                    color={
                      activeTab === tab.id ? activeTextColor : inactiveTextColor
                    }
                    transition="color 0.2s"
                  >
                    {tab.label}
                  </Text>
                </VStack>
              </Card.Body>
            </Card.Root>
          ))}
        </SimpleGrid>

        {/* Content Area */}
        <Card.Root>
          <Card.Body>
            {activeTab === "brackets" && <SimpleBracket />}
            {activeTab === "createTournament" &&
              (!isGuest ? (
                <CreateTournamentForm />
              ) : (
                <VStack gap={4} align="center" py={8}>
                  <Text fontSize="lg" fontWeight="medium">
                    Sign up to create tournaments
                  </Text>
                  <Text color="fg.muted" textAlign="center">
                    Guest users can join tournaments, but only registered users
                    can create them.
                  </Text>
                  <Button
                    colorPalette="blue"
                    onClick={() => navigate("/register")}
                  >
                    Create an Account
                  </Button>
                </VStack>
              ))}
            {activeTab === "currentTournaments" && (
              <TournamentBrowser
                statusFilter={["pending", "active"]}
                emptyMessage="No open tournaments right now. Create one!"
              />
            )}
            {activeTab === "pastTournaments" && (
              <TournamentBrowser
                statusFilter="completed"
                emptyMessage="No completed tournaments yet."
              />
            )}
          </Card.Body>
        </Card.Root>
      </VStack>
    </Container>
  );
};

export default TournamentsPage;
