import React from "react";
import { Container, VStack, Separator } from "@chakra-ui/react";
import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";
import TournamentLookup from "./TournamentLookup";
import TournamentFormatsSection from "./TournamentFormatsSection";
import HowItWorksSection from "./HowItWorksSection";

const HomePage: React.FC = () => (
  <Container maxW="7xl" py={10} px={{ base: 4, md: 8, lg: 12 }}>
    <VStack gap={12} align="stretch">
      <HeroSection />
      <Separator />
      <FeaturesSection />
      <TournamentLookup />
      <TournamentFormatsSection />
      <HowItWorksSection />
    </VStack>
  </Container>
);

export default HomePage;
