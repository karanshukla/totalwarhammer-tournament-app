import React from "react";
import { Card, Heading, HStack, Icon } from "@chakra-ui/react";

interface PanelCardProps extends Omit<Card.RootProps, "title"> {
  title: React.ReactNode;
  icon?: React.ElementType;
  headerAside?: React.ReactNode;
  footer?: React.ReactNode;
  footerProps?: Card.FooterProps;
  children: React.ReactNode;
}

/** The standard panel surface every tournament and match card sits on. */
const PanelCard: React.FC<PanelCardProps> = ({
  title,
  icon,
  headerAside,
  footer,
  footerProps,
  children,
  ...rootProps
}) => (
  <Card.Root bg="bg.panel" borderColor="border" shadow="sm" {...rootProps}>
    <Card.Header>
      <HStack gap={2} justifyContent="space-between" alignItems="center">
        <HStack gap={2} minW={0}>
          {icon && <Icon as={icon} boxSize={4} color="fg.muted" />}
          <Heading size="md">{title}</Heading>
        </HStack>
        {headerAside}
      </HStack>
    </Card.Header>
    <Card.Body>{children}</Card.Body>
    {footer && <Card.Footer {...footerProps}>{footer}</Card.Footer>}
  </Card.Root>
);

export default PanelCard;
