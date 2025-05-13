import React, { useState } from "react";
import { Text, VStack, Button, Input, Box } from "@chakra-ui/react";
import { useUserStore } from "@/shared/stores/userStore";
import { updateGuestUsername } from "@/features/authentication/api/guestApi";
import { updateUsername as updateAuthUsername } from "@/features/account/api/accountApi";

interface UsernameUpdateFormProps {
  isGuest?: boolean;
}

const UsernameUpdateForm: React.FC<UsernameUpdateFormProps> = ({
  isGuest = false,
}) => {
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
      setError("Usernames must be at least 5 characters long");
      return;
    }
    setIsSubmitting(true);
    try {
      if (isGuest) {
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

  return (
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
  );
};

export default UsernameUpdateForm;
