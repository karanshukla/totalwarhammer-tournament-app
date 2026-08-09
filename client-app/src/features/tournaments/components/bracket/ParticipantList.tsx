import React from "react";
import {
  Box,
  Text,
  SimpleGrid,
  Flex,
  Button,
  ButtonGroup,
  Card,
  Heading,
  VStack,
  Spacer,
  HStack,
} from "@chakra-ui/react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DragOverlay } from "@dnd-kit/core";
import { LuPlus, LuMinus } from "react-icons/lu";
import { SortableItem } from "./SortableItem";
import { Participant } from "./types";
import { useTournamentStore } from "@/shared/stores/tournamentStore";
import { toaster } from "@/shared/ui/Toaster";

interface ParticipantListProps {
  activeParticipant: Participant | null;
  newParticipantCount: number;
  onSetNewParticipantCount: (count: number) => void;
  onEditParticipant: (participant: Participant) => void;
}

export function ParticipantList({
  activeParticipant,
  newParticipantCount,
  onSetNewParticipantCount,
  onEditParticipant,
}: ParticipantListProps) {
  const store = useTournamentStore();
  const participants = useTournamentStore((state) => state.participants);

  const increment = () => {
    onSetNewParticipantCount(Math.min(newParticipantCount + 1, 100));
  };

  const decrement = () => {
    onSetNewParticipantCount(Math.max(newParticipantCount - 1, 1));
  };

  const handleAddParticipants = () => {
    store.addParticipants(newParticipantCount);
    toaster.success({
      description: `${newParticipantCount} new participant(s) added.`,
    });
    onSetNewParticipantCount(1);
  };

  const handleResetBracket = () => {
    store.resetBracket();
    toaster.info({ description: "Bracket has been reset." });
  };

  const handleResetParticipantsAndBracket = () => {
    store.resetParticipantsAndBracket();
    toaster.info({ description: "Participants and bracket have been reset." });
  };

  const handleDeleteParticipant = (participantId: string) => {
    store.deleteParticipant(participantId);
    toaster.info({ description: "Participant deleted." });
  };

  return (
    <Card.Root mb={5} borderRadius="md" boxShadow="sm" overflow="hidden">
      <Card.Header py={3} px={4}>
        <Heading size="md">Tournament Participants</Heading>
      </Card.Header>
      <Card.Body p={4}>
        <VStack align="stretch" gap={4}>
          {/* Control panel */}
          <Box
            bg="bg.subtle"
            borderWidth="1px"
            borderColor="border"
            borderRadius="md"
            p={3}
          >
            <VStack align="stretch" gap={3}>
              <Text fontWeight="medium">Add New Participants</Text>
              <Flex
                wrap="wrap"
                gap={3}
                justify="space-between"
                align={{ base: "stretch", md: "center" }}
              >
                <HStack>
                  <Text>Quantity:</Text>
                  <Button
                    onClick={decrement}
                    size="sm"
                    variant="outline"
                    colorPalette="ink"
                    disabled={newParticipantCount <= 1}
                  >
                    <LuMinus />
                  </Button>
                  <Text fontWeight="medium" px={2}>
                    {newParticipantCount}
                  </Text>
                  <Button
                    onClick={increment}
                    size="sm"
                    variant="outline"
                    colorPalette="ink"
                    disabled={newParticipantCount >= 100}
                  >
                    <LuPlus />
                  </Button>
                </HStack>

                <Flex gap={2} flexWrap="wrap">
                  <Button
                    onClick={handleAddParticipants}
                    colorPalette="crimson"
                    size="sm"
                  >
                    <LuPlus /> Add Participants
                  </Button>
                  <Button
                    onClick={handleResetBracket}
                    colorPalette="ink"
                    variant="outline"
                    size="sm"
                  >
                    Reset Bracket
                  </Button>
                  <Button
                    onClick={handleResetParticipantsAndBracket}
                    colorPalette="crimson"
                    variant="outline"
                    size="sm"
                  >
                    Reset All
                  </Button>
                </Flex>
              </Flex>
            </VStack>
          </Box>

          <Text color="fg.secondary">
            Drag participants to tournament bracket:
          </Text>

          {/* Participants list */}
          <Box borderWidth="1px" borderColor="border" borderRadius="md" p={3}>
            <SortableContext
              items={participants.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={3}>
                {participants.map((participant) => (
                  <Flex
                    key={participant.id}
                    bg="bg.subtle"
                    borderWidth="1px"
                    borderColor="border"
                    borderRadius="md"
                    p={2}
                    align="center"
                  >
                    <SortableItem
                      id={participant.id}
                      participant={participant}
                    />
                    <Spacer />
                    <ButtonGroup size="xs" variant="ghost" gap={1}>
                      <Button
                        onClick={() => onEditParticipant(participant)}
                        colorPalette="ink"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDeleteParticipant(participant.id)}
                        colorPalette="crimson"
                      >
                        Delete
                      </Button>
                    </ButtonGroup>
                  </Flex>
                ))}
              </SimpleGrid>
            </SortableContext>

            <DragOverlay>
              {activeParticipant ? (
                <Box
                  p={2}
                  bg="bg.elevated"
                  borderRadius="md"
                  boxShadow="md"
                  borderWidth="1px"
                  borderColor="border.emphasized"
                >
                  <SortableItem
                    id={activeParticipant.id}
                    participant={activeParticipant}
                  />
                </Box>
              ) : null}
            </DragOverlay>
          </Box>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
