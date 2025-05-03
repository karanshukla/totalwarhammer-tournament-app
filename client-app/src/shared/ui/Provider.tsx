"use client";

import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { ColorModeProvider } from "./ColorMode";

type ProviderProps = {
  children: React.ReactNode;
};

export function Provider(props: ProviderProps) {
  return (
    <ChakraProvider value={defaultSystem}>
      <ColorModeProvider {...props} />
    </ChakraProvider>
  );
}
