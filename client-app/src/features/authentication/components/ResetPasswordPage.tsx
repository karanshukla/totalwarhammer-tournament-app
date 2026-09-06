import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  Field,
  Heading,
  Input,
  Stack,
  Text,
  VStack,
  Alert,
  Flex,
  Link,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { verifyResetToken, resetPassword } from "../api/passwordResetApi";
import { useNavigate } from "react-router";
import { toaster } from "@/shared/ui/toasterStore";
import { PasswordInput } from "@/shared/ui/PasswordInput";
import {
  passwordSchema,
  PASSWORD_MAX_LENGTH,
} from "@/shared/constants/validation";

const resetPasswordFormSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [expiryTime, setExpiryTime] = useState<Date | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
  });

  const verifyToken = async (token: string) => {
    try {
      const response = await verifyResetToken(token);
      setIsTokenValid(response.success);

      if (response.success && response.data?.validUntil) {
        setExpiryTime(new Date(response.data.validUntil));
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setIsTokenValid(false);
      toaster.create({
        title: "Invalid Token",
        description: "The password reset token is invalid or has expired.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const token = queryParams.get("token");

    if (!token) {
      setIsTokenValid(false);
      setIsLoading(false);
      toaster.create({
        title: "Invalid Request",
        description:
          "No reset token found in the URL. Please request a new password reset link.",
        type: "error",
      });
      return;
    }

    setResetToken(token);
    verifyToken(token);
  }, []);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!resetToken) return;

    try {
      setIsResetting(true);
      const response = await resetPassword(resetToken, data.password);

      if (response.success) {
        // Delay the redirect so the success toast (raised inside
        // resetPassword) is visible before the page navigates away.
        setTimeout(() => {
          navigate("/");
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to reset password:", error);
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxW="2xl" py={10}>
        <VStack gap={6} align="center">
          <Heading size="lg">Verifying Your Reset Link</Heading>
          <Text>Please wait while we verify your reset token...</Text>
        </VStack>
      </Container>
    );
  }

  if (isTokenValid === false) {
    return (
      <Container maxW="2xl" py={10}>
        <VStack gap={6} align="center">
          <Heading size="lg">Invalid Reset Link</Heading>
          <Text textAlign="center">
            The password reset link is invalid or has expired. Please request a
            new password reset link.
          </Text>
          <Button onClick={() => navigate("/")} colorPalette="ink">
            Back to Home
          </Button>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="2xl" py={10}>
      <VStack gap={8} align="stretch">
        <Box textAlign="center">
          <Heading size="lg" mb={2}>
            Reset Your Password
          </Heading>
          <Flex direction="column">
            <Text color="fg.muted">Enter your new password below.</Text>
            {expiryTime && (
              <Text fontSize="sm" color="fg.muted">
                This link will expire at {expiryTime.toLocaleTimeString()}.
              </Text>
            )}
          </Flex>
        </Box>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack gap={6}>
            <Field.Root invalid={!!errors.password} required>
              <Field.Label>New Password</Field.Label>
              <PasswordInput
                {...register("password")}
                placeholder="Enter your new password"
                maxLength={PASSWORD_MAX_LENGTH}
              />
              <Field.ErrorText>{errors.password?.message}</Field.ErrorText>
            </Field.Root>

            <Field.Root invalid={!!errors.confirmPassword} required>
              <Field.Label>Confirm Password</Field.Label>
              <PasswordInput
                {...register("confirmPassword")}
                placeholder="Confirm your new password"
                maxLength={PASSWORD_MAX_LENGTH}
              />
              <Field.ErrorText>
                {errors.confirmPassword?.message}
              </Field.ErrorText>
            </Field.Root>

            <Button
              type="submit"
              colorPalette="crimson"
              width="full"
              loading={isResetting}
              loadingText="Resetting..."
              disabled={isResetting}
            >
              Reset Password
            </Button>
          </Stack>
        </form>

        <Link href="/">Remember your password? Click here to go home</Link>
      </VStack>
    </Container>
  );
};

export default ResetPasswordPage;
