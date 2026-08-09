import { chakra } from "@chakra-ui/react";
import { selectableCardRecipe } from "./theme";

export const SelectableCard = chakra("div", selectableCardRecipe, {
  defaultProps: { role: "button", tabIndex: 0 },
});
