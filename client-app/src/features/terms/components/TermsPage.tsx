import React from "react";
import {
  Heading,
  Container,
  Box,
  Text,
  VStack,
  Link,
  Separator,
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router";
import { Prose } from "@/shared/ui/Prose";
import { TermsContent } from "./termsContent";

const tocItems = [
  { id: "usage", label: "Usage" },
  { id: "data-hosting", label: "Data & Hosting" },
  { id: "acceptable-use", label: "Acceptable Use" },
  { id: "disclaimer", label: "Disclaimer" },
  { id: "contact", label: "Contact" },
];

const TermsPage: React.FC = () => {
  return (
    <Container maxW="6xl" py={8} px={{ base: 4, md: 8 }}>
      <Heading as="h1" size="xl" mb={8}>
        Terms of Use
      </Heading>
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
            <TermsContent />
          </Prose>
          <Separator my={8} />
          <Text fontSize="sm" color="fg.muted">
            For full details on how we handle your data, see our{" "}
            <Link asChild color="fg" textDecoration="underline">
              <RouterLink to="/privacy">Privacy Policy</RouterLink>
            </Link>
            .
          </Text>
        </Box>
      </Box>
    </Container>
  );
};

export default TermsPage;
