import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, Flex, Text } from "@chakra-ui/react";
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

  const hoverBg = "bg.subtle";

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      py={1}
      px={2}
      borderRadius="sm"
      bg={isDragging ? "info.subtle" : "transparent"}
      _hover={{ bg: hoverBg }}
      cursor="grab"
      height="100%"
      maxWidth="calc(100% - 80px)" // Space for the edit/delete buttons
    >
      <Flex align="center" height="100%">
        <Text fontWeight="medium" fontSize="sm" lineClamp={1} flex="1">
          {participant.name}
        </Text>
        <Text fontSize="xs" color="fg.muted" lineClamp={1} ml={2}>
          {participant.faction}
        </Text>
      </Flex>
    </Box>
  );
}
