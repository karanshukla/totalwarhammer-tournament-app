import React from "react";
import { Flex, Text, Button, HStack, Box } from "@chakra-ui/react";
import { ColorModeButton } from "@/shared/ui/color-mode";

const CommonHeader: React.FC = () => {
  return (
    <Flex
      as="header"
      w="full"
      py={3}
      px={4}
      align="center"
      justify="space-between"
      zIndex={10}
    >
      {/* Left spacer with equal width to the buttons area */}
      <Box visibility="hidden" w="130px" />

      {/* Centered title */}
      <Text fontWeight="medium" textAlign="center" flex="1">
        Total Warhammer Tournament
      </Text>

      {/* Right-aligned buttons area */}
      <HStack gap={2} w="130px" justify="flex-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => console.log("Register/Login clicked")}
        >
          Register/Login
        </Button>
        <ColorModeButton />
      </HStack>
    </Flex>
  );
};

export default CommonHeader;
