import React from "react";
import {
  Dialog,
  Portal,
  Field,
  Input,
  Button,
  VStack,
  chakra,
} from "@chakra-ui/react";
import { warhammer3Factions } from "@/shared/constants/warhammer3Factions";
import { Participant } from "./types";

interface Props {
  open: boolean;
  participant: Participant | null;
  actionLoading: boolean;
  onClose: () => void;
  onParticipantChange: (p: Participant) => void;
  onSave: () => void;
}

const borderColor = "border";

const EditParticipantDialog: React.FC<Props> = ({
  open,
  participant,
  actionLoading,
  onClose,
  onParticipantChange,
  onSave,
}) => {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e: { open: boolean }) => {
        if (!e.open) {
          onClose();
        }
      }}
    >
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
                      participant && onParticipantChange({ ...participant, name: e.target.value })
                    }
                    autoFocus
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Faction</Field.Label>
                  <chakra.select
                    value={participant?.faction ?? ""}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      participant && onParticipantChange({ ...participant, faction: e.target.value })
                    }
                    w="full"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="border"
                    bg="bg.panel"
                    fontSize="sm"
                    color="fg"
                    p={2}
                  >
                    <option value="">No Faction</option>
                    {warhammer3Factions.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </chakra.select>
                </Field.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer borderTopWidth="1px" borderColor={borderColor} gap={3}>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorPalette="blue"
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
