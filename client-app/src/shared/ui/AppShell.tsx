import React from "react";
import {
  Box,
  useMediaQuery,
  Stack,
  Text,
  Icon,
  Flex,
  Separator,
  Button,
  HStack,
} from "@chakra-ui/react";
import {
  FiHome,
  FiAward,
  FiBarChart2,
  FiUser,
  FiLogOut,
  FiGithub,
  FiHelpCircle,
  FiLock,
} from "react-icons/fi";
import { BsEnvelope } from "react-icons/bs";
import { ColorModeButton } from "@/shared/ui/color-mode";
import { useRouter } from "@/core/router/RouterContext";
import { useUserStore } from "../stores/userStore";

interface AppShellProps {
  children: React.ReactNode;
}

const HEADER_HEIGHT = "60px";
const NAVBAR_WIDTH_DESKTOP = { base: "70px", md: "250px" };
const NAVBAR_HEIGHT_MOBILE = "70px";

type NavItemProps = {
  icon: React.ElementType;
  children: React.ReactNode;
  to?: string;
  isActive?: boolean;
  toExternal?: string;
};

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [isPortrait] = useMediaQuery([
    "(orientation: portrait) and (max-width: 768px)",
  ]);
  const [isMobile] = useMediaQuery(["(max-width: 768px)"]);
  const { currentPath, navigate } = useRouter();

  const NavItem = ({
    icon,
    children,
    to,
    isActive = currentPath === to,
    toExternal,
  }: NavItemProps) => (
    <Flex
      align="center"
      p="2"
      cursor="pointer"
      direction={isPortrait ? "column" : "row"}
      width="full"
      bg={isActive ? "gray.100" : "transparent"}
      _dark={{ bg: isActive ? "whiteAlpha.200" : "transparent" }}
      borderRadius="md"
      onClick={() =>
        toExternal ? window.open(toExternal, "_blank") : navigate(to)
      }
      role="group"
      _hover={{
        bg: "gray.100",
        _dark: { bg: "whiteAlpha.200" },
      }}
      transition="all 0.2s"
    >
      <Icon
        as={icon}
        boxSize={5}
        mr={isPortrait ? 0 : 3}
        mb={isPortrait ? 1 : 0}
        color={isActive ? "blue.500" : "inherit"}
      />
      {(!isPortrait || !isMobile) && (
        <Text
          fontSize="sm"
          fontWeight={isActive ? "semibold" : "normal"}
          color={isActive ? "blue.500" : "inherit"}
        >
          {children}
        </Text>
      )}
    </Flex>
  );

  const user = useUserStore((state) => state.user);
  const isAuthenticated = () => {
    return user && user.id !== "" && user.email !== "";
  };
  const logout = () => {
    document.cookie = "jwt=; path=/; max-age=0; secure; samesite=strict";
    const { setUser } = useUserStore.getState();
    setUser({ id: "", email: "" });
    navigate("/");
  };

  return (
    <Box>
      <Flex
        as="header"
        position="fixed"
        top={0}
        left={0}
        right={0}
        h={HEADER_HEIGHT}
        py={3}
        px={4}
        align="center"
        justify="space-between"
        zIndex="docked"
        bg="chakra-body-bg"
        borderBottomWidth="1px"
      >
        <Box
          w={!isPortrait ? NAVBAR_WIDTH_DESKTOP : "0"}
          transition="width 0.2s"
        />

        <Flex align={isMobile ? "flex-start" : "flex-center"} flex="1">
          {isPortrait ? (
            <>
              <Text>TWTA</Text>
            </>
          ) : (
            <Text fontWeight="medium" textAlign="center" flex="1">
              Total Warhammer Tournament App
            </Text>
          )}
        </Flex>
        <HStack gap={2} w="130px" justify="flex-end">
          {isAuthenticated() ? (
            <Button variant="outline" size="sm" onClick={() => logout()}>
              <Icon as={FiLogOut} boxSize={4} mr={2} /> Logout
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/registerLogin")}
            >
              Register/Login
            </Button>
          )}
          <ColorModeButton />
        </HStack>
      </Flex>

      <Box
        as="nav"
        position="fixed"
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
              left: 0,
              top: HEADER_HEIGHT,
              h: `calc(100vh - ${HEADER_HEIGHT})`,
              w: NAVBAR_WIDTH_DESKTOP,
              borderRightWidth: "1px",
              py: 6,
              px: { base: 2, md: 4 },
            })}
      >
        <Stack
          gap={4}
          direction={isPortrait ? "row" : "column"}
          align={isPortrait ? "center" : "flex-start"}
          justify={isPortrait ? "space-around" : "flex-start"}
          width="full"
          height="full"
        >
          <NavItem icon={FiHome} to="/">
            Home
          </NavItem>
          <NavItem icon={FiAward} to="/tournaments">
            Tournaments
          </NavItem>
          <NavItem icon={FiBarChart2} to="/statistics">
            Statistics
          </NavItem>
          <NavItem icon={FiUser} to="/account">
            Account
          </NavItem>
          {!isPortrait && (
            <>
              <Separator />
              <NavItem icon={FiHelpCircle} to="/contact">
                Get Help
              </NavItem>
              <NavItem icon={FiLock} to="/security">
                Security
              </NavItem>
              <NavItem
                icon={FiGithub}
                toExternal="https://github.com/karanshukla/totalwarhammer-tournament-app"
              >
                Source Code
              </NavItem>
              <Separator />
              <Box mt="auto" pb={4} w="full" textAlign="center">
                <Text fontSize="xs" color="gray.500">
                  &copy; {new Date().getFullYear()} TW Tournament App. All
                  rights reserved.
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
      </Box>

      <Box
        pt={HEADER_HEIGHT}
        pl={!isPortrait ? NAVBAR_WIDTH_DESKTOP : 0}
        pb={isPortrait ? NAVBAR_HEIGHT_MOBILE : 0}
        transition="all 0.2s"
        minH="100vh"
      >
        {children}
      </Box>
    </Box>
  );
};

export default AppShell;
