import React from "react";
import { Dialog, Portal, Field, Input, Button, VStack } from "@chakra-ui/react";
import FactionSelect from "@/shared/ui/FactionSelect";
import type { GameScoped } from "@/shared/constants/factions";
import { PARTICIPANT_NAME_MAX_LENGTH } from "@/shared/constants/validation";
import { Participant } from "./types";

interface Props {
  open: boolean;
  participant: Participant | null;
  actionLoading: boolean;
  tournament?: GameScoped;
  onClose: () => void;
  onParticipantChange: (p: Participant) => void;
  onSave: () => void;
}

const borderColor = "border";

const EditParticipantDialog: React.FC<Props> = ({
  open,
  participant,
  actionLoading,
  tournament,
  onClose,
  onParticipantChange,
  onSave,
}) => {
  const handleOpenChange = (e: { open: boolean }) => {
    // This dialog is only ever rendered while `open` is true (controlled by
    // the parent); Ark UI's internal close triggers (Escape, backdrop click)
    // only ever request open:false, so open:true here is unreachable.
    /* v8 ignore next */
    if (e.open) return;
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxWidth="400px" width="95%">
            <Dialog.Header borderBottomWidth="1px" borderColor={borderColor}>
              <Dialog.Title>Edit Participant</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body py={4}>
              <VStack gap={4} align="stretch">
                <Field.Root>
                  <Field.Label>Name</Field.Label>
                  <Input
                    value={participant?.name ?? ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      participant &&
                      onParticipantChange({
                        ...participant,
                        name: e.target.value,
                      })
                    }
                    maxLength={PARTICIPANT_NAME_MAX_LENGTH}
                    autoFocus
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Faction</Field.Label>
                  <FactionSelect
                    tournament={tournament}
                    value={participant?.faction ?? ""}
                    onChange={(faction) =>
                      participant &&
                      onParticipantChange({ ...participant, faction })
                    }
                  />
                </Field.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer
              borderTopWidth="1px"
              borderColor={borderColor}
              gap={3}
            >
              <Button variant="outline" colorPalette="ink" onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorPalette="crimson"
                onClick={onSave}
                loading={actionLoading}
                disabled={!participant?.name?.trim()}
              >
                Save
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default EditParticipantDialog;
