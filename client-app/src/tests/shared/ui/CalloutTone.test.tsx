import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import Callout from "@/shared/ui/Callout";
import GuidanceNote from "@/features/tournaments/components/create/GuidanceNote";

const renderIn = (ui: React.ReactNode) =>
  render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>);

describe("Callout tones", () => {
  it("announces errors as alerts", () => {
    renderIn(<Callout tone="error">Something broke</Callout>);
    expect(screen.getByRole("alert")).toHaveTextContent("Something broke");
  });

  it("does not announce warnings as alerts", () => {
    renderIn(<Callout tone="warning">Odd player count</Callout>);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Odd player count")).toBeInTheDocument();
  });

  it("keeps a warning GuidanceNote out of the alert role", () => {
    renderIn(<GuidanceNote tone="warning">Byes will be added</GuidanceNote>);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
