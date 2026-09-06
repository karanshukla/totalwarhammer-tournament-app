import React from "react";
import { Button, Card, Text, VStack } from "@chakra-ui/react";
import { useCreateTournamentForm } from "./create/useCreateTournamentForm";
import TournamentBasicFields from "./create/TournamentBasicFields";
import TournamentDescriptionField from "./create/TournamentDescriptionField";
import BannedFactionsSection from "./create/BannedFactionsSection";
import GuidanceNote from "./create/GuidanceNote";

interface CreateTournamentFormProps {
  isGuest?: boolean;
}

const CreateTournamentForm: React.FC<CreateTournamentFormProps> = ({
  isGuest = false,
}) => {
  const {
    formData,
    isLoading,
    nameError,
    playerCountError,
    factionListVisible,
    activeFactionList,
    guidance,
    handleGameChange,
    handleNameChange,
    handleTournamentTypeChange,
    handlePlayerCountChange,
    handleDescriptionChange,
    handleBannedFactionsChange,
    handleSubmit,
  } = useCreateTournamentForm();

  return (
    <form onSubmit={handleSubmit}>
      <Card.Root>
        <Card.Body>
          <VStack gap={6} align="stretch">
            <TournamentBasicFields
              name={formData.name}
              nameError={nameError}
              onNameChange={handleNameChange}
              tournamentType={formData.tournamentType}
              onTournamentTypeChange={handleTournamentTypeChange}
              playerCount={formData.playerCount}
              playerCountError={playerCountError}
              onPlayerCountChange={handlePlayerCountChange}
            />

            <TournamentDescriptionField
              description={formData.description}
              onChange={handleDescriptionChange}
            />

            {formData.tournamentType === "Swiss System" && (
              <GuidanceNote tone="info">
                Swiss System uses the{" "}
                <Text as="span" fontWeight="semibold">
                  Blossom algorithm
                </Text>{" "}
                for maximum-cardinality matching - players are paired by win
                score while avoiding rematches wherever possible.
              </GuidanceNote>
            )}

            <BannedFactionsSection
              factions={activeFactionList}
              banned={formData.bannedFactions}
              onBannedChange={handleBannedFactionsChange}
              visible={factionListVisible}
              enable40kFactions={formData.enable40kFactions}
              onGameChange={handleGameChange}
              isGuest={isGuest}
              guidance={guidance}
            />
          </VStack>
        </Card.Body>
        <Card.Footer>
          <Button
            type="submit"
            colorPalette="crimson"
            size="md"
            loading={isLoading}
            disabled={isGuest || !formData.name.trim()}
          >
            Create Tournament
          </Button>
        </Card.Footer>
      </Card.Root>
    </form>
  );
};

export default CreateTournamentForm;
