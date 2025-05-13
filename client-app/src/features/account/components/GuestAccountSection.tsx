import React from "react";
import { VStack, Text } from "@chakra-ui/react";
import UsernameUpdateForm from "./UsernameUpdateForm";

const GuestAccountSection: React.FC = () => {
  return (
    <VStack gap={6} align="start">
      <Text>
        You are currently a guest user. You can only update your username.
      </Text>
      <UsernameUpdateForm isGuest={true} />
    </VStack>
  );
};

export default GuestAccountSection;
