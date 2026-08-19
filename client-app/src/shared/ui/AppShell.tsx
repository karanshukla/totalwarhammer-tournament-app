import React, { useEffect, useRef } from "react";
import {
  Box,
  useMediaQuery,
  Text,
  Flex,
  HStack,
  Badge,
  SkipNavLink,
} from "@chakra-ui/react";
import { ColorModeButton } from "@/shared/ui/ColorMode";
import { useLocation } from "react-router";
import { useUserStore } from "../stores/userStore";
import { RegisterLogin } from "@/features/authentication/components/RegisterLogin";
import { LogoutButton } from "@/features/authentication/components/LogoutButton";
import NavItems from "./NavItems";

interface AppShellProps {
  children: React.ReactNode;
}

const MAIN_CONTENT_ID = "main-content";
const HEADER_HEIGHT = "60px";
const NAVBAR_WIDTH_DESKTOP = { base: "70px", md: "250px" };
const NAVBAR_HEIGHT_MOBILE = "70px";

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [isPortrait] = useMediaQuery([
    "(orientation: portrait) and (max-width: 768px)",
  ]);
  const [isMobile] = useMediaQuery(["(max-width: 768px)"]);
  const location = useLocation();
  const currentPath = location.pathname;
  const mainRef = useRef<HTMLDivElement>(null);

  // <main> is the scroll container, not the window, so React Router's own
  // scroll behaviour doesn't apply and nothing reset it — navigating from a
  // scrolled-down page dropped you mid-way through the next one. Moving focus
  // here also announces the change and puts keyboard users at the new content
  // rather than back in the sidebar.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [currentPath]);

  const userStore = useUserStore();
  const user = userStore.user;
  const isUserLoggedIn = Boolean(user.isAuthenticated);
  const isUserGuest = Boolean(user.isGuest);

  return (
    <Flex
      direction="column"
      h="100dvh"
      overflow="hidden"
      position="fixed"
      inset={0}
    >
      {/* The header below owns a stacking context, so the skip link needs an
          explicit z-index to surface above it once focused. */}
      <SkipNavLink
        id={MAIN_CONTENT_ID}
        zIndex={2000}
        bg="bg.elevated"
        color="fg.primary"
        borderWidth="1px"
        borderColor="border.emphasized"
      >
        Skip to main content
      </SkipNavLink>

      {/* Header — always at top, never scrolls */}
      <Flex
        as="header"
        h={HEADER_HEIGHT}
        py={3}
        px={4}
        align="center"
        justify="space-between"
        zIndex="sticky"
        bg="chakra-body-bg"
        borderBottomWidth="1px"
        flexShrink={0}
      >
        {!isPortrait && (
          <Box
            w={NAVBAR_WIDTH_DESKTOP}
            flexShrink={0}
            transition="width 0.2s"
          />
        )}

        <Flex
          align="center"
          gap={2}
          flex="1"
          justify={isPortrait ? "flex-start" : "center"}
        >
          <Box flexShrink={0} _light={{ display: "none" }}>
            <img
              src="/logo.svg"
              alt=""
              height="32"
              width="32"
              aria-hidden="true"
            />
          </Box>
          <Box flexShrink={0} _dark={{ display: "none" }}>
            <img
              src="/logo-light.svg"
              alt=""
              height="32"
              width="32"
              aria-hidden="true"
            />
          </Box>
          <Text fontWeight="medium" color="gold.text">
            {isPortrait ? "TW Tournament" : "Total Warhammer Tournament App"}
          </Text>
          {isUserGuest && !isPortrait && (
            <Badge colorPalette="ink">Guest Mode</Badge>
          )}
        </Flex>

        <HStack gap={2} justify="flex-end" flexShrink={0}>
          {isUserLoggedIn ? <LogoutButton /> : <RegisterLogin />}
          <ColorModeButton />
        </HStack>
      </Flex>

      {/* Body row: sidebar + scrollable content */}
      <Flex flex="1" minH={0}>
        {/* Sidebar — desktop only */}
        {!isPortrait && (
          <Box
            as="nav"
            aria-label="Main"
            w={NAVBAR_WIDTH_DESKTOP}
            flexShrink={0}
            bg="chakra-body-bg"
            borderRightWidth="1px"
            py={6}
            px={{ base: 2, md: 4 }}
            overflowY="auto"
          >
            <NavItems
              isPortrait={false}
              isMobile={isMobile}
              currentPath={currentPath}
              isUserGuest={isUserGuest}
            />
          </Box>
        )}

        {/* Scrollable content — fills remaining space exactly */}
        <Box
          as="main"
          id={MAIN_CONTENT_ID}
          ref={mainRef}
          tabIndex={-1}
          flex="1"
          overflowY="auto"
          overflowX="hidden"
          minW={0}
        >
          {children}
        </Box>
      </Flex>

      {/* Bottom nav — portrait mobile only, always at bottom, never overlaps */}
      {isPortrait && (
        <Box
          as="nav"
          aria-label="Main"
          flexShrink={0}
          h={NAVBAR_HEIGHT_MOBILE}
          bg="chakra-body-bg"
          borderTopWidth="1px"
          py={2}
          px={4}
          css={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <NavItems
            isPortrait={true}
            isMobile={isMobile}
            currentPath={currentPath}
            isUserGuest={isUserGuest}
          />
        </Box>
      )}
    </Flex>
  );
};

export default AppShell;
