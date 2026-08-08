import React from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import { LuTriangleAlert, LuInfo } from "react-icons/lu";

type Tone = "warning" | "info";

const tones = {
  warning: {
    bg: "status.loss.subtle",
    borderColor: "status.loss.border",
    color: "status.loss",
    Icon: LuTriangleAlert,
  },
  info: {
    bg: "bg.subtle",
    borderColor: "border",
    color: "fg.secondary",
    Icon: LuInfo,
  },
} as const;

interface GuidanceNoteProps {
  tone: Tone;
  children: React.ReactNode;
}

const GuidanceNote: React.FC<GuidanceNoteProps> = ({ tone, children }) => {
  const { bg, borderColor, color, Icon } = tones[tone];
  return (
    <Box
      p={3}
      borderRadius="md"
      bg={bg}
      borderWidth={1}
      borderColor={borderColor}
    >
      <HStack gap={2} alignItems="flex-start">
        <Box color={color} flexShrink={0} mt="1px">
          <Icon size={14} />
        </Box>
        <Text fontSize="xs" color={color}>
          {children}
        </Text>
      </HStack>
    </Box>
  );
};

export default GuidanceNote;
