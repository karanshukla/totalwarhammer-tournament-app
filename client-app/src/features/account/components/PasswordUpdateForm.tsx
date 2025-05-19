import React, { useState } from "react";
import { Text, VStack, Button, Box } from "@chakra-ui/react";
import { PasswordInput } from "@/shared/ui/PasswordInput";
import { updatePassword } from "@/features/account/api/accountApi";

const PasswordUpdateForm: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

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

      window.location.reload();
    } catch (error) {
      if (error instanceof Error) {
        setPasswordError(error.message);
      } else {
        setPasswordError("Failed to update password");
      }
    }
    setIsUpdatingPassword(false);
  };

  return (
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
  );
};

export default PasswordUpdateForm;
