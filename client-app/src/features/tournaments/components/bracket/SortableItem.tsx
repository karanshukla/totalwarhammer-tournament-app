import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, Flex, Text } from "@chakra-ui/react";
import { useColorModeValue } from "@/shared/ui/ColorMode";
import { Participant } from "./types";

interface SortableItemProps {
  id: string;
  participant: Participant;
}

export function SortableItem({ id, participant }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const hoverBg = useColorModeValue("gray.50", "gray.600");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      py={0.5}
      px={2}
      borderRadius="sm"
      bg={isDragging ? "blue.50" : "transparent"}
      _dark={{ bg: isDragging ? "blue.900" : "transparent" }}
      _hover={{ bg: hoverBg }}
      cursor="grab"
      boxShadow={isDragging ? "sm" : "none"}
      width="auto"
      height="24px"
      maxWidth="calc(100% - 90px)" // Space for the edit/delete buttons
    >
      <Flex justifyContent="space-between" alignItems="center" height="100%">
        <Text fontWeight="medium" fontSize="xs" noOfLines={1}>
          {participant.name}
        </Text>
        <Text
          fontSize="2xs"
          color="gray.500"
          noOfLines={1}
          ml={2}
          flexShrink={0}
        >
          {participant.faction}
        </Text>
      </Flex>
    </Box>
  );
}
