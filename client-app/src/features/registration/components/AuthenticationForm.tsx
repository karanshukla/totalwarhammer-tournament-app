import {
  Button,
  Field,
  Input,
  Stack,
  Checkbox,
  HStack,
  Text,
  Separator,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginUser } from "../api/loginApi";
import { Toaster } from "@/shared/ui/toaster";
import { useRouter } from "@/core/router/RouterContext";
import { userExists } from "../api/registrationApi";
import { LoginForm } from "./LoginForm";
import { RegistrationForm } from "./RegistrationForm";
import { useState } from "react";
import { createGuestUser } from "../api/guestApi";

const authenticationFormSchema = z.object({
  usernameOrEmail: z
    .string()
    .or(z.string().email())
    .or(z.string().min(5, { message: "A valid Username is required" })),
});

export type authenticationFormValues = z.infer<typeof authenticationFormSchema>;

// Custom event type for closing drawers
export type AuthEventType = "close-drawer";

export function AuthenticationForm() {
  const [formToShow, setFormToShow] = useState<"check" | "login" | "register">(
    "check"
  );
  const [usernameOrEmailValue, setUsernameOrEmailValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<authenticationFormValues>({
    resolver: zodResolver(authenticationFormSchema),
  });

  const router = useRouter();

  // Function to dispatch custom event to close drawer
  const closeDrawer = () => {
    // Create and dispatch a custom event that RegisterLogin can listen for
    document.dispatchEvent(
      new CustomEvent("auth-event", {
        detail: { type: "close-drawer" },
      })
    );
  };

  const onSubmit = async (data: authenticationFormValues) => {
    try {
      setIsLoading(true);
      setUsernameOrEmailValue(data.usernameOrEmail);
      const exists = await userExists(data.usernameOrEmail);
      if (exists) {
        setFormToShow("login");
      } else {
        setFormToShow("register");
      }
    } catch (error) {
      console.error("Authentication check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    try {
      setIsLoading(true);
      await createGuestUser();

      // First close the drawer
      closeDrawer();

      // Short timeout to ensure the drawer closes before navigation
      setTimeout(() => {
        // Then navigate to home page
        router.navigate("/");
      }, 100);
    } catch (error) {
      console.error("Guest login failed:", error);
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster />
      {formToShow === "login" ? (
        <LoginForm
          key="login-form"
          defaultEmail={usernameOrEmailValue}
          onSuccess={closeDrawer} // Pass closeDrawer callback
        />
      ) : formToShow === "register" ? (
        <RegistrationForm
          key="registration-form"
          onSuccess={closeDrawer} // Pass closeDrawer callback
        />
      ) : (
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
                as="button"
                loading={isLoading}
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
              loading={isLoading}
              loadingText="Creating guest account..."
            >
              Continue as Guest
            </Button>
            <Text fontSize="xs" color="gray.400">
              Guest accounts last for 48 hours
            </Text>
          </Stack>
        </Stack>
      )}
    </>
  );
}
