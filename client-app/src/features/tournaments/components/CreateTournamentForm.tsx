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
  Card,
  Box,
  HStack,
  Select,
  Portal,
  createListCollection,
} from "@chakra-ui/react";
import { LuLock } from "react-icons/lu";
import { NumberInputRoot, NumberInputField } from "@/shared/ui/NumberInput";
import { httpClient } from "@/core/api/httpClient";
import { useNavigate } from "react-router";
import { toaster } from "@/shared/ui/Toaster";
import GameSystemToggle from "@/shared/ui/GameSystemToggle";
import {
  factionsForGameSystem,
  type FactionGame,
} from "@/shared/constants/factions";
import {
  validateTournamentName,
  TOURNAMENT_NAME_MAX_LENGTH,
  TOURNAMENT_DESCRIPTION_MAX_LENGTH,
  PLAYER_COUNT_MIN,
  PLAYER_COUNT_MAX,
} from "@/shared/constants/validation";
import BannedFactionPicker from "./create/BannedFactionPicker";
import GuidanceNote from "./create/GuidanceNote";
import NextStepsPanel from "./create/NextStepsPanel";
import { formatGuidance } from "./create/formatGuidance";

const tournamentTypes = [
  "Single Elimination",
  "Double Elimination",
  "Round Robin",
  "Swiss System",
];

const tournamentTypeCollection = createListCollection({
  items: tournamentTypes.map((t) => ({ label: t, value: t })),
});

const GAME_SWITCH_FADE_MS = 180;

interface CreateTournamentFormProps {
  isGuest?: boolean;
}

const CreateTournamentForm: React.FC<CreateTournamentFormProps> = ({
  isGuest = false,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    playerCount: 8,
    tournamentType: tournamentTypes[0],
    bannedFactions: [] as string[],
    enable40kFactions: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [playerCountError, setPlayerCountError] = useState<string | null>(null);
  const [factionListVisible, setFactionListVisible] = useState(true);
  const navigate = useNavigate();

  const activeFactionList = factionsForGameSystem(formData);
  const guidance = formatGuidance(
    formData.tournamentType,
    formData.playerCount,
  );

  // Bans are per-game, so switching systems clears them rather than leaving
  // selections the server would reject.
  const handleGameChange = (game: FactionGame) => {
    setFactionListVisible(false);
    setTimeout(() => {
      setFormData((prev) => ({
        ...prev,
        enable40kFactions: game === "40k",
        bannedFactions: [],
      }));
      setFactionListVisible(true);
    }, GAME_SWITCH_FADE_MS);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    if (name === "name" && nameError) setNameError(null);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = ({ value }: { value: string }) => {
    setPlayerCountError(null);
    setFormData((prev) => ({
      ...prev,
      playerCount: parseInt(value) || PLAYER_COUNT_MIN,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const invalidName = validateTournamentName(formData.name);
    setNameError(invalidName);

    const { playerCount } = formData;
    const invalidPlayerCount =
      playerCount < PLAYER_COUNT_MIN || playerCount > PLAYER_COUNT_MAX
        ? `Player count must be between ${PLAYER_COUNT_MIN} and ${PLAYER_COUNT_MAX}`
        : null;
    setPlayerCountError(invalidPlayerCount);

    if (invalidName || invalidPlayerCount) return;

    setIsLoading(true);

    try {
      const response = (await httpClient.post("/tournament", {
        ...formData,
        name: formData.name.trim(),
      })) as {
        success: boolean;
        data: { _id: string; name: string; code: string };
      };
      toaster.create({
        title: "Tournament Created",
        description: `"${response.data.name}" created successfully.`,
        type: "success",
      });
      navigate(`/matches/tournament/${response.data.code}`);
    } catch (err) {
      toaster.create({
        title: "Failed to Create Tournament",
        description: err instanceof Error ? err.message : "An error occurred",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card.Root maxW="container.lg" mx="auto">
        <Card.Body>
          <VStack gap={6} align="stretch">
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
              <Field.Root required invalid={!!nameError}>
                <Field.Label>Tournament Name</Field.Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter tournament name"
                  maxLength={TOURNAMENT_NAME_MAX_LENGTH}
                />
                <Field.ErrorText>{nameError}</Field.ErrorText>
              </Field.Root>

              <Field.Root required>
                <Field.Label>Tournament Type</Field.Label>
                <Select.Root
                  collection={tournamentTypeCollection}
                  value={[formData.tournamentType]}
                  onValueChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      tournamentType: e.value[0] ?? tournamentTypes[0],
                    }))
                  }
                  w="full"
                >
                  <Select.HiddenSelect name="tournamentType" />
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content>
                        {tournamentTypeCollection.items.map((item) => (
                          <Select.Item key={item.value} item={item}>
                            {item.label}
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>
              </Field.Root>

              <Field.Root required invalid={!!playerCountError}>
                <Field.Label>Number of Players</Field.Label>
                <NumberInputRoot
                  value={String(formData.playerCount)}
                  min={PLAYER_COUNT_MIN}
                  max={PLAYER_COUNT_MAX}
                  onValueChange={handleNumberChange}
                >
                  <NumberInputField />
                </NumberInputRoot>
                <Field.ErrorText>{playerCountError}</Field.ErrorText>
              </Field.Root>
            </SimpleGrid>

            <Field.Root>
              <Field.Label>Description</Field.Label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value.slice(
                      0,
                      TOURNAMENT_DESCRIPTION_MAX_LENGTH,
                    ),
                  }))
                }
                placeholder="Enter tournament description (Markdown supported)"
                minH="200px"
                resize="vertical"
                maxLength={TOURNAMENT_DESCRIPTION_MAX_LENGTH}
              />
              <Field.HelperText>
                <Text as="span">Markdown supported. </Text>
                <Text
                  as="span"
                  color={
                    formData.description.length >=
                    TOURNAMENT_DESCRIPTION_MAX_LENGTH
                      ? "status.loss"
                      : "fg.muted"
                  }
                >
                  {formData.description.length}/
                  {TOURNAMENT_DESCRIPTION_MAX_LENGTH}
                </Text>
              </Field.HelperText>
            </Field.Root>

            {formData.tournamentType === "Swiss System" && (
              <GuidanceNote tone="info">
                Swiss System uses the{" "}
                <Text as="span" fontWeight="semibold">
                  Blossom algorithm
                </Text>{" "}
                for maximum-cardinality matching - players are paired by win
                score while avoiding rematches wherever possible.
              </GuidanceNote>
            )}

            <Field.Root>
              <Field.Label>Banned Factions</Field.Label>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={6} w="full">
                <BannedFactionPicker
                  factions={activeFactionList}
                  banned={formData.bannedFactions}
                  visible={factionListVisible}
                  onChange={(bannedFactions) =>
                    setFormData((prev) => ({ ...prev, bannedFactions }))
                  }
                />

                <Flex direction="column" gap={3} flex={1} minW={0}>
                  <VStack gap={2} alignItems="stretch" flex={1}>
                    {guidance.warnings.map((warning) => (
                      <GuidanceNote key={warning} tone="warning">
                        {warning}
                      </GuidanceNote>
                    ))}
                    {guidance.infos.map((info) => (
                      <GuidanceNote key={info} tone="info">
                        {info}
                      </GuidanceNote>
                    ))}

                    <Box mt="auto">
                      <HStack
                        gap={2}
                        mb={2}
                        p={2}
                        borderRadius="md"
                        borderWidth={1}
                        borderColor="border"
                        bg="bg.subtle"
                        alignItems="center"
                      >
                        <HStack gap={1} flex={1} alignItems="center">
                          <Text
                            fontSize="xs"
                            color="fg.muted"
                            fontWeight="medium"
                          >
                            Factions
                          </Text>
                        </HStack>
                        <GameSystemToggle
                          value={formData.enable40kFactions ? "40k" : "wh3"}
                          onChange={handleGameChange}
                        />
                      </HStack>
                      {isGuest && (
                        <Box
                          p={3}
                          borderRadius="md"
                          bg="gold.subtle"
                          borderWidth={1}
                          borderColor="gold.border"
                          mb={3}
                        >
                          <HStack gap={2} alignItems="flex-start">
                            <Box color="gold.text" flexShrink={0} mt="1px">
                              <LuLock size={14} />
                            </Box>
                            <VStack gap={1} alignItems="flex-start">
                              <Text
                                fontSize="sm"
                                fontWeight="semibold"
                                color="gold.text"
                              >
                                Registration Required
                              </Text>
                              <Text fontSize="sm" color="gold.text">
                                Only registered users can create tournaments.
                                Guest users can join and participate.
                              </Text>
                            </VStack>
                          </HStack>
                        </Box>
                      )}
                      <NextStepsPanel />
                    </Box>
                  </VStack>
                </Flex>
              </SimpleGrid>
            </Field.Root>
          </VStack>
        </Card.Body>
        <Card.Footer>
          <Button
            type="submit"
            colorPalette="crimson"
            size="md"
            loading={isLoading}
            disabled={isGuest || !formData.name.trim()}
          >
            Create Tournament
          </Button>
        </Card.Footer>
      </Card.Root>
    </form>
  );
};

export default CreateTournamentForm;
