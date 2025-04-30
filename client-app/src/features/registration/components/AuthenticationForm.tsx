import { Button, Field, Input, Stack, Checkbox } from "@chakra-ui/react";
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

const authenticationFormSchema = z.object({
  usernameOrEmail: z
    .string()
    .or(z.string().email())
    .or(z.string().min(5, { message: "A valid Username is required" })),
});

export type authenticationFormValues = z.infer<typeof authenticationFormSchema>;

export function AuthenticationForm() {
  const [formToShow, setFormToShow] = useState<"check" | "login" | "register">(
    "check"
  );
  const [usernameOrEmailValue, setUsernameOrEmailValue] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<authenticationFormValues>({
    resolver: zodResolver(authenticationFormSchema),
  });

  const router = useRouter();

  const onSubmit = async (data: authenticationFormValues) => {
    try {
      setUsernameOrEmailValue(data.usernameOrEmail);
      const exists = await userExists(data.usernameOrEmail);
      if (exists) {
        setFormToShow("login");
      } else {
        setFormToShow("register");
      }
    } catch (error) {
      console.error("Authentication check failed:", error);
    }
  };

  return (
    <>
      <Toaster />
      {formToShow === "login" ? (
        <LoginForm key="login-form" defaultEmail={usernameOrEmailValue} />
      ) : formToShow === "register" ? (
        <RegistrationForm key="registration-form" />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack gap="4" align="flex-start" maxW="sm">
            <Field.Root invalid={!!errors.usernameOrEmail} required>
              <Field.Label>Username or Email</Field.Label>
              <Input {...register("usernameOrEmail")} />
              <Field.ErrorText>
                {errors.usernameOrEmail?.message}
              </Field.ErrorText>
            </Field.Root>
            <Button type="submit" as="button">
              Submit
            </Button>
          </Stack>
        </form>
      )}
    </>
  );
}
