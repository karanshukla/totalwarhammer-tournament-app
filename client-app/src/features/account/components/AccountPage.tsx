import React, { useState } from "react";
import {
  Heading,
  Container,
  Text,
  VStack,
  Button,
  Input,
  Box,
  HStack,
  Stack,
} from "@chakra-ui/react";
import { useUserStore } from "@/shared/stores/userStore";
import { updateGuestUsername } from "@/features/authentication/api/guestApi";

const AccountPage: React.FC = () => {
  const user = useUserStore((state) => state.user);
  const [username, setUsername] = useState(user.username || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || username.length < 5) {
      setError("Usernames must be at least 5 characters long");
      return;
    }
    setIsSubmitting(true);
    await updateGuestUsername(username);
    setUsername(username);
    setIsSubmitting(false);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    if (id === "currentPassword") setCurrentPassword(value);
    if (id === "newPassword") setNewPassword(value);
    if (id === "confirmPassword") setConfirmPassword(value);
    if (passwordError) setPasswordError("");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      // You'll need to implement an API call to update the password
      // await updatePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      // Show success message
    } catch (error) {
      setPasswordError("Failed to update password");
    }
    setIsUpdatingPassword(false);
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" size="xl" mb={4}>
        Account Page
      </Heading>
      <Heading as="h2" size="lg" mb={4}>
        User Information
      </Heading>

      {user.isGuest && (
        <VStack gap={6} align="start">
          <Text>
            You are currently a guest user. You can only update your username.
          </Text>

          <Box as="form" onSubmit={handleSubmit} width="100%" maxW="md">
            <VStack gap={4} align="start">
              <Input
                id="username"
                placeholder="Enter your new username"
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
      )}

      {user.isAuthenticated && !user.isGuest && (
        <Stack
          direction={{ base: "column", md: "row" }}
          gap={8}
          w="100%"
          align="flex-start"
        >
          {/* Username Update Column */}
          <Box flex="1" p={5} borderWidth="1px" borderRadius="lg">
            <VStack align="start" gap={4}>
              <Heading size="md">Update Username</Heading>
              <Text>Change your current username</Text>

              <Box as="form" onSubmit={handleSubmit} width="100%">
                <VStack gap={4} align="start">
                  <Input
                    id="username"
                    placeholder="Enter your new username"
                    value={username}
                    onChange={handleUsernameChange}
                  />
                  {error && <Text color="red.500">{error}</Text>}
                  <Button
                    type="submit"
                    colorScheme="blue"
                    loading={isSubmitting}
                    loadingText="Updating"
                    width="full"
                  >
                    Update Username
                  </Button>
                </VStack>
              </Box>
            </VStack>
          </Box>

          {/* Password Update Column */}
          <Box flex="1" p={5} borderWidth="1px" borderRadius="lg">
            <VStack align="start" gap={4}>
              <Heading size="md">Update Password</Heading>
              <Text>Change your current password</Text>

              <Box as="form" onSubmit={handlePasswordSubmit} width="100%">
                <VStack gap={4} align="start">
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={handlePasswordChange}
                  />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={handlePasswordChange}
                  />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={handlePasswordChange}
                  />
                  {passwordError && <Text color="red.500">{passwordError}</Text>}
                  <Button
                    type="submit"
                    colorScheme="blue"
                    loading={isUpdatingPassword}
                    loadingText="Updating"
                    width="full"
                  >
                    Update Password
                  </Button>
                </VStack>
              </Box>
            </VStack>
          </Box>
        </Stack>
      )}
    </Container>
  );
};

export default AccountPage;
