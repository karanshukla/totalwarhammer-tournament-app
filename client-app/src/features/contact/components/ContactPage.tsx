import React, { useState } from "react";
import {
  Heading,
  Container,
  VStack,
  Text,
  Box,
  HStack,
  Badge,
  SimpleGrid,
  Card,
  Separator,
  Collapsible,
} from "@chakra-ui/react";
import {
  LuTrophy,
  LuSwords,
  LuUsers,
  LuShieldAlert,
  LuCircleCheck,
  LuChevronDown,
  LuChevronUp,
  LuInfo,
  LuHash,
  LuUser,
} from "react-icons/lu";
import {
  KEYBOARD_SHORTCUTS,
  KEYBOARD_SHORTCUT_LABELS,
} from "@/shared/ui/keyboardShortcuts";
import {
  QUICK_START_STEPS,
  TOURNAMENT_FORMATS,
  ORGANISER_RESPONSIBILITIES,
  PLAYER_RESPONSIBILITIES,
  RESULT_REPORTING_CARDS,
  JOIN_CODE_BULLETS,
  GUEST_CAPABILITIES,
  REGISTERED_CAPABILITIES,
  FAQ_ENTRIES,
  type ResultReportingCard,
} from "./contactPageContent";

interface FaqItemProps {
  question: string;
  children: React.ReactNode;
}

const FaqItem: React.FC<FaqItemProps> = ({ question, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
      <Collapsible.Trigger
        width="full"
        textAlign="left"
        p={3}
        borderRadius="md"
        cursor="pointer"
        _hover={{ bg: "bg.muted" }}
      >
        <HStack justifyContent="space-between">
          <Text fontWeight="medium" fontSize="md">
            {question}
          </Text>
          {open ? <LuChevronUp size={16} /> : <LuChevronDown size={16} />}
        </HStack>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box px={3} pb={3} pt={1}>
          <Text fontSize="md" color="fg.muted">
            {children}
          </Text>
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  );
};

const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <Card.Root>
    <Card.Header pb={2}>
      <HStack gap={2}>
        {icon}
        <Heading size="md">{title}</Heading>
      </HStack>
    </Card.Header>
    <Card.Body pt={0}>{children}</Card.Body>
  </Card.Root>
);

const BulletList: React.FC<{ items: string[] }> = ({ items }) => (
  <VStack gap={1} alignItems="flex-start">
    {items.map((item) => (
      <Text key={item} fontSize="sm" color="fg.muted">
        • {item}
      </Text>
    ))}
  </VStack>
);

// Maps each result-reporting outcome to the semantic status tokens that
// colour its card; "neutral" (organiser override) has no status.* token
// of its own, so it falls back to the standard subtle bg/border/fg triad.
const RESULT_CARD_TONES: Record<
  ResultReportingCard["tone"],
  { bg: string; borderColor: string; titleColor: string }
> = {
  win: {
    bg: "status.win.subtle",
    borderColor: "status.win.border",
    titleColor: "status.win",
  },
  loss: {
    bg: "status.loss.subtle",
    borderColor: "status.loss.border",
    titleColor: "status.loss",
  },
  neutral: {
    bg: "bg.subtle",
    borderColor: "border",
    titleColor: "fg.secondary",
  },
};

const ContactPage: React.FC = () => {
  return (
    <Container maxW="5xl" py={8}>
      <VStack gap={2} align="flex-start" mb={8}>
        <Heading as="h1" size="xl">
          Get Help
        </Heading>
        <Text color="fg.muted">
          Everything you need to know about running tournaments in this app.
        </Text>
      </VStack>

      <VStack gap={6} align="stretch">
        <Section icon={<LuCircleCheck />} title="Quick Start">
          <VStack gap={3} align="stretch">
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
              {QUICK_START_STEPS.map(({ step, title, desc }) => (
                <HStack
                  key={step}
                  gap={3}
                  p={3}
                  borderRadius="md"
                  borderWidth={1}
                  borderColor="border"
                  alignItems="flex-start"
                >
                  <Box
                    minW={7}
                    h={7}
                    borderRadius="full"
                    bg="bg.subtle"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    flexShrink={0}
                  >
                    <Text fontSize="sm" fontWeight="bold" color="fg.secondary">
                      {step}
                    </Text>
                  </Box>
                  <VStack gap={0} alignItems="flex-start">
                    <Text fontSize="md" fontWeight="semibold">
                      {title}
                    </Text>
                    <Text fontSize="sm" color="fg.muted">
                      {desc}
                    </Text>
                  </VStack>
                </HStack>
              ))}
            </SimpleGrid>
          </VStack>
        </Section>

        <Section icon={<LuSwords />} title="Tournament Formats">
          <VStack gap={4} align="stretch">
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              {TOURNAMENT_FORMATS.map((format) => (
                <Box
                  key={format.badge}
                  p={4}
                  borderRadius="md"
                  borderWidth={1}
                  borderColor="border"
                >
                  <HStack mb={2}>
                    <Badge colorPalette={format.badgeColorPalette}>
                      {format.badge}
                    </Badge>
                  </HStack>
                  <Text fontSize="md" color="fg.muted" mb={2}>
                    {format.description}
                  </Text>
                  <BulletList items={format.bullets} />
                </Box>
              ))}
            </SimpleGrid>
          </VStack>
        </Section>

        <Section icon={<LuUsers />} title="Organiser vs. Player">
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <VStack gap={2} alignItems="flex-start">
              <HStack>
                <LuShieldAlert />
                <Text fontWeight="semibold" fontSize="md">
                  Organiser (creator)
                </Text>
              </HStack>
              <Box pl={6}>
                <BulletList items={ORGANISER_RESPONSIBILITIES} />
              </Box>
            </VStack>
            <VStack gap={2} alignItems="flex-start">
              <HStack>
                <LuUser />
                <Text fontWeight="semibold" fontSize="md">
                  Player (participant)
                </Text>
              </HStack>
              <Box pl={6}>
                <BulletList items={PLAYER_RESPONSIBILITIES} />
              </Box>
            </VStack>
          </SimpleGrid>
        </Section>

        <Section icon={<LuCircleCheck />} title="Reporting Match Results">
          <VStack gap={3} align="stretch">
            <Text fontSize="md" color="fg.muted">
              Match results can be submitted by players or recorded directly by
              the organiser.
            </Text>
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
              {RESULT_REPORTING_CARDS.map((card) => {
                const tone = RESULT_CARD_TONES[card.tone];
                return (
                  <Box
                    key={card.title}
                    p={3}
                    borderRadius="md"
                    bg={tone.bg}
                    borderWidth={1}
                    borderColor={tone.borderColor}
                  >
                    <Text
                      fontSize="sm"
                      fontWeight="semibold"
                      color={tone.titleColor}
                      mb={1}
                    >
                      {card.title}
                    </Text>
                    <Text fontSize="sm" color="fg.muted">
                      {card.description}
                    </Text>
                  </Box>
                );
              })}
            </SimpleGrid>
          </VStack>
        </Section>

        <Section icon={<LuHash />} title="Join Codes">
          <VStack gap={2} align="stretch">
            <Text fontSize="md" color="fg.muted">
              Every tournament has a unique 6-character join code (e.g.{" "}
              <Text as="span" fontFamily="mono" fontWeight="bold">
                ABC123
              </Text>
              ). Share it with players to let them join without needing a direct
              link.
            </Text>
            <HStack gap={4} flexWrap="wrap">
              {JOIN_CODE_BULLETS.map((bullet) => (
                <Text key={bullet} fontSize="sm" color="fg.muted">
                  • {bullet}
                </Text>
              ))}
            </HStack>
          </VStack>
        </Section>

        <Section icon={<LuInfo />} title="Guest vs. Registered Accounts">
          <VStack gap={2} align="stretch">
            <Text fontSize="md" color="fg.muted">
              You can use the app as a guest without signing up, but there are
              some limitations:
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
              <Box p={3} borderRadius="md" borderWidth={1} borderColor="border">
                <Text fontSize="sm" fontWeight="semibold" mb={1}>
                  Guest users can:
                </Text>
                <BulletList items={GUEST_CAPABILITIES} />
              </Box>
              <Box p={3} borderRadius="md" borderWidth={1} borderColor="border">
                <Text fontSize="sm" fontWeight="semibold" mb={1}>
                  Registered users also can:
                </Text>
                <BulletList items={REGISTERED_CAPABILITIES} />
              </Box>
            </SimpleGrid>
          </VStack>
        </Section>

        <Section icon={<LuTrophy />} title="Frequently Asked Questions">
          <VStack gap={1} align="stretch">
            {FAQ_ENTRIES.map((faq, index) => (
              <React.Fragment key={faq.question}>
                {index > 0 && <Separator />}
                <FaqItem question={faq.question}>{faq.answer}</FaqItem>
              </React.Fragment>
            ))}
          </VStack>
        </Section>

        <Section icon={<LuInfo />} title="Keyboard Shortcuts">
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={2}>
            {(
              Object.keys(
                KEYBOARD_SHORTCUTS,
              ) as (keyof typeof KEYBOARD_SHORTCUTS)[]
            )
              .map((name) => ({
                key: KEYBOARD_SHORTCUTS[name],
                label: KEYBOARD_SHORTCUT_LABELS[name],
              }))
              .map(({ key, label }) => (
                <HStack key={key} gap={2}>
                  <Text
                    as="kbd"
                    fontSize="sm"
                    fontFamily="mono"
                    px={2}
                    py={1}
                    borderRadius="sm"
                    borderWidth={1}
                    borderColor="border"
                    bg="bg.muted"
                  >
                    {key}
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    {label}
                  </Text>
                </HStack>
              ))}
          </SimpleGrid>
        </Section>
      </VStack>
    </Container>
  );
};

export default ContactPage;
