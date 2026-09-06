import React from "react";
import { Heading, HStack, Text } from "@chakra-ui/react";
import { LuClock } from "react-icons/lu";

interface StatisticsHeaderProps {
  cachedAt?: string;
}

const StatisticsHeader: React.FC<StatisticsHeaderProps> = ({ cachedAt }) => (
  <HStack justify="space-between" align="baseline" wrap="wrap" gap={2}>
    <Heading as="h1" size="xl">
      Statistics
    </Heading>
    {cachedAt && (
      <HStack gap={1} color="fg.muted">
        <LuClock size={12} />
        <Text fontSize="xs">
          Updated{" "}
          {new Date(cachedAt).toLocaleTimeString("en-GB", {
            timeZone: "UTC",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}{" "}
          UTC
        </Text>
      </HStack>
    )}
  </HStack>
);

export default StatisticsHeader;
