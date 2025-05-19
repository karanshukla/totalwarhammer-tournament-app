import React from "react";
import {
  Dialog,
  Button,
  Field,
  Input,
  VStack,
  chakra,
  Portal,
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
  const inputBgColor = useColorModeValue("white", "gray.900");

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (participant) {
      onParticipantChange({
        ...participant,
        name: e.target.value,
      });
    }
  };

  const handleFactionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (participant) {
      onParticipantChange({
        ...participant,
        faction: e.target.value,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent default form submission (page reload)
    onSave();
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
              py={3}
              px={4}
              borderBottomWidth="1px"
              borderColor={borderColor}
            >
              <Dialog.Title fontSize="lg" fontWeight="medium">
                Edit Participant
              </Dialog.Title>
            </Dialog.Header>
            <chakra.form onSubmit={handleSubmit}>
              <Dialog.Body py={4} px={4}>
                <VStack spacing={4} align="stretch">
                  <Field.Root>
                    <Field.Label mb={1} fontWeight="medium">
                      Name
                    </Field.Label>
                    <Input
                      value={participant?.name || ""}
                      onChange={handleNameChange}
                      bg={inputBgColor}
                      borderColor={borderColor}
                      autoFocus
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label mb={1} fontWeight="medium">
                      Faction
                    </Field.Label>
                    <chakra.select
                      value={participant?.faction || ""}
                      onChange={handleFactionChange}
                      width="100%"
                      bg={inputBgColor}
                      borderColor={borderColor}
                      borderRadius="md"
                      p={2}
                    >
                      <option value="">Select Faction</option>
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
                py={3}
                px={4}
                gap={3}
                borderTopWidth="1px"
                borderColor={borderColor}
              >
                <Button
                  ref={cancelRef}
                  onClick={onClose}
                  variant="outline"
                  width={{ base: "full", sm: "auto" }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit" // Changed to type="submit"
                  colorScheme="blue"
                  width={{ base: "full", sm: "auto" }}
                >
                  Save
                </Button>
              </Dialog.Footer>
            </chakra.form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
