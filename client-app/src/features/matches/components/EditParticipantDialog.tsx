import React, { useMemo } from "react";
import {
  Dialog,
  Portal,
  Field,
  Input,
  Button,
  VStack,
  Select,
  createListCollection,
} from "@chakra-ui/react";
import {
  warhammer3Factions,
  warhammer40kFactions,
} from "@/shared/constants/factions";
import { Participant } from "./types";

interface Props {
  open: boolean;
  participant: Participant | null;
  actionLoading: boolean;
  enable40kFactions?: boolean;
  onClose: () => void;
  onParticipantChange: (p: Participant) => void;
  onSave: () => void;
}

const borderColor = "border";

const EditParticipantDialog: React.FC<Props> = ({
  open,
  participant,
  actionLoading,
  enable40kFactions = false,
  onClose,
  onParticipantChange,
  onSave,
}) => {
  const factionList = enable40kFactions
    ? warhammer40kFactions
    : warhammer3Factions;

  const factionCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: "No Faction", value: "" },
          ...factionList.map((f) => ({ label: f, value: f })),
        ],
      }),
    [factionList],
  );

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
                    autoFocus
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Faction</Field.Label>
                  <Select.Root
                    collection={factionCollection}
                    value={[participant?.faction ?? ""]}
                    onValueChange={(e) =>
                      participant &&
                      onParticipantChange({
                        ...participant,
                        // This is a single-select with no clear affordance, so
                        // e.value always has exactly one entry in practice;
                        // the fallback guards the type (string[] -> string).
                        /* v8 ignore next */
                        faction: e.value[0] ?? "",
                      })
                    }
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
                          {factionCollection.items.map((item) => (
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
