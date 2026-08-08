import React from "react";
import { Badge } from "@chakra-ui/react";

interface GameSystemBadgeProps {
  enable40kFactions?: boolean;
  size?: "xs" | "sm" | "md";
}

/**
 * Marks a tournament as Warhammer 40,000. WH3 is the default game system and
 * stays unlabelled so the badge reads as "this one is different".
 */
const GameSystemBadge: React.FC<GameSystemBadgeProps> = ({
  enable40kFactions,
  size = "xs",
}) => {
  if (!enable40kFactions) return null;
  return (
    <Badge size={size} variant="subtle" bg="gold.subtle" color="gold.text">
      40K
    </Badge>
  );
};

export default GameSystemBadge;
