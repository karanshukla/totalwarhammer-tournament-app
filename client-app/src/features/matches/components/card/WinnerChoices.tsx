import React from "react";
import { SimpleGrid, Button } from "@chakra-ui/react";
import { displayName as dn } from "@/shared/utils/displayName";
import type { Match } from "@/shared/tournament/types";

interface WinnerChoicesProps {
  match: Match;
  label: (name: string) => string;
  loading: boolean;
  size?: "xs" | "sm" | "md";
  paletteFor: (participantId: string) => string;
  variantFor: (participantId: string) => "solid" | "outline";
  iconFor?: (participantId: string) => React.ReactNode;
  onChoose: (participantId: string) => void;
}

/** The two winner choices, laid out identically wherever a result is entered. */
const WinnerChoices: React.FC<WinnerChoicesProps> = ({
  match,
  label,
  loading,
  size = "sm",
  paletteFor,
  variantFor,
  iconFor,
  onChoose,
}) => (
  <SimpleGrid columns={{ base: 1, sm: 2 }} gap={2}>
    {[match.player1, match.player2].map((player) => (
      <Button
        key={player.participantId}
        size={size}
        width="full"
        colorPalette={paletteFor(player.participantId)}
        variant={variantFor(player.participantId)}
        onClick={() => onChoose(player.participantId)}
        loading={loading}
        fontWeight="bold"
      >
        {iconFor?.(player.participantId)}
        {label(dn(player.name))}
      </Button>
    ))}
  </SimpleGrid>
);

export default WinnerChoices;
