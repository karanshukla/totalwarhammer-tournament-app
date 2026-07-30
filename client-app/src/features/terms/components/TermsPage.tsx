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
        {/* Sticky TOC sidebar - desktop only */}
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

        {/* Main content */}
        <Box maxW="2xl">
          <Prose size="lg">
            <h2 id="usage">Usage</h2>
            <p>
              You're free to use this app to create brackets, host tournaments,
              and track match results. The app is designed for Total War:
              Warhammer but may be used for other purposes. You may participate
              either as a registered user or as a guest - no account is required
              to join a tournament.
            </p>

            <h2 id="data-hosting">Data &amp; Hosting</h2>
            <p>
              Both the backend API and the frontend application are hosted
              within the European Union. All data - including user accounts,
              tournament records, and match results - is stored on EU-based
              infrastructure and is subject to the{" "}
              <strong>General Data Protection Regulation (GDPR)</strong>.
            </p>
            <p>
              We collect only the minimum data necessary to operate the service:
            </p>
            <ul>
              <li>
                <strong>Registered users:</strong> email address, username, and
                hashed password. Your email is used only for account recovery.
              </li>
              <li>
                <strong>Guest users:</strong> a temporary session identifier. No
                personal information is required or stored beyond your chosen
                display name.
              </li>
              <li>
                <strong>Tournament &amp; match data:</strong> participant names,
                results, and timestamps associated with tournaments you create
                or join.
              </li>
            </ul>
            <p>You may delete your data in the Account page</p>

            <h2 id="acceptable-use">Acceptable Use</h2>
            <p>
              You may not use this app for any illegal activities, to harass
              other users, or in any way that violates the Terms of Service of
              Total War: Warhammer or any other game. Abuse of the platform may
              result in account suspension.
            </p>

            <h2 id="disclaimer">Disclaimer</h2>
            <p>
              Total War is a registered trademark of SEGA and Creative Assembly.
              This project is an independent community tool and is not
              affiliated with, sponsored by, or endorsed by SEGA or Creative
              Assembly.
            </p>
            <p>
              The app is provided as-is, without warranty of any kind. We
              reserve the right to modify or discontinue the service at any
              time.
            </p>

            <h2 id="contact">Contact</h2>
            <p>
              For questions, feedback, or data requests, please open an issue on{" "}
              <a
                href="https://github.com/karanshukla/totalwarhammer-tournament-app"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>{" "}
              or contact us on Discord: <strong>@anchorstandard</strong>.
            </p>

            <p>
              <em>
                In general, don't be mean to others, and don't do anything Karl
                Franz would disapprove of.
              </em>
            </p>
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
