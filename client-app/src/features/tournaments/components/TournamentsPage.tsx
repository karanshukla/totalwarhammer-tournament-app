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
import { useNavigate } from "react-router";
import SimpleBracket from "./SimpleBracket";
import CreateTournamentForm from "./CreateTournamentForm";
import TournamentBrowser from "./TournamentBrowser";
import { httpClient } from "@/core/api/httpClient";
import { useUserStore } from "@/shared/stores/userStore";

const TournamentsPage: React.FC = () => {
  const { user } = useUserStore();
  const isGuest = !user.isAuthenticated || user.isGuest;

  const tabs = useMemo(
    () => [
      {
        id: "brackets",
        icon: LuBrackets,
        label: "Create a Simple Bracket",
        content: "Create a simple bracket tournament",
      },
      {
        id: "createTournament",
        icon: LuTrophy,
        label: "Create a Tournament",
        content: "Create a new Tournament",
      },
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
    [],
  );

  const activeBg = "info.subtle";
  const inactiveBg = "bg.panel";
  const activeBorderColor = "info.border";
  const inactiveBorderColor = "border";

  const activeIconColor = "info.text";
  const inactiveIconColor = "fg.secondary";

  const activeTextColor = "info.text";
  const inactiveTextColor = "fg.secondary";

  const hoverActiveBorderColor = "info.border";
  const hoverInactiveBorderColor = "border.emphasized";
  const hoverInactiveBg = "bg.subtle";

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
        navigate(`/matches/tournament/${code}`);
      } else {
        navigate(`/matches/spectate/${code}`);
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

    /* c8 ignore next 3 — Effect 1 always sets the hash before this Effect 2 check runs */
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
                placeholder="e.g., ABC123"
                value={codeInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCodeInput(e.target.value)
                }
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                  e.key === "Enter" && handleFindByCode()
                }
                maxW="220px"
                size="sm"
              />
              <Button
                size="sm"
                colorPalette="verdigris"
                onClick={handleFindByCode}
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
            {activeTab === "createTournament" && (
              <CreateTournamentForm isGuest={isGuest} />
            )}
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
