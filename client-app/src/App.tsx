import {
  Box,
  Heading,
  Text,
  VStack,
  Container,
  Image,
  Flex,
} from "@chakra-ui/react";
import CommonNavBar from "./features/registration/components/CommonNavBar";
import CommonHeader from "./features/registration/components/CommonHeader";

export function App() {
  return (
    <Flex direction="column" minH="100vh">
      {/* Fixed header */}
      <Box position="fixed" top="0" width="full" zIndex="docked">
        <CommonHeader />
      </Box>

      {/* Main content area with sidebar */}
      <Flex flex="1">
        <CommonNavBar />

        {/* Main content */}
        <Box
          flex="1"
          ml={{ base: "70px", md: "250px" }}
          pt="20"
          width={{ base: "calc(100% - 70px)", md: "calc(100% - 250px)" }}
        >
          <VStack
            gap="6"
            textAlign="center"
            width="full"
            maxW="container.md"
            mx="auto"
            py="10"
            px="4"
          >
            <Image
              height="200px"
              src="/karlfranz.jpg"
              alt="Summon the Elector Counts!"
            />
            <Heading as="h1" size="2xl">
              Total Warhammer Tournament App
            </Heading>
            <Text fontSize="xl">Currently under construction</Text>
          </VStack>
        </Box>
      </Flex>
    </Flex>
  );
}

export default App;
