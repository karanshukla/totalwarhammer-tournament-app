import React from "react";
import {
  Heading,
  Text,
  VStack,
  Stack,
  CardRoot,
  Separator,
} from "@chakra-ui/react";
import UsernameUpdateForm from "./UsernameUpdateForm";
import PasswordUpdateForm from "./PasswordUpdateForm";
import LogoutButton from "./LogoutButton";

const AuthenticatedAccountSection: React.FC = () => {
  return (
    <Stack
      direction={{ base: "column", md: "row" }}
      gap={8}
      w="100%"
      align="flex-start"
    >
      <CardRoot flex="1" p={5} borderWidth="1px" borderRadius="lg">
        <VStack align="start" gap={4}>
          <Heading size="md">Update Username</Heading>
          <Text>Change your current username</Text>
          <UsernameUpdateForm />
          <Text fontSize="sm" color="gray.500">
            Usernames must be at least 5 characters long.
          </Text>
        </VStack>
        <Separator my={4} />
        <LogoutButton />
      </CardRoot>

      <CardRoot flex="1" p={5} borderWidth="1px" borderRadius="lg">
        <VStack align="start" gap={4}>
          <Heading size="md">Update Password</Heading>
          <Text>Change your current password</Text>
          <PasswordUpdateForm />
        </VStack>
      </CardRoot>
    </Stack>
  );
};

export default AuthenticatedAccountSection;
