import React, { useState } from "react";
import {
  Heading,
  Container,
  Text,
  VStack,
  Button,
  Input,
  Box,
} from "@chakra-ui/react";
import { useUserStore } from "@/shared/stores/userStore";
import { updateGuestUsername } from "@/features/authentication/api/guestApi";

const AccountPage: React.FC = () => {
  const user = useUserStore((state) => state.user);
  const [username, setUsername] = useState(user.username || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || username.length < 5) {
      setError("Username must be at least 5 characters long");
      return;
    }
    setIsSubmitting(true);
    await updateGuestUsername(username);
    setUsername(username);
    setIsSubmitting(false);
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" size="xl" mb={4}>
        Account Page
      </Heading>
      <Heading as="h2" size="lg" mb={4}>
        User Information
      </Heading>

      {user.isGuest ? (
        <VStack gap={6} align="start">
          <Text>
            You are currently a guest user. You can only update your username.
          </Text>

          <Box as="form" onSubmit={handleSubmit} width="100%" maxW="md">
            <VStack gap={4} align="start">
              <Input
                id="username"
                placeholder="Enter new username"
                value={username}
                onChange={handleUsernameChange}
              />
              <Button
                type="submit"
                colorScheme="blue"
                loading={isSubmitting}
                loadingText="Updating"
              >
                Update Username
              </Button>
            </VStack>
          </Box>
        </VStack>
      ) : (
        <VStack gap={6} align="start">
          <Text>Username: {user.username}</Text>
          <Text>Email: {user.email}</Text>
          <Text>Account Type: {user.isGuest ? "Guest" : "Registered"}</Text>
        </VStack>
      )}
    </Container>
  );
};

export default AccountPage;
