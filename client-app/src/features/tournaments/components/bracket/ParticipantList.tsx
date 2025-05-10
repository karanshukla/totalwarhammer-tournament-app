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
  HStack, // Added HStack
} from "@chakra-ui/react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DragOverlay } from "@dnd-kit/core";
import { LuPlus, LuMinus } from "react-icons/lu"; // Added LuMinus
import { useColorModeValue } from "@/shared/ui/ColorMode";
import { SortableItem } from "./SortableItem";
import { Participant } from "./types";
// Removed NumberInput imports as they are replaced by Buttons
// import {
//   NumberInputRoot,
//   NumberInputField,
//   NumberInputControl,
//   NumberInputIncrementTrigger,
//   NumberInputDecrementTrigger,
// } from "@/shared/ui/NumberInput";

interface ParticipantListProps {
  participants: Participant[];
  activeParticipant: Participant | null;
  newParticipantCount: number;
  onSetNewParticipantCount: (count: number) => void;
  onAddParticipants: () => void;
  onRandomize: () => void;
  onEditParticipant: (participant: Participant) => void;
  onDeleteParticipant: (participantId: string) => void;
}

export function ParticipantList({
  participants,
  activeParticipant,
  newParticipantCount,
  onSetNewParticipantCount,
  onAddParticipants,
  onRandomize,
  onEditParticipant,
  onDeleteParticipant,
}: ParticipantListProps) {
  const overlayBgColor = useColorModeValue("white", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  // Removed useCallback for handleValueChange as NumberInput is removed
  // const handleValueChange = useCallback(
  //   (valueAsString: string, valueAsNumber: number) => {
  //     onSetNewParticipantCount(isNaN(valueAsNumber) ? 1 : valueAsNumber);
  //   },
  //   [onSetNewParticipantCount]
  // );

  // Handle incrementing and decrementing participant count
  const increment = () => {
    onSetNewParticipantCount(Math.min(newParticipantCount + 1, 100));
  };

  const decrement = () => {
    onSetNewParticipantCount(Math.max(newParticipantCount - 1, 1));
  };

  return (
    <Card.Root p={5} mb={6}>
      <VStack align="stretch" spacing={6}>
        <Text fontSize="xl" fontWeight="bold">
          Tournament Participants
        </Text>

        {/* Add new participants controls */}
        <Card.Root p={4} variant="outline">
          <VStack align="stretch" spacing={4}>
            <Text fontSize="md" fontWeight="medium">
              Add New Participants
            </Text>

            <Flex
              direction={{ base: "column", md: "row" }}
              gap={4}
              align={{ base: "stretch", md: "center" }}
            >
              {/* Replaced NumberInput with Buttons and HStack */}
              <HStack spacing={2} minW="120px" alignItems="center">
                <Text mr={1}>Quantity:</Text>
                <HStack spacing={1}>
                  <Button
                    onClick={decrement}
                    size="sm"
                    variant="outline"
                    aria-label="Decrease quantity"
                    isDisabled={newParticipantCount <= 1}
                  >
                    <LuMinus size={16} />
                  </Button>
                  <Box
                    minW="30px"
                    textAlign="center"
                    fontWeight="medium"
                    fontSize="sm"
                    px={1}
                  >
                    {newParticipantCount}
                  </Box>
                  <Button
                    onClick={increment}
                    size="sm"
                    variant="outline"
                    aria-label="Increase quantity"
                    isDisabled={newParticipantCount >= 100}
                  >
                    <LuPlus size={16} />
                  </Button>
                </HStack>
              </HStack>

              <ButtonGroup size="md" width={{ base: "full", md: "auto" }}>
                <Button onClick={onAddParticipants} leftIcon={<LuPlus />}>
                  Add
                </Button>
                <Button onClick={onRandomize} variant="outline">
                  Randomize
                </Button>
              </ButtonGroup>
            </Flex>
          </VStack>
        </Card.Root>

        <Text>Drag participants to tournament bracket:</Text>

        {/* Participant list */}
        <Box
          borderWidth="1px"
          borderRadius="md"
          borderColor={borderColor}
          p={4}
        >
          <SortableContext
            items={participants.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
              {participants.map((participant) => (
                <Box
                  key={participant.id}
                  borderWidth="1px"
                  borderRadius="md"
                  borderColor={borderColor}
                  p={2}
                >
                  <Flex>
                    <SortableItem
                      id={participant.id}
                      participant={participant}
                    />
                    <Spacer />
                    <ButtonGroup size="xs" variant="ghost">
                      <Button
                        onClick={() => onEditParticipant(participant)}
                        color="blue.500"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => onDeleteParticipant(participant.id)}
                        color="red.500"
                      >
                        Delete
                      </Button>
                    </ButtonGroup>
                  </Flex>
                </Box>
              ))}
            </SimpleGrid>
          </SortableContext>

          {/* Drag overlay */}
          <DragOverlay>
            {activeParticipant ? (
              <Box
                p={2}
                borderWidth="1px"
                borderRadius="md"
                bg={overlayBgColor}
                boxShadow="md"
                width="180px"
              >
                <Flex justifyContent="space-between" alignItems="center">
                  <Text fontWeight="medium" fontSize="xs" noOfLines={1}>
                    {activeParticipant.name}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {activeParticipant.faction}
                  </Text>
                </Flex>
              </Box>
            ) : null}
          </DragOverlay>
        </Box>
      </VStack>
    </Card.Root>
  );
}
