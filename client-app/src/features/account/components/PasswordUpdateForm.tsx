import React, { useState } from "react";
import { Text, VStack, Button, Box, Field } from "@chakra-ui/react";
import { PasswordInput } from "@/shared/ui/PasswordInput";
import { updatePassword } from "@/features/account/api/accountApi";
import {
  validatePassword,
  PASSWORD_MAX_LENGTH,
} from "@/shared/constants/validation";

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

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setPasswordError(validationError);
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
        <Field.Root width="100%">
          <Field.Label>Current password</Field.Label>
          <PasswordInput
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            placeholder="Current password"
            value={currentPassword}
            onChange={handlePasswordChange}
          />
        </Field.Root>
        <Field.Root width="100%">
          <Field.Label>New password</Field.Label>
          <PasswordInput
            id="newPassword"
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            value={newPassword}
            onChange={handlePasswordChange}
            maxLength={PASSWORD_MAX_LENGTH}
          />
        </Field.Root>
        <Field.Root invalid={!!passwordError} width="100%">
          <Field.Label>Confirm new password</Field.Label>
          <PasswordInput
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={handlePasswordChange}
            maxLength={PASSWORD_MAX_LENGTH}
          />
          {passwordError && <Field.ErrorText>{passwordError}</Field.ErrorText>}
        </Field.Root>
        <Button
          type="submit"
          colorPalette="crimson"
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
