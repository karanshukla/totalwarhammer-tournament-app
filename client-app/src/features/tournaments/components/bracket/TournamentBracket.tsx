import React from "react";
import {
  Box,
  Text,
  VStack,
  Flex,
  Button,
  Heading,
  Card,
  Stack,
  Spacer,
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
    <Card.Root>
      <Card.Header p={5}>
        <Heading size="md">Tournament Bracket</Heading>
      </Card.Header>
      <Card.Body p={6}>
        <Text fontSize="sm" mb={6}>
          Drag participants into the empty slots below
        </Text>

        <Button
          leftIcon={<LuPlus />}
          mb={6}
          onClick={onAddRound}
          size="sm"
          px={2} // Further adjusted padding
          width="fit-content" // Make button only as wide as its content
          minW="auto"
        >
          Add Round
        </Button>

        <Flex
          gap={6}
          overflow="auto"
          direction={{ base: "column", lg: "row" }}
          pb={4}
        >
          {sortedRounds.map((round) => (
            <VStack key={round.id} spacing={5} align="stretch" minW="240px">
              <Text fontWeight="bold" textAlign="center" fontSize="lg">
                {round.title}
              </Text>

              {round.matches.map((match) => (
                <Card.Root key={match.id} variant="outline" size="md" p={2}>
                  <Card.Header pb={2} pt={2}>
                    <Flex justify="space-between" align="center">
                      <Text fontSize="md">{match.title}</Text>
                      <Button
                        size="sm"
                        onClick={() => onRemoveMatch(match.id)}
                        variant="ghost"
                        color="red.500"
                        _hover={{ bg: "red.50" }}
                        _dark={{ _hover: { bg: "red.900" } }}
                        px={3}
                      >
                        Remove
                      </Button>
                    </Flex>
                  </Card.Header>

                  <Card.Body pt={3} pb={3}>
                    <VStack spacing={3}>
                      <MatchParticipantSlot
                        matchId={match.id}
                        position={1}
                        participantId={match.participant1Id}
                        participants={participants}
                        onRemove={() =>
                          onRemoveParticipantFromSlot(match.id, 1)
                        }
                      />

                      <Text fontSize="md" fontWeight="medium">
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
                leftIcon={<LuPlus />}
                size="md"
                onClick={() => onAddMatchToRound(round.id)}
                variant="outline"
                px={4}
                mt={2}
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
