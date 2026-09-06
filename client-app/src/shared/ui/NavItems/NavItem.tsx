import React from "react";
import { Box, Icon, Text, VisuallyHidden, chakra } from "@chakra-ui/react";
import { Link } from "react-router";
import { isNavPathActive } from "./navRoutes";

const RouterLink = chakra(Link);

export interface NavItemProps {
  icon: React.ElementType;
  children: React.ReactNode;
  to?: string;
  currentPath: string;
  toExternal?: string;
  isPortrait: boolean;
  isMobile: boolean;
  shortcut?: string;
}

export const NavItem: React.FC<NavItemProps> = ({
  icon,
  children,
  to,
  currentPath,
  toExternal,
  isPortrait,
  isMobile,
  shortcut,
}) => {
  const isActive = !!to && isNavPathActive(currentPath, to);

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

  const commonProps = {
    display: "flex",
    alignItems: "center",
    p: 2,
    cursor: "pointer",
    flexDirection: isPortrait ? "column" : "row",
    width: "full",
    bg: isActive ? "bg.muted" : "transparent",
    borderRadius: "md",
    "aria-current": isActive ? ("page" as const) : undefined,
    _hover: {
      bg: "bg.muted",
    },
    transition: "all 0.2s",
  };

  if (toExternal) {
    return (
      <chakra.a
        href={toExternal}
        target="_blank"
        rel="noopener noreferrer"
        {...commonProps}
      >
        {content}
        <VisuallyHidden>(opens in a new tab)</VisuallyHidden>
      </chakra.a>
    );
  }

  // All NavItems in this file use `to` or `toExternal`, so the fallthrough
  // below (no link) is unreachable in practice — excluded from branch coverage.
  /* v8 ignore else */
  if (to) {
    return (
      <RouterLink to={to} {...commonProps}>
        {content}
      </RouterLink>
    );
  }

  /* v8 ignore next */
  return <Box {...commonProps}>{content}</Box>;
};
