import { Button, Field, Input, Stack } from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerUser } from "../api/registrationApi";
import { Toaster } from "@/shared/ui/toaster";
import { useRouter } from "@/core/router/RouterContext";
import { useState } from "react";

const formSchema = z.object({
  username: z.string().min(5, { message: "A valid Username is required" }),
  email: z.string().email({ message: "A valid Email Address is required" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" }),
});

export type RegistrationFormValues = z.infer<typeof formSchema>;

export function RegistrationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { navigate } = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(formSchema),
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
          <Input {...register("username")} />
          <Field.ErrorText>{errors.username?.message}</Field.ErrorText>
        </Field.Root>

        <Field.Root invalid={!!errors.email} required>
          <Field.Label>Email Address</Field.Label>
          <Input {...register("email")} />
          <Field.ErrorText>{errors.email?.message}</Field.ErrorText>
        </Field.Root>

        <Field.Root invalid={!!errors.password}>
          <Field.Label>Password</Field.Label>
          <Input type="password" {...register("password")} />
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
