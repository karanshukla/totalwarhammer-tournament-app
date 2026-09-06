import { useState } from "react";
import { useNavigate } from "react-router";
import { httpClient } from "@/core/api/httpClient";
import { toaster } from "@/shared/ui/toasterStore";
import {
  factionsForGameSystem,
  type FactionGame,
} from "@/shared/constants/factions";
import {
  validateTournamentName,
  TOURNAMENT_DESCRIPTION_MAX_LENGTH,
  PLAYER_COUNT_MIN,
  PLAYER_COUNT_MAX,
} from "@/shared/constants/validation";
import { formatGuidance } from "./formatGuidance";

export const TOURNAMENT_TYPES = [
  "Single Elimination",
  "Double Elimination",
  "Round Robin",
  "Swiss System",
];

const GAME_SWITCH_FADE_MS = 180;

interface CreateTournamentFormData {
  name: string;
  description: string;
  playerCount: number;
  tournamentType: string;
  bannedFactions: string[];
  enable40kFactions: boolean;
}

/** Owns all state and submit logic for the create-tournament form. */
export function useCreateTournamentForm() {
  const [formData, setFormData] = useState<CreateTournamentFormData>({
    name: "",
    description: "",
    playerCount: 8,
    tournamentType: TOURNAMENT_TYPES[0],
    bannedFactions: [],
    enable40kFactions: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [playerCountError, setPlayerCountError] = useState<string | null>(null);
  const [factionListVisible, setFactionListVisible] = useState(true);
  const navigate = useNavigate();

  const activeFactionList = factionsForGameSystem(formData);
  const guidance = formatGuidance(
    formData.tournamentType,
    formData.playerCount,
  );

  // Bans are per-game, so switching systems clears them rather than leaving
  // selections the server would reject.
  const handleGameChange = (game: FactionGame) => {
    setFactionListVisible(false);
    setTimeout(() => {
      setFormData((prev) => ({
        ...prev,
        enable40kFactions: game === "40k",
        bannedFactions: [],
      }));
      setFactionListVisible(true);
    }, GAME_SWITCH_FADE_MS);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (nameError) setNameError(null);
    setFormData((prev) => ({ ...prev, name: e.target.value }));
  };

  const handleTournamentTypeChange = (tournamentType: string) => {
    setFormData((prev) => ({ ...prev, tournamentType }));
  };

  const handlePlayerCountChange = ({ value }: { value: string }) => {
    setPlayerCountError(null);
    setFormData((prev) => ({
      ...prev,
      playerCount: parseInt(value) || PLAYER_COUNT_MIN,
    }));
  };

  const handleDescriptionChange = (description: string) => {
    setFormData((prev) => ({
      ...prev,
      description: description.slice(0, TOURNAMENT_DESCRIPTION_MAX_LENGTH),
    }));
  };

  const handleBannedFactionsChange = (bannedFactions: string[]) => {
    setFormData((prev) => ({ ...prev, bannedFactions }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const invalidName = validateTournamentName(formData.name);
    setNameError(invalidName);

    const { playerCount } = formData;
    const invalidPlayerCount =
      playerCount < PLAYER_COUNT_MIN || playerCount > PLAYER_COUNT_MAX
        ? `Player count must be between ${PLAYER_COUNT_MIN} and ${PLAYER_COUNT_MAX}`
        : null;
    setPlayerCountError(invalidPlayerCount);

    if (invalidName || invalidPlayerCount) return;

    setIsLoading(true);

    try {
      const response = (await httpClient.post("/tournament", {
        ...formData,
        name: formData.name.trim(),
      })) as {
        success: boolean;
        data: { _id: string; name: string; code: string };
      };
      toaster.create({
        title: "Tournament Created",
        description: `"${response.data.name}" created successfully.`,
        type: "success",
      });
      navigate(`/matches/tournament/${response.data.code}`);
    } catch (err) {
      toaster.create({
        title: "Failed to Create Tournament",
        description: err instanceof Error ? err.message : "An error occurred",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
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
  };
}
