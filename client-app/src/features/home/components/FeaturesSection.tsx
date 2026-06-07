import React from "react";
import { SimpleGrid, Card, VStack, Text, Box, Heading } from "@chakra-ui/react";
import { LuTrophy, LuSwords, LuChartBar, LuShield } from "react-icons/lu";

const features = [
  {
    icon: LuTrophy,
    title: "Run Tournaments",
    bg: "gold.subtle",
    color: "gold.text",
    desc: "Create and manage brackets for your community with full control over format and participants.",
  },
  {
    icon: LuSwords,
    title: "Track Matches",
    bg: "brand.subtle",
    color: "brand.text",
    desc: "Record results, advance rounds, and follow live progress across all active tournaments.",
  },
  {
    icon: LuChartBar,
    title: "View Statistics",
    bg: "info.subtle",
    color: "info.text",
    desc: "Explore win rates, top players, and faction performance across all recorded tournaments.",
  },
  {
    icon: LuShield,
    title: "Guest Friendly",
    bg: "info.subtle",
    color: "info.text",
    desc: "No account required to participate. Jump in as a guest and join tournaments instantly.",
  },
];

const FeaturesSection: React.FC = () => (
  <Box>
    <Heading as="h2" size="xl" mb={2}>
      What you can do
    </Heading>
    <Text color="fg.muted" mb={6}>
      Everything you need to run a community tournament.
    </Text>
    <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={4}>
      {features.map((f) => (
        <Card.Root key={f.title} variant="outline" bg="bg.panel">
          <Card.Body>
            <VStack align="start" gap={3}>
              <Box
                p={2}
                borderRadius="md"
                bg={f.bg}
                color={f.color}
                fontSize="xl"
              >
                <f.icon />
              </Box>
              <Text fontWeight="semibold">{f.title}</Text>
              <Text fontSize="sm" color="fg.muted">
                {f.desc}
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      ))}
    </SimpleGrid>
  </Box>
);

export default FeaturesSection;
