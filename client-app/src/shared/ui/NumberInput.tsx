import { NumberInput as ChakraNumberInput } from "@chakra-ui/react";
import * as React from "react";

export type NumberInputProps = ChakraNumberInput.RootProps;

export const NumberInputRoot = React.forwardRef<
  HTMLDivElement,
  NumberInputProps
>(function NumberInput(props, ref) {
  const { children, ...rest } = props;
  return (
    <ChakraNumberInput.Root ref={ref} {...rest}>
      {children}
    </ChakraNumberInput.Root>
  );
});

export const NumberInputField = React.forwardRef<
  HTMLInputElement,
  ChakraNumberInput.InputProps
>((props, ref) => <ChakraNumberInput.Input ref={ref} {...props} />);

export const NumberInputStepper = ChakraNumberInput.Control;
export const NumberInputControl = ChakraNumberInput.Control;
export const NumberInputIncrementTrigger = React.forwardRef<
  HTMLButtonElement,
  ChakraNumberInput.IncrementTriggerProps
>((props, ref) => <ChakraNumberInput.IncrementTrigger ref={ref} {...props} />);
export const NumberInputDecrementTrigger = React.forwardRef<
  HTMLButtonElement,
  ChakraNumberInput.DecrementTriggerProps
>((props, ref) => <ChakraNumberInput.DecrementTrigger ref={ref} {...props} />);
