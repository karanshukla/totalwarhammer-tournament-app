import React from "react";
import { Box, Flex, Text, Button } from "@chakra-ui/react";
import { useDroppable } from "@dnd-kit/core";
import { Participant } from "./types";

interface MatchParticipantSlotProps {
  matchId: string;
  position: 1 | 2;
  participantId: string | null;
  participants: Participant[];
  onRemove: () => void;
}

export function MatchParticipantSlot({
  matchId,
  position,
  participantId,
  participants,
  onRemove,
}: MatchParticipantSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${matchId}-${position}`,
  });

  const participant = participantId
    ? participants.find((p) => p.id === participantId)
    : null;

  return (
    <Box
      ref={setNodeRef}
      borderWidth="1px"
      borderRadius="md"
      borderColor={isOver ? "blue.300" : "gray.200"}
      p={2}
      bg={isOver ? "blue.50" : "transparent"}
      _dark={{
        borderColor: isOver ? "blue.500" : "gray.600",
        bg: isOver ? "blue.900" : "transparent",
      }}
      width="100%"
      height="40px"
      transition="all 0.2s"
    >
      {participant ? (
        <Flex justify="space-between" align="center" height="100%">
          <Text fontSize="sm" fontWeight="medium" noOfLines={1} ml={1}>
            {participant.name}
          </Text>
          <Text fontSize="xs" color="gray.500" ml={2}>
            {participant.faction}
          </Text>
          <Button
            aria-label="Remove participant"
            size="xs"
            onClick={onRemove}
            variant="ghost"
            color="red.500"
            _hover={{ bg: "red.50" }}
            _dark={{ _hover: { bg: "red.900" } }}
            height="24px"
            minWidth="unset"
            px={2}
          >
            Remove
          </Button>
        </Flex>
      ) : (
        <Text fontSize="sm" color="gray.500" textAlign="center" py={1}>
          Drop player here
        </Text>
      )}
    </Box>
  );
}
