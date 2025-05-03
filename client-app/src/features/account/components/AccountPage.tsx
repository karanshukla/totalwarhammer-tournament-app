import React from "react";
import { Heading, Container, Text } from "@chakra-ui/react";
import { useUserStore } from "@/shared/stores/userStore";

const AccountPage: React.FC = () => {
  const user = useUserStore((state) => state.user);

  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" size="xl" mb={4}>
        Account Page
      </Heading>
      <Heading as="h2" size="lg" mb={4}>
        User Information
      </Heading>
      {user.isGuest ? (
        <Text>
          You are currently a guest user. You can only update your username.
        </Text>
      ) : (
        <Text>
          You are logged in as {user.username}. You can update your account
          information here.
        </Text>
      )}
    </Container>
  );
};

export default AccountPage;
