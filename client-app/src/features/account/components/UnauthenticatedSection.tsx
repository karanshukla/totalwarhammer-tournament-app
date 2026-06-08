import React from "react";
import {
  CardRoot,
  VStack,
  Heading,
  Text,
  Button,
  HStack,
} from "@chakra-ui/react";
import { LuLock } from "react-icons/lu";

const UnauthenticatedSection: React.FC = () => {
  const openAuthDrawer = () =>
    document.dispatchEvent(
      new CustomEvent("auth-event", { detail: { type: "open-drawer" } }),
    );

  return (
    <CardRoot p={8} borderWidth="1px" borderRadius="lg" bg="bg.panel" maxW="lg">
      <VStack align="start" gap={4}>
        <HStack gap={2} color="fg.muted">
          <LuLock size={20} />
          <Heading size="md">Not signed in</Heading>
        </HStack>
        <Text color="fg.muted" fontSize="sm">
          Sign in or create an account to manage your profile, view your match
          history, and track your tournament performance.
        </Text>
        <Button colorPalette="crimson" onClick={openAuthDrawer}>
          Sign in / Register
        </Button>
      </VStack>
    </CardRoot>
  );
};

export default UnauthenticatedSection;
