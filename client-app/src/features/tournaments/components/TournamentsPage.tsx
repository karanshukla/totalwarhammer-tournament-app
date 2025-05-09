import React, { useState } from "react";
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

const TournamentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("brackets");

  const tabs = [
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
  ];

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
            onClick={() => setActiveTab(tab.id)}
            cursor="pointer"
            variant={activeTab === tab.id ? "filled" : "outline"}
            _hover={{ shadow: "md" }}
            transition="all 0.2s"
          >
            <Card.Body p={4}>
              <VStack spacing={3}>
                <Icon
                  as={tab.icon}
                  boxSize={6}
                  color={activeTab === tab.id ? "blue.500" : "gray.500"}
                />
                <Text fontSize="md" fontWeight="medium" textAlign="center">
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
          )}

          {activeTab === "createTournament" && (
            <Box py={2}>
              {/* Create tournament content goes here */}
              Create a new Tournament
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
