import React, { useState } from "react";
import { Text, VStack, HStack, Input, Button } from "@chakra-ui/react";
import { LuSearch } from "react-icons/lu";
import { useNavigate } from "react-router";
import { httpClient } from "@/core/api/httpClient";
import { useUserStore } from "@/shared/stores/userStore";

interface CodeLookupResponse {
  success: boolean;
  data: { _id: string; participants: { name: string }[] };
}

const TournamentCodeSearch: React.FC = () => {
  const { user } = useUserStore();
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const navigate = useNavigate();

  const isParticipantOf = (participants: { name: string }[]) => {
    const lowerName = user?.username?.trim().toLowerCase();
    const guestFallback =
      user?.isGuest && user?.id ? `guest_${user.id.substring(0, 6)}` : null;
    return participants?.some((p) => {
      const ln = p.name.trim().toLowerCase();
      return (
        (lowerName && ln === lowerName) ||
        (guestFallback && ln === guestFallback) ||
        p.name === user?.id
      );
    });
  };

  const handleFindByCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setCodeLoading(true);
    setCodeError(null);
    try {
      const res = (await httpClient.get(
        `/tournament/code/${code}`,
      )) as CodeLookupResponse;
      if (isParticipantOf(res.data.participants)) {
        navigate(`/matches/tournament/${code}`);
      } else {
        navigate(`/matches/spectate/${code}`);
      }
    } catch {
      setCodeError("No tournament found with that code.");
    } finally {
      setCodeLoading(false);
    }
  };

  return (
    <VStack alignItems="flex-end" gap={1}>
      <HStack gap={2}>
        <Input
          placeholder="e.g., ABC123"
          value={codeInput}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setCodeInput(e.target.value)
          }
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
            e.key === "Enter" && handleFindByCode()
          }
          maxW="220px"
          size="sm"
        />
        <Button
          size="sm"
          colorPalette="verdigris"
          onClick={handleFindByCode}
          loading={codeLoading}
          gap={2}
        >
          <LuSearch /> Find Tournament
        </Button>
      </HStack>
      {codeError && (
        <Text fontSize="xs" color="status.loss">
          {codeError}
        </Text>
      )}
    </VStack>
  );
};

export default TournamentCodeSearch;
