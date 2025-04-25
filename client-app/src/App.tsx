import {
  Box,
  Center,
  Heading,
  Text,
  VStack,
  HStack,
  Icon,
  Link,
  Container,
} from '@chakra-ui/react';
import { FaHammer, FaGithub, FaDiscord } from 'react-icons/fa';

export function App() {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Container maxW="container.md" py={10}>
          <VStack gap={6} textAlign="center">
            <Icon as={FaHammer} w={20} h={20} color="orange.400" />
            
            <Heading size="2xl" mb={2}>
              Total Warhammer Tournament App
            </Heading>
            
            <Text fontSize="xl" >
              Currently under construction!
            </Text>
          </VStack>
      </Container>
    </Box>
  );
}

export default App;
