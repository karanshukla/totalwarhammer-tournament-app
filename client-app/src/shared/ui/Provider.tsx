"use client";

import React from "react";
import { ChakraProvider } from "@chakra-ui/react";
import { ColorModeProvider } from "./ColorMode";
import { system } from "./theme";

type ProviderProps = {
  children: React.ReactNode;
};

export function Provider(props: ProviderProps) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider {...props} />
    </ChakraProvider>
  );
}
