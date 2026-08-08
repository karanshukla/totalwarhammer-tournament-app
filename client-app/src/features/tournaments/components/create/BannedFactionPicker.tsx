import React, { useEffect, useState } from "react";
import { Box, Flex, SimpleGrid, Text, VStack } from "@chakra-ui/react";

interface BannedFactionPickerProps {
  factions: string[];
  banned: string[];
  onChange: (banned: string[]) => void;
  /** Fades the list out and back when the game system switches. */
  visible?: boolean;
}

/**
 * Multi-select faction ban list. Shift-click extends the selection from the
 * last clicked faction, mirroring how file pickers behave.
 */
const BannedFactionPicker: React.FC<BannedFactionPickerProps> = ({
  factions,
  banned,
  onChange,
  visible = true,
}) => {
  const [shiftHeld, setShiftHeld] = useState(false);
  const [anchor, setAnchor] = useState<number | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => setAnchor(null), [factions]);

  const toggle = (faction: string) => {
    const index = factions.indexOf(faction);
    const wasBanned = banned.includes(faction);

    if (shiftHeld && anchor !== null) {
      const range = factions.slice(
        Math.min(anchor, index),
        Math.max(anchor, index) + 1,
      );
      onChange(
        wasBanned
          ? banned.filter((f) => !range.includes(f))
          : [...new Set([...banned, ...range])],
      );
    } else {
      onChange(
        wasBanned ? banned.filter((f) => f !== faction) : [...banned, faction],
      );
    }
    setAnchor(index);
  };

  return (
    <VStack gap={2} align="stretch" minW={0} overflow="hidden">
      <Box
        opacity={visible ? 1 : 0}
        transition="opacity 0.18s ease"
        maxH="320px"
        overflowY="auto"
        overflowX="hidden"
        pr={1}
      >
        <SimpleGrid columns={2} gap={2}>
          {factions.map((faction) => {
            const isChecked = banned.includes(faction);
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
                borderColor={isChecked ? "brand.border" : "border.subtle"}
                cursor="pointer"
                minW={0}
                bg={isChecked ? "brand.subtle" : "bg.subtle"}
                _hover={{
                  bg: isChecked ? "brand.subtle" : "bg.emphasized",
                  borderColor: isChecked ? "brand.border" : "border.emphasized",
                }}
                transition="all 0.15s"
                onClick={() => toggle(faction)}
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
  );
};

export default BannedFactionPicker;
