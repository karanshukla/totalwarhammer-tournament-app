import React from "react";
import {
  Box,
  Text,
  SimpleGrid,
  Flex,
  Button,
  ButtonGroup,
  Card,
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
import { useColorModeValue } from "@/shared/ui/ColorMode";
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
  const overlayBgColor = useColorModeValue("white", "gray.700");

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
    <Card.Root p={4} mb={5}>
      <VStack align="stretch" spacing={4}>
        <Text fontSize="xl" fontWeight="bold">
          Tournament Participants
        </Text>

        {/* Control panel */}
        <Card.Root variant="outline" p={3}>
          <VStack align="stretch" spacing={3}>
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
                  isDisabled={newParticipantCount <= 1}
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
                  isDisabled={newParticipantCount >= 100}
                >
                  <LuPlus />
                </Button>
              </HStack>

              <ButtonGroup size="sm">
                <Button onClick={handleAddParticipants} colorScheme="blue">
                  <LuPlus /> Add Participants
                </Button>
                <Button
                  onClick={handleResetBracket}
                  colorScheme="red"
                  variant="outline"
                >
                  Reset Bracket
                </Button>
                <Button
                  onClick={handleResetParticipantsAndBracket}
                  colorScheme="orange"
                  variant="outline"
                >
                  Reset All
                </Button>
              </ButtonGroup>
            </Flex>
          </VStack>
        </Card.Root>

        <Text>Drag participants to tournament bracket:</Text>

        {/* Participants list */}
        <Box borderWidth="1px" borderRadius="md" p={3}>
          <SortableContext
            items={participants.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={3}>
              {participants.map((participant) => (
                <Flex
                  key={participant.id}
                  borderWidth="1px"
                  borderRadius="md"
                  p={2}
                  align="center"
                >
                  <SortableItem id={participant.id} participant={participant} />
                  <Spacer />
                  <ButtonGroup size="xs" variant="ghost" spacing={1}>
                    <Button
                      onClick={() => onEditParticipant(participant)}
                      color="blue.500"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDeleteParticipant(participant.id)}
                      color="red.500"
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
                bg={overlayBgColor}
                borderRadius="md"
                boxShadow="md"
                borderWidth="1px"
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
    </Card.Root>
  );
}
