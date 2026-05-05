import React, { useState } from "react";
import {
  Button,
  Text,
  Textarea,
  VStack,
  Flex,
  Field,
  SimpleGrid,
  Input,
  Alert,
  Card,
  chakra,
} from "@chakra-ui/react";
import { NumberInputRoot, NumberInputField } from "@/shared/ui/NumberInput";
import { httpClient } from "@/core/api/httpClient";

const warhammer3Factions = [
  "Empire",
  "Dwarfs",
  "Greenskins",
  "Vampire Counts",
  "Warriors of Chaos",
  "Beastmen",
  "Wood Elves",
  "Bretonnia",
  "Norsca",
  "High Elves",
  "Dark Elves",
  "Lizardmen",
  "Skaven",
  "Tomb Kings",
  "Vampire Coast",
  "Kislev",
  "Cathay",
  "Ogre Kingdoms",
  "Daemons of Chaos Undivided",
  "Khorne",
  "Nurgle",
  "Slaanesh",
  "Tzeentch",
  "Chaos Dwarfs",
];

const tournamentTypes = [
  "Single Elimination",
  "Double Elimination",
  "Round Robin",
  "Swiss System",
];

const CreateTournamentForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    playerCount: 8,
    tournamentType: tournamentTypes[0],
    bannedFactions: [] as string[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (value: string) => {
    setFormData((prev) => ({ ...prev, playerCount: parseInt(value) || 2 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await httpClient.post("/tournament", formData);
      setSuccess(true);
      setFormData({
        name: "",
        description: "",
        playerCount: 8,
        tournamentType: tournamentTypes[0],
        bannedFactions: [],
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create tournament",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card.Root as="form" onSubmit={handleSubmit} maxW="container.lg" mx="auto">
      <Card.Body>
        <VStack gap={6} align="stretch">
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
            <Field.Root required>
              <Field.Label>Tournament Name</Field.Label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter tournament name"
              />
            </Field.Root>

            <Field.Root required>
              <Field.Label>Tournament Type</Field.Label>
              <chakra.select
                name="tournamentType"
                value={formData.tournamentType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFormData((prev) => ({
                    ...prev,
                    tournamentType: e.target.value,
                  }))
                }
                w="full"
                borderRadius="md"
                borderWidth="1px"
                borderColor="border"
                fontSize="md"
                p={2}
              >
                {tournamentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </chakra.select>
            </Field.Root>

            <Field.Root required>
              <Field.Label>Number of Players</Field.Label>
              <NumberInputRoot
                value={formData.playerCount}
                min={2}
                max={128}
                onValueChange={handleNumberChange}
              >
                <NumberInputField />
              </NumberInputRoot>
            </Field.Root>
          </SimpleGrid>

          <Field.Root>
            <Field.Label>Description</Field.Label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter tournament description (Markdown supported)"
              minH="100px"
            />
            <Field.HelperText>
              You can use Markdown formatting in the description.
            </Field.HelperText>
          </Field.Root>

          <Field.Root>
            <Field.Label>Banned Factions</Field.Label>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
              <VStack gap={2} align="stretch">
                <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={2}>
                  {warhammer3Factions.map((faction) => (
                    <Flex
                      key={faction}
                      align="center"
                      gap={2}
                      p={2}
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="border"
                      cursor="pointer"
                      _hover={{ bg: "bg.muted" }}
                      transition="background 0.2s"
                      onClick={() => {
                        const isChecked =
                          !formData.bannedFactions.includes(faction);
                        setFormData((prev) => ({
                          ...prev,
                          bannedFactions: isChecked
                            ? [...prev.bannedFactions, faction]
                            : prev.bannedFactions.filter((f) => f !== faction),
                        }));
                      }}
                    >
                      <input
                        type="checkbox"
                        value={faction}
                        checked={formData.bannedFactions.includes(faction)}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setFormData((prev) => ({
                            ...prev,
                            bannedFactions: isChecked
                              ? [...prev.bannedFactions, faction]
                              : prev.bannedFactions.filter(
                                  (f) => f !== faction,
                                ),
                          }));
                        }}
                        width={16}
                        height={16}
                      />
                      <Text fontSize="sm" userSelect="none">
                        {faction}
                      </Text>
                    </Flex>
                  ))}
                </SimpleGrid>
                <Text color="fg.muted" fontSize="sm">
                  Select factions that will be banned in this tournament.
                </Text>
              </VStack>

              <Flex display={{ base: "none", md: "flex" }}>
                <Text color="fg.muted" fontSize="sm">
                  Once you create your tournament, head over to the "Matches"
                  page to manage it, invite users and advance the rounds. Your
                  tournament will be visible to all users. Note: You cannot edit
                  a tournament once it's created, but you can delete it if you
                  haven't started it.
                </Text>
              </Flex>
            </SimpleGrid>
          </Field.Root>

          {error && (
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Title>{error}</Alert.Title>
            </Alert.Root>
          )}
          {success && (
            <Alert.Root status="success">
              <Alert.Indicator />
              <Alert.Title>Tournament created successfully!</Alert.Title>
            </Alert.Root>
          )}
        </VStack>
      </Card.Body>
      <Card.Footer>
        <Button type="submit" colorPalette="blue" size="md" loading={isLoading}>
          Create Tournament
        </Button>
      </Card.Footer>
    </Card.Root>
  );
};

export default CreateTournamentForm;
