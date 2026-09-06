import React from "react";
import { VStack, Text } from "@chakra-ui/react";

/** Section beneath the matchup that holds every control for this match. */
export const ActionZone: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <VStack
    mt={3}
    pt={3}
    gap={3}
    alignItems="stretch"
    borderTopWidth={1}
    borderColor="border"
  >
    {children}
  </VStack>
);

export const ActionLabel: React.FC<{
  children: React.ReactNode;
  tone?: string;
}> = ({ children, tone = "fg.muted" }) => (
  <Text
    fontSize="xs"
    fontFamily="cond"
    fontWeight="semibold"
    textTransform="uppercase"
    letterSpacing="wide"
    color={tone}
  >
    {children}
  </Text>
);
