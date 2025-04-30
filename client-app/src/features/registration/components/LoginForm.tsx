import { Button, Field, Input, Stack, Checkbox } from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginUser } from "../api/loginApi";
import { Toaster } from "@/shared/ui/toaster";
import { useRouter } from "@/core/router/RouterContext";

const loginFormSchema = z.object({
  email: z.string().email({ message: "A valid Email Address is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

interface LoginFormProps {
  defaultEmail?: string;
}

export function LoginForm({ defaultEmail = "" }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: defaultEmail,
    },
  });

  const { navigate } = useRouter();

  const onSubmit = async (data: LoginFormValues) => {
    await loginUser(data);
    navigate("/");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack gap="4" align="flex-start" maxW="sm">
        <Toaster />
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
          {/*/TODO - Implement remember me functionality via session token or something*/}
          <Checkbox.Label>Remember Me</Checkbox.Label>
        </Checkbox.Root>
        <Button type="submit" as="button">
          Login
        </Button>
      </Stack>
    </form>
  );
}
