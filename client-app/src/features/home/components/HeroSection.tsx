import React from "react";
import {
  VStack,
  HStack,
  Button,
  Text,
  Box,
  Heading,
  Badge,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";

const HeroSection: React.FC = () => (
  <Box textAlign="center" py={8}>
    <Badge
      colorPalette="red"
      mb={4}
      px={3}
      py={1}
      fontSize="xs"
      textTransform="uppercase"
      letterSpacing="wider"
    >
      Total War: Warhammer
    </Badge>
    <Heading as="h1" size="4xl" fontWeight="bold" lineHeight="tight" mb={4}>
      TW Tournament App
    </Heading>
    <Text
      fontSize="lg"
      color="fg.muted"
      maxW="2xl"
      mx="auto"
      lineHeight="relaxed"
      mb={8}
    >
      Create custom brackets, participate in Total War Warhammer tournaments
      within the multiplayer community, and view statistics for recorded
      matchups.
    </Text>
    <HStack gap={3} justify="center">
      <Button colorPalette="blue" size="lg" asChild>
        <Link to="/tournaments">View Ongoing Tournaments</Link>
      </Button>
      <Button
        variant="outline"
        size="lg"
        onClick={() =>
          document.dispatchEvent(
            new CustomEvent("auth-event", { detail: { type: "open-drawer" } }),
          )
        }
      >
        Create Account
      </Button>
    </HStack>
  </Box>
);

export default HeroSection;
