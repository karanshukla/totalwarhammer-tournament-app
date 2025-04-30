import { Button, Field, Input, Stack, Checkbox } from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginUser } from "../api/loginApi";
import { useRouter } from "@/core/router/RouterContext";
import { useState } from "react";

const loginFormSchema = z.object({
  email: z.string().email({ message: "A valid Email Address is required" }),
  password: z.string().min(1, { message: "Password is required" }),
  rememberMe: z.boolean().optional(),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

interface LoginFormProps {
  defaultEmail?: string;
  onSuccess?: () => void;
}

export function LoginForm({ defaultEmail = "", onSuccess }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: defaultEmail,
      rememberMe: false,
    },
  });

  const { navigate } = useRouter();

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const response = await loginUser(data);
      if (response.success) {
        onSuccess ? onSuccess() : navigate("/");
      }
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack gap="4" align="flex-start" maxW="sm">
        <Field.Root invalid={!!errors.email} required>
          <Field.Label>Email Address</Field.Label>
          <Input {...register("email")} />
          <Field.ErrorText>{errors.email?.message}</Field.ErrorText>
        </Field.Root>

        <Field.Root invalid={!!errors.password} required>
          <Field.Label>Password</Field.Label>
          <Input type="password" {...register("password")} />
          <Field.ErrorText>{errors.password?.message}</Field.ErrorText>
        </Field.Root>

        <Checkbox.Root>
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label>Remember Me</Checkbox.Label>
        </Checkbox.Root>

        <Button type="submit" loading={isLoading} loadingText="Logging in...">
          Login
        </Button>
      </Stack>
    </form>
  );
}
