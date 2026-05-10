import React, { useState } from "react";
import { Button, Text, VStack, HStack, Box } from "@chakra-ui/react";
import { LuTriangleAlert } from "react-icons/lu";
import { deleteAccount } from "../api/accountApi";
import { useNavigate } from "react-router-dom";

const DeleteAccountSection: React.FC = () => {
  const [confirming, setConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteAccount();
      navigate("/");
    } catch {
      setIsLoading(false);
    }
  };

  if (!confirming) {
    return (
      <Button
        colorPalette="red"
        variant="subtle"
        size="sm"
        onClick={() => setConfirming(true)}
      >
        Delete Account
      </Button>
    );
  }

  return (
    <Box
      p={4}
      borderRadius="md"
      borderWidth={1}
      borderColor="red.muted"
      bg="red.subtle"
    >
      <VStack align="start" gap={3}>
        <HStack gap={2} color="red.fg">
          <LuTriangleAlert size={16} />
          <Text fontWeight="semibold" fontSize="sm">
            Are you sure?
          </Text>
        </HStack>
        <Text fontSize="sm" color="red.fg">
          Your login access will be removed. Tournament and match data you
          created will remain but will no longer be linked to your name.
        </Text>
        <HStack gap={2}>
          <Button
            colorPalette="red"
            size="sm"
            loading={isLoading}
            onClick={handleDelete}
          >
            Yes, delete my account
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default DeleteAccountSection;
