import React from "react";
import {
  SimpleGrid,
  Card,
  VStack,
  HStack,
  Button,
  Text,
  Box,
} from "@chakra-ui/react";
import {
  LuUsers,
  LuTrophy,
  LuUserPlus,
  LuPlay,
  LuChevronsRight,
} from "react-icons/lu";
import { Link } from "react-router-dom";

const steps = [
  { icon: LuUserPlus, label: "Register or join as a guest" },
  { icon: LuTrophy, label: "Create a tournament or get a join code" },
  { icon: LuUsers, label: "Invite participants and fill the bracket" },
  { icon: LuPlay, label: "Start the tournament and record results" },
  { icon: LuChevronsRight, label: "Advance rounds until a winner is crowned" },
];

const HowItWorksSection: React.FC = () => (
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
              bg="brass.subtle"
              color="brass.fg"
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
              bg="brass.muted"
              color="brass.fg"
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
        <Button colorPalette="brass" asChild>
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
);

export default HowItWorksSection;
