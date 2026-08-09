import React from "react";
import {
  Dialog,
  Button,
  Field,
  Input,
  VStack,
  Portal,
  chakra,
} from "@chakra-ui/react";
import { Participant } from "./types";
import FactionSelect from "@/shared/ui/FactionSelect";
import type { GameScoped } from "@/shared/constants/factions";
import { PARTICIPANT_NAME_MAX_LENGTH } from "@/shared/constants/validation";

interface ParticipantEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  participant: Participant | null;
  onParticipantChange: (participant: Participant | null) => void;
  onSave: () => void;
  tournament?: GameScoped;
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
  tournament,
}: ParticipantEditDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (participant) {
      onParticipantChange({
        ...participant,
        name: e.target.value,
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
            bg="bg.panel"
            borderRadius="md"
          >
            <Dialog.Header
              py={3}
              px={4}
              borderBottomWidth="1px"
              borderColor="border"
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
                      bg="bg.subtle"
                      borderColor="border"
                      maxLength={PARTICIPANT_NAME_MAX_LENGTH}
                      autoFocus
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label mb={1} fontWeight="medium">
                      Faction
                    </Field.Label>
                    <FactionSelect
                      tournament={tournament}
                      value={participant?.faction || ""}
                      onChange={(faction) =>
                        participant &&
                        onParticipantChange({ ...participant, faction })
                      }
                      placeholder="Select Faction"
                      size="md"
                    />
                  </Field.Root>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer
                py={3}
                px={4}
                gap={3}
                borderTopWidth="1px"
                borderColor="border"
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
                  disabled={!participant?.name?.trim()}
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
