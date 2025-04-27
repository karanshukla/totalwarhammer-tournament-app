import { Box, Heading, Text, VStack, Container, Image } from "@chakra-ui/react";
import { RegistrationForm } from "@/features/registration/components/RegistrationForm";
import CommonHeader from "./features/registration/components/CommonHeader";

export function App() {
  return (
    <><CommonHeader title="Total War: Warhammer Tournament" /><Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      data-state="open"
      _open={{
        animation: "scale-in 0.2s ease-out",
        transform: "scale(1)",
      }}
    >
      <Container maxW="container.md" py={10}>
        <VStack gap={6} textAlign="center">
          <Image
            height="200px"
            src="/karlfranz.jpg"
            alt="Summon the Elector Counts!" />
          <Heading size="2xl" mb={2}>
            Total Warhammer Tournament App
          </Heading>

          <Text fontSize="xl">
            Currently under construction! Register below for updates.
          </Text>
          <RegistrationForm />
        </VStack>
      </Container>
    </Box></>
  );
}

export default App;
