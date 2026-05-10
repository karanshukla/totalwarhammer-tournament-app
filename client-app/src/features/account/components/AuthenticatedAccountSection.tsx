import React from "react";
import {
  Heading,
  Text,
  VStack,
  Stack,
  CardRoot,
  Separator,
  HStack,
  Badge,
} from "@chakra-ui/react";
import { LuUser, LuMail } from "react-icons/lu";
import UsernameUpdateForm from "./UsernameUpdateForm";
import PasswordUpdateForm from "./PasswordUpdateForm";
import LogoutButton from "./LogoutButton";
import DeleteAccountSection from "./DeleteAccountSection";
import UserStatsCard from "./UserStatsCard";
import { useUserStore } from "@/shared/stores/userStore";

const AuthenticatedAccountSection: React.FC = () => {
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
              <Text fontWeight="semibold">{user.username || "-"}</Text>
            </HStack>
            <Badge colorPalette="blue" variant="subtle">
              Registered
            </Badge>
          </HStack>
          <HStack gap={1.5} color="fg.muted">
            <LuMail />
            <Text fontSize="sm">{user.email}</Text>
          </HStack>
        </VStack>
      </CardRoot>

      <UserStatsCard />

      <Stack
        direction={{ base: "column", md: "row" }}
        gap={6}
        w="100%"
        align="stretch"
      >
        <CardRoot
          flex="1"
          p={5}
          borderWidth="1px"
          borderRadius="lg"
          bg="bg.panel"
        >
          <VStack align="start" gap={4} h="100%">
            <Heading size="md">Update Username</Heading>
            <Text color="fg.muted" fontSize="sm">
              Change your display name. Must be at least 5 characters.
            </Text>
            <UsernameUpdateForm />
            <Separator mt="auto" />
            <Text
              fontSize="xs"
              color="fg.muted"
              textTransform="uppercase"
              letterSpacing="wider"
            >
              Session
            </Text>
            <HStack gap={4} wrap="wrap">
              <LogoutButton />
              <DeleteAccountSection />
            </HStack>
          </VStack>
        </CardRoot>

        <CardRoot
          flex="1"
          p={5}
          borderWidth="1px"
          borderRadius="lg"
          bg="bg.panel"
        >
          <VStack align="start" gap={4}>
            <Heading size="md">Update Password</Heading>
            <Text color="fg.muted" fontSize="sm">
              Choose a new password for your account.
            </Text>
            <PasswordUpdateForm />
          </VStack>
        </CardRoot>
      </Stack>
    </VStack>
  );
};

export default AuthenticatedAccountSection;
