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
import { useTournamentStore } from "@/shared/stores/tournamentStore";

export function TournamentBracket() {
  const store = useTournamentStore();
  const rounds = useTournamentStore((state) => state.rounds);
  const participants = useTournamentStore((state) => state.participants);

  const onAddRound = () => store.addRound();
  const onAddMatchToRound = (roundId: string) => store.addMatchToRound(roundId);
  const onRemoveMatch = (matchId: string) => store.removeMatch(matchId);
  const onRemoveParticipantFromSlot = (matchId: string, position: 1 | 2) => {
    store.updateMatchParticipant(
      matchId,
      position === 1 ? "participant1Id" : "participant2Id",
      null
    );
  };

  // Sort rounds to keep finals at the end
  const sortedRounds = [...rounds].sort((a, b) => {
    const aIsFinals = a.title.toLowerCase().includes("final") ? 1 : 0;
    const bIsFinals = b.title.toLowerCase().includes("final") ? 1 : 0;

    if (aIsFinals !== bIsFinals) return aIsFinals - bIsFinals; // Finals go last
    return 0; // Keep original order otherwise
  });

  return (
    <Card.Root borderRadius="md" boxShadow="sm" overflow="hidden">
      <Card.Header py={3} px={4}>
        <Heading size="md">Tournament Bracket</Heading>
      </Card.Header>
      <Card.Body p={4}>
        <Text fontSize="sm" mb={3} color="gray.600">
          Drag participants into the empty slots below
        </Text>
        <Button
          leftIcon={<LuPlus />}
          mb={4} // Increased margin bottom for more space before rounds
          onClick={onAddRound}
          size="sm"
          colorScheme="blue"
          variant="outline"
        >
          Add Round
        </Button>

        <Flex
          gap={6} // Increased gap between rounds
          direction={{ base: "column", lg: "row" }}
          overflowX="auto"
          py={2} // Added some padding for visual separation
        >
          {sortedRounds.map((round) => (
            <VStack
              key={round.id}
              spacing={4} // Increased spacing between matches in a round
              align="stretch"
              minW={{ base: "auto", lg: "220px" }} // Slightly reduced minW
              flex="1"
              maxW={{ base: "100%", lg: "280px" }} // Slightly reduced maxW
            >
              <Text
                fontWeight="bold"
                textAlign="center"
                fontSize="md" // Kept as is, seems reasonable for round titles
                color="blue.600"
                pb={2}
                borderBottom="1px solid"
                borderColor="gray.200"
                mb={2} // Added margin bottom for space below round title
              >
                {round.title}
              </Text>

              {round.matches.map((match) => (
                <Card.Root
                  key={match.id}
                  id={`match-${match.id}`}
                  variant="outline"
                  data-match-id={match.id}
                  boxShadow="xs" // Reduced shadow for a lighter feel
                  _hover={{ boxShadow: "md" }}
                  transition="all 0.2s"
                  borderRadius="sm" // Slightly smaller border radius
                >
                  <Card.Header py={1.5} px={2.5} borderBottomWidth="1px">
                    {" "}
                    {/* Reduced padding */}
                    <Flex justify="space-between" align="center">
                      <Text fontSize="xs" fontWeight="medium">
                        {" "}
                        {/* Reduced font size */}
                        {match.title}
                      </Text>
                      <Button
                        size="xs"
                        onClick={() => onRemoveMatch(match.id)}
                        variant="ghost"
                        colorScheme="red"
                        px={1.5} // Reduced padding for a smaller button
                      >
                        Remove
                      </Button>
                    </Flex>
                  </Card.Header>

                  <Card.Body py={1.5} px={2.5}>
                    {" "}
                    {/* Reduced padding */}
                    <VStack spacing={1.5}>
                      {" "}
                      {/* Reduced spacing */}
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
                        fontSize="2xs" // Reduced font size for "VS"
                        fontWeight="medium"
                        color="gray.500"
                        bg="gray.50"
                        py={0.5} // Reduced padding
                        textAlign="center"
                        width="100%"
                        my={0.5} // Added small vertical margin
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
                leftIcon={<Icon as={LuPlus} boxSize={3} />}
                size="xs" // Made "Add Match" button smaller
                onClick={() => onAddMatchToRound(round.id)}
                variant="ghost"
                colorScheme="blue"
                width="full"
                mt={2} // Added margin top for spacing
              >
                Add Match
              </Button>
            </VStack>
          ))}
        </Flex>
      </Card.Body>
    </Card.Root>
  );
}
