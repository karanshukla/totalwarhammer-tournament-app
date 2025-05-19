import React from "react";
import {
  Heading,
  Text,
  Container,
  VStack,
  Image,
  Button,
  Input,
  HStack,
} from "@chakra-ui/react";
import { Prose } from "@/shared/ui/Prose";

const HomePage: React.FC = () => {
  return (
    <Container maxW="container.xl">
      <VStack gap={6} py={10} align="flex-start">
        <Prose>
          <Heading as="h1" size="2xl" mb={4}>
            TWT Tournament App
          </Heading>
          <Text>
            Create custom brackets, participate in Total War Warhammer 3
            tournaments within the multiplayer community, and view statistics
            for recorded matchups.
          </Text>
        </Prose>
        <Text>
          Want to view an ongoing tournament? Enter in the Tourney Code below:
        </Text>
        <Input placeholder="Enter Tourney Code" />
        <Button colorScheme="teal" size="lg">
          View Tournament
        </Button>
        <Text>
          Want to participate in an upcoming tournament? Head over to the
          "Tournaments" page using the navigation bar
        </Text>
      </VStack>
      <HStack
        justify="center"
        align="center"
        gap={8}
        py={10}
        flexDirection={{ base: "column", md: "row" }}
      >
        <Prose>
          Want to participate in a tournament? Create a guest account and change
          your username
        </Prose>
        <Prose>
          Want to host tournaments? Create an account and login to access
          tournament management features
        </Prose>
      </HStack>
    </Container>
  );
};

export default HomePage;
