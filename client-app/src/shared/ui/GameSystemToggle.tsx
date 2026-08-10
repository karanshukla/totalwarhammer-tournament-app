import React from "react";
import { HStack, chakra } from "@chakra-ui/react";
import type { FactionGame } from "@/shared/constants/factions";

interface GameSystemToggleProps {
  value: FactionGame;
  onChange: (game: FactionGame) => void;
  size?: "sm" | "md";
}

const options: { game: FactionGame; label: string; palette: string }[] = [
  { game: "wh3", label: "WH3", palette: "ink" },
  { game: "40k", label: "40K", palette: "verdigris" },
];

/** Segmented WH3 / 40K switch shared by the create form and the stats pages. */
const GameSystemToggle: React.FC<GameSystemToggleProps> = ({
  value,
  onChange,
  size = "md",
}) => (
  <HStack gap={1} role="group" aria-label="Game system">
    {options.map(({ game, label, palette }) => {
      const active = value === game;
      return (
        <chakra.button
          key={game}
          type="button"
          py={size === "sm" ? 1 : 1.5}
          px={size === "sm" ? 3 : 4}
          borderRadius="sm"
          borderWidth={1}
          fontSize={size}
          fontWeight="medium"
          cursor="pointer"
          transition="all 0.15s"
          aria-pressed={active}
          onClick={() => !active && onChange(game)}
          bg={active ? "colorPalette.subtle" : "transparent"}
          borderColor={active ? "colorPalette.muted" : "border"}
          color={active ? "fg" : "fg.muted"}
          colorPalette={palette}
        >
          {label}
        </chakra.button>
      );
    })}
  </HStack>
);

export default GameSystemToggle;
