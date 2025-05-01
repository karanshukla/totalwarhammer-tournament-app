import React from "react";
import { Heading, Text, Container, VStack, Image } from "@chakra-ui/react";

const HomePage: React.FC = () => {
  return (
    <Container maxW="container.xl">
      <VStack gap={6} py={10} align="flex-start">
        <Image
          src="/karlfranz.jpg"
          alt="Summon the Elector Counts!"
          w="200px"
        />
        <Heading>Welcome to Total Warhammer Tournament App</Heading>
        <Text fontSize="lg">Under Construction</Text>
      </VStack>
    </Container>
  );
};

export default HomePage;
