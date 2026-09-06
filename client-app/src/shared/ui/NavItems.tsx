import React from "react";
import { Badge, Stack, useDisclosure } from "@chakra-ui/react";
import { FiUser } from "react-icons/fi";
import { useNavigate } from "react-router";
import { NavItem } from "./NavItems/NavItem";
import { OverflowNavItems } from "./NavItems/OverflowNavItems";
import { MobileOverflowMenu } from "./NavItems/MobileOverflowMenu";
import { PRIMARY_NAV_ENTRIES } from "./NavItems/navEntries";
import { useNavKeyboardShortcuts } from "./NavItems/useNavKeyboardShortcuts";
import { KEYBOARD_SHORTCUTS } from "./keyboardShortcuts";

interface NavItemsProps {
  isPortrait: boolean;
  isMobile: boolean;
  currentPath: string;
  isUserGuest: boolean;
}

const NavItems: React.FC<NavItemsProps> = ({
  isPortrait,
  isMobile,
  currentPath,
  isUserGuest,
}) => {
  const navigate = useNavigate();
  const {
    open: isOverflowOpen,
    onOpen: onOverflowOpen,
    onClose: onOverflowClose,
  } = useDisclosure();

  useNavKeyboardShortcuts(navigate);

  return (
    <Stack
      gap={4}
      direction={isPortrait ? "row" : "column"}
      align={isPortrait ? "center" : "flex-start"}
      justify={isPortrait ? "space-around" : "flex-start"}
      width="full"
      height="full"
    >
      {PRIMARY_NAV_ENTRIES.map((entry) => (
        <NavItem
          key={entry.to}
          icon={entry.icon}
          to={entry.to}
          currentPath={currentPath}
          isPortrait={isPortrait}
          isMobile={isMobile}
          shortcut={entry.shortcut}
        >
          {entry.label}
        </NavItem>
      ))}
      <NavItem
        icon={FiUser}
        to="/account"
        currentPath={currentPath}
        isPortrait={isPortrait}
        isMobile={isMobile}
        shortcut={KEYBOARD_SHORTCUTS.account}
      >
        Account
        {isUserGuest && isPortrait && (
          <Badge size="sm" colorPalette="ink" ml={1}>
            Guest
          </Badge>
        )}
      </NavItem>
      {!isPortrait && <OverflowNavItems currentPath={currentPath} />}
      {isPortrait && (
        <MobileOverflowMenu
          currentPath={currentPath}
          open={isOverflowOpen}
          onOpen={onOverflowOpen}
          onClose={onOverflowClose}
        />
      )}
    </Stack>
  );
};

export default NavItems;
