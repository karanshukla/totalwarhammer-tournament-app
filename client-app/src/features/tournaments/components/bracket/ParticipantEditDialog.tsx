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
import { Participant } from "./types";
import {
  warhammer3Factions,
  warhammer40kFactions,
} from "@/shared/constants/factions";

interface ParticipantEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  participant: Participant | null;
  onParticipantChange: (participant: Participant | null) => void;
  onSave: () => void;
  enable40kFactions?: boolean;
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
  enable40kFactions = false,
}: ParticipantEditDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const bgColor = "bg.panel";
  const borderColor = "border";
  const inputBgColor = "bg";

  const factionList = enable40kFactions
    ? warhammer40kFactions
    : warhammer3Factions;

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
    e.preventDefault();
    onSave();
  };

  return (
    <Dialog.Root
      open={isOpen}
      /* v8 ignore next */
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
                <VStack gap={4} align="stretch">
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
                      borderWidth="1px"
                      borderColor={borderColor}
                      borderRadius="md"
                      color="fg"
                      p={2}
                    >
                      <option value="">Select Faction</option>
                      {factionList.map((faction) => (
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
                  colorPalette="ink"
                  width={{ base: "full", sm: "auto" }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  colorPalette="crimson"
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
