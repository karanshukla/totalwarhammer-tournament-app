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
  chakra,
  Box,
  HStack,
} from "@chakra-ui/react";
import { LuTriangleAlert, LuInfo, LuLock } from "react-icons/lu";
import { NumberInputRoot, NumberInputField } from "@/shared/ui/NumberInput";
import { httpClient } from "@/core/api/httpClient";
import { useNavigate } from "react-router-dom";
import { toaster } from "@/shared/ui/Toaster";
import { warhammer3Factions } from "@/shared/constants/warhammer3Factions";

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
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = ({ value }: { value: string }) => {
    setFormData((prev) => ({ ...prev, playerCount: parseInt(value) || 2 }));
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
                    formData.description.length >= 2000 ? "red.fg" : "fg.muted"
                  }
                >
                  {formData.description.length}/2000
                </Text>
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
                              : prev.bannedFactions.filter(
                                  (f) => f !== faction,
                                ),
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

                <Flex
                  display={{ base: "none", md: "flex" }}
                  direction="column"
                  gap={3}
                  flex={1}
                >
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
                            bg="orange.subtle"
                            borderWidth={1}
                            borderColor="orange.muted"
                          >
                            <HStack gap={2} alignItems="flex-start">
                              <Box color="orange.fg" flexShrink={0} mt="1px">
                                <LuTriangleAlert size={14} />
                              </Box>
                              <Text fontSize="xs" color="orange.fg">
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
                            bg="blue.subtle"
                            borderWidth={1}
                            borderColor="blue.muted"
                          >
                            <HStack gap={2} alignItems="flex-start">
                              <Box color="blue.fg" flexShrink={0} mt="1px">
                                <LuInfo size={14} />
                              </Box>
                              <Text fontSize="xs" color="blue.fg">
                                {info}
                              </Text>
                            </HStack>
                          </Box>
                        ))}
                        <Box mt="auto">
                          {isGuest && (
                            <Box
                              p={3}
                              borderRadius="md"
                              bg="orange.subtle"
                              borderWidth={1}
                              borderColor="orange.muted"
                              mb={3}
                            >
                              <HStack gap={2} alignItems="flex-start">
                                <Box color="orange.fg" flexShrink={0} mt="1px">
                                  <LuLock size={14} />
                                </Box>
                                <VStack gap={1} alignItems="flex-start">
                                  <Text
                                    fontSize="sm"
                                    fontWeight="semibold"
                                    color="orange.fg"
                                  >
                                    Registration Required
                                  </Text>
                                  <Text fontSize="sm" color="orange.fg">
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
            colorPalette="blue"
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
