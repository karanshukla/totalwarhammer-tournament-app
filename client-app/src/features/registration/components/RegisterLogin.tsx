import React from "react";
import { RegistrationForm } from "./RegistrationForm";
import {
  Box,
  Container,
  Heading,
  Stack,
  useBreakpointValue,
  Separator,
  Flex,
} from "@chakra-ui/react";
import { LoginForm } from "./LoginForm";

export const RegisterLogin: React.FC = () => {
  const direction = useBreakpointValue({ base: "column", md: "row" }) as
    | "column"
    | "row";

  return (
    <Container maxW="container.xl" py={{ base: 4, md: 8 }}>
      <Box textAlign="center" mb={{ base: 6, md: 10 }}>
        <Heading as="h1" size={{ base: "md", md: "lg" }}>
          Register or Login to your account
        </Heading>
      </Box>

      <Flex justify="center" width="100%">
        <Stack
          direction={direction}
          gap={{ base: 8, md: 12 }}
          align={direction === "column" ? "stretch" : "flex-start"}
          justify="center"
          width="100%"
          maxW={{ md: "900px" }}
          separator={
            <Separator
              orientation={direction === "column" ? "horizontal" : "vertical"}
            />
          }
        >
          <Box flex="1" maxW={direction === "row" ? "45%" : "100%"}>
            <RegistrationForm />
          </Box>
          <Box flex="1" maxW={direction === "row" ? "45%" : "100%"}>
            <LoginForm />
          </Box>
        </Stack>
      </Flex>
    </Container>
  );
};
