import { Box, Heading, Text, VStack, Container, Image } from "@chakra-ui/react";
import { RegistrationForm } from "@/features/registration/components/RegistrationForm";
import CommonNavBar from "./features/registration/components/CommonNavBar";

export function App() {
  return (
    <>
      <CommonNavBar />
      <Box
        ml={{ base: "70px", md: "250px" }}  // Match the navbar width
        pt="60px"  // Account for header height
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
              alt="Summon the Elector Counts!"
            />
            <Heading size="2xl" mb={2}>
              Total Warhammer Tournament App
            </Heading>

            <Text fontSize="xl">
              Currently under construction! Register below for updates.
            </Text>
            <RegistrationForm />
          </VStack>
        </Container>
      </Box>
    </>
  );
}

export default App;
