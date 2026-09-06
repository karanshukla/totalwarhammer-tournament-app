import React from "react";
import {
  Field,
  Input,
  Select,
  SimpleGrid,
  Portal,
  createListCollection,
} from "@chakra-ui/react";
import { NumberInputRoot, NumberInputField } from "@/shared/ui/NumberInput";
import {
  TOURNAMENT_NAME_MAX_LENGTH,
  PLAYER_COUNT_MIN,
  PLAYER_COUNT_MAX,
} from "@/shared/constants/validation";
import { TOURNAMENT_TYPES } from "./useCreateTournamentForm";

const tournamentTypeCollection = createListCollection({
  items: TOURNAMENT_TYPES.map((t) => ({ label: t, value: t })),
});

interface TournamentBasicFieldsProps {
  name: string;
  nameError: string | null;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  tournamentType: string;
  onTournamentTypeChange: (tournamentType: string) => void;
  playerCount: number;
  playerCountError: string | null;
  onPlayerCountChange: (value: { value: string }) => void;
}

/** Name, format and player-count fields — the top row of the create form. */
const TournamentBasicFields: React.FC<TournamentBasicFieldsProps> = ({
  name,
  nameError,
  onNameChange,
  tournamentType,
  onTournamentTypeChange,
  playerCount,
  playerCountError,
  onPlayerCountChange,
}) => (
  <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
    <Field.Root required invalid={!!nameError}>
      <Field.Label>Tournament Name</Field.Label>
      <Input
        name="name"
        value={name}
        onChange={onNameChange}
        placeholder="Enter tournament name"
        maxLength={TOURNAMENT_NAME_MAX_LENGTH}
      />
      <Field.ErrorText>{nameError}</Field.ErrorText>
    </Field.Root>

    <Field.Root required>
      <Field.Label>Tournament Type</Field.Label>
      <Select.Root
        collection={tournamentTypeCollection}
        value={[tournamentType]}
        onValueChange={(e) =>
          onTournamentTypeChange(e.value[0] ?? TOURNAMENT_TYPES[0])
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
        value={String(playerCount)}
        min={PLAYER_COUNT_MIN}
        max={PLAYER_COUNT_MAX}
        onValueChange={onPlayerCountChange}
      >
        <NumberInputField />
      </NumberInputRoot>
      <Field.ErrorText>{playerCountError}</Field.ErrorText>
    </Field.Root>
  </SimpleGrid>
);

export default TournamentBasicFields;
