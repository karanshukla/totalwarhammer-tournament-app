import React from "react";
import { Heading, Text, Container, VStack, Image } from "@chakra-ui/react";

export const HomePage: React.FC = () => {
  return (
    <Container maxW="container.xl">
      <VStack gap={6} py={10} textAlign="center">
        <Image src="/karlfranz.jpg" alt="summon the Elector Counts!" />
        <Heading>Welcome to Total Warhammer Tournament App</Heading>
        <Text fontSize="lg">Under Construction</Text>
      </VStack>
    </Container>
  );
};
