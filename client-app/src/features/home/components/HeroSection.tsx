import React from "react";
import { HStack, Button, Text, Box, Heading, Badge } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { useUserStore } from "@/shared/stores/userStore";

const HeroSection: React.FC = () => {
  const userStore = useUserStore();
  const isUserLoggedIn = Boolean(userStore.user.isAuthenticated);
  const isUserGuest = Boolean(userStore.user.isGuest);
  const showCreateAccount = !isUserLoggedIn && !isUserGuest;

  return (
    <Box textAlign="center" py={8}>
      <Badge
        variant="subtle"
        bg="gold.subtle"
        color="gold.text"
        mb={4}
        px={3}
        py={1}
        fontSize="xs"
        textTransform="uppercase"
        letterSpacing="wider"
        whiteSpace="normal"
        maxW="full"
      >
        Now includes beta warhammer 40k support (Dawn of War/Future Titles)
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
      <HStack gap={3} justify="center" flexWrap="wrap">
        <Button colorPalette="verdigris" size="lg" asChild>
          <Link to="/tournaments">View Ongoing Tournaments</Link>
        </Button>
        {showCreateAccount && (
          <Button
            colorPalette="brass"
            variant="outline"
            size="lg"
            onClick={() =>
              document.dispatchEvent(
                new CustomEvent("auth-event", {
                  detail: { type: "open-drawer" },
                }),
              )
            }
          >
            Create Account
          </Button>
        )}
      </HStack>
    </Box>
  );
};

export default HeroSection;
