import React, { useEffect } from "react";
import {
  Stack,
  Text,
  Icon,
  Separator,
  Box,
  Badge,
  VisuallyHidden,
  Popover,
  Portal,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import {
  FiHome,
  FiAward,
  FiBarChart2,
  FiUser,
  FiGithub,
  FiHelpCircle,
  FiLock,
  FiShield,
  FiMenu,
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { LuSword } from "react-icons/lu";

// Define keyboard shortcuts
const KEYBOARD_SHORTCUTS = {
  home: "Alt+1",
  tournaments: "Alt+2",
  matches: "Alt+3",
  statistics: "Alt+4",
  account: "Alt+5",
  help: "Alt+6",
  terms: "Alt+7",
  privacy: "Alt+8",
  source: "Alt+9",
};

type NavItemProps = {
  icon: React.ElementType;
  children: React.ReactNode;
  to?: string;
  isActive?: boolean;
  toExternal?: string;
  isPortrait: boolean;
  isMobile: boolean;
  shortcut?: string;
};

const NavItem: React.FC<NavItemProps> = ({
  icon,
  children,
  to,
  isActive,
  toExternal,
  isPortrait,
  isMobile,
  shortcut,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (toExternal) {
      window.open(toExternal, "_blank");
      return;
    }
    // Every rendered NavItem provides either `to` or `toExternal` (see the
    // unreachable fallthrough below), so `to` is always set here in practice.
    /* v8 ignore next */
    if (!to) return;
    navigate(to);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClick();
    }
  };

  const content = (
    <>
      <Icon
        as={icon}
        boxSize={5}
        mr={isPortrait ? 0 : 3}
        mb={isPortrait ? 1 : 0}
        color={isActive ? "info.text" : "inherit"}
        aria-hidden="true"
      />
      {(!isPortrait || !isMobile) && (
        <Text
          fontSize="sm"
          fontWeight={isActive ? "semibold" : "normal"}
          color={isActive ? "info.text" : "inherit"}
        >
          {children}
          {shortcut && (
            <Box
              as="span"
              fontSize="xs"
              color="fg.muted"
              ml={2}
              display={{ base: "none", md: "inline" }}
            >
              ({shortcut})
            </Box>
          )}
        </Text>
      )}
      {isPortrait && isMobile && <VisuallyHidden>{children}</VisuallyHidden>}
    </>
  );

  // Common props for both link and div
  const commonProps = {
    display: "flex",
    alignItems: "center",
    p: 2,
    cursor: "pointer",
    flexDirection: isPortrait ? "column" : "row",
    width: "full",
    bg: isActive ? "bg.muted" : "transparent",
    borderRadius: "md",
    role: "button",
    tabIndex: 0,
    "aria-current": isActive ? ("page" as const) : undefined,
    _hover: {
      bg: "bg.muted",
    },
    transition: "all 0.2s",
    onKeyDown: handleKeyDown,
  };

  // For external links
  if (toExternal) {
    return (
      <Box onClick={handleClick} {...commonProps}>
        {content}
      </Box>
    );
  }

  // For internal links with react-router
  // All NavItems in this file use `to` or `toExternal`, so the fallthrough
  // below (no link) is unreachable in practice — excluded from branch coverage.
  /* v8 ignore else */
  if (to) {
    return (
      <Box as="div" onClick={() => navigate(to)} {...commonProps}>
        {content}
      </Box>
    );
  }

  /* v8 ignore next */
  return <Box {...commonProps}>{content}</Box>;
};

interface NavItemsProps {
  isPortrait: boolean;
  isMobile: boolean;
  currentPath: string;
  isUserGuest: boolean;
}

// The links that don't fit in the mobile bottom tab bar (Help, Terms, Privacy,
// Source Code) plus the footer text. Rendered in the desktop sidebar and, on
// mobile, inside the burger overflow drawer — so both surfaces stay in sync.
const OverflowNavItems: React.FC<{ currentPath: string }> = ({
  currentPath,
}) => (
  <>
    <Separator />
    <NavItem
      icon={FiHelpCircle}
      to="/contact"
      isActive={currentPath === "/contact"}
      isPortrait={false}
      isMobile={false}
      shortcut={KEYBOARD_SHORTCUTS.help}
    >
      Get Help
    </NavItem>
    <NavItem
      icon={FiLock}
      to="/terms"
      isActive={currentPath === "/terms"}
      isPortrait={false}
      isMobile={false}
      shortcut={KEYBOARD_SHORTCUTS.terms}
    >
      Terms of Use
    </NavItem>
    <NavItem
      icon={FiShield}
      to="/privacy"
      isActive={currentPath === "/privacy"}
      isPortrait={false}
      isMobile={false}
      shortcut={KEYBOARD_SHORTCUTS.privacy}
    >
      Privacy Policy
    </NavItem>
    <NavItem
      icon={FiGithub}
      toExternal="https://github.com/karanshukla/totalwarhammer-tournament-app"
      isPortrait={false}
      isMobile={false}
      shortcut={KEYBOARD_SHORTCUTS.source}
    >
      Source Code
    </NavItem>
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey) {
        switch (event.key) {
          case "1":
            event.preventDefault();
            navigate("/");
            break;
          case "2":
            event.preventDefault();
            navigate("/tournaments");
            break;
          case "3":
            event.preventDefault();
            navigate("/matches");
            break;
          case "4":
            event.preventDefault();
            navigate("/statistics");
            break;
          case "5":
            event.preventDefault();
            navigate("/account");
            break;
          case "6":
            event.preventDefault();
            navigate("/contact");
            break;
          case "7":
            event.preventDefault();
            navigate("/terms");
            break;
          case "8":
            // Alt+8 = Privacy (see KEYBOARD_SHORTCUTS.privacy). Previously this
            // branch opened GitHub and Alt+9 (Source) was a dead binding — both
            // are corrected here so each shortcut matches its label.
            event.preventDefault();
            navigate("/privacy");
            break;
          case "9":
            event.preventDefault();
            window.open(
              "https://github.com/karanshukla/totalwarhammer-tournament-app",
              "_blank",
            );
            break;
          default:
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return (
    <Stack
      gap={4}
      direction={isPortrait ? "row" : "column"}
      align={isPortrait ? "center" : "flex-start"}
      justify={isPortrait ? "space-around" : "flex-start"}
      width="full"
      height="full"
      role="navigation"
      aria-label="Main Navigation"
    >
      <NavItem
        icon={FiHome}
        to="/"
        isActive={currentPath === "/"}
        isPortrait={isPortrait}
        isMobile={isMobile}
        shortcut={KEYBOARD_SHORTCUTS.home}
      >
        Home
      </NavItem>
      <NavItem
        icon={FiAward}
        to="/tournaments"
        isActive={currentPath === "/tournaments"}
        isPortrait={isPortrait}
        isMobile={isMobile}
        shortcut={KEYBOARD_SHORTCUTS.tournaments}
      >
        Tournaments
      </NavItem>
      <NavItem
        icon={LuSword}
        to="/matches"
        isActive={currentPath === "/matches"}
        isPortrait={isPortrait}
        isMobile={isMobile}
        shortcut={KEYBOARD_SHORTCUTS.matches}
      >
        Matches
      </NavItem>
      <NavItem
        icon={FiBarChart2}
        to="/statistics"
        isActive={currentPath === "/statistics"}
        isPortrait={isPortrait}
        isMobile={isMobile}
        shortcut={KEYBOARD_SHORTCUTS.statistics}
      >
        Statistics
      </NavItem>
      <NavItem
        icon={FiUser}
        to="/account"
        isActive={currentPath === "/account"}
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
        <Popover.Root
          open={isOverflowOpen}
          onOpenChange={(e) => !e.open && onOverflowClose()}
          positioning={{ placement: "top" }}
        >
          <Popover.Trigger asChild>
            <VStack
              gap={1}
              align="center"
              justify="center"
              flex="1"
              role="button"
              tabIndex={0}
              aria-label="Open more navigation options"
              aria-haspopup="dialog"
              aria-expanded={isOverflowOpen}
              cursor="pointer"
              borderRadius="md"
              px={2}
              py={1}
              color={isOverflowOpen ? "info.text" : "inherit"}
              bg={isOverflowOpen ? "bg.muted" : "transparent"}
              _hover={{ bg: "bg.muted" }}
              transition="all 0.2s"
              onClick={onOverflowOpen}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOverflowOpen();
                }
              }}
            >
              <Icon as={FiMenu} boxSize={5} aria-hidden="true" />
              <VisuallyHidden>More</VisuallyHidden>
            </VStack>
          </Popover.Trigger>
          <Portal>
            <Popover.Positioner>
              <Popover.Content w="240px">
                <Popover.Arrow>
                  <Popover.ArrowTip />
                </Popover.Arrow>
                <Popover.Body p={2}>
                  <Stack
                    gap={1}
                    direction="column"
                    onClick={() => onOverflowClose()}
                  >
                    <NavItem
                      icon={FiHelpCircle}
                      to="/contact"
                      isActive={currentPath === "/contact"}
                      isPortrait={false}
                      isMobile={false}
                    >
                      Get Help
                    </NavItem>
                    <NavItem
                      icon={FiLock}
                      to="/terms"
                      isActive={currentPath === "/terms"}
                      isPortrait={false}
                      isMobile={false}
                    >
                      Terms of Use
                    </NavItem>
                    <NavItem
                      icon={FiShield}
                      to="/privacy"
                      isActive={currentPath === "/privacy"}
                      isPortrait={false}
                      isMobile={false}
                    >
                      Privacy Policy
                    </NavItem>
                    <NavItem
                      icon={FiGithub}
                      toExternal="https://github.com/karanshukla/totalwarhammer-tournament-app"
                      isPortrait={false}
                      isMobile={false}
                    >
                      Source Code
                    </NavItem>
                    <Separator my={1} />
                    <Text
                      fontSize="xs"
                      color="fg.muted"
                      textAlign="center"
                      px={2}
                    >
                      &copy; {new Date().getFullYear()} TW Tournament App.
                    </Text>
                  </Stack>
                </Popover.Body>
              </Popover.Content>
            </Popover.Positioner>
          </Portal>
        </Popover.Root>
      )}
    </Stack>
  );
};

export default NavItems;
