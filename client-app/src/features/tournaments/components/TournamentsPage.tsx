import React from "react";
import { Heading, Container } from "@chakra-ui/react";

const TournamentsPage: React.FC = () => {
  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" size="xl" mb={4}>
        Tournaments Page
      </Heading>
    </Container>
  );
};

export default TournamentsPage;
