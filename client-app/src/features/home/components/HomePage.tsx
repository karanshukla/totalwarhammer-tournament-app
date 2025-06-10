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
          <Text fontSize="2xl" fontWeight="bold">
            Create custom brackets, participate in Total War Warhammer 3
            tournaments within the multiplayer community, and view statistics
            for recorded matchups.
          </Text>
        </Prose>
        <HStack>
          <Text>
            Want to view an ongoing tournament? Enter in the Tourney Code here:
          </Text>
          <Input placeholder="Enter Tourney Code" />
          <Button colorScheme="teal" size="lg">
            View Tournament
          </Button>
        </HStack>
        <Text>
          Want to create a tournament? Create an account and login to access the
          tournament page.
        </Text>
      </VStack>
      <Prose>
        Want to participate in a tournament? Create a guest account and change
        your username
      </Prose>
      <br></br>
      <Prose>
        Guest accounts are limited to viewing tournaments and participating in
        matches. To create a tournament, you must register.
      </Prose>
    </Container>
  );
};

export default HomePage;
