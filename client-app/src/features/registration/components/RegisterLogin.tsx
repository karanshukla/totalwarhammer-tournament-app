import React from "react";
import { RegistrationForm } from "./RegistrationForm";
import { Container, HStack, Separator } from "@chakra-ui/react";
import { LoginForm } from "./LoginForm";

export const RegisterLogin: React.FC = () => {
  return (
    <Container maxW="container.xl" py={8}>
      <HStack gap={8} align="flex-start">
      <RegistrationForm />
      <Separator />
      <LoginForm />
      </HStack>
    </Container>
  );
};
