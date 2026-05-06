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
          <Text fontWeight="medium" fontSize="sm">
            {question}
          </Text>
          {open ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}
        </HStack>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box px={3} pb={3} pt={1}>
          <Text fontSize="sm" color="fg.muted">
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

const ContactPage: React.FC = () => {
  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={2} align="flex-start" mb={8}>
        <Heading as="h1" size="xl">
          Get Help
        </Heading>
        <Text color="fg.muted">
          Everything you need to know about running tournaments in this app.
        </Text>
      </VStack>

      <VStack gap={6} align="stretch">
        {/* Quick Start */}
        <Section icon={<LuCircleCheck />} title="Quick Start">
          <VStack gap={3} align="stretch">
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
              {[
                {
                  step: "1",
                  title: "Create or join a tournament",
                  desc: "Go to Tournaments to create one, or enter a join code on the home page.",
                },
                {
                  step: "2",
                  title: "Fill the roster",
                  desc: "The organiser adds players (or players join with the code). Minimum 2 players required to start.",
                },
                {
                  step: "3",
                  title: "Start the tournament",
                  desc: "Once the organiser clicks Start, matches are generated automatically based on the format.",
                },
                {
                  step: "4",
                  title: "Report results & advance",
                  desc: "Players report who won each match. The organiser advances rounds until the tournament completes.",
                },
              ].map(({ step, title, desc }) => (
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
                    bg="blue.subtle"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    flexShrink={0}
                  >
                    <Text fontSize="xs" fontWeight="bold" color="blue.fg">
                      {step}
                    </Text>
                  </Box>
                  <VStack gap={0} alignItems="flex-start">
                    <Text fontSize="sm" fontWeight="semibold">
                      {title}
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      {desc}
                    </Text>
                  </VStack>
                </HStack>
              ))}
            </SimpleGrid>
          </VStack>
        </Section>

        {/* Tournament Formats */}
        <Section icon={<LuSwords />} title="Tournament Formats">
          <VStack gap={4} align="stretch">
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              <Box p={4} borderRadius="md" borderWidth={1} borderColor="border">
                <HStack mb={2}>
                  <Badge colorPalette="green">Single Elimination</Badge>
                </HStack>
                <Text fontSize="sm" color="fg.muted" mb={2}>
                  Lose once and you're out. Best for quick events with a
                  definitive winner.
                </Text>
                <VStack gap={1} alignItems="flex-start">
                  <Text fontSize="xs" color="fg.muted">
                    • Rounds: ⌈log₂(n)⌉
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    • Non-power-of-2 player counts get byes in round 1
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    • Minimum 2 players
                  </Text>
                </VStack>
              </Box>
              <Box p={4} borderRadius="md" borderWidth={1} borderColor="border">
                <HStack mb={2}>
                  <Badge colorPalette="blue">Double Elimination</Badge>
                </HStack>
                <Text fontSize="sm" color="fg.muted" mb={2}>
                  Two losses to be eliminated. Winners and Losers brackets run
                  in parallel, meeting at the Grand Final.
                </Text>
                <VStack gap={1} alignItems="flex-start">
                  <Text fontSize="xs" color="fg.muted">
                    • Winners bracket → Losers bracket on first loss
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    • Grand Final can reset if Losers finalist wins
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    • Minimum 4 players
                  </Text>
                </VStack>
              </Box>
              <Box p={4} borderRadius="md" borderWidth={1} borderColor="border">
                <HStack mb={2}>
                  <Badge colorPalette="purple">Swiss System</Badge>
                </HStack>
                <Text fontSize="sm" color="fg.muted" mb={2}>
                  Nobody is eliminated. Players are paired against others with
                  the same record each round. Best overall standings wins.
                </Text>
                <VStack gap={1} alignItems="flex-start">
                  <Text fontSize="xs" color="fg.muted">
                    • Rounds: ⌈log₂(n)⌉ (e.g. 8 players = 3 rounds)
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    • Odd player counts get a bye each round
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    • No rematches within the same tournament
                  </Text>
                </VStack>
              </Box>
              <Box p={4} borderRadius="md" borderWidth={1} borderColor="border">
                <HStack mb={2}>
                  <Badge colorPalette="teal">Round Robin</Badge>
                </HStack>
                <Text fontSize="sm" color="fg.muted" mb={2}>
                  Everyone plays everyone. Most comprehensive format — the
                  player with the best overall record wins.
                </Text>
                <VStack gap={1} alignItems="flex-start">
                  <Text fontSize="xs" color="fg.muted">
                    • Rounds: n−1 (even) or n (odd players)
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    • All matches are generated upfront
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    • Organiser finalises after all matches complete
                  </Text>
                </VStack>
              </Box>
            </SimpleGrid>
          </VStack>
        </Section>

        {/* Roles */}
        <Section icon={<LuUsers />} title="Organiser vs. Player">
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <VStack gap={2} alignItems="flex-start">
              <HStack>
                <LuShieldAlert />
                <Text fontWeight="semibold" fontSize="sm">
                  Organiser (creator)
                </Text>
              </HStack>
              <VStack gap={1} alignItems="flex-start" pl={6}>
                <Text fontSize="xs" color="fg.muted">
                  • Start and delete tournaments
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  • Add and remove participants
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  • Record match results directly
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  • Override disputed results with a reason
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  • Advance rounds / finalise the tournament
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  • Edit participant names and factions
                </Text>
              </VStack>
            </VStack>
            <VStack gap={2} alignItems="flex-start">
              <HStack>
                <LuUser />
                <Text fontWeight="semibold" fontSize="sm">
                  Player (participant)
                </Text>
              </HStack>
              <VStack gap={1} alignItems="flex-start" pl={6}>
                <Text fontSize="xs" color="fg.muted">
                  • Join tournaments via code or tournament page
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  • Report who won your match
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  • If both players report the same winner, result confirms
                  automatically
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  • If reports conflict, match is marked Disputed for organiser
                  resolution
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  • View standings and bracket at any time
                </Text>
              </VStack>
            </VStack>
          </SimpleGrid>
        </Section>

        {/* Result Reporting */}
        <Section icon={<LuCircleCheck />} title="Reporting Match Results">
          <VStack gap={3} align="stretch">
            <Text fontSize="sm" color="fg.muted">
              Match results can be submitted by players or recorded directly by
              the organiser.
            </Text>
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
              <Box
                p={3}
                borderRadius="md"
                bg="green.subtle"
                borderWidth={1}
                borderColor="green.muted"
              >
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  color="green.fg"
                  mb={1}
                >
                  Both agree
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  Both players report the same winner → match completes
                  automatically.
                </Text>
              </Box>
              <Box
                p={3}
                borderRadius="md"
                bg="orange.subtle"
                borderWidth={1}
                borderColor="orange.muted"
              >
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  color="orange.fg"
                  mb={1}
                >
                  Conflict
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  Players report different winners → match is marked Disputed.
                  Organiser resolves with an optional reason.
                </Text>
              </Box>
              <Box
                p={3}
                borderRadius="md"
                bg="blue.subtle"
                borderWidth={1}
                borderColor="blue.muted"
              >
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  color="blue.fg"
                  mb={1}
                >
                  Organiser override
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  Organiser can override any result at any time, even completed
                  ones, with a logged reason.
                </Text>
              </Box>
            </SimpleGrid>
          </VStack>
        </Section>

        {/* Join Codes */}
        <Section icon={<LuHash />} title="Join Codes">
          <VStack gap={2} align="stretch">
            <Text fontSize="sm" color="fg.muted">
              Every tournament has a unique 6-character join code (e.g.{" "}
              <Text as="span" fontFamily="mono" fontWeight="bold">
                ABC123
              </Text>
              ). Share it with players to let them join without needing a direct
              link.
            </Text>
            <HStack gap={4} flexWrap="wrap">
              <Text fontSize="xs" color="fg.muted">
                • Enter the code on the Home page
              </Text>
              <Text fontSize="xs" color="fg.muted">
                • Codes are case-insensitive
              </Text>
              <Text fontSize="xs" color="fg.muted">
                • Joining is only possible while the tournament is in Pending
                status
              </Text>
            </HStack>
          </VStack>
        </Section>

        {/* Guest Users */}
        <Section icon={<LuInfo />} title="Guest vs. Registered Accounts">
          <VStack gap={2} align="stretch">
            <Text fontSize="sm" color="fg.muted">
              You can use the app as a guest without signing up, but there are
              some limitations:
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
              <Box p={3} borderRadius="md" borderWidth={1} borderColor="border">
                <Text fontSize="xs" fontWeight="semibold" mb={1}>
                  Guest users can:
                </Text>
                <VStack gap={1} alignItems="flex-start">
                  <Text fontSize="xs" color="fg.muted">
                    • Join tournaments via code
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    • Report match results
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    • View standings and brackets
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    • Set a display name (Guest_XXXX by default)
                  </Text>
                </VStack>
              </Box>
              <Box p={3} borderRadius="md" borderWidth={1} borderColor="border">
                <Text fontSize="xs" fontWeight="semibold" mb={1}>
                  Registered users also can:
                </Text>
                <VStack gap={1} alignItems="flex-start">
                  <Text fontSize="xs" color="fg.muted">
                    • Create tournaments
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    • Persistent account across sessions
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    • Appear in Statistics
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    • "Remember me" login for 30-day sessions
                  </Text>
                </VStack>
              </Box>
            </SimpleGrid>
          </VStack>
        </Section>

        {/* FAQ */}
        <Section icon={<LuTrophy />} title="Frequently Asked Questions">
          <VStack gap={1} align="stretch">
            <FaqItem question="Can I change a result after it's been recorded?">
              Yes — organisers can override any match result using the Override
              button on a completed match card. An optional reason can be logged
              for transparency.
            </FaqItem>
            <Separator />
            <FaqItem question="What happens if a player doesn't report their result?">
              The organiser can record the result directly on behalf of both
              players at any time. Players reporting results is optional — the
              organiser always has full control.
            </FaqItem>
            <Separator />
            <FaqItem question="Can I add more players after the tournament starts?">
              No — the participant roster is locked once a tournament is
              started. Make sure all players are added before clicking Start.
            </FaqItem>
            <Separator />
            <FaqItem question="What is a bye?">
              A bye is a free win given to a player when there's no opponent to
              pair them with (e.g. odd number of players in Swiss). Bye matches
              are automatically marked as completed.
            </FaqItem>
            <Separator />
            <FaqItem question="Why can't I see the Advance Round button?">
              The Advance Round button only appears once all matches in the
              current round are completed. Make sure every match has a result
              recorded before trying to advance.
            </FaqItem>
            <Separator />
            <FaqItem question="What does the Grand Final bracket reset mean in Double Elimination?">
              In Double Elimination, the Winners bracket finalist enters the
              Grand Final undefeated. If the Losers bracket finalist wins, both
              players now have one loss each — so a reset match is played to
              determine the true champion.
            </FaqItem>
            <Separator />
            <FaqItem question="Can I delete a tournament?">
              Only the organiser can delete a tournament, and only while it's in
              Pending status (not yet started). Once started, it cannot be
              deleted.
            </FaqItem>
            <Separator />
            <FaqItem question="How are Swiss pairings generated?">
              Round 1 is random. Subsequent rounds pair players with the same
              number of wins together (top-down), avoiding rematches. If a
              perfect pairing isn't possible, the algorithm falls back to
              best-available.
            </FaqItem>
          </VStack>
        </Section>

        {/* Keyboard shortcuts */}
        <Section icon={<LuInfo />} title="Keyboard Shortcuts">
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={2}>
            {[
              { key: "Alt+1", label: "Home" },
              { key: "Alt+2", label: "Tournaments" },
              { key: "Alt+3", label: "Matches" },
              { key: "Alt+4", label: "Statistics" },
              { key: "Alt+5", label: "Account" },
              { key: "Alt+6", label: "Get Help" },
              { key: "Alt+7", label: "Terms of Use" },
              { key: "Alt+8", label: "Source Code" },
            ].map(({ key, label }) => (
              <HStack key={key} gap={2}>
                <Text
                  as="kbd"
                  fontSize="xs"
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
                <Text fontSize="xs" color="fg.muted">
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
