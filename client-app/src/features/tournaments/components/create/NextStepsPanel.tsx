import React from "react";
import { Box, HStack, Text, VStack } from "@chakra-ui/react";

const steps: React.ReactNode[] = [
  <>
    Create the tournament, then go to the <Emphasis>Matches</Emphasis> page to
    manage it.
  </>,
  <>
    Add participants manually, or share the <Emphasis>join code</Emphasis> so
    players can join themselves.
  </>,
  <>
    Once everyone is in, hit <Emphasis>Start Tournament</Emphasis> to generate
    round 1 matches.
  </>,
  <>
    After all matches in a round are complete, use{" "}
    <Emphasis>Advance Round</Emphasis> to progress.
  </>,
];

function Emphasis({ children }: { children: React.ReactNode }) {
  return (
    <Text as="span" fontWeight="semibold" color="fg">
      {children}
    </Text>
  );
}

const NextStepsPanel: React.FC = () => (
  <Box
    p={3}
    borderRadius="md"
    bg="bg.subtle"
    borderWidth={1}
    borderColor="border"
  >
    <VStack gap={2} alignItems="flex-start">
      <Text
        fontSize="xs"
        fontWeight="semibold"
        color="fg.muted"
        textTransform="uppercase"
        letterSpacing="wider"
      >
        Next Steps
      </Text>
      <VStack gap={1} alignItems="flex-start">
        {steps.map((step, index) => (
          <HStack key={index} gap={2} alignItems="flex-start">
            <Text fontSize="sm" color="fg.muted">
              {index + 1}.
            </Text>
            <Text fontSize="sm" color="fg.muted">
              {step}
            </Text>
          </HStack>
        ))}
      </VStack>
    </VStack>
  </Box>
);

export default NextStepsPanel;
