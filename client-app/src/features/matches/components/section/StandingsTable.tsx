import React from "react";
import { Box, Separator, Table } from "@chakra-ui/react";
import SectionLabel from "@/shared/ui/SectionLabel";
import type { Standing } from "@/shared/tournament/outcome";

interface StandingsTableProps {
  standings: Standing[];
}

const StandingsTable: React.FC<StandingsTableProps> = ({ standings }) => (
  <Box>
    <SectionLabel mb={2}>Standings</SectionLabel>
    <Table.ScrollArea>
      <Table.Root size="sm" variant="outline">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>#</Table.ColumnHeader>
            <Table.ColumnHeader>Player</Table.ColumnHeader>
            <Table.ColumnHeader>Faction</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="center">W</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="center">L</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="center">Played</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {standings.map((standing, index) => (
            <Table.Row key={standing.participantId}>
              <Table.Cell color="fg.muted">{index + 1}</Table.Cell>
              <Table.Cell fontWeight={index === 0 ? "bold" : "normal"}>
                {standing.name}
              </Table.Cell>
              <Table.Cell color="fg.muted">
                {standing.faction || "-"}
              </Table.Cell>
              <Table.Cell textAlign="center" color="status.win">
                {standing.wins}
              </Table.Cell>
              <Table.Cell textAlign="center" color="status.loss">
                {standing.losses}
              </Table.Cell>
              <Table.Cell textAlign="center">{standing.played}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
    <Separator mt={4} />
  </Box>
);

export default StandingsTable;
