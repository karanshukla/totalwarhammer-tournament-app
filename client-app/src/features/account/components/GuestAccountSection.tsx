import React from "react";
import {
  VStack,
  HStack,
  Text,
  Heading,
  Badge,
  CardRoot,
} from "@chakra-ui/react";
import { LuUser } from "react-icons/lu";
import { useUserStore } from "@/shared/stores/userStore";
import UsernameUpdateForm from "./UsernameUpdateForm";

const GuestAccountSection: React.FC = () => {
  const user = useUserStore((state) => state.user);
  return (
    <VStack align="stretch" gap={6} w="100%">
      <CardRoot p={5} borderWidth="1px" borderRadius="lg" bg="bg.panel">
        <VStack align="start" gap={2}>
          <Heading
            size="sm"
            color="fg.muted"
            textTransform="uppercase"
            letterSpacing="wider"
          >
            Signed in as
          </Heading>
          <HStack gap={3}>
            <HStack gap={1.5} color="fg">
              <LuUser />
              <Text fontWeight="semibold">{user.username || "Guest"}</Text>
            </HStack>
            <Badge colorPalette="brass" variant="subtle">
              Guest
            </Badge>
          </HStack>
          <Text fontSize="sm" color="fg.muted">
            Guest accounts last 48 hours. You can participate in tournaments but
            cannot create them or appear in leaderboards.
          </Text>
        </VStack>
      </CardRoot>

      <CardRoot p={5} borderWidth="1px" borderRadius="lg" bg="bg.panel">
        <VStack align="start" gap={4}>
          <Heading size="md">Update Username</Heading>
          <Text color="fg.muted" fontSize="sm">
            Set a display name for your guest session. Must be at least 3
            characters.
          </Text>
          <UsernameUpdateForm isGuest={true} />
        </VStack>
      </CardRoot>
    </VStack>
  );
};

export default GuestAccountSection;
