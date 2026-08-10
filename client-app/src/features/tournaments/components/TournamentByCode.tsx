import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { Box, Spinner, Text, VStack, Button } from "@chakra-ui/react";
import { httpClient } from "@/core/api/httpClient";
import TournamentViewPage from "./TournamentViewPage";

const TournamentByCode: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) return;
    httpClient
      .get<{ success: boolean; data: { _id: string } }>(
        `/tournament/code/${code.toUpperCase()}`,
      )
      .then((res) => setResolvedId(res.data._id))
      .catch(() => setNotFound(true));
  }, [code]);

  if (notFound) {
    return (
      <Box textAlign="center" py={20}>
        <VStack gap={4}>
          <Text fontSize="2xl" fontWeight="bold" fontFamily="heading">
            Tournament Not Found
          </Text>
          <Text color="fg.muted">
            No tournament with code{" "}
            <Text as="span" fontFamily="mono" fontWeight="bold">
              {code?.toUpperCase()}
            </Text>{" "}
            exists.
          </Text>
          <Button colorPalette="verdigris" variant="outline" asChild>
            <Link to="/tournaments">Browse Tournaments</Link>
          </Button>
        </VStack>
      </Box>
    );
  }

  if (!resolvedId) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={20}>
        <Spinner size="lg" role="status" aria-label="Loading tournament" />
      </Box>
    );
  }

  return <TournamentViewPage id={resolvedId} />;
};

export default TournamentByCode;
