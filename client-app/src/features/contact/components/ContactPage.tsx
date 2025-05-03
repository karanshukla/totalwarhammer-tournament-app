import React from "react";
import { Heading, Container, VStack } from "@chakra-ui/react";

const ContactPage: React.FC = () => {
  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" size="xl" mb={4}>
        Get Help
      </Heading>
      <VStack gap={4} align="flex-start"></VStack>
    </Container>
  );
};

export default ContactPage;
