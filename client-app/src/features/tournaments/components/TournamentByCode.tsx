import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router";
import { Box, Spinner, Text, VStack, Button } from "@chakra-ui/react";
import { httpClient } from "@/core/api/httpClient";
import TournamentViewPage from "./TournamentViewPage";

const TournamentByCode: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const lookupSeq = useRef(0);

  useEffect(() => {
    if (!code) return;
    // React Router keeps this component mounted across code changes, so
    // without resetting, a failed lookup latched "Not Found" forever — the
    // next, valid code rendered the not-found page because that branch is
    // checked first. The sequence guard stops a slow earlier lookup from
    // overwriting a newer one.
    const seq = ++lookupSeq.current;
    setNotFound(false);
    setResolvedId(null);

    httpClient
      .get<{ success: boolean; data: { _id: string } }>(
        `/tournament/code/${code.toUpperCase()}`,
      )
      .then((res) => {
        if (seq === lookupSeq.current) setResolvedId(res.data._id);
      })
      .catch(() => {
        if (seq === lookupSeq.current) setNotFound(true);
      });
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
