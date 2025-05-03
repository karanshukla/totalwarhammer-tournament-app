import { Button, Field, Input, Stack, Checkbox } from "@chakra-ui/react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginUser } from "../api/authenticationApi";
import { useState, useRef } from "react";

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
  const isSubmittingRef = useRef(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: defaultEmail,
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    // Prevent duplicate submissions
    if (isSubmittingRef.current) {
      return;
    }

    try {
      setIsLoading(true);
      isSubmittingRef.current = true;

      await loginUser(data);
      onSuccess?.();
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoading(false);
      // Add a small delay before allowing another submission
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 1000);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack gap="4" align="flex-start" maxW="sm">
        <Field.Root invalid={!!errors.email} required>
          <Field.Label>Email Address</Field.Label>
          <Controller
            name="email"
            control={control}
            render={({ field }) => <Input {...field} />}
          />
          <Field.ErrorText>{errors.email?.message}</Field.ErrorText>
        </Field.Root>

        <Field.Root invalid={!!errors.password} required>
          <Field.Label>Password</Field.Label>
          <Controller
            name="password"
            control={control}
            render={({ field }) => <Input type="password" {...field} />}
          />
          <Field.ErrorText>{errors.password?.message}</Field.ErrorText>
        </Field.Root>

        <Controller
          name="rememberMe"
          control={control}
          render={({ field: { onChange, value, ref } }) => (
            <Checkbox.Root
              checked={value}
              onCheckedChange={(checked) => {
                onChange(checked.checked);
              }}
            >
              <Checkbox.HiddenInput ref={ref} />
              <Checkbox.Control />
              <Checkbox.Label>Remember Me</Checkbox.Label>
            </Checkbox.Root>
          )}
        />

        <Button type="submit" loading={isLoading} loadingText="Logging in...">
          Login
        </Button>
      </Stack>
    </form>
  );
}
