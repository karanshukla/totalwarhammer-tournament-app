import React from "react";
import {
  Dialog,
  Button,
  Field,
  Input,
  Portal,
  VStack,
  Box,
  chakra, // Add chakra factory
} from "@chakra-ui/react";
import { useColorModeValue } from "@/shared/ui/ColorMode";
import { Participant, FACTIONS } from "./types";

interface ParticipantEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  participant: Participant | null;
  onParticipantChange: (participant: Participant | null) => void;
  onSave: () => void;
}

interface OpenChangeDetails {
  open: boolean;
}

export function ParticipantEditDialog({
  isOpen,
  onClose,
  participant,
  onParticipantChange,
  onSave,
}: ParticipantEditDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const inputBgColor = useColorModeValue("white", "gray.700");
  const triggerHoverBorderColor = useColorModeValue("gray.300", "gray.500");

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (participant) {
      onParticipantChange({
        ...participant,
        name: e.target.value,
      });
    }
  };

  // New handler for standard Select component
  const handleFactionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (participant) {
      onParticipantChange({
        ...participant,
        faction: e.target.value,
      });
    }
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e: OpenChangeDetails) => !e.open && onClose()}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            maxWidth="400px"
            width="95%"
            bg={bgColor}
            borderRadius="md"
          >
            <Dialog.Header
              py={4}
              px={6}
              borderBottomWidth="1px"
              borderColor={borderColor}
            >
              <Dialog.Title fontSize="xl" fontWeight="medium">
                Edit Participant
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body py={5} px={6}>
              <VStack spacing={5} align="stretch">
                <Field.Root>
                  <Field.Label fontSize="sm" mb={1} fontWeight="medium">
                    Name
                  </Field.Label>
                  <Input
                    value={participant?.name || ""}
                    onChange={handleNameChange}
                    size="md"
                    px={3}
                    py={2}
                    bg={inputBgColor}
                    borderColor={borderColor}
                    borderRadius="md"
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label fontSize="sm" mb={1} fontWeight="medium">
                    Faction
                  </Field.Label>
                  <chakra.select
                    value={participant?.faction || ""}
                    onChange={handleFactionChange}
                    width="100%"
                    bg={inputBgColor}
                    borderColor={borderColor}
                    borderRadius="md"
                    px={3}
                    py={2}
                    _hover={{ borderColor: triggerHoverBorderColor }}
                    _focus={{
                      borderColor: "blue.500",
                      boxShadow: `0 0 0 1px blue.500`,
                    }}
                    // Apply a height consistent with other inputs if necessary, e.g., h="2.5rem" or size="md" equivalent
                    // For now, relying on px, py and browser default height for select
                  >
                    <option value="">Select Faction</option>{" "}
                    {/* Placeholder option */}
                    {FACTIONS.map((faction) => (
                      <option key={faction} value={faction}>
                        {faction}
                      </option>
                    ))}
                  </chakra.select>
                </Field.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer
              py={4}
              px={6}
              gap={3}
              borderTopWidth="1px"
              borderColor={borderColor}
            >
              <Button
                ref={cancelRef}
                onClick={onClose}
                size="md"
                variant="outline"
                width={{ base: "full", sm: "auto" }}
              >
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={onSave}
                size="md"
                width={{ base: "full", sm: "auto" }}
              >
                Save
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
