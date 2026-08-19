import React from "react";
import { Box, Flex } from "@chakra-ui/react";

interface SidebarLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

// The sidebar tracks the scroll rather than leaving a column of dead canvas
// beside the (much taller) match list.
const SidebarLayout: React.FC<SidebarLayoutProps> = ({ sidebar, children }) => (
  <Flex
    direction={{ base: "column", lg: "row" }}
    alignItems="flex-start"
    gap={6}
  >
    <Flex direction="column" gap={6} flex="1" minW={0} w="full">
      {children}
    </Flex>
    <Flex
      direction="column"
      gap={6}
      w={{ base: "full", lg: "22rem" }}
      flexShrink={0}
      order={{ base: -1, lg: 0 }}
      position={{ lg: "sticky" }}
      top={0}
      maxH={{ lg: "calc(100dvh - 6rem)" }}
      overflowY={{ lg: "auto" }}
    >
      {sidebar}
    </Flex>
  </Flex>
);

export default SidebarLayout;
