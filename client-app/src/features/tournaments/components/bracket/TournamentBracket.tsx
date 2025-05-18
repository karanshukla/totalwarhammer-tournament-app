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
          mb={4}
          onClick={onAddRound}
          size="sm"
          colorScheme="blue"
          variant="outline"
        >
          Add Round
        </Button>

        <Flex
          gap={4}
          direction={{ base: "column", lg: "row" }}
          overflowX="auto"
        >
          {sortedRounds.map((round) => (
            <VStack
              key={round.id}
              spacing={3}
              align="stretch"
              minW={{ base: "auto", lg: "240px" }}
              flex="1"
              maxW={{ base: "100%", lg: "300px" }}
            >
              <Text
                fontWeight="bold"
                textAlign="center"
                fontSize="md"
                color="blue.600"
                pb={2}
                borderBottom="1px solid"
                borderColor="gray.200"
              >
                {round.title}
              </Text>

              {round.matches.map((match) => (
                <Card.Root
                  key={match.id}
                  id={`match-${match.id}`}
                  variant="outline"
                  data-match-id={match.id}
                  boxShadow="sm"
                  _hover={{ boxShadow: "md" }}
                  transition="all 0.2s"
                >
                  <Card.Header py={2} px={3} borderBottomWidth="1px">
                    <Flex justify="space-between" align="center">
                      <Text fontSize="sm" fontWeight="medium">
                        {match.title}
                      </Text>
                      <Button
                        size="xs"
                        onClick={() => onRemoveMatch(match.id)}
                        variant="ghost"
                        colorScheme="red"
                      >
                        Remove
                      </Button>
                    </Flex>
                  </Card.Header>

                  <Card.Body py={2} px={3}>
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
                        textAlign="center"
                        width="100%"
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
      </Card.Body>
    </Card.Root>
  );
}
