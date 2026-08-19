import React from "react";
import { chakra } from "@chakra-ui/react";
import { selectableCardRecipe } from "./theme";
import { activateOnEnterOrSpace } from "./keyboardActivation";

const StyledSelectableCard = chakra("div", selectableCardRecipe, {
  defaultProps: { role: "button", tabIndex: 0 },
});

type SelectableCardProps = React.ComponentProps<typeof StyledSelectableCard>;

// The card is a div carrying role="button", so Enter/Space activation has to be
// wired up by hand here — leaving it to callers made every new call site a
// keyboard trap waiting to happen.
export const SelectableCard = React.forwardRef<
  HTMLDivElement,
  SelectableCardProps
>(function SelectableCard({ onClick, onKeyDown, ...props }, ref) {
  return (
    <StyledSelectableCard
      ref={ref}
      onClick={onClick}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event);
        activateOnEnterOrSpace<HTMLDivElement>((keyEvent) =>
          onClick?.(
            keyEvent as unknown as React.MouseEvent<HTMLDivElement, MouseEvent>,
          ),
        )(event);
      }}
      {...props}
    />
  );
});
