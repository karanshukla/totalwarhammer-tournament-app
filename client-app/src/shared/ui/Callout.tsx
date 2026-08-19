import React from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import type { BoxProps } from "@chakra-ui/react";
import { LuTriangleAlert, LuInfo, LuCircleCheck } from "react-icons/lu";

export type CalloutTone = "error" | "warning" | "info" | "success";

const tones = {
  error: {
    bg: "status.loss.subtle",
    borderColor: "status.loss.border",
    color: "status.loss",
    Icon: LuTriangleAlert,
  },
  warning: {
    bg: "gold.subtle",
    borderColor: "gold.border",
    color: "gold.text",
    Icon: LuTriangleAlert,
  },
  info: {
    bg: "bg.subtle",
    borderColor: "border",
    color: "fg.secondary",
    Icon: LuInfo,
  },
  success: {
    bg: "status.win.subtle",
    borderColor: "status.win.border",
    color: "status.win",
    Icon: LuCircleCheck,
  },
} as const;

interface CalloutProps extends Omit<BoxProps, "children"> {
  tone: CalloutTone;
  icon?: boolean;
  fontSize?: BoxProps["fontSize"];
  children: React.ReactNode;
}

/** Bordered notice tinted by tone — errors, hints, confirmations. */
const Callout: React.FC<CalloutProps> = ({
  tone,
  icon = false,
  fontSize,
  children,
  ...boxProps
}) => {
  const { bg, borderColor, color, Icon } = tones[tone];
  return (
    <Box
      role={tone === "error" ? "alert" : undefined}
      p={3}
      borderRadius="md"
      bg={bg}
      borderWidth={1}
      borderColor={borderColor}
      {...boxProps}
    >
      <HStack gap={2} alignItems="flex-start">
        {icon && (
          <Box color={color} flexShrink={0} mt="1px">
            <Icon size={14} />
          </Box>
        )}
        <Text fontSize={fontSize} color={color}>
          {children}
        </Text>
      </HStack>
    </Box>
  );
};

export default Callout;
