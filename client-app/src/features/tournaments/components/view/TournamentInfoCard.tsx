import React from "react";
import {
  Badge,
  Card,
  For,
  Heading,
  HStack,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuTrophy } from "react-icons/lu";
import type { Tournament } from "@/shared/tournament/types";
import { statusColorMap } from "@/shared/tournament/types";

interface InfoRowProps {
  label: string;
  children: React.ReactNode;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, children }) => (
  <HStack justifyContent="space-between">
    <Text color="fg.muted" fontSize="sm">
      {label}
    </Text>
    {children}
  </HStack>
);

interface TournamentInfoCardProps {
  tournament: Tournament;
}

const TournamentInfoCard: React.FC<TournamentInfoCardProps> = ({
  tournament,
}) => (
  <Card.Root bg="bg.panel" borderColor="border" shadow="sm">
    <Card.Header>
      <HStack gap={2}>
        <LuTrophy />
        <Heading size="md">Tournament Info</Heading>
      </HStack>
    </Card.Header>
    <Card.Body>
      <VStack gap={3} alignItems="stretch">
        <InfoRow label="Format">
          <Text fontWeight="medium">{tournament.tournamentType}</Text>
        </InfoRow>
        <Separator />
        <InfoRow label="Players">
          <Text fontWeight="medium">
            {tournament.participants.length}/{tournament.playerCount}
          </Text>
        </InfoRow>
        <Separator />
        <InfoRow label="Status">
          <Badge colorPalette={statusColorMap[tournament.status]}>
            {tournament.status.charAt(0).toUpperCase() +
              tournament.status.slice(1)}
          </Badge>
        </InfoRow>
        <Separator />
        <InfoRow label="Created">
          <Text fontSize="sm">
            {new Date(tournament.createdAt).toLocaleDateString()}
          </Text>
        </InfoRow>
        {tournament.bannedFactions.length > 0 && (
          <>
            <Separator />
            <VStack alignItems="flex-start" gap={1}>
              <Text color="fg.muted" fontSize="sm">
                Banned Factions
              </Text>
              <HStack wrap="wrap" gap={1}>
                <For each={tournament.bannedFactions}>
                  {(f) => (
                    <Badge
                      key={f}
                      colorPalette="ink"
                      size="sm"
                      variant="subtle"
                    >
                      {f}
                    </Badge>
                  )}
                </For>
              </HStack>
            </VStack>
          </>
        )}
      </VStack>
    </Card.Body>
  </Card.Root>
);

export default TournamentInfoCard;
