import React from "react";
import { Button, Field, Input, Text, VStack } from "@chakra-ui/react";
import { LuUserPlus } from "react-icons/lu";
import PanelCard from "@/shared/ui/PanelCard";
import FactionSelect from "@/shared/ui/FactionSelect";
import { PARTICIPANT_NAME_MAX_LENGTH } from "@/shared/constants/validation";
import type { Tournament } from "@/shared/tournament/types";

interface AddParticipantCardProps {
  tournament: Tournament;
  isFull: boolean;
  name: string;
  faction: string;
  actionLoading: boolean;
  onNameChange: (value: string) => void;
  onFactionChange: (value: string) => void;
  onAdd: () => void;
}

const AddParticipantCard: React.FC<AddParticipantCardProps> = ({
  tournament,
  isFull,
  name,
  faction,
  actionLoading,
  onNameChange,
  onFactionChange,
  onAdd,
}) => (
  <PanelCard
    icon={LuUserPlus}
    title="Add Participant"
    headerAside={
      isFull && (
        <Text fontSize="sm" color="gold.text">
          Tournament is full
        </Text>
      )
    }
  >
    <VStack gap={4}>
      <Field.Root>
        <Field.Label>Player Name</Field.Label>
        <Input
          placeholder="Enter player name"
          maxLength={PARTICIPANT_NAME_MAX_LENGTH}
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onNameChange(e.target.value)
          }
          disabled={isFull}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
            e.key === "Enter" && onAdd()
          }
        />
      </Field.Root>
      <Field.Root>
        <Field.Label>
          Faction{" "}
          <Text as="span" color="fg.muted" fontSize="sm">
            (optional)
          </Text>
        </Field.Label>
        <FactionSelect
          tournament={tournament}
          value={faction}
          onChange={onFactionChange}
          disabled={isFull}
        />
      </Field.Root>
      <Button
        width="full"
        colorPalette="crimson"
        onClick={onAdd}
        disabled={!name.trim() || isFull}
        loading={actionLoading}
      >
        <LuUserPlus />
        Add Participant
      </Button>
    </VStack>
  </PanelCard>
);

export default AddParticipantCard;
