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
      bg={isOver ? "blue.50" : "white"}
      _dark={{
        borderColor: isOver ? "blue.500" : "gray.600",
        bg: isOver ? "blue.900" : "gray.800",
      }}
      width="100%"
      height="36px"
      transition="all 0.2s"
    >
      {participant ? (
        <Flex justify="space-between" align="center" height="100%">
          <Text fontSize="sm" fontWeight="medium" noOfLines={1} flex="1">
            {participant.name}
          </Text>
          <Text fontSize="xs" color="gray.500" mx={1} noOfLines={1}>
            {participant.faction}
          </Text>
          <Button
            aria-label="Remove participant"
            size="xs"
            onClick={onRemove}
            variant="ghost"
            colorScheme="red"
            height="24px"
            minWidth="auto"
            px={1}
          >
            ×
          </Button>
        </Flex>
      ) : (
        <Text
          fontSize="xs"
          color="gray.500"
          textAlign="center"
          height="100%"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          Drop player here
        </Text>
      )}
    </Box>
  );
}
