import React from "react";
import {
  Stack,
  Text,
  Icon,
  Flex,
  Separator,
  Box,
  Badge,
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
import { useRouter } from "@/core/router/RouterContext";
import { LuSword } from "react-icons/lu";

type NavItemProps = {
  icon: React.ElementType;
  children: React.ReactNode;
  to?: string;
  isActive?: boolean;
  toExternal?: string;
  isPortrait: boolean;
  isMobile: boolean;
};

const NavItem = ({
  icon,
  children,
  to,
  isActive,
  toExternal,
  isPortrait,
  isMobile,
}: NavItemProps) => {
  const { navigate } = useRouter();

  return (
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
        toExternal ? window.open(toExternal, "_blank") : to && navigate(to)
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
  return (
    <Stack
      gap={4}
      direction={isPortrait ? "row" : "column"}
      align={isPortrait ? "center" : "flex-start"}
      justify={isPortrait ? "space-around" : "flex-start"}
      width="full"
      height="full"
    >
      <NavItem
        icon={FiHome}
        to="/"
        isActive={currentPath === "/"}
        isPortrait={isPortrait}
        isMobile={isMobile}
      >
        Home
      </NavItem>
      <NavItem
        icon={FiAward}
        to="/tournaments"
        isActive={currentPath === "/tournaments"}
        isPortrait={isPortrait}
        isMobile={isMobile}
      >
        Tournaments
      </NavItem>
      <NavItem
        icon={LuSword}
        to="/matches"
        isActive={currentPath === "/matches"}
        isPortrait={isPortrait}
        isMobile={isMobile}
      >
        Matches
      </NavItem>
      <NavItem
        icon={FiBarChart2}
        to="/statistics"
        isActive={currentPath === "/statistics"}
        isPortrait={isPortrait}
        isMobile={isMobile}
      >
        Statistics
      </NavItem>
      <NavItem
        icon={FiUser}
        to="/account"
        isActive={currentPath === "/account"}
        isPortrait={isPortrait}
        isMobile={isMobile}
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
          >
            Get Help
          </NavItem>
          <NavItem
            icon={FiLock}
            to="/terms"
            isActive={currentPath === "/terms"}
            isPortrait={isPortrait}
            isMobile={isMobile}
          >
            Terms of Use
          </NavItem>
          <NavItem
            icon={FiGithub}
            toExternal="https://github.com/karanshukla/totalwarhammer-tournament-app"
            isPortrait={isPortrait}
            isMobile={isMobile}
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
