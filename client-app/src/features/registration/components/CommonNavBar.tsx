import React, { useEffect, useState } from "react";
import {
  Box,
  useMediaQuery,
  Stack,
  Text,
  Icon,
  Flex,
  Separator,
} from "@chakra-ui/react";
import {
  FiHome,
  FiAward,
  FiBarChart2,
  FiUser,
  FiLogOut,
  FiGithub,
} from "react-icons/fi";
import { BsEnvelope } from "react-icons/bs";

const CommonNavBar: React.FC = () => {
  const [isPortraitQuery] = useMediaQuery([
    "(orientation: portrait) and (max-width: 768px)",
  ]);
  const [isMobileQuery] = useMediaQuery(["(max-width: 768px)"]);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsPortrait(isPortraitQuery);
    setIsMobile(isMobileQuery);
  }, [isPortraitQuery, isMobileQuery]);

  const NavItem = ({
    icon,
    children,
  }: {
    icon: React.ElementType | any;
    children: React.ReactNode;
  }) => {
    return (
      <Flex
        align="center"
        p="2"
        role="group"
        cursor="pointer"
        direction={isPortrait ? "column" : "row"}
        justify="flex-start"
        width="full"
      >
        <Icon
          as={icon}
          boxSize={5}
          mr={isPortrait ? 0 : 3}
          mb={isPortrait ? 1 : 0}
        />
        {(!isPortrait || !isMobile) && <Text fontSize="sm">{children}</Text>}
      </Flex>
    );
  };

  return (
    <Box
      as="nav"
      position="fixed"
      zIndex={10}
      {...(isPortrait
        ? {
            bottom: 0,
            left: 0,
            right: 0,
            width: "100%",
            height: "70px",
            borderTopWidth: "1px",
            py: 2,
            px: 4,
          }
        : {
            left: 0,
            top: 0,
            h: "100vh",
            w: { base: "70px", md: "250px" },
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
        pt={!isPortrait ? 4 : 0}
      >
        <NavItem icon={FiHome}>Home</NavItem>
        <NavItem icon={FiAward}>Tournaments</NavItem>
        <NavItem icon={FiBarChart2}>Statistics</NavItem>
        <NavItem icon={FiUser}>Account</NavItem>
        {!isPortrait && (
          <>
            <Separator />
            <NavItem icon={FiGithub}>Source Code</NavItem>
            <NavItem icon={BsEnvelope}>Support</NavItem>
            <NavItem icon={FiLogOut}>Go to Total Tavern</NavItem>
            <Separator />
            <Box textAlign="center">
              <Text fontSize="xs" color="gray.500" textAlign="center">
                &copy; {new Date().getFullYear()} TW Tournament App. All rights
                reserved.
              </Text>
              <Text fontSize="xs" color="gray.500" textAlign="center" mt={1}>
                This is a work in progress app. Thanks for trying it out!
              </Text>
            </Box>
          </>
        )}
      </Stack>
    </Box>
  );
};

export default CommonNavBar;
