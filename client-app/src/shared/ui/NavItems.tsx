import React, { useEffect } from "react";
import {
  Stack,
  Text,
  Icon,
  Separator,
  Box,
  Badge,
  VisuallyHidden,
} from "@chakra-ui/react";
import {
  FiHome,
  FiAward,
  FiBarChart2,
  FiUser,
  FiGithub,
  FiHelpCircle,
  FiLock,
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
  source: "Alt+8",
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
    } else if (to) {
      navigate(to);
    }
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
        color={isActive ? "blue.500" : "inherit"}
        aria-hidden="true"
      />
      {(!isPortrait || !isMobile) && (
        <Text
          fontSize="sm"
          fontWeight={isActive ? "semibold" : "normal"}
          color={isActive ? "blue.500" : "inherit"}
        >
          {children}
          {shortcut && (
            <Box
              as="span"
              fontSize="xs"
              color="gray.500"
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
    bg: isActive ? "gray.100" : "transparent",
    _dark: { bg: isActive ? "whiteAlpha.200" : "transparent" },
    borderRadius: "md",
    role: "button",
    tabIndex: 0,
    "aria-current": isActive ? ("page" as const) : undefined,
    _hover: {
      bg: "gray.100",
      _dark: { bg: "whiteAlpha.200" },
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
  if (to) {
    return (
      <Box as="div" onClick={() => navigate(to)} {...commonProps}>
        {content}
      </Box>
    );
  }

  // Default case (no link)
  return <Box {...commonProps}>{content}</Box>;
};

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
            event.preventDefault();
            window.open(
              "https://github.com/karanshukla/totalwarhammer-tournament-app",
              "_blank"
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
          <Badge size="sm" colorScheme="blue" ml={1}>
            Guest
          </Badge>
        )}
      </NavItem>
      {!isPortrait && (
        <>
          <Separator />
          <NavItem
            icon={FiHelpCircle}
            to="/contact"
            isActive={currentPath === "/contact"}
            isPortrait={isPortrait}
            isMobile={isMobile}
            shortcut={KEYBOARD_SHORTCUTS.help}
          >
            Get Help
          </NavItem>
          <NavItem
            icon={FiLock}
            to="/terms"
            isActive={currentPath === "/terms"}
            isPortrait={isPortrait}
            isMobile={isMobile}
            shortcut={KEYBOARD_SHORTCUTS.terms}
          >
            Terms of Use
          </NavItem>
          <NavItem
            icon={FiGithub}
            toExternal="https://github.com/karanshukla/totalwarhammer-tournament-app"
            isPortrait={isPortrait}
            isMobile={isMobile}
            shortcut={KEYBOARD_SHORTCUTS.source}
          >
            Source Code
          </NavItem>
          <Separator />
          <Box mt="auto" pb={4} w="full" textAlign="center">
            <Text fontSize="xs" color="gray.500">
              &copy; {new Date().getFullYear()} TW Tournament App. All rights
              reserved.
            </Text>
            <Text
              fontSize="xs"
              color="gray.500"
              mt={1}
              display={{ base: "none", md: "block" }}
            >
              This is a work in progress app. Thanks for trying it out!
            </Text>
          </Box>
        </>
      )}
    </Stack>
  );
};

export default NavItems;
