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
    <Flex direction="column" height="100vh" overflow="hidden">
      {/* Fixed Header */}
      <Flex
        as="header"
        position="sticky"
        top={0}
        h={HEADER_HEIGHT}
        py={3}
        px={4}
        align="center"
        justify="space-between"
        zIndex="docked"
        bg="chakra-body-bg"
        borderBottomWidth="1px"
        width="100%"
      >
        <Box
          w={!isPortrait ? NAVBAR_WIDTH_DESKTOP : "0"}
          transition="width 0.2s"
        />

        <Flex align={isMobile ? "flex-start" : "flex-center"} flex="1">
          {isPortrait ? (
            <>
              <Text>TW Tournament App</Text>
            </>
          ) : (
            <Text fontWeight="medium" textAlign="center" flex="1">
              Total Warhammer Tournament App{" "}
              {isUserGuest && (
                <Badge colorScheme="blue" ml={2}>
                  Guest Mode
                </Badge>
              )}
            </Text>
          )}
        </Flex>
        <HStack gap={2} w="130px" justify="flex-end">
          {isUserLoggedIn ? <LogoutButton /> : <RegisterLogin />}
          <ColorModeButton />
        </HStack>
      </Flex>

      {/* Main Content Area with Sidebar and Content */}
      <Flex flex="1" overflow="hidden">
        {/* Sidebar Nav - Fixed on Desktop, Bottom on Mobile */}
        <Box
          as="nav"
          position={isPortrait ? "fixed" : "sticky"}
          zIndex="base"
          bg="chakra-body-bg"
          transition="all 0.2s"
          {...(isPortrait
            ? {
                bottom: 0,
                left: 0,
                right: 0,
                width: "100%",
                height: NAVBAR_HEIGHT_MOBILE,
                borderTopWidth: "1px",
                py: 2,
                px: 4,
              }
            : {
                top: 0,
                h: `calc(100vh - ${HEADER_HEIGHT})`,
                w: NAVBAR_WIDTH_DESKTOP,
                borderRightWidth: "1px",
                py: 6,
                px: { base: 2, md: 4 },
                flexShrink: 0,
              })}
        >
          <NavItems
            isPortrait={isPortrait}
            isMobile={isMobile}
            currentPath={currentPath}
            isUserGuest={isUserGuest}
          />
        </Box>

        {/* Scrollable Content Area */}
        <Box
          flex="1"
          overflow="auto"
          pb={isPortrait ? NAVBAR_HEIGHT_MOBILE : 0}
        >
          {children}
        </Box>
      </Flex>
    </Flex>
  );
};

export default AppShell;
