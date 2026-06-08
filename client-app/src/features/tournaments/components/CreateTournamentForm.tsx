import React, { useState, useEffect } from "react";
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
  chakra,
  Box,
  HStack,
  Badge,
} from "@chakra-ui/react";
import {
  LuTriangleAlert,
  LuInfo,
  LuLock,
  LuFlaskConical,
} from "react-icons/lu";
import { NumberInputRoot, NumberInputField } from "@/shared/ui/NumberInput";
import { httpClient } from "@/core/api/httpClient";
import { useNavigate } from "react-router-dom";
import { toaster } from "@/shared/ui/Toaster";
import {
  warhammer3Factions,
  warhammer40kFactions,
} from "@/shared/constants/factions";

const tournamentTypes = [
  "Single Elimination",
  "Double Elimination",
  "Round Robin",
  "Swiss System",
];

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
  const [factionListVisible, setFactionListVisible] = useState(true);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [shiftAnchor, setShiftAnchor] = useState<number | null>(null);
  const navigate = useNavigate();

  const activeFactionList = formData.enable40kFactions
    ? warhammer40kFactions
    : warhammer3Factions;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftPressed(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftPressed(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const handleToggle40k = () => {
    setFactionListVisible(false);
    setTimeout(() => {
      toggle40k();
      setFactionListVisible(true);
    }, 180);
  };

  const handleFactionClick = (faction: string) => {
    const idx = activeFactionList.indexOf(faction);
    if (isShiftPressed && shiftAnchor !== null) {
      const start = Math.min(shiftAnchor, idx);
      const end = Math.max(shiftAnchor, idx);
      const range = activeFactionList.slice(start, end + 1);
      const isTargetChecked = formData.bannedFactions.includes(faction);
      setFormData((prev) => ({
        ...prev,
        bannedFactions: isTargetChecked
          ? prev.bannedFactions.filter((f) => !range.includes(f))
          : [...new Set([...prev.bannedFactions, ...range])],
      }));
      setShiftAnchor(idx);
    } else {
      const isChecked = !formData.bannedFactions.includes(faction);
      setFormData((prev) => ({
        ...prev,
        bannedFactions: isChecked
          ? [...prev.bannedFactions, faction]
          : prev.bannedFactions.filter((f) => f !== faction),
      }));
      setShiftAnchor(idx);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = ({ value }: { value: string }) => {
    setFormData((prev) => ({ ...prev, playerCount: parseInt(value) || 2 }));
  };

  const toggle40k = () => {
    setShiftAnchor(null);
    setFormData((prev) => ({
      ...prev,
      enable40kFactions: !prev.enable40kFactions,
      bannedFactions: [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = (await httpClient.post("/tournament", formData)) as {
        success: boolean;
        data: { _id: string; name: string };
      };
      toaster.create({
        title: "Tournament Created",
        description: `"${response.data.name}" created successfully.`,
        type: "success",
        action: {
          label: "Go to Tournament",
          onClick: () => navigate(`/matches#${response.data._id}`),
        },
      });
      setFormData({
        name: "",
        description: "",
        playerCount: 8,
        tournamentType: tournamentTypes[0],
        bannedFactions: [],
        enable40kFactions: false,
      });
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
                  bg="bg.panel"
                  fontSize="md"
                  color="fg"
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
                  value={String(formData.playerCount)}
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
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value.slice(0, 2000),
                  }))
                }
                placeholder="Enter tournament description (Markdown supported)"
                minH="200px"
                resize="vertical"
                maxLength={2000}
              />
              <Field.HelperText>
                <Text as="span">Markdown supported. </Text>
                <Text
                  as="span"
                  color={
                    formData.description.length >= 2000
                      ? "status.loss"
                      : "fg.muted"
                  }
                >
                  {formData.description.length}/2000
                </Text>
              </Field.HelperText>
            </Field.Root>

            {formData.tournamentType === "Swiss System" && (
              <Box
                p={3}
                borderRadius="md"
                bg="bg.subtle"
                borderWidth={1}
                borderColor="border"
              >
                <HStack gap={2} alignItems="flex-start">
                  <Box color="fg.secondary" flexShrink={0} mt="1px">
                    <LuInfo size={14} />
                  </Box>
                  <Text fontSize="xs" color="fg.secondary">
                    Swiss System uses the{" "}
                    <Text as="span" fontWeight="semibold">
                      Blossom algorithm
                    </Text>{" "}
                    for maximum-cardinality matching - players are paired by win
                    score while avoiding rematches wherever possible.
                  </Text>
                </HStack>
              </Box>
            )}

            <Field.Root>
              <Field.Label>Banned Factions</Field.Label>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={6} w="full">
                <VStack gap={2} align="stretch" minW={0} overflow="hidden">
                  <Box
                    opacity={factionListVisible ? 1 : 0}
                    transition="opacity 0.18s ease"
                    maxH="320px"
                    overflowY="auto"
                    overflowX="hidden"
                    pr={1}
                  >
                    <SimpleGrid columns={2} gap={2}>
                      {activeFactionList.map((faction) => {
                        const isChecked =
                          formData.bannedFactions.includes(faction);
                        return (
                          <Flex
                            key={faction}
                            data-scope="faction-checkbox"
                            data-state={isChecked ? "checked" : undefined}
                            align="center"
                            gap={2}
                            p={2}
                            borderRadius="md"
                            borderWidth="1px"
                            borderColor="border"
                            cursor="pointer"
                            minW={0}
                            _hover={{ bg: "bg.muted" }}
                            transition="background 0.2s"
                            onClick={() => handleFactionClick(faction)}
                          >
                            <input
                              type="checkbox"
                              value={faction}
                              checked={isChecked}
                              onChange={() => {}}
                              width={16}
                              height={16}
                            />
                            <Text
                              fontSize="sm"
                              userSelect="none"
                              minW={0}
                              wordBreak="break-word"
                            >
                              {faction}
                            </Text>
                          </Flex>
                        );
                      })}
                    </SimpleGrid>
                  </Box>
                  <Text color="fg.muted" fontSize="sm">
                    Hold Shift to select multiple factions!
                  </Text>
                </VStack>

                <Flex direction="column" gap={3} flex={1} minW={0}>
                  {(() => {
                    const n = formData.playerCount;
                    const type = formData.tournamentType;
                    const warnings: string[] = [];
                    const infos: string[] = [];

                    if (type === "Single Elimination") {
                      if (n < 2) warnings.push("Need at least 2 players.");
                      const isPowerOf2 = n > 0 && (n & (n - 1)) === 0;
                      if (!isPowerOf2)
                        warnings.push(
                          `${n} players is not a power of 2 - ${n - Math.pow(2, Math.floor(Math.log2(n)))} player(s) will receive a bye in round 1.`,
                        );
                    }
                    if (type === "Double Elimination") {
                      if (n < 4)
                        warnings.push(
                          "Double Elimination requires at least 4 players.",
                        );
                      const isPowerOf2 = n > 0 && (n & (n - 1)) === 0;
                      if (!isPowerOf2)
                        infos.push(
                          `${n} players is not a power of 2 - some round 1 matches will have byes.`,
                        );
                    }
                    if (type === "Swiss System") {
                      if (n % 2 !== 0)
                        warnings.push(
                          `Odd number of players (${n}) - one player will receive a bye each round.`,
                        );
                      const rounds = Math.ceil(Math.log2(Math.max(n, 2)));
                      infos.push(
                        `Will run ${rounds} round${rounds !== 1 ? "s" : ""} (⌈log₂(${n})⌉).`,
                      );
                    }
                    if (type === "Round Robin") {
                      if (n < 3)
                        warnings.push(
                          "Round Robin works best with 3 or more players.",
                        );
                      const rounds = n % 2 === 0 ? n - 1 : n;
                      const matchesPerRound = Math.floor(n / 2);
                      infos.push(
                        `${rounds} round${rounds !== 1 ? "s" : ""}, ${matchesPerRound} match${matchesPerRound !== 1 ? "es" : ""}/round - ${n % 2 !== 0 ? "1 bye per round" : "no byes"}.`,
                      );
                      if (n > 16)
                        warnings.push(
                          `${n} players means ${rounds * matchesPerRound} total matches - consider Swiss instead.`,
                        );
                    }

                    return (
                      <VStack gap={2} alignItems="stretch" flex={1}>
                        {warnings.map((w, i) => (
                          <Box
                            key={i}
                            p={3}
                            borderRadius="md"
                            bg="status.loss.subtle"
                            borderWidth={1}
                            borderColor="status.loss.border"
                          >
                            <HStack gap={2} alignItems="flex-start">
                              <Box color="status.loss" flexShrink={0} mt="1px">
                                <LuTriangleAlert size={14} />
                              </Box>
                              <Text fontSize="xs" color="status.loss">
                                {w}
                              </Text>
                            </HStack>
                          </Box>
                        ))}
                        {infos.map((info, i) => (
                          <Box
                            key={i}
                            p={3}
                            borderRadius="md"
                            bg="bg.subtle"
                            borderWidth={1}
                            borderColor="border"
                          >
                            <HStack gap={2} alignItems="flex-start">
                              <Box color="fg.secondary" flexShrink={0} mt="1px">
                                <LuInfo size={14} />
                              </Box>
                              <Text fontSize="xs" color="fg.secondary">
                                {info}
                              </Text>
                            </HStack>
                          </Box>
                        ))}

                        <Box mt="auto">
                          {formData.enable40kFactions && (
                            <Box
                              p={3}
                              borderRadius="md"
                              bg="info.subtle"
                              borderWidth={1}
                              borderColor="info.border"
                              mb={2}
                            >
                              <HStack gap={2} alignItems="flex-start">
                                <Box color="info.text" flexShrink={0} mt="1px">
                                  <LuFlaskConical size={14} />
                                </Box>
                                <Text fontSize="sm" color="info.text">
                                  40K factions are in beta and will not appear
                                  in global statistics or player stat pages.
                                </Text>
                              </HStack>
                            </Box>
                          )}
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
                              <Badge
                                colorPalette="verdigris"
                                size="xs"
                                variant="subtle"
                              >
                                <LuFlaskConical size={9} />
                                Beta
                              </Badge>
                            </HStack>
                            <HStack gap={1}>
                              <chakra.button
                                type="button"
                                py={1.5}
                                px={4}
                                borderRadius="sm"
                                borderWidth={1}
                                fontSize="sm"
                                fontWeight="medium"
                                cursor="pointer"
                                transition="all 0.15s"
                                onClick={() =>
                                  formData.enable40kFactions &&
                                  handleToggle40k()
                                }
                                bg={
                                  !formData.enable40kFactions
                                    ? "colorPalette.subtle"
                                    : "transparent"
                                }
                                borderColor={
                                  !formData.enable40kFactions
                                    ? "colorPalette.muted"
                                    : "border"
                                }
                                color={
                                  !formData.enable40kFactions
                                    ? "fg"
                                    : "fg.muted"
                                }
                                colorPalette="ink"
                              >
                                WH3
                              </chakra.button>
                              <chakra.button
                                type="button"
                                py={1.5}
                                px={4}
                                borderRadius="sm"
                                borderWidth={1}
                                fontSize="sm"
                                fontWeight="medium"
                                cursor="pointer"
                                transition="all 0.15s"
                                onClick={() =>
                                  !formData.enable40kFactions &&
                                  handleToggle40k()
                                }
                                bg={
                                  formData.enable40kFactions
                                    ? "colorPalette.subtle"
                                    : "transparent"
                                }
                                borderColor={
                                  formData.enable40kFactions
                                    ? "colorPalette.muted"
                                    : "border"
                                }
                                color={
                                  formData.enable40kFactions ? "fg" : "fg.muted"
                                }
                                colorPalette="verdigris"
                              >
                                40K
                              </chakra.button>
                            </HStack>
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
                                    Only registered users can create
                                    tournaments. Guest users can join and
                                    participate.
                                  </Text>
                                </VStack>
                              </HStack>
                            </Box>
                          )}
                          <Box
                            p={3}
                            borderRadius="md"
                            bg="bg.subtle"
                            borderWidth={1}
                            borderColor="border"
                          >
                            <VStack gap={2} alignItems="flex-start">
                              <Text
                                fontSize="xs"
                                fontWeight="semibold"
                                color="fg.muted"
                                textTransform="uppercase"
                                letterSpacing="wider"
                              >
                                Next Steps
                              </Text>
                              <VStack gap={1} alignItems="flex-start">
                                <HStack gap={2} alignItems="flex-start">
                                  <Text fontSize="sm" color="fg.muted">
                                    1.
                                  </Text>
                                  <Text fontSize="sm" color="fg.muted">
                                    Create the tournament, then go to the{" "}
                                    <Text
                                      as="span"
                                      fontWeight="semibold"
                                      color="fg"
                                    >
                                      Matches
                                    </Text>{" "}
                                    page to manage it.
                                  </Text>
                                </HStack>
                                <HStack gap={2} alignItems="flex-start">
                                  <Text fontSize="sm" color="fg.muted">
                                    2.
                                  </Text>
                                  <Text fontSize="sm" color="fg.muted">
                                    Add participants manually, or share the{" "}
                                    <Text
                                      as="span"
                                      fontWeight="semibold"
                                      color="fg"
                                    >
                                      join code
                                    </Text>{" "}
                                    so players can join themselves.
                                  </Text>
                                </HStack>
                                <HStack gap={2} alignItems="flex-start">
                                  <Text fontSize="sm" color="fg.muted">
                                    3.
                                  </Text>
                                  <Text fontSize="sm" color="fg.muted">
                                    Once everyone is in, hit{" "}
                                    <Text
                                      as="span"
                                      fontWeight="semibold"
                                      color="fg"
                                    >
                                      Start Tournament
                                    </Text>{" "}
                                    to generate round 1 matches.
                                  </Text>
                                </HStack>
                                <HStack gap={2} alignItems="flex-start">
                                  <Text fontSize="sm" color="fg.muted">
                                    4.
                                  </Text>
                                  <Text fontSize="sm" color="fg.muted">
                                    After all matches in a round are complete,
                                    use{" "}
                                    <Text
                                      as="span"
                                      fontWeight="semibold"
                                      color="fg"
                                    >
                                      Advance Round
                                    </Text>{" "}
                                    to progress.
                                  </Text>
                                </HStack>
                              </VStack>
                            </VStack>
                          </Box>
                        </Box>
                      </VStack>
                    );
                  })()}
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
            disabled={isGuest}
          >
            Create Tournament
          </Button>
        </Card.Footer>
      </Card.Root>
    </form>
  );
};

export default CreateTournamentForm;
