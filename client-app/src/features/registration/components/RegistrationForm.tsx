import { Button, Field, Input, Stack } from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerUser } from "../api/registrationApi";
import { Toaster } from "@/shared/ui/toaster";

const formSchema = z.object({
  username: z.string().min(5, { message: "A valid Username is required" }),
  email: z.string().email({ message: "A valid Email Address is required" }),
  password: z.string().optional(),
});

export type RegistrationFormValues = z.infer<typeof formSchema>;

export function RegistrationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: RegistrationFormValues) => {
    await registerUser(data);
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
          <Field.Label>Password (disabled)</Field.Label>
          <Input disabled {...register("password")} />
          <Field.ErrorText>{errors.password?.message}</Field.ErrorText>
        </Field.Root>
        <Button type="submit" as="button">
          Submit
        </Button>
      </Stack>
    </form>
  );
}
