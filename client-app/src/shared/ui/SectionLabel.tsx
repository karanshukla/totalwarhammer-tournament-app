import React from "react";
import { Text, type TextProps } from "@chakra-ui/react";

/**
 * The uppercase label above a group inside a panel — Standings, Round 3,
 * Winners Bracket. A heading so screen-reader users can jump between groups.
 */
const SectionLabel: React.FC<TextProps> = ({ children, ...textProps }) => (
  <Text
    as="h3"
    fontWeight="semibold"
    fontSize="sm"
    color="fg.muted"
    textTransform="uppercase"
    letterSpacing="wider"
    {...textProps}
  >
    {children}
  </Text>
);

export default SectionLabel;
