import React, { useMemo } from "react";
import { Select, Portal, createListCollection } from "@chakra-ui/react";
import {
  selectableFactions,
  type GameScoped,
} from "@/shared/constants/factions";

interface FactionSelectProps {
  /** The tournament decides both the roster and which factions are banned. */
  tournament: GameScoped | null | undefined;
  value: string;
  onChange: (faction: string) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

const FactionSelect: React.FC<FactionSelectProps> = ({
  tournament,
  value,
  onChange,
  placeholder = "No Faction",
  disabled,
  size = "sm",
}) => {
  const enable40kFactions = tournament?.enable40kFactions;
  const bannedFactions = tournament?.bannedFactions;
  // Each fetch hands back a fresh bannedFactions array, so key the memo on its
  // contents rather than its identity or it rebuilds on every render.
  const bannedKey = JSON.stringify(bannedFactions ?? []);

  const collection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: placeholder, value: "" },
          ...selectableFactions({
            enable40kFactions,
            bannedFactions: JSON.parse(bannedKey) as string[],
          }).map((f) => ({ label: f, value: f })),
        ],
      }),
    [placeholder, enable40kFactions, bannedKey],
  );

  return (
    <Select.Root
      collection={collection}
      value={[value]}
      onValueChange={(e) => onChange(e.value[0] ?? "")}
      disabled={disabled}
      w="full"
      size={size}
    >
      <Select.HiddenSelect />
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder={placeholder} />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content>
            {collection.items.map((item) => (
              <Select.Item key={item.value} item={item}>
                {item.label}
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
};

export default FactionSelect;
