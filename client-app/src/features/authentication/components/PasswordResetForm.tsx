import {
  Button,
  Field,
  Input,
  Stack,
  Text,
  Heading,
  Icon,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Toaster } from "@/shared/ui/Toaster";
import { useState } from "react";
import { requestPasswordReset } from "../api/passwordResetApi";
import { FiArrowLeft } from "react-icons/fi";

const passwordResetFormSchema = z.object({
  email: z.string().email({ message: "A valid Email Address is required" }),
});

export type PasswordResetFormValues = z.infer<typeof passwordResetFormSchema>;

interface PasswordResetFormProps {
  onBackClick: () => void;
  onSuccess: () => void;
}

export function PasswordResetForm({
  onBackClick,
  onSuccess,
}: PasswordResetFormProps) {
  const [isRequestingReset, setIsRequestingReset] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetFormValues>({
    resolver: zodResolver(passwordResetFormSchema),
  });

  const handlePasswordResetSubmit = async (data: PasswordResetFormValues) => {
    try {
      setIsRequestingReset(true);
      const response = await requestPasswordReset(data.email);

      if (response.success) {
        // Toast is created in the requestPasswordReset function
        onSuccess(); // Close the drawer or navigate away
      }
    } catch (error) {
      console.error("Password reset request failed:", error);
    } finally {
      setIsRequestingReset(false);
    }
  };

  return (
    <>
      <Toaster />
      <Stack gap={4}>
        <Button size="sm" variant="ghost" onClick={onBackClick}>
          <Icon as={FiArrowLeft} />
          Back to Login
        </Button>
        <Heading size="md">Reset Your Password</Heading>
        <Text fontSize="sm" color="gray.500">
          Enter your email address and we'll send you a link to reset your
          password.
        </Text>
        <form onSubmit={handleSubmit(handlePasswordResetSubmit)}>
          <Stack gap="4" align="flex-start" maxW="sm">
            <Field.Root invalid={!!errors.email} required>
              <Field.Label>Email Address</Field.Label>
              <Input {...register("email")} />
              <Field.ErrorText>{errors.email?.message}</Field.ErrorText>
            </Field.Root>
            <Button
              type="submit"
              width="full"
              loading={isRequestingReset}
              loadingText="Sending..."
            >
              Send Reset Link
            </Button>
          </Stack>
        </form>
      </Stack>
    </>
  );
}
