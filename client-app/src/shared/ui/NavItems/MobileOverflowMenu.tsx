import React from "react";
import {
  Icon,
  Popover,
  Portal,
  Separator,
  Stack,
  Text,
  VisuallyHidden,
  chakra,
} from "@chakra-ui/react";
import { FiMenu } from "react-icons/fi";
import { NavItem } from "./NavItem";
import { OVERFLOW_NAV_ENTRIES } from "./navEntries";

interface MobileOverflowMenuProps {
  currentPath: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

/** The burger-triggered popover holding the overflow links on the portrait bottom tab bar. */
export const MobileOverflowMenu: React.FC<MobileOverflowMenuProps> = ({
  currentPath,
  open,
  onOpen,
  onClose,
}) => (
  <Popover.Root
    open={open}
    onOpenChange={(e) => !e.open && onClose()}
    positioning={{ placement: "top" }}
  >
    <Popover.Trigger asChild>
      <chakra.button
        type="button"
        display="flex"
        flexDirection="column"
        gap={1}
        alignItems="center"
        justifyContent="center"
        flex="1"
        aria-label="Open more navigation options"
        cursor="pointer"
        borderRadius="md"
        px={2}
        py={1}
        color={open ? "info.text" : "inherit"}
        bg={open ? "bg.muted" : "transparent"}
        _hover={{ bg: "bg.muted" }}
        transition="all 0.2s"
        onClick={onOpen}
      >
        <Icon as={FiMenu} boxSize={5} aria-hidden="true" />
        <VisuallyHidden>More</VisuallyHidden>
      </chakra.button>
    </Popover.Trigger>
    <Portal>
      <Popover.Positioner>
        <Popover.Content w="240px">
          <Popover.Arrow>
            <Popover.ArrowTip />
          </Popover.Arrow>
          <Popover.Body p={2}>
            <Stack gap={1} direction="column" onClick={() => onClose()}>
              {OVERFLOW_NAV_ENTRIES.map((entry) => (
                <NavItem
                  key={entry.label}
                  icon={entry.icon}
                  to={entry.to}
                  toExternal={entry.toExternal}
                  currentPath={currentPath}
                  isPortrait={false}
                  isMobile={false}
                >
                  {entry.label}
                </NavItem>
              ))}
              <Separator my={1} />
              <Text fontSize="xs" color="fg.muted" textAlign="center" px={2}>
                &copy; {new Date().getFullYear()} TW Tournament App.
              </Text>
            </Stack>
          </Popover.Body>
        </Popover.Content>
      </Popover.Positioner>
    </Portal>
  </Popover.Root>
);
