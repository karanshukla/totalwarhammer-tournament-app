import React from "react";
import { Box, Button, Card, HStack, Heading, Text } from "@chakra-ui/react";
import { LuDownload } from "react-icons/lu";

interface StatsSectionProps {
  title: string;
  icon: React.ReactNode;
  accent: string;
  iconColor?: string;
  subtitle?: string;
  shown: number;
  available: number;
  total?: number;
  loadingMore?: boolean;
  onShowMore?: () => void;
  onExport: () => void;
  exporting?: boolean;
  children: React.ReactNode;
}

/**
 * One statistics card: accent-topped panel, export control, and the
 * "Showing 1–10 of 47" pager every list section on this page shares.
 */
const StatsSection: React.FC<StatsSectionProps> = ({
  title,
  icon,
  accent,
  iconColor = "gold.text",
  subtitle,
  shown,
  available,
  total,
  loadingMore = false,
  onShowMore,
  onExport,
  exporting = false,
  children,
}) => {
  const rendered = Math.min(shown, available);
  // The server caps how many rows it will ever materialise per list, so a total
  // can exceed what paging can reach. Once a page comes back short, stop
  // offering "Show more" rather than looping on a request that adds nothing.
  const hasMore = total !== undefined && rendered < total && available >= shown;

  return (
    <Card.Root
      bg="bg.panel"
      borderWidth={1}
      borderColor="border.subtle"
      borderTopWidth="2px"
      borderTopColor={accent}
      shadow="sm"
      transition="all 0.15s ease"
      _hover={{ borderColor: "border.emphasized", shadow: "md" }}
    >
      <Card.Header>
        <HStack justifyContent="space-between" alignItems="center" gap={2}>
          <HStack gap={2} minW={0}>
            <Box color={iconColor}>{icon}</Box>
            <Heading size="md">{title}</Heading>
          </HStack>
          <Button
            size="xs"
            variant="ghost"
            colorPalette="ink"
            onClick={onExport}
            loading={exporting}
            aria-label={`Export ${title} as CSV`}
          >
            <LuDownload />
            CSV
          </Button>
        </HStack>
        {subtitle && (
          <Text fontSize="xs" color="fg.muted">
            {subtitle}
          </Text>
        )}
      </Card.Header>
      <Card.Body>{children}</Card.Body>
      {total !== undefined && total > 0 && (
        <Card.Footer pt={0}>
          <HStack justifyContent="space-between" w="full" gap={2}>
            <Text fontSize="xs" color="fg.muted" fontFamily="mono">
              Showing {rendered} of {total}
            </Text>
            {hasMore && (
              <Button
                size="xs"
                variant="outline"
                colorPalette="verdigris"
                onClick={onShowMore}
                loading={loadingMore}
              >
                Show more
              </Button>
            )}
          </HStack>
        </Card.Footer>
      )}
    </Card.Root>
  );
};

export default StatsSection;
