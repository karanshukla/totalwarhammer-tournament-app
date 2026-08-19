import React, { useEffect, useRef, useState } from "react";
import { Button, HStack, Text } from "@chakra-ui/react";
import type { ButtonProps } from "@chakra-ui/react";

interface ConfirmButtonProps extends Omit<ButtonProps, "onClick"> {
  /** Runs only after the user confirms. */
  onConfirm: () => void;
  /** Shown in place of the button's label once armed. */
  confirmLabel?: string;
  children: React.ReactNode;
}

const ARM_TIMEOUT_MS = 5000;

/**
 * A two-step button for destructive actions: the first click arms it, the
 * second carries it out. Arming lapses after a few seconds so a stray click
 * doesn't leave a live trigger sitting on screen.
 *
 * Prefer this over a bare Button anywhere the action destroys data a user
 * cannot recreate — a tournament, a bracket, a roster.
 */
export const ConfirmButton: React.FC<ConfirmButtonProps> = ({
  onConfirm,
  confirmLabel = "Confirm?",
  children,
  ...buttonProps
}) => {
  const [armed, setArmed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const disarm = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setArmed(false);
  };

  if (!armed) {
    return (
      <Button
        {...buttonProps}
        onClick={() => {
          setArmed(true);
          timeoutRef.current = setTimeout(
            () => setArmed(false),
            ARM_TIMEOUT_MS,
          );
        }}
      >
        {children}
      </Button>
    );
  }

  return (
    <HStack gap={1}>
      <Text fontSize="xs" fontFamily="cond" color="status.loss">
        {confirmLabel}
      </Text>
      <Button
        {...buttonProps}
        variant="solid"
        onClick={() => {
          disarm();
          onConfirm();
        }}
      >
        Yes
      </Button>
      <Button
        size={buttonProps.size}
        colorPalette="ink"
        variant="outline"
        onClick={disarm}
      >
        Cancel
      </Button>
    </HStack>
  );
};

export default ConfirmButton;
