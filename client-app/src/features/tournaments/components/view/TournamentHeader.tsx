import React from "react";
import { Badge, Button } from "@chakra-ui/react";
import { LuEye, LuSettings, LuUsers } from "react-icons/lu";
import MarkdownContent from "@/shared/ui/MarkdownContent";
import TournamentPageHeader from "@/shared/ui/TournamentPageHeader";
import type { Tournament } from "@/shared/tournament/types";

type Viewer = "owner" | "participant" | "spectator";

const viewerBadges: Record<
  Viewer,
  { label: string; palette: string; Icon: React.ElementType }
> = {
  owner: { label: "Owner", palette: "brass", Icon: LuSettings },
  participant: { label: "Participant", palette: "verdigris", Icon: LuUsers },
  spectator: { label: "Spectating", palette: "ink", Icon: LuEye },
};

interface TournamentHeaderProps {
  tournament: Tournament;
  viewer: Viewer;
  onManage: () => void;
}

const TournamentHeader: React.FC<TournamentHeaderProps> = ({
  tournament,
  viewer,
  onManage,
}) => {
  const { label, palette, Icon } = viewerBadges[viewer];

  return (
    <TournamentPageHeader
      tournament={tournament}
      roleBadge={
        <Badge variant="outline" size="sm" colorPalette={palette}>
          <Icon />
          {label}
        </Badge>
      }
      actions={
        viewer === "owner" && (
          <Button colorPalette="verdigris" size="sm" onClick={onManage}>
            <LuSettings />
            Manage Tournament
          </Button>
        )
      }
    >
      {tournament.description && (
        <MarkdownContent color="fg.muted">
          {tournament.description}
        </MarkdownContent>
      )}
    </TournamentPageHeader>
  );
};

export default TournamentHeader;
