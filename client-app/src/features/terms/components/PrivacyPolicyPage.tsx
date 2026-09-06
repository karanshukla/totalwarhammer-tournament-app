import React from "react";
import { Heading, Container, Box, Text, VStack, Link } from "@chakra-ui/react";
import { Prose } from "@/shared/ui/Prose";
import { PrivacyPolicyContent } from "./privacyPolicyContent";

const tocItems = [
  { id: "controller", label: "Data Controller" },
  { id: "what-we-collect", label: "What We Collect" },
  { id: "lawful-basis", label: "Lawful Basis" },
  { id: "retention", label: "Data Retention" },
  { id: "your-rights", label: "Your Rights" },
  { id: "third-parties", label: "Third Parties" },
  { id: "contact", label: "Contact" },
];

const PrivacyPolicyPage: React.FC = () => {
  return (
    <Container maxW="6xl" py={8} px={{ base: 4, md: 8 }}>
      <Heading as="h1" size="xl" mb={2}>
        Privacy Policy
      </Heading>
      <Text color="fg.muted" fontSize="sm" mb={8}>
        Last updated: May 2026
      </Text>
      <Box
        display={{ base: "block", lg: "grid" }}
        gridTemplateColumns={{ lg: "200px 1fr" }}
        gap={10}
        alignItems="start"
      >
        <Box display={{ base: "none", lg: "block" }} position="sticky" top={6}>
          <Text
            fontSize="xs"
            fontWeight="semibold"
            textTransform="uppercase"
            letterSpacing="wider"
            color="fg.muted"
            mb={3}
          >
            On this page
          </Text>
          <VStack align="stretch" gap={1}>
            {tocItems.map((item) => (
              <Link
                key={item.id}
                href={`#${item.id}`}
                fontSize="sm"
                color="fg.muted"
                _hover={{ color: "fg" }}
                textDecoration="none"
                py={1}
              >
                {item.label}
              </Link>
            ))}
          </VStack>
        </Box>

        <Box maxW="2xl">
          <Prose size="lg">
            <PrivacyPolicyContent />
          </Prose>
        </Box>
      </Box>
    </Container>
  );
};

export default PrivacyPolicyPage;
