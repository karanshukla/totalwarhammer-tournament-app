import React from "react";
import {
  SimpleGrid,
  Card,
  VStack,
  HStack,
  Text,
  Box,
  Heading,
} from "@chakra-ui/react";
import { LuGitBranch, LuRepeat, LuCircleDot, LuHash } from "react-icons/lu";

const tournamentTypes = [
  {
    icon: LuGitBranch,
    name: "Single Elimination",
    bg: "brand.subtle",
    color: "brand.text",
    desc: "Classic knockout format. Lose once and you're out - fast-paced and decisive.",
  },
  {
    icon: LuRepeat,
    name: "Double Elimination",
    bg: "brand.subtle",
    color: "brand.text",
    desc: "Two chances to prove yourself. Losers drop to a second bracket before being eliminated.",
  },
  {
    icon: LuCircleDot,
    name: "Round Robin",
    bg: "info.subtle",
    color: "info.text",
    desc: "Everyone plays everyone. The player with the most wins takes the crown.",
  },
  {
    icon: LuHash,
    name: "Swiss System",
    bg: "gold.subtle",
    color: "gold.text",
    desc: "Paired by performance each round. No eliminations - the best record wins.",
  },
];

const TournamentFormatsSection: React.FC = () => (
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
                  bg={t.bg}
                  color={t.color}
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
);

export default TournamentFormatsSection;
