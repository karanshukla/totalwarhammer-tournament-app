import { Button, Field, Input, Stack, Text, Separator } from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Toaster } from "@/shared/ui/toaster";
import { useRouter } from "@/core/router/RouterContext";
import { userExists } from "../api/registrationApi";
import { LoginForm } from "./LoginForm";
import { RegistrationForm } from "./RegistrationForm";
import { useState } from "react";
import { createGuestUser } from "../api/guestApi";

// Simplified schema
const authenticationFormSchema = z.object({
  usernameOrEmail: z
    .string()
    .min(5, { message: "A valid Username or Email is required" }),
});

export type authenticationFormValues = z.infer<typeof authenticationFormSchema>;
export type AuthEventType = "close-drawer";

export function AuthenticationForm() {
  const [formState, setFormState] = useState({
    view: "check" as "check" | "login" | "register",
    usernameOrEmail: "",
    isLoading: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<authenticationFormValues>({
    resolver: zodResolver(authenticationFormSchema),
  });

  const router = useRouter();

  const closeDrawer = () => {
    document.dispatchEvent(
      new CustomEvent("auth-event", {
        detail: { type: "close-drawer" },
      })
    );
  };

  const onSubmit = async (data: authenticationFormValues) => {
    try {
      setFormState((prev) => ({
        ...prev,
        isLoading: true,
        usernameOrEmail: data.usernameOrEmail,
      }));
      const exists = await userExists(data.usernameOrEmail);
      setFormState((prev) => ({
        ...prev,
        view: exists ? "login" : "register",
        isLoading: false,
      }));
    } catch (error) {
      console.error("Authentication check failed:", error);
      setFormState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleGuestLogin = async () => {
    try {
      setFormState((prev) => ({ ...prev, isLoading: true }));
      await createGuestUser();
      closeDrawer();
      setTimeout(() => router.navigate("/"), 100);
    } catch (error) {
      console.error("Guest login failed:", error);
      setFormState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  if (formState.view === "login") {
    return (
      <>
        <Toaster />
        <LoginForm
          key="login-form"
          defaultEmail={formState.usernameOrEmail}
          onSuccess={closeDrawer}
        />
      </>
    );
  }

  if (formState.view === "register") {
    return (
      <>
        <Toaster />
        <RegistrationForm key="registration-form" />
      </>
    );
  }

  return (
    <>
      <Toaster />
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
              loading={formState.isLoading}
              loadingText="Checking..."
            >
              Submit
            </Button>
          </Stack>
        </form>

        <Separator />

        <Stack gap={2} align="center">
          <Text fontSize="sm" color="gray.500">
            Don't want to create an account?
          </Text>
          <Button
            variant="outline"
            width="full"
            onClick={handleGuestLogin}
            loading={formState.isLoading}
            loadingText="Creating guest account..."
          >
            Continue as Guest
          </Button>
          <Text fontSize="xs" color="gray.400">
            Guest accounts last for 48 hours
          </Text>
        </Stack>
      </Stack>
    </>
  );
}
