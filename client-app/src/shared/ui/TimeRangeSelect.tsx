import React from "react";
import { HStack, chakra } from "@chakra-ui/react";
import { RANGE_OPTIONS, type StatsRange } from "./timeRange";

interface TimeRangeSelectProps {
  value: StatsRange;
  onChange: (range: StatsRange) => void;
  size?: "sm" | "md";
  disabled?: boolean;
}

/** Segmented 7d / 30d / 90d / All-time window picker shared by the stats views. */
const TimeRangeSelect: React.FC<TimeRangeSelectProps> = ({
  value,
  onChange,
  size = "md",
  disabled = false,
}) => (
  <HStack gap={1} role="group" aria-label="Time range">
    {RANGE_OPTIONS.map(({ range, label }) => {
      const active = value === range;
      return (
        <chakra.button
          key={range}
          type="button"
          py={size === "sm" ? 1 : 1.5}
          px={size === "sm" ? 3 : 4}
          borderRadius="sm"
          borderWidth={1}
          fontSize={size}
          fontFamily="cond"
          fontWeight="medium"
          cursor={disabled ? "not-allowed" : "pointer"}
          transition="all 0.15s"
          aria-pressed={active}
          disabled={disabled}
          onClick={() => !active && onChange(range)}
          bg={active ? "colorPalette.subtle" : "transparent"}
          borderColor={active ? "colorPalette.muted" : "border"}
          color={active ? "fg" : "fg.muted"}
          colorPalette="verdigris"
          _disabled={{ opacity: 0.6 }}
        >
          {label}
        </chakra.button>
      );
    })}
  </HStack>
);

export default TimeRangeSelect;
