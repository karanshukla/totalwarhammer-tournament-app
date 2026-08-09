import React from "react";
import { Badge } from "@chakra-ui/react";
import { LuCircleCheck, LuClock } from "react-icons/lu";
import type { MatchStatus } from "@/shared/tournament/types";

interface MatchStatusBadgeProps {
  status: MatchStatus;
  withIcon?: boolean;
}

export const MatchStatusBadge: React.FC<MatchStatusBadgeProps> = ({
  status,
  withIcon = false,
}) => {
  switch (status) {
    case "completed":
      return (
        <Badge
          size="sm"
          variant="subtle"
          bg="status.win.subtle"
          color="status.win"
          borderColor="status.win.border"
          borderWidth="1px"
        >
          {withIcon && <LuCircleCheck />} Completed
        </Badge>
      );
    case "disputed":
      return (
        <Badge colorPalette="crimson" size="sm" variant="solid">
          ⚠ Disputed
        </Badge>
      );
    case "in_progress":
      return (
        <Badge colorPalette="verdigris" size="sm" variant="subtle">
          {withIcon && <LuClock />} In Progress
        </Badge>
      );
    default:
      return (
        <Badge colorPalette="ink" size="sm" variant="subtle">
          Pending
        </Badge>
      );
  }
};

/** Win/loss marker beside a player's name. */
export const ResultBadge: React.FC<{ won: boolean }> = ({ won }) => (
  <Badge
    size="sm"
    variant="subtle"
    bg={won ? "status.win.subtle" : "status.loss.subtle"}
    color={won ? "status.win" : "status.loss"}
    borderColor={won ? "status.win.border" : "status.loss.border"}
    borderWidth="1px"
    fontWeight="bold"
  >
    {won ? "W" : "L"}
  </Badge>
);
