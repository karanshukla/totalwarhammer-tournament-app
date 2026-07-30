import React, { useState, useMemo, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  Container,
  Heading,
  Text,
  Box,
  VStack,
  HStack,
  SimpleGrid,
  Card,
  Badge,
  Button,
  Input,
  Field,
  Separator,
  For,
  Textarea,
  Select,
  Portal,
  createListCollection,
} from "@chakra-ui/react";
import {
  LuTrophy,
  LuTrash2,
  LuPlay,
  LuUserPlus,
  LuUsers,
  LuX,
  LuChevronLeft,
  LuSwords,
  LuCopy,
  LuEye,
  LuPencil,
  LuChevronsRight,
  LuClock,
  LuCircleCheck,
  LuCalendar,
  LuTrendingUp,
  LuAward,
  LuHash,
  LuFilePen,
  LuCheck,
  LuFlaskConical,
} from "react-icons/lu";
import { useNavigate } from "react-router";
import { toaster } from "@/shared/ui/Toaster";
import {
  warhammer3Factions,
  warhammer40kFactions,
} from "@/shared/constants/factions";
import { Match, Participant, Tournament, statusColorMap } from "./types";
import MatchesSection from "./MatchesSection";
import EditParticipantDialog from "./EditParticipantDialog";

interface Props {
  selected: Tournament;
  matches: Match[];
  user: { id: string; username?: string; isGuest?: boolean } | null;
  newName: string;
  newFaction: string;
  actionLoading: boolean;
  actionError: string | null;
  matchLoading: boolean;
  onBack: () => void;
  onStart: () => void;
  onDelete: () => void;
  onAddParticipant: () => void;
  onRemoveParticipant: (id: string) => void;
  onRecordResult: (matchId: string, winnerId: string) => void;
  onReportResult: (matchId: string, winnerId: string) => void;
  onOverrideResult: (
    matchId: string,
    winnerId: string,
    reason: string,
  ) => Promise<void>;
  onResolveDispute: (matchId: string, winnerId: string) => void;
  onAdvanceRound: () => void;
  onSaveDescription: (draft: string) => Promise<void>;
  onSaveParticipant: (participant: Participant) => Promise<void>;
  onSetNewName: (v: string) => void;
  onSetNewFaction: (v: string) => void;
}

const cardBg = "bg.panel";
const borderColor = "border";
const selectedBg = "info.subtle";

const TournamentDetail: React.FC<Props> = ({
  selected,
  matches,
  user,
  newName,
  newFaction,
  actionLoading,
  actionError,
  matchLoading,
  onBack,
  onStart,
  onDelete,
  onAddParticipant,
  onRemoveParticipant,
  onRecordResult,
  onReportResult,
  onOverrideResult,
  onResolveDispute,
  onAdvanceRound,
  onSaveDescription,
  onSaveParticipant,
  onSetNewName,
  onSetNewFaction,
}) => {
  const navigate = useNavigate();

  const [editingParticipant, setEditingParticipant] =
    useState<Participant | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [descriptionLoading, setDescriptionLoading] = useState(false);

  const isAdmin =
    !!user &&
    (selected.createdBy === user.id ||
      selected.createdBy?.toString() === user.id?.toString());
  const isFull = selected.participants.length >= selected.playerCount;
  const newFactionCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: "No Faction", value: "" },
          ...(selected.enable40kFactions
            ? warhammer40kFactions
            : warhammer3Factions
          )
            .filter((f) => !selected.bannedFactions.includes(f))
            .map((f) => ({ label: f, value: f })),
        ],
      }),
    [selected.enable40kFactions, selected.bannedFactions],
  );
  const canStart =
    isAdmin &&
    selected.status === "pending" &&
    selected.participants.length >= 2;
  const canDelete = isAdmin && selected.status === "pending";
  const isPending = selected.status === "pending";
  const isActive = selected.status === "active";

  const tournamentType = selected.tournamentType;
  const isDoubleElim = tournamentType === "Double Elimination";
  const isRoundRobin = tournamentType === "Round Robin";
  const isSwiss = tournamentType === "Swiss System";
  const roundNumbers = [...new Set(matches.map((m) => m.round))].sort(
    (a, b) => a - b,
  );

  const canAdvance =
    isAdmin &&
    isActive &&
    matches.length > 0 &&
    (() => {
      if (isDoubleElim) {
        const wbMax = Math.max(
          ...matches
            .filter((m) => m.bracketSide === "winners")
            .map((m) => m.round),
          0,
        );
        const lbMax = Math.max(
          ...matches
            .filter((m) => m.bracketSide === "losers")
            .map((m) => m.round),
          0,
        );
        const gfLast = matches
          .filter((m) => m.bracketSide === "grand_final")
          .slice(-1)[0];
        const wbDone = matches
          .filter((m) => m.bracketSide === "winners" && m.round === wbMax)
          .every((m) => m.status === "completed");
        const lbDone =
          lbMax === 0 ||
          matches
            .filter((m) => m.bracketSide === "losers" && m.round === lbMax)
            .every((m) => m.status === "completed");
        const gfDone = !gfLast || gfLast.status === "completed";
        return wbDone && lbDone && gfDone;
      }
      const maxRound = Math.max(...matches.map((m) => m.round));
      return matches
        .filter((m) => m.round === maxRound)
        .every((m) => m.status === "completed");
    })();

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleUpdateDescription = async () => {
    setDescriptionLoading(true);
    try {
      await onSaveDescription(descriptionDraft);
      setEditingDescription(false);
    } finally {
      setDescriptionLoading(false);
    }
  };

  const handleUpdateParticipant = async () => {
    if (!editingParticipant) return;
    try {
      await onSaveParticipant(editingParticipant);
      setEditDialogOpen(false);
      setEditingParticipant(null);
    } catch {
      // error shown via actionError from parent
    }
  };

  // Esc cancels the inline description editor (issue #144). Scoped to when the
  // editor is open and not mid-save, so it never fires elsewhere on the page.
  useEffect(() => {
    if (!editingDescription || descriptionLoading) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setEditingDescription(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editingDescription, descriptionLoading]);

  return (
    <Container maxW="container.xl" py={8}>
      <Button variant="ghost" size="sm" mb={6} onClick={onBack}>
        <LuChevronLeft />
        Back to Matches View
      </Button>

      <HStack mb={6} gap={4} wrap="wrap" alignItems="flex-start">
        <VStack alignItems="flex-start" gap={1} flex={1}>
          <HStack gap={3} wrap="wrap">
            <Heading as="h1" size="xl">
              {selected.name}
            </Heading>
            <Badge colorPalette={statusColorMap[selected.status]} size="lg">
              {selected.status.charAt(0).toUpperCase() +
                selected.status.slice(1)}
            </Badge>
          </HStack>
          <HStack gap={3} color="fg.muted" fontSize="sm" wrap="wrap">
            <Text>{selected.tournamentType}</Text>
            {selected.enable40kFactions && (
              <Badge
                size="xs"
                variant="subtle"
                bg="gold.subtle"
                color="gold.text"
              >
                <LuFlaskConical size={9} />
                40K Beta
              </Badge>
            )}
            <Text>·</Text>
            <Text>
              {selected.participants.length}/{selected.playerCount} players
            </Text>
            {selected.code && (
              <>
                <Text>·</Text>
                <Text fontFamily="mono" fontWeight="bold" letterSpacing="wider">
                  Code: {selected.code}
                </Text>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => handleCopyCode(selected.code)}
                  colorPalette={codeCopied ? "verdigris" : "ink"}
                >
                  <LuCopy />
                  {codeCopied ? "Copied!" : "Copy"}
                </Button>
              </>
            )}
          </HStack>
          {isAdmin && editingDescription ? (
            <VStack mt={2} gap={2} alignItems="stretch" w="full">
              <Textarea
                value={descriptionDraft}
                onChange={(e) =>
                  setDescriptionDraft(e.target.value.slice(0, 2000))
                }
                placeholder="Tournament description (Markdown supported)"
                minH="240px"
                h="240px"
                resize="vertical"
                fontSize="sm"
                maxLength={2000}
              />
              <Text
                fontSize="xs"
                color={
                  descriptionDraft.length >= 2000 ? "status.loss" : "fg.muted"
                }
                textAlign="right"
              >
                {descriptionDraft.length}/2000
              </Text>
              <HStack gap={2}>
                <Button
                  size="xs"
                  colorPalette="crimson"
                  onClick={handleUpdateDescription}
                  loading={descriptionLoading}
                >
                  <LuCheck />
                  Save
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setEditingDescription(false)}
                >
                  Cancel
                </Button>
              </HStack>
            </VStack>
          ) : (
            <VStack mt={1} gap={2} alignItems="flex-start">
              {selected.description ? (
                <Box
                  w="full"
                  fontSize="sm"
                  color="fg.muted"
                  css={{
                    "& h1,& h2,& h3,& h4,& h5,& h6": {
                      fontWeight: "bold",
                      lineHeight: 1.3,
                      marginTop: "0.75rem",
                      marginBottom: "0.25rem",
                    },
                    "& h1": { fontSize: "1.25rem" },
                    "& h2": { fontSize: "1.125rem" },
                    "& h3": { fontSize: "1rem" },
                    "& p": { marginBottom: "0.5rem", lineHeight: 1.6 },
                    "& ul,& ol": {
                      paddingLeft: "1.25rem",
                      marginBottom: "0.5rem",
                    },
                    "& li": { marginBottom: "0.25rem" },
                    "& strong": { fontWeight: "bold" },
                    "& em": { fontStyle: "italic" },
                    "& code": {
                      fontFamily: "monospace",
                      background: "var(--chakra-colors-bg-muted)",
                      padding: "0 4px",
                      borderRadius: "3px",
                      fontSize: "0.8em",
                    },
                    "& pre": {
                      background: "var(--chakra-colors-bg-muted)",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      overflowX: "auto",
                      marginBottom: "0.5rem",
                      fontSize: "0.8em",
                    },
                    "& blockquote": {
                      borderLeft: "3px solid var(--chakra-colors-border)",
                      paddingLeft: "0.75rem",
                      color: "var(--chakra-colors-fg-muted)",
                      margin: "0.5rem 0",
                    },
                    "& a": {
                      color: "var(--chakra-colors-verdigris-fg)",
                      textDecoration: "underline",
                    },
                    "& img": {
                      maxWidth: "100%",
                      height: "auto",
                      borderRadius: "4px",
                    },
                  }}
                >
                  <ReactMarkdown>{selected.description}</ReactMarkdown>
                </Box>
              ) : isAdmin && selected.status !== "completed" ? (
                <Text color="fg.muted" fontSize="sm" fontStyle="italic">
                  No description - click Edit Description to add one.
                </Text>
              ) : null}
              {isAdmin && selected.status !== "completed" && (
                <Button
                  size="sm"
                  variant="outline"
                  alignSelf="flex-start"
                  onClick={() => {
                    setDescriptionDraft(selected.description ?? "");
                    setEditingDescription(true);
                  }}
                >
                  <LuFilePen />
                  Edit Description
                </Button>
              )}
            </VStack>
          )}
        </VStack>
        <HStack gap={2}>
          <Button
            size="sm"
            variant="ghost"
            colorPalette="verdigris"
            onClick={() => navigate(`/matches/spectate/${selected.code}`)}
          >
            <LuEye />
            Spectator View
          </Button>
          {canStart && (
            <Button
              colorPalette="verdigris"
              size="sm"
              onClick={onStart}
              loading={actionLoading}
            >
              <LuPlay />
              Start Tournament
            </Button>
          )}
          {canAdvance && (
            <Button
              colorPalette="crimson"
              size="sm"
              onClick={onAdvanceRound}
              loading={actionLoading}
            >
              <LuChevronsRight />
              {isRoundRobin
                ? "Finalize Tournament"
                : isSwiss &&
                    Math.max(...matches.map((m) => m.round)) >=
                      roundNumbers.length
                  ? "Finalize Tournament"
                  : "Advance Round"}
            </Button>
          )}
          {canDelete && (
            <Button
              colorPalette="crimson"
              variant="outline"
              size="sm"
              onClick={onDelete}
              loading={actionLoading}
            >
              <LuTrash2 />
              Delete
            </Button>
          )}
        </HStack>
      </HStack>

      {actionError && (
        <Box
          mb={6}
          p={3}
          bg="status.loss.subtle"
          borderRadius="md"
          borderWidth={1}
          borderColor="status.loss.border"
        >
          <Text color="status.loss">{actionError}</Text>
        </Box>
      )}

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
        <Card.Root bg={cardBg}>
          <Card.Header>
            <HStack gap={2}>
              <LuUsers />
              <Heading size="md">
                Participants ({selected.participants.length}/
                {selected.playerCount})
              </Heading>
            </HStack>
          </Card.Header>
          <Card.Body>
            {selected.participants.length === 0 ? (
              <Text color="fg.muted" textAlign="center" py={4}>
                No Participants Yet
              </Text>
            ) : (
              <VStack gap={2} alignItems="stretch">
                <For each={selected.participants}>
                  {(p) => (
                    <HStack
                      key={p._id}
                      p={3}
                      borderRadius="md"
                      borderWidth={1}
                      borderColor={borderColor}
                      bg={selectedBg}
                      justifyContent="space-between"
                    >
                      <VStack alignItems="flex-start" gap={0}>
                        <Text fontWeight="medium">{p.name}</Text>
                        {p.faction && (
                          <Text fontSize="xs" color="fg.muted">
                            {p.faction}
                          </Text>
                        )}
                      </VStack>
                      <HStack gap={1}>
                        {isAdmin && (
                          <Button
                            size="xs"
                            variant="ghost"
                            colorPalette="ink"
                            onClick={() => {
                              setEditingParticipant(p);
                              setEditDialogOpen(true);
                            }}
                            aria-label="Edit participant"
                          >
                            <LuPencil />
                          </Button>
                        )}
                        {isAdmin && isPending && (
                          <Button
                            size="xs"
                            variant="ghost"
                            colorPalette="crimson"
                            onClick={() => onRemoveParticipant(p._id)}
                            loading={actionLoading}
                            aria-label="Remove participant"
                          >
                            <LuX />
                          </Button>
                        )}
                      </HStack>
                    </HStack>
                  )}
                </For>
              </VStack>
            )}
          </Card.Body>
        </Card.Root>

        {isAdmin && isPending ? (
          <Card.Root bg={cardBg}>
            <Card.Header>
              <Heading size="md">Add Participant</Heading>
              {isFull && (
                <Text fontSize="sm" color="gold.text" mt={1}>
                  Tournament is full
                </Text>
              )}
            </Card.Header>
            <Card.Body>
              <VStack gap={4}>
                <Field.Root>
                  <Field.Label>Player Name</Field.Label>
                  <Input
                    placeholder="Enter player name"
                    value={newName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      onSetNewName(e.target.value)
                    }
                    disabled={isFull}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                      e.key === "Enter" && onAddParticipant()
                    }
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>
                    Faction{" "}
                    <Text as="span" color="fg.muted" fontSize="sm">
                      (optional)
                    </Text>
                  </Field.Label>
                  <Select.Root
                    collection={newFactionCollection}
                    value={[newFaction]}
                    onValueChange={(e) => onSetNewFaction(e.value[0] ?? "")}
                    disabled={isFull}
                    w="full"
                    size="sm"
                  >
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText placeholder="No Faction" />
                      </Select.Trigger>
                      <Select.IndicatorGroup>
                        <Select.Indicator />
                      </Select.IndicatorGroup>
                    </Select.Control>
                    <Portal>
                      <Select.Positioner>
                        <Select.Content>
                          {newFactionCollection.items.map((item) => (
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
                <Button
                  width="full"
                  colorPalette="crimson"
                  onClick={onAddParticipant}
                  disabled={!newName.trim() || isFull}
                  loading={actionLoading}
                >
                  <LuUserPlus />
                  Add Participant
                </Button>
              </VStack>
            </Card.Body>
          </Card.Root>
        ) : (
          <Card.Root bg={cardBg}>
            <Card.Header>
              <HStack gap={2}>
                <LuTrophy />
                <Heading size="md">Tournament Info</Heading>
              </HStack>
            </Card.Header>
            <Card.Body>
              <VStack gap={3} alignItems="stretch">
                <HStack justifyContent="space-between">
                  <HStack gap={1}>
                    <LuHash size={14} />
                    <Text color="fg.muted" fontSize="sm">
                      Code
                    </Text>
                  </HStack>
                  <HStack gap={1}>
                    <Box
                      px={2}
                      py="1px"
                      bg="gold.subtle"
                      color="gold.text"
                      borderRadius="sm"
                      fontSize="xs"
                      fontWeight="bold"
                      letterSpacing="widest"
                      border="1px solid"
                      borderColor="gold.border"
                      textTransform="uppercase"
                    >
                      {selected.code}
                    </Box>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(selected.code);
                        toaster.create({
                          title: "Copied!",
                          description: "Tournament code copied to clipboard",
                          type: "success",
                        });
                      }}
                    >
                      <LuCopy size={14} />
                    </Button>
                  </HStack>
                </HStack>
                <Separator />

                <HStack justifyContent="space-between">
                  <HStack gap={1}>
                    <LuSwords size={14} />
                    <Text color="fg.muted" fontSize="sm">
                      Format
                    </Text>
                  </HStack>
                  <Text fontWeight="medium">{selected.tournamentType}</Text>
                </HStack>
                <Separator />

                <HStack justifyContent="space-between">
                  <HStack gap={1}>
                    <LuUsers size={14} />
                    <Text color="fg.muted" fontSize="sm">
                      Players
                    </Text>
                  </HStack>
                  <Text fontWeight="medium">
                    {selected.participants.length}/{selected.playerCount}
                  </Text>
                </HStack>
                <Separator />

                {isActive && matches.length > 0 && !isRoundRobin && (
                  <>
                    <HStack justifyContent="space-between">
                      <HStack gap={1}>
                        <LuTrendingUp size={14} />
                        <Text color="fg.muted" fontSize="sm">
                          Current Round
                        </Text>
                      </HStack>
                      <Text fontWeight="medium">
                        {Math.max(
                          ...matches
                            .filter(
                              (m) =>
                                m.bracketSide !== "losers" &&
                                m.bracketSide !== "grand_final",
                            )
                            .map((m) => m.round),
                        )}{" "}
                        of {roundNumbers.length}
                      </Text>
                    </HStack>
                    <Separator />
                  </>
                )}

                {matches.length > 0 && (
                  <>
                    <HStack justifyContent="space-between">
                      <HStack gap={1}>
                        <LuCircleCheck size={14} />
                        <Text color="fg.muted" fontSize="sm">
                          Matches Completed
                        </Text>
                      </HStack>
                      <Text fontWeight="medium">
                        {matches.filter((m) => m.status === "completed").length}
                        / {matches.length}
                      </Text>
                    </HStack>
                    <Separator />
                  </>
                )}

                {selected.status === "completed" && (
                  <>
                    <HStack justifyContent="space-between">
                      <HStack gap={1}>
                        <Box as="span" color="gold.text" display="inline-flex">
                          <LuAward size={14} />
                        </Box>
                        <Text color="fg.muted" fontSize="sm">
                          Champion
                        </Text>
                      </HStack>
                      {(() => {
                        const finalMatch = matches.find(
                          (m) =>
                            m.winnerId &&
                            m.round ===
                              Math.max(...matches.map((x) => x.round)),
                        );
                        if (!finalMatch)
                          return <Text fontWeight="medium">-</Text>;
                        const champion =
                          finalMatch.winnerId ===
                          finalMatch.player1.participantId
                            ? finalMatch.player1
                            : finalMatch.player2;
                        return (
                          <Text fontWeight="bold" color="gold.text">
                            {champion.name}
                          </Text>
                        );
                      })()}
                    </HStack>
                    <Separator />
                  </>
                )}

                <HStack justifyContent="space-between">
                  <HStack gap={1}>
                    <LuClock size={14} />
                    <Text color="fg.muted" fontSize="sm">
                      Status
                    </Text>
                  </HStack>
                  <Badge colorPalette={statusColorMap[selected.status]}>
                    {selected.status.charAt(0).toUpperCase() +
                      selected.status.slice(1)}
                  </Badge>
                </HStack>
                <Separator />

                <HStack justifyContent="space-between">
                  <HStack gap={1}>
                    <LuCalendar size={14} />
                    <Text color="fg.muted" fontSize="sm">
                      Created
                    </Text>
                  </HStack>
                  <Text fontSize="sm">
                    {new Date(selected.createdAt).toLocaleDateString()}
                  </Text>
                </HStack>
                {selected.bannedFactions.length > 0 && (
                  <>
                    <Separator />
                    <VStack alignItems="flex-start" gap={1}>
                      <Text color="fg.muted" fontSize="sm">
                        Banned Factions
                      </Text>
                      <HStack wrap="wrap" gap={1}>
                        <For each={selected.bannedFactions}>
                          {(f) => (
                            <Badge
                              key={f}
                              colorPalette="ink"
                              size="sm"
                              variant="subtle"
                            >
                              {f}
                            </Badge>
                          )}
                        </For>
                      </HStack>
                    </VStack>
                  </>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>
        )}

        {selected.status === "completed" &&
          (() => {
            const finalRound = Math.max(...matches.map((m) => m.round));
            const finalMatch = matches.find(
              (m) => m.round === finalRound && m.winnerId,
            );
            if (!finalMatch) return null;
            const champion =
              finalMatch.winnerId === finalMatch.player1.participantId
                ? finalMatch.player1
                : finalMatch.player2;
            return (
              <Box
                mb={0}
                p={5}
                borderRadius="lg"
                bg="gold.subtle"
                borderWidth={1}
                borderColor="gold.border"
                textAlign="center"
                gridColumn={{ lg: "1 / -1" }}
              >
                <HStack justifyContent="center" gap={3}>
                  <LuTrophy size={24} color="var(--chakra-colors-gold-text)" />
                  <VStack gap={0}>
                    <Text
                      fontSize="xs"
                      fontWeight="semibold"
                      textTransform="uppercase"
                      letterSpacing="wider"
                      color="fg.muted"
                    >
                      Tournament Champion
                    </Text>
                    <Text fontSize="2xl" fontWeight="bold">
                      {champion.name}
                    </Text>
                    {champion.faction && (
                      <Text fontSize="sm" color="fg.muted">
                        {champion.faction}
                      </Text>
                    )}
                  </VStack>
                  <LuTrophy size={24} color="var(--chakra-colors-gold-text)" />
                </HStack>
              </Box>
            );
          })()}

        {(isActive || selected.status === "completed") && (
          <MatchesSection
            matches={matches}
            selected={selected}
            user={user}
            isAdmin={isAdmin}
            isActive={isActive}
            actionLoading={actionLoading}
            matchLoading={matchLoading}
            onRecordResult={onRecordResult}
            onReportResult={onReportResult}
            onOverrideResult={onOverrideResult}
            onResolveDispute={onResolveDispute}
            onAdvanceRound={onAdvanceRound}
          />
        )}
      </SimpleGrid>

      <EditParticipantDialog
        open={editDialogOpen}
        participant={editingParticipant}
        actionLoading={actionLoading}
        enable40kFactions={selected.enable40kFactions}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingParticipant(null);
        }}
        onParticipantChange={setEditingParticipant}
        onSave={handleUpdateParticipant}
      />
    </Container>
  );
};

export default TournamentDetail;
