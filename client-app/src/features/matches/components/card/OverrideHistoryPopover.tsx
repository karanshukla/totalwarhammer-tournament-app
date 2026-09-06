import React from "react";
import {
  Box,
  Button,
  Popover,
  Portal,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuTriangleAlert } from "react-icons/lu";
import { displayName as dn } from "@/shared/utils/displayName";
import type { Match } from "@/shared/tournament/types";

interface OverrideHistoryPopoverProps {
  match: Match;
}

const OverrideHistoryPopover: React.FC<OverrideHistoryPopoverProps> = ({
  match,
}) => (
  <Popover.Root>
    <Popover.Trigger asChild>
      <Button
        size="xs"
        variant="ghost"
        color="gold.text"
        _hover={{ bg: "gold.subtle" }}
        px={1}
        minW="auto"
        height="auto"
        py="1px"
      >
        <LuTriangleAlert />
        {match.resultOverrides.length > 1
          ? `${match.resultOverrides.length}× `
          : ""}
        Overridden
      </Button>
    </Popover.Trigger>
    <Portal>
      <Popover.Positioner>
        <Popover.Content maxW="300px">
          <Popover.Arrow>
            <Popover.ArrowTip />
          </Popover.Arrow>
          <Popover.Body p={3}>
            <VStack gap={2} alignItems="stretch">
              <Text
                fontSize="xs"
                fontWeight="bold"
                fontFamily="cond"
                color="fg.secondary"
                textTransform="uppercase"
                letterSpacing="wide"
              >
                Result Override History
              </Text>
              {match.resultOverrides.map((override, index) => {
                const newWinnerName =
                  override.newWinnerId === match.player1.participantId
                    ? dn(match.player1.name)
                    : dn(match.player2.name);
                return (
                  <Box key={index}>
                    {index > 0 && <Separator mb={2} />}
                    <Text fontSize="xs" color="fg.primary">
                      Winner set to{" "}
                      <Text as="span" fontWeight="bold">
                        {newWinnerName}
                      </Text>
                    </Text>
                    <Text
                      fontSize="xs"
                      color="fg.muted"
                      fontStyle={override.reason ? "italic" : "normal"}
                      mt="2px"
                    >
                      {override.reason
                        ? `"${override.reason}"`
                        : "No reason provided"}
                    </Text>
                    <Text fontSize="2xs" color="fg.muted" mt="2px">
                      {new Date(override.overriddenAt).toLocaleString()}
                    </Text>
                  </Box>
                );
              })}
            </VStack>
          </Popover.Body>
        </Popover.Content>
      </Popover.Positioner>
    </Portal>
  </Popover.Root>
);

export default OverrideHistoryPopover;
