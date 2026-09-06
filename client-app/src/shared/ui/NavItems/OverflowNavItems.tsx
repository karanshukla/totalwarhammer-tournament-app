import React from "react";
import { Box, Separator, Text } from "@chakra-ui/react";
import { NavItem } from "./NavItem";
import { OVERFLOW_NAV_ENTRIES } from "./navEntries";

interface OverflowNavItemsProps {
  currentPath: string;
}

// The links that don't fit in the mobile bottom tab bar (Help, Terms, Privacy,
// Source Code) plus the footer text. Rendered in the desktop sidebar; the
// mobile equivalent lives in MobileOverflowMenu so both surfaces stay in sync.
export const OverflowNavItems: React.FC<OverflowNavItemsProps> = ({
  currentPath,
}) => (
  <>
    <Separator />
    {OVERFLOW_NAV_ENTRIES.map((entry) => (
      <NavItem
        key={entry.label}
        icon={entry.icon}
        to={entry.to}
        toExternal={entry.toExternal}
        currentPath={currentPath}
        isPortrait={false}
        isMobile={false}
        shortcut={entry.shortcut}
      >
        {entry.label}
      </NavItem>
    ))}
    <Separator />
    <Box mt="auto" pb={4} w="full" textAlign="center">
      <Text fontSize="xs" color="fg.muted">
        &copy; {new Date().getFullYear()} TW Tournament App. All rights
        reserved.
      </Text>
      <Text
        fontSize="xs"
        color="fg.muted"
        mt={1}
        display={{ base: "none", md: "block" }}
      >
        This is a work in progress app. Thanks for trying it out!
      </Text>
    </Box>
  </>
);
