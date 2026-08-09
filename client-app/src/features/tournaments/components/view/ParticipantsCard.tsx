import React from "react";
import {
  Badge,
  Card,
  For,
  Heading,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuUsers } from "react-icons/lu";
import { displayName as dn } from "@/shared/utils/displayName";
import type { Participant } from "@/shared/tournament/types";

interface ParticipantsCardProps {
  participants: Participant[];
  playerCount: number;
  isYou: (participant: Participant) => boolean;
}

const ParticipantsCard: React.FC<ParticipantsCardProps> = ({
  participants,
  playerCount,
  isYou,
}) => (
  <Card.Root bg="bg.panel" borderColor="border" shadow="sm">
    <Card.Header>
      <HStack gap={2}>
        <LuUsers />
        <Heading size="md">
          Participants ({participants.length}/{playerCount})
        </Heading>
      </HStack>
    </Card.Header>
    <Card.Body>
      {participants.length === 0 ? (
        <Text color="fg.muted" textAlign="center" py={4}>
          No participants yet
        </Text>
      ) : (
        <VStack gap={2} alignItems="stretch">
          <For each={participants}>
            {(p) => (
              <HStack
                key={p._id}
                p={3}
                borderRadius="md"
                borderWidth={1}
                borderColor="border"
                bg="bg.subtle"
                justifyContent="space-between"
              >
                <VStack alignItems="flex-start" gap={0}>
                  <Text fontWeight="medium">{dn(p.name)}</Text>
                  {p.faction && (
                    <Text fontSize="xs" color="fg.muted">
                      {p.faction}
                    </Text>
                  )}
                </VStack>
                {isYou(p) && (
                  <Badge colorPalette="ink" size="sm">
                    You
                  </Badge>
                )}
              </HStack>
            )}
          </For>
        </VStack>
      )}
    </Card.Body>
  </Card.Root>
);

export default ParticipantsCard;
