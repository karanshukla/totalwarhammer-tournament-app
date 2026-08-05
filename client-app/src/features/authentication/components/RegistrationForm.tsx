import { Button, Field, Input, Stack } from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerUser } from "../api/registrationApi";
import { Toaster } from "@/shared/ui/Toaster";
import { useNavigate } from "react-router";
import { useState } from "react";
import { PasswordInput } from "@/shared/ui/PasswordInput";
import {
  passwordSchema,
  usernameSchema,
  USERNAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
} from "@/shared/constants/validation";

const formSchema = z.object({
  username: usernameSchema,
  email: z.string().email({ message: "A valid Email Address is required" }),
  password: passwordSchema,
});

export type RegistrationFormValues = z.infer<typeof formSchema>;

interface RegistrationFormProps {
  /** Value carried over from the initial "Username or Email" check. Routed
   *  into the email field when it contains "@", otherwise the username field. */
  defaultIdentifier?: string;
}

export function RegistrationForm({
  defaultIdentifier = "",
}: RegistrationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const isEmail = defaultIdentifier.includes("@");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: isEmail ? "" : defaultIdentifier,
      email: isEmail ? defaultIdentifier : "",
      password: "",
    },
  });

  const onSubmit = async (data: RegistrationFormValues) => {
    try {
      setIsLoading(true);
      await registerUser(data);
      navigate("/");
    } catch (error) {
      console.error("Registration failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack gap="4" align="flex-start" maxW="sm">
        <Toaster />
        <Field.Root invalid={!!errors.username} required>
          <Field.Label>Username</Field.Label>
          <Input {...register("username")} maxLength={USERNAME_MAX_LENGTH} />
          <Field.ErrorText>{errors.username?.message}</Field.ErrorText>
        </Field.Root>

        <Field.Root invalid={!!errors.email} required>
          <Field.Label>Email Address</Field.Label>
          <Input {...register("email")} />
          <Field.ErrorText>{errors.email?.message}</Field.ErrorText>
        </Field.Root>

        <Field.Root invalid={!!errors.password}>
          <Field.Label>Password</Field.Label>
          <PasswordInput
            type="password"
            {...register("password")}
            autoComplete="new-password"
            maxLength={PASSWORD_MAX_LENGTH}
          />
          <Field.ErrorText>{errors.password?.message}</Field.ErrorText>
        </Field.Root>
        <Button
          type="submit"
          as="button"
          loading={isLoading}
          loadingText="Registering..."
        >
          Register
        </Button>
      </Stack>
    </form>
  );
}
