import React from "react";
import { Text } from "@chakra-ui/react";
import { displayName as dn } from "@/shared/utils/displayName";
import type { Match } from "@/shared/tournament/types";

interface ReportedResultLinesProps {
  match: Match;
}

const ReportedResultLines: React.FC<ReportedResultLinesProps> = ({ match }) => (
  <>
    {(match.reportedResults ?? []).map((result) => {
      const reportedBy = result.reportedBy?.toString();
      const reporterName =
        reportedBy === match.player1.participantId?.toString()
          ? match.player1.name
          : reportedBy === match.player2.participantId?.toString()
            ? match.player2.name
            : result.reportedByName;
      const votedForName =
        result.winnerId?.toString() === match.player1.participantId?.toString()
          ? dn(match.player1.name)
          : dn(match.player2.name);
      return (
        <Text key={result.reportedBy} fontSize="xs" color="fg.muted">
          <strong>{dn(reporterName)}</strong> says{" "}
          <strong>{votedForName}</strong> won
        </Text>
      );
    })}
  </>
);

export default ReportedResultLines;
