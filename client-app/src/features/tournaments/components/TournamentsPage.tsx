import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Heading,
  Container,
  Box,
  SimpleGrid,
  Text,
  VStack,
  Card,
  Icon,
} from "@chakra-ui/react";
import { LuBrackets, LuTrophy, LuHistory, LuClock } from "react-icons/lu";
import SimpleBracket from "./SimpleBracket";
import CreateTournamentForm from "./CreateTournamentForm";
import { useColorModeValue } from "@/shared/ui/ColorMode";

const TournamentsPage: React.FC = () => {
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
    []
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
      <Heading as="h1" size="xl" mb={6}>
        Tournaments
      </Heading>

      {/* Navigation Cards - Touch & Mouse Friendly */}
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={4} mb={8}>
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
              <VStack spacing={3} alignItems="center">
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
        <Card.Header>
          <Heading size="md">
            {tabs.find((tab) => tab.id === activeTab)?.label}
          </Heading>
        </Card.Header>
        <Card.Body>
          {activeTab === "brackets" && (
            <Box>
              <SimpleBracket />
            </Box>
          )}{" "}
          {activeTab === "createTournament" && (
            <Box py={2}>
              <CreateTournamentForm />
            </Box>
          )}
          {activeTab === "currentTournaments" && (
            <Box py={2}>
              {/* Current tournaments content goes here */}
              Check ongoing tournaments
            </Box>
          )}
          {activeTab === "pastTournaments" && (
            <Box py={2}>
              {/* Past tournaments content goes here */}
              Check past tournaments
            </Box>
          )}
        </Card.Body>
      </Card.Root>
    </Container>
  );
};

export default TournamentsPage;
