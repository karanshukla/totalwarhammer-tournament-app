import { Button, Field, Input, Stack, Text, Separator } from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toaster } from "@/shared/ui/toasterStore";
import { userExists } from "../api/registrationApi";
import { LoginForm } from "./LoginForm";
import { RegistrationForm } from "./RegistrationForm";
import { PasswordResetForm } from "./PasswordResetForm";
import { useState } from "react";
import { createGuestUser } from "../api/guestApi";

const authenticationFormSchema = z.object({
  usernameOrEmail: z
    .string()
    .min(5, { message: "A valid Username or Email is required" }),
});

export type AuthenticationFormValues = z.infer<typeof authenticationFormSchema>;
export type AuthEventType = "close-drawer";

export function AuthenticationForm() {
  const [flowState, setFlowState] = useState({
    view: "check" as "check" | "login" | "register" | "reset-password",
    usernameOrEmail: "",
    isCheckingUser: false,
    isCreatingGuest: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthenticationFormValues>({
    resolver: zodResolver(authenticationFormSchema),
  });

  const closeDrawer = () => {
    document.dispatchEvent(
      new CustomEvent("auth-event", {
        detail: { type: "close-drawer" },
      }),
    );
  };

  // Both of these await calls rethrow (userExists silently, createGuestUser
  // after toasting). Without a catch the loading flag was never cleared, so a
  // rate-limited or offline request left the button spinning and disabled
  // until the user reloaded the page.
  const onSubmit = async (data: AuthenticationFormValues) => {
    setFlowState((prev) => ({
      ...prev,
      isCheckingUser: true,
      usernameOrEmail: data.usernameOrEmail,
    }));
    try {
      const exists = await userExists(data.usernameOrEmail);
      setFlowState((prev) => ({
        ...prev,
        view: exists ? "login" : "register",
        isCheckingUser: false,
      }));
    } catch {
      setFlowState((prev) => ({ ...prev, isCheckingUser: false }));
      toaster.create({
        title: "Could not continue",
        description: "We couldn't reach the server. Please try again.",
        type: "error",
      });
    }
  };

  const handleGuestLogin = async () => {
    setFlowState((prev) => ({ ...prev, isCreatingGuest: true }));
    try {
      await createGuestUser();
      closeDrawer();
    } catch {
      // createGuestUser has already surfaced the failure via a toast.
    } finally {
      setFlowState((prev) => ({ ...prev, isCreatingGuest: false }));
    }
  };

  const handlePasswordResetClick = () => {
    setFlowState((prev) => ({
      ...prev,
      view: "reset-password",
    }));
  };

  const handleBackToLogin = () => {
    setFlowState((prev) => ({
      ...prev,
      view: "check",
    }));
  };

  if (flowState.view === "login") {
    return (
      <>
        <LoginForm
          key="login-form"
          defaultIdentifier={flowState.usernameOrEmail}
          onSuccess={closeDrawer}
        />
      </>
    );
  }

  if (flowState.view === "register") {
    return (
      <>
        <RegistrationForm
          key="registration-form"
          defaultIdentifier={flowState.usernameOrEmail}
        />
      </>
    );
  }

  if (flowState.view === "reset-password") {
    return (
      <PasswordResetForm
        onBackClick={handleBackToLogin}
        onSuccess={closeDrawer}
      />
    );
  }

  return (
    <>
      <Stack gap={6}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack gap="4" align="flex-start" maxW="sm">
            <Field.Root invalid={!!errors.usernameOrEmail} required>
              <Field.Label>Username or Email</Field.Label>
              <Input {...register("usernameOrEmail")} />
              <Field.ErrorText>
                {errors.usernameOrEmail?.message}
              </Field.ErrorText>
            </Field.Root>
            <Button
              type="submit"
              loading={flowState.isCheckingUser}
              loadingText="Checking..."
            >
              Submit
            </Button>
          </Stack>
        </form>

        <Separator />

        <Stack gap={2} align="center">
          <Text fontSize="sm" color="fg.muted">
            Don't want to create an account?
          </Text>
          <Button
            variant="outline"
            colorPalette="ink"
            width="full"
            onClick={handleGuestLogin}
            loading={flowState.isCreatingGuest}
            loadingText="Creating guest account..."
          >
            Continue as Guest
          </Button>
          <Text fontSize="xs" color="fg.muted">
            Guest accounts last for 48 hours. You may create brackets and
            participate in tournaments, but you cannot create a tournament or
            appear in the site leaderboards.
          </Text>

          <Separator />
          <Button
            variant="outline"
            colorPalette="ink"
            width="full"
            onClick={handlePasswordResetClick}
          >
            Reset Password
          </Button>
        </Stack>
      </Stack>
    </>
  );
}
