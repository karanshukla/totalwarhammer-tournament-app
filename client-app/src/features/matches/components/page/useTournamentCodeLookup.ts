import { useState } from "react";
import { useNavigate } from "react-router";
import { httpClient } from "@/core/api/httpClient";

interface TournamentCodeViewer {
  id: string;
  username?: string;
}

/** Looks up a tournament by its join code and routes to the player or spectator view. */
export function useTournamentCodeLookup(user: TournamentCodeViewer | null) {
  const navigate = useNavigate();
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);

  const handleFindByCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setCodeLoading(true);
    setCodeError(null);
    try {
      const res = (await httpClient.get(`/tournament/code/${code}`)) as {
        success: boolean;
        data: { _id: string; participants: { name: string }[] };
      };
      const t = res.data;
      const lowerName = user?.username?.trim().toLowerCase();
      const isParticipant = t.participants?.some(
        (p) => p.name.trim().toLowerCase() === lowerName || p.name === user?.id,
      );
      navigate(
        isParticipant
          ? `/matches/tournament/${code}`
          : `/matches/spectate/${code}`,
      );
      setCodeInput("");
    } catch {
      setCodeError("No tournament found with that code.");
    } finally {
      setCodeLoading(false);
    }
  };

  return {
    codeInput,
    setCodeInput,
    codeError,
    codeLoading,
    handleFindByCode,
  };
}
