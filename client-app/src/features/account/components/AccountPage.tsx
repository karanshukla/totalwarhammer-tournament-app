import React, { useState } from "react";
import {
  Heading,
  Container,
  Text,
  VStack,
  Button,
  Input,
  Box,
  Stack,
  CardRoot,
  Separator,
} from "@chakra-ui/react";
import { useUserStore } from "@/shared/stores/userStore";
import { updateGuestUsername } from "@/features/authentication/api/guestApi";
import {
  updateUsername as updateAuthUsername,
  updatePassword,
} from "@/features/account/api/accountApi";
import { PasswordInput } from "@/shared/ui/PasswordInput";
import { logoutUser } from "@/features/authentication/api/authenticationApi";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

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
    try {
      if (user.isGuest) {
        await updateGuestUsername(username);
      } else {
        await updateAuthUsername(username);
      }
      setError("");
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Failed to update username");
      }
    }
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
      await updatePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
    } catch (error) {
      if (error instanceof Error) {
        setPasswordError(error.message);
      } else {
        setPasswordError("Failed to update password");
      }
    }
    setIsUpdatingPassword(false);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setTimeout(() => {}, 1000);
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" size="xl" mb={4}>
        Account
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
                value={username}
                onChange={handleUsernameChange}
              />
              {error && <Text color="red.500">{error}</Text>}
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={isSubmitting}
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
          <CardRoot flex="1" p={5} borderWidth="1px" borderRadius="lg">
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
                    isLoading={isSubmitting}
                    loadingText="Updating"
                    width="full"
                  >
                    Update Username
                  </Button>
                </VStack>
              </Box>
              <Text fontSize="sm" color="gray.500">
                Usernames must be at least 5 characters long.
              </Text>
            </VStack>
            <Separator my={4} />
            <Button onClick={handleLogout}>Logout</Button>
          </CardRoot>

          <CardRoot flex="1" p={5} borderWidth="1px" borderRadius="lg">
            <VStack align="start" gap={4}>
              <Heading size="md">Update Password</Heading>
              <Text>Change your current password</Text>

              <Box as="form" onSubmit={handlePasswordSubmit} width="100%">
                <VStack gap={4} align="start">
                  <PasswordInput
                    id="currentPassword"
                    type="password"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={handlePasswordChange}
                  />
                  <PasswordInput
                    id="newPassword"
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={handlePasswordChange}
                  />
                  <PasswordInput
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={handlePasswordChange}
                  />
                  {passwordError && (
                    <Text color="red.500">{passwordError}</Text>
                  )}
                  <Button
                    type="submit"
                    colorScheme="blue"
                    isLoading={isUpdatingPassword}
                    loadingText="Updating"
                    width="full"
                  >
                    Update Password
                  </Button>
                </VStack>
              </Box>
            </VStack>
          </CardRoot>
        </Stack>
      )}

      {!user.isAuthenticated && (
        <CardRoot p={5} borderWidth="1px" borderRadius="lg" width="50%">
          <Text>You aren't logged in! :(</Text>
        </CardRoot>
      )}
    </Container>
  );
};

export default AccountPage;
