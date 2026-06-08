import React from "react";
import {
  Box,
  useMediaQuery,
  Text,
  Flex,
  HStack,
  Badge,
} from "@chakra-ui/react";
import { ColorModeButton } from "@/shared/ui/ColorMode";
import { useLocation } from "react-router-dom";
import { useUserStore } from "../stores/userStore";
import { RegisterLogin } from "@/features/authentication/components/RegisterLogin";
import { LogoutButton } from "@/features/authentication/components/LogoutButton";
import NavItems from "./NavItems";

interface AppShellProps {
  children: React.ReactNode;
}

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

        <Flex align="center" flex="1">
          <Text
            fontWeight="medium"
            textAlign={isPortrait ? "left" : "center"}
            flex="1"
            color="gold.text"
          >
            {isPortrait ? "TW Tournament" : "Total Warhammer Tournament App"}
            {isUserGuest && !isPortrait && (
              <Badge colorPalette="ink" ml={2}>
                Guest Mode
              </Badge>
            )}
          </Text>
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
        <Box flex="1" overflowY="auto" overflowX="hidden" minW={0}>
          {children}
        </Box>
      </Flex>

      {/* Bottom nav — portrait mobile only, always at bottom, never overlaps */}
      {isPortrait && (
        <Box
          as="nav"
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
