import React, { useState } from "react";
import {
  Container,
  VStack,
  Button,
  Input,
  Card,
  Field,
  Text,
  Stack,
} from "@chakra-ui/react";
import { LuSearch, LuUsers } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { httpClient } from "@/core/api/httpClient";

const HomePage: React.FC = () => {
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const navigate = useNavigate();

  const handleFindByCode = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setCodeLoading(true);
    setCodeError(null);
    try {
      const res = (await httpClient.get(`/tournament/code/${trimmed}`)) as {
        success: boolean;
        data: { _id: string };
      };
      navigate(`/tournament/${res.data._id}`);
    } catch {
      setCodeError("No tournament found with that code.");
    } finally {
      setCodeLoading(false);
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={8} align="stretch">
        {/* Hero Section */}
        <Card.Root variant="outline">
          <Card.Body py={8}>
            <Text fontSize="xl" textAlign="center" lineHeight="relaxed">
              Create custom brackets, participate in Total War Warhammer 3
              tournaments within the multiplayer community, and view statistics
              for recorded matchups.
            </Text>
          </Card.Body>
        </Card.Root>

        {/* Tournament Lookup Section - Card with outline variant */}
        <Card.Root variant="outline">
          <Card.Header>
            <Card.Title>
              <Stack direction="row" gap={2} align="center">
                <LuSearch />
                View Tournament
              </Stack>
            </Card.Title>
            <Card.Description>
              Enter a tournament code to view an ongoing tournament
            </Card.Description>
          </Card.Header>
          <Card.Body>
            <Field.Root invalid={!!codeError}>
              <Field.Label>Tournament Code</Field.Label>
              <Input
                placeholder="e.g., ABC123"
                value={code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCode(e.target.value)
                }
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                  e.key === "Enter" && handleFindByCode()
                }
                fontFamily="mono"
                textTransform="uppercase"
              />
              {codeError ? (
                <Field.ErrorText>{codeError}</Field.ErrorText>
              ) : (
                <Field.HelperText>
                  Enter the code provided by the tournament organizer
                </Field.HelperText>
              )}
            </Field.Root>
          </Card.Body>
          <Card.Footer>
            <Button
              colorPalette="blue"
              size="lg"
              onClick={handleFindByCode}
              loading={codeLoading}
            >
              View Tournament
            </Button>
          </Card.Footer>
        </Card.Root>

        {/* Account Info Section - Subtle variant card */}
        <Card.Root variant="subtle">
          <Card.Header>
            <Card.Title>
              <Stack direction="row" gap={2} align="center">
                <LuUsers />
                Getting Started
              </Stack>
            </Card.Title>
          </Card.Header>
          <Card.Body>
            <VStack gap={4} align="stretch">
              <Text>
                <strong>Create a tournament:</strong> Register an account and
                login to access the tournament creation page.
              </Text>
              <Text>
                <strong>Participate in a tournament:</strong> Create a guest
                account and customize your username.
              </Text>
              <Text color="fg.muted" fontSize="sm">
                Guest accounts are limited to viewing tournaments and
                participating in matches. To create a tournament, you must
                register a full account.
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Container>
  );
};

export default HomePage;
