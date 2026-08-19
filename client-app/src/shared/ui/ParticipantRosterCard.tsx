import React from "react";
import { Badge, For, HStack, Text, VStack } from "@chakra-ui/react";
import { LuUsers } from "react-icons/lu";
import PanelCard from "@/shared/ui/PanelCard";
import { displayName as dn } from "@/shared/utils/displayName";
import type { Participant } from "@/shared/tournament/types";

interface ParticipantRosterCardProps {
  participants: Participant[];
  playerCount: number;
  isYou?: (participant: Participant) => boolean;
  renderActions?: (participant: Participant) => React.ReactNode;
}

const ParticipantRosterCard: React.FC<ParticipantRosterCardProps> = ({
  participants,
  playerCount,
  isYou,
  renderActions,
}) => (
  <PanelCard
    icon={LuUsers}
    title={`Participants (${participants.length}/${playerCount})`}
  >
    {participants.length === 0 ? (
      <Text color="fg.muted" textAlign="center" py={4}>
        No participants yet
      </Text>
    ) : (
      <VStack gap={2} alignItems="stretch">
        <For each={participants}>
          {(p) => {
            const you = isYou?.(p) ?? false;
            return (
              <HStack
                key={p._id}
                p={3}
                borderRadius="md"
                borderWidth={1}
                borderColor={you ? "info.border" : "border.subtle"}
                bg={you ? "info.subtle" : "bg.subtle"}
                justifyContent="space-between"
                gap={3}
              >
                <VStack alignItems="flex-start" gap={0} minW={0}>
                  <Text fontWeight="medium" truncate>
                    {dn(p.name)}
                  </Text>
                  {p.faction && (
                    <Text fontSize="xs" color="fg.muted" truncate>
                      {p.faction}
                    </Text>
                  )}
                </VStack>
                <HStack gap={1} flexShrink={0}>
                  {you && (
                    <Badge colorPalette="verdigris" size="sm">
                      You
                    </Badge>
                  )}
                  {renderActions?.(p)}
                </HStack>
              </HStack>
            );
          }}
        </For>
      </VStack>
    )}
  </PanelCard>
);

export default ParticipantRosterCard;
