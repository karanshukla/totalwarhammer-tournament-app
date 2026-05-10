import React from "react";
import {
  Heading,
  Container,
  Box,
  Text,
  VStack,
  Link,
} from "@chakra-ui/react";
import { Prose } from "@/shared/ui/Prose";

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
        {/* Sticky TOC sidebar - desktop only */}
        <Box
          display={{ base: "none", lg: "block" }}
          position="sticky"
          top={6}
        >
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
            <h2 id="controller">Data Controller</h2>
            <p>
              This application ("TW Tournament App") is operated as an
              independent community project. The data controller responsible
              for your personal data is the project maintainer, reachable at{" "}
              <a href="mailto:dev@twtournament.app">dev@twtournament.app</a> or
              via Discord: <strong>@anchorstandard</strong>.
            </p>

            <h2 id="what-we-collect">What We Collect</h2>
            <p>
              We collect only what is necessary to operate the service:
            </p>
            <ul>
              <li>
                <strong>Registered users:</strong> username, email address, and
                a hashed (bcrypt) password. Your email is used solely for
                account recovery and is never shared with third parties.
              </li>
              <li>
                <strong>Guest users:</strong> a temporary session identifier
                and an optional display name. No email or password is required.
                Guest sessions expire after 48 hours.
              </li>
              <li>
                <strong>Tournament and match data:</strong> participant display
                names, faction selections, match results, and timestamps
                associated with tournaments you create or join.
              </li>
              <li>
                <strong>Server logs:</strong> standard web server logs
                (IP address, request path, timestamp) retained for up to 30
                days for security and debugging purposes.
              </li>
            </ul>
            <p>
              We do not use cookies beyond a session cookie required for
              authentication. We do not use analytics, advertising, or any
              third-party tracking.
            </p>

            <h2 id="lawful-basis">Lawful Basis for Processing</h2>
            <p>
              Under GDPR Article 6, we process your data on the following
              bases:
            </p>
            <ul>
              <li>
                <strong>Contract (Article 6(1)(b)):</strong> processing your
                account credentials and session data is necessary to provide
                the service you signed up for.
              </li>
              <li>
                <strong>Legitimate interest (Article 6(1)(f)):</strong>{" "}
                retaining tournament and match records (including participant
                display names) after account deletion is necessary to maintain
                the integrity of historical tournament data for other
                participants. When an account is deleted, all personal
                identifiers (email, password) are permanently removed and the
                display name is replaced with an anonymous placeholder.
              </li>
              <li>
                <strong>Legitimate interest (Article 6(1)(f)):</strong>{" "}
                short-term server log retention for security monitoring.
              </li>
            </ul>

            <h2 id="retention">Data Retention</h2>
            <ul>
              <li>
                <strong>Account data</strong> (username, email, password) is
                retained for as long as your account is active. When you
                delete your account, your email and password are permanently
                erased and your username is replaced with an anonymous
                identifier.
              </li>
              <li>
                <strong>Tournament and match records</strong> are retained
                indefinitely to preserve the integrity of historical results.
                After account deletion, your display name in these records is
                replaced with "Deleted User".
              </li>
              <li>
                <strong>Guest sessions</strong> expire after 48 hours.
              </li>
              <li>
                <strong>Server logs</strong> are retained for up to 30 days.
              </li>
            </ul>

            <h2 id="your-rights">Your Rights</h2>
            <p>
              Under GDPR you have the following rights, which you can exercise
              by contacting us:
            </p>
            <ul>
              <li>
                <strong>Right of access (Article 15):</strong> request a copy
                of the personal data we hold about you.
              </li>
              <li>
                <strong>Right to rectification (Article 16):</strong> correct
                inaccurate data - you can update your username directly in the
                account settings.
              </li>
              <li>
                <strong>Right to erasure (Article 17):</strong> delete your
                account via account settings. Personal identifiers are erased
                immediately. Tournament records are anonymised rather than
                deleted (see Lawful Basis above).
              </li>
              <li>
                <strong>Right to data portability (Article 20):</strong>{" "}
                request an export of your personal data in a machine-readable
                format.
              </li>
              <li>
                <strong>Right to object (Article 21):</strong> object to
                processing based on legitimate interest.
              </li>
              <li>
                <strong>Right to lodge a complaint:</strong> you have the
                right to lodge a complaint with your local supervisory
                authority. In the EU, a list of authorities is available at{" "}
                <a
                  href="https://edpb.europa.eu/about-edpb/about-edpb/members_en"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  edpb.europa.eu
                </a>
                .
              </li>
            </ul>

            <h2 id="third-parties">Third Parties &amp; Hosting</h2>
            <p>
              Both the frontend and backend are hosted within the European
              Union. We do not share your personal data with any third parties
              except as required by law.
            </p>
            <p>
              Infrastructure providers (hosting, database) process data on our
              behalf as data processors under appropriate agreements. No data
              is transferred outside the EU/EEA.
            </p>

            <h2 id="contact">Contact</h2>
            <p>
              For any privacy-related requests or questions, contact us at{" "}
              <a href="mailto:dev@twtournament.app">dev@twtournament.app</a> or
              via Discord: <strong>@anchorstandard</strong>.
            </p>
            <p>
              We will respond to requests within 30 days as required by GDPR
              Article 12.
            </p>
          </Prose>
        </Box>
      </Box>
    </Container>
  );
};

export default PrivacyPolicyPage;
