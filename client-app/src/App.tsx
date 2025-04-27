import {
  Box,
  Heading,
  Text,
  VStack,
  Container,
  Image,
} from '@chakra-ui/react';
import { RegistrationForm } from '@/features/registration/components/RegistrationForm';

export function App() {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Container maxW="container.md" py={10}>
        <VStack gap={6} textAlign="center">
          <Image height="200px" src="/karzfranz.jpg" alt="Summon the Elector Counts" rounded="md" />
          <Heading size="2xl" mb={2}>
            Total Warhammer Tournament App
          </Heading>

          <Text fontSize="xl" >
            Currently under construction! Register below for updates.
          </Text>
          <RegistrationForm />
        </VStack>
      </Container>
    </Box>
  );
}

export default App;
