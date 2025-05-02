import React from "react";
import {
  Heading,
  Container,
  Text,
  VStack,
  Link,
  Button,
  Icon,
} from "@chakra-ui/react";
import { FiMail, FiExternalLink } from "react-icons/fi";

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
