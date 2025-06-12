import React, { useState } from "react";
import {
  Box,
  Button,
  Text,
  Textarea,
  VStack,
  Field,
  CheckboxGroup,
  Grid,
  GridItem,
  SimpleGrid,
  Input,
  chakra,
  Select,
  Checkbox,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import { NumberInputRoot, NumberInputField } from "@/shared/ui/NumberInput";

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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (value: string) => {
    setFormData((prev) => ({ ...prev, playerCount: parseInt(value) || 2 }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(formData);
  };

  return (
    <Box
      as="form"
      onSubmit={handleSubmit}
      maxW="100%" // changed from lg to 100%
      w="100%" // ensure full width
      mx="auto"
      mt={8}
      p={6}
      borderWidth={1}
      borderRadius="lg"
      boxShadow="md"
    >
      <VStack spacing={6} align="stretch" w="100%">
        <Grid
          templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
          gap={4}
          w="100%"
        >
          <GridItem colSpan={1} w="100%">
            <Field.Root required w="100%">
              <Field.Label>Tournament Name</Field.Label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter tournament name"
                w="100%"
              />
            </Field.Root>
          </GridItem>

          <GridItem colSpan={1} w="100%">
            <Field.Root required w="100%">
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
                w="100%"
                borderRadius="md"
                borderWidth={1}
                borderColor="gray.200"
                fontSize="md"
                p={2}
                _focus={{ borderColor: "blue.400", boxShadow: "outline" }}
              >
                {tournamentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </chakra.select>
            </Field.Root>
          </GridItem>

          <GridItem colSpan={1} w="100%">
            <Field.Root required w="100%">
              <Field.Label>Number of Players</Field.Label>
              <Box w="100%">
                <NumberInputRoot
                  value={formData.playerCount}
                  min={2}
                  max={128}
                  onValueChange={handleNumberChange}
                  w="100%"
                >
                  <NumberInputField />
                </NumberInputRoot>
              </Box>
            </Field.Root>
          </GridItem>
        </Grid>
        <Field.Root>
          <Field.Label>Description</Field.Label>
          <Textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Enter tournament description (Markdown supported)"
            minH="100px"
            w="100%"
          />
          <Text fontSize="sm" color="gray.500" mt={1}>
            You can use Markdown formatting in the description.
          </Text>
        </Field.Root>
        <Field.Root w="100%">
          <Field.Label>Banned Factions</Field.Label>
          <Grid
            templateColumns={{ base: "1fr", md: "2fr 1fr" }}
            gap={6}
            alignItems="start"
            w="100%"
          >
            <Box>
              <CheckboxGroup
                value={
                  Array.isArray(formData.bannedFactions)
                    ? formData.bannedFactions
                    : []
                }
                onChange={(values: string[] | number[]) =>
                  setFormData((prev) => ({
                    ...prev,
                    bannedFactions: values as string[],
                  }))
                }
              >
                <SimpleGrid
                  columns={{ base: 1, sm: 2, md: 3 }}
                  spacingX={6}
                  spacingY={3}
                  w="100%"
                >
                  {warhammer3Factions.map((faction) => (
                    <chakra.label
                      key={faction}
                      display="flex"
                      alignItems="center"
                      w="100%"
                      minWidth={0}
                      p={2}
                      borderRadius="md"
                      borderWidth={1}
                      borderColor="gray.200"
                      _focusWithin={{
                        borderColor: "blue.400",
                        boxShadow: "outline",
                      }}
                      cursor="pointer"
                      flexDirection="row"
                      flex={1}
                      gap={3}
                      justifyContent="space-between"
                      style={{ width: "100%", flex: 1, minWidth: 0 }}
                    >
                      <chakra.input
                        type="checkbox"
                        value={faction}
                        onChange={undefined}
                        accentColor="blue.500"
                        style={{ width: 18, height: 18, flexShrink: 0 }}
                      />
                      <Text
                        fontSize="sm"
                        flex={1}
                        textAlign="left"
                        whiteSpace="normal"
                        wordBreak="break-word"
                        ml={2}
                      >
                        {faction}
                      </Text>
                    </chakra.label>
                  ))}
                </SimpleGrid>
              </CheckboxGroup>
              <Text fontSize="sm" color="gray.500" mt={2}>
                Select factions that will be banned in this tournament.
              </Text>
            </Box>
            <Box
              display={{ base: "none", md: "block" }}
              pl={2}
              style={{ flex: 1 }}
            >
              <Text fontSize="sm" color="gray.600">
                Once you create your tournament, head over to the "Matches" page
                to manage it, invite users and advance the rounds. Your
                tournament will be visibile in the app by all other users, so
                check your player size! You cannot edit a tournament once its
                created, but you can delete it if you haven't started it.
              </Text>
            </Box>
          </Grid>
        </Field.Root>
        <Button type="submit" colorScheme="blue" size="md" mt={4}>
          Create Tournament
        </Button>
      </VStack>
    </Box>
  );
};

export default CreateTournamentForm;
