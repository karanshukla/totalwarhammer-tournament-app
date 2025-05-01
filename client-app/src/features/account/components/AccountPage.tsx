import React from "react";
import { Box, Heading, Text, Container, VStack } from "@chakra-ui/react";

const AccountPage: React.FC = () => {
  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" size="xl" mb={4}>
        Account Page
      </Heading>
    </Container>
  );
};

export default AccountPage;
