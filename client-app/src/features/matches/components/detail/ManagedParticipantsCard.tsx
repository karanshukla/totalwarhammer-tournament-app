import React from "react";
import {
  Button,
  Card,
  For,
  Heading,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuPencil, LuUsers, LuX } from "react-icons/lu";
import type { Participant } from "@/shared/tournament/types";

interface ManagedParticipantsCardProps {
  participants: Participant[];
  playerCount: number;
  isAdmin: boolean;
  isPending: boolean;
  actionLoading: boolean;
  onEdit: (participant: Participant) => void;
  onRemove: (participantId: string) => void;
  cardBg: string;
  borderColor: string;
  rowBg: string;
}

const ManagedParticipantsCard: React.FC<ManagedParticipantsCardProps> = ({
  participants,
  playerCount,
  isAdmin,
  isPending,
  actionLoading,
  onEdit,
  onRemove,
  cardBg,
  borderColor,
  rowBg,
}) => (
  <Card.Root bg={cardBg}>
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
          No Participants Yet
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
                borderColor={borderColor}
                bg={rowBg}
                justifyContent="space-between"
              >
                <VStack alignItems="flex-start" gap={0}>
                  <Text fontWeight="medium">{p.name}</Text>
                  {p.faction && (
                    <Text fontSize="xs" color="fg.muted">
                      {p.faction}
                    </Text>
                  )}
                </VStack>
                <HStack gap={1}>
                  {isAdmin && (
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="ink"
                      onClick={() => onEdit(p)}
                      aria-label="Edit participant"
                    >
                      <LuPencil />
                    </Button>
                  )}
                  {isAdmin && isPending && (
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="crimson"
                      onClick={() => onRemove(p._id)}
                      loading={actionLoading}
                      aria-label="Remove participant"
                    >
                      <LuX />
                    </Button>
                  )}
                </HStack>
              </HStack>
            )}
          </For>
        </VStack>
      )}
    </Card.Body>
  </Card.Root>
);

export default ManagedParticipantsCard;
