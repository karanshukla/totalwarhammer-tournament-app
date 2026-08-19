import React from "react";
import { Box } from "@chakra-ui/react";

interface TournamentCodeProps {
  code: string;
}

/** The join code, styled identically everywhere it is shown. */
const TournamentCode: React.FC<TournamentCodeProps> = ({ code }) => (
  <Box
    as="span"
    px={2}
    py="1px"
    bg="gold.subtle"
    color="gold.text"
    borderRadius="sm"
    fontFamily="mono"
    fontSize="xs"
    fontWeight="bold"
    letterSpacing="widest"
    borderWidth="1px"
    borderColor="gold.border"
    textTransform="uppercase"
  >
    {code}
  </Box>
);

export default TournamentCode;
