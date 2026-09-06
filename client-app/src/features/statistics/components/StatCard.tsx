import React from "react";
import { Box, Card, Text, VStack } from "@chakra-ui/react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  colorPalette?: string;
  sub?: string;
}

/**
 * Every stat tile uses bg.panel fill plus a real drop shadow for elevation,
 * not a darker background. A prior attempt used bg.muted instead, which
 * tanked fg.muted's contrast to 2.66:1, failing WCAG — shadow, not fill, is
 * what has to separate the card from the page.
 */
const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  colorPalette = "crimson",
  sub,
}) => {
  const iconBg =
    colorPalette === "ink" ? "bg.subtle" : `${colorPalette}.subtle`;
  const iconColor =
    colorPalette === "ink" ? "fg.secondary" : `${colorPalette}.fg`;
  const accent =
    colorPalette === "ink" ? "border.emphasized" : `${colorPalette}.border`;

  return (
    <Card.Root
      bg="bg.panel"
      borderWidth={1}
      borderColor="border.subtle"
      borderTopWidth="2px"
      borderTopColor={accent}
      shadow="sm"
      transition="all 0.15s ease"
      _hover={{ borderColor: "border.emphasized", shadow: "md" }}
    >
      <Card.Body p={{ base: 3, md: 4 }}>
        <VStack alignItems="flex-start" gap={2}>
          <Box
            p={2}
            borderRadius="md"
            bg={iconBg}
            color={iconColor}
            fontSize="lg"
          >
            {icon}
          </Box>
          <VStack alignItems="flex-start" gap={0}>
            <Text fontSize="2xl" fontWeight="bold" lineHeight="1">
              {value}
            </Text>
            <Text fontSize="xs" color="fg.secondary" lineHeight="tight" mt={1}>
              {label}
            </Text>
            {sub && (
              <Text fontSize="xs" color="fg.secondary">
                {sub}
              </Text>
            )}
          </VStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
};

export default StatCard;
