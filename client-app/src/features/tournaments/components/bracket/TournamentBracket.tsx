import React from "react";
import {
  Box,
  Text,
  VStack,
  Flex,
  Button,
  Heading,
  Card,
  Icon,
} from "@chakra-ui/react";
import { LuPlus } from "react-icons/lu";
import { MatchParticipantSlot } from "./MatchParticipantSlot";
import { Participant, Round, Match } from "./types";

interface TournamentBracketProps {
  rounds: Round[];
  participants: Participant[];
  onAddRound: () => void;
  onAddMatchToRound: (roundId: string) => void;
  onRemoveMatch: (matchId: string) => void;
  onRemoveParticipantFromSlot: (matchId: string, position: 1 | 2) => void;
}

export function TournamentBracket({
  rounds,
  participants,
  onAddRound,
  onAddMatchToRound,
  onRemoveMatch,
  onRemoveParticipantFromSlot,
}: TournamentBracketProps) {
  const getSortOrder = (title: string) => {
    const lowerCaseTitle = title.toLowerCase();
    if (lowerCaseTitle.includes("grand final") || lowerCaseTitle === "finals") {
      return 1000; // Give grand finals a very high sort order
    }
    if (
      lowerCaseTitle.includes("semi") &&
      (lowerCaseTitle.includes("final") || lowerCaseTitle.includes("finals"))
    ) {
      return 999; // Give semi finals a high sort order but below grand finals
    }
    return 0; // All other rounds get a default low value
  };

  const sortedRounds = [...rounds].sort(
    // Ensure that semi and grand finals are at the end of the list
    (a, b) => getSortOrder(a.title) - getSortOrder(b.title)
  );

  return (
    <Card.Root borderRadius="lg" boxShadow="md" overflow="hidden">
      <Card.Header p={4}>
        <Heading size="md">Tournament Bracket</Heading>
      </Card.Header>
      <Card.Body p={{ base: 3, md: 6 }}>
        <Text fontSize="sm" mb={4} color="gray.600">
          Drag participants into the empty slots below
        </Text>
        <Button
          leftIcon={<Icon as={LuPlus} />}
          mb={6}
          onClick={onAddRound}
          size="sm"
          colorScheme="blue"
          variant="outline"
          width="fit-content"
          borderRadius="md"
          fontWeight="normal"
        >
          Add Round
        </Button>

        <Box position="relative" minH="500px" w="100%">
          <Flex
            gap={{ base: 3, md: 6 }}
            direction={{ base: "column", lg: "row" }}
            pb={4}
            position="relative"
            overflowX={{ base: "hidden", md: "auto" }}
          >
            {sortedRounds.map((round) => (
              <VStack
                key={round.id}
                spacing={4}
                align="stretch"
                minW="240px"
                flex="1"
                maxW={{ base: "100%", lg: "320px" }}
              >
                <Text
                  fontWeight="bold"
                  textAlign="center"
                  fontSize="md"
                  color="blue.600"
                  p={2}
                  borderBottom="2px solid"
                  borderColor="gray.200"
                >
                  {round.title}
                </Text>

                {round.matches.map((match) => (
                  <Card.Root
                    key={match.id}
                    id={`match-${match.id}`}
                    variant="outline"
                    size="sm"
                    p={0}
                    position="relative"
                    data-match-id={match.id}
                    borderWidth="1px"
                    borderColor="gray.200"
                    boxShadow="sm"
                    _hover={{ boxShadow: "md" }}
                    transition="all 0.2s"
                    borderRadius="md"
                  >
                    <Card.Header
                      py={2}
                      px={3}
                      borderBottomWidth="1px"
                      borderColor="gray.200"
                    >
                      <Flex justify="space-between" align="center">
                        <Text fontSize="sm" fontWeight="medium">
                          {match.title}
                        </Text>
                        <Button
                          size="xs"
                          onClick={() => onRemoveMatch(match.id)}
                          variant="ghost"
                          colorScheme="red"
                          fontSize="xs"
                          p={1}
                          h="auto"
                          minW="auto"
                        >
                          Remove
                        </Button>
                      </Flex>
                    </Card.Header>

                    <Card.Body py={3} px={3}>
                      <VStack spacing={2}>
                        <MatchParticipantSlot
                          matchId={match.id}
                          position={1}
                          participantId={match.participant1Id}
                          participants={participants}
                          onRemove={() =>
                            onRemoveParticipantFromSlot(match.id, 1)
                          }
                        />

                        <Text
                          fontSize="xs"
                          fontWeight="medium"
                          color="gray.500"
                          bg="gray.50"
                          py={1}
                          px={2}
                          borderRadius="md"
                          width="100%"
                          textAlign="center"
                        >
                          VS
                        </Text>

                        <MatchParticipantSlot
                          matchId={match.id}
                          position={2}
                          participantId={match.participant2Id}
                          participants={participants}
                          onRemove={() =>
                            onRemoveParticipantFromSlot(match.id, 2)
                          }
                        />
                      </VStack>
                    </Card.Body>
                  </Card.Root>
                ))}

                <Button
                  leftIcon={<Icon as={LuPlus} boxSize="3" />}
                  size="sm"
                  onClick={() => onAddMatchToRound(round.id)}
                  variant="ghost"
                  colorScheme="blue"
                  width="full"
                >
                  Add Match
                </Button>
              </VStack>
            ))}
          </Flex>
        </Box>
      </Card.Body>
    </Card.Root>
  );
}
