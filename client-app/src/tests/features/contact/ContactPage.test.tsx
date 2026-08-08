/**
 * Branch coverage for contact/components/ContactPage.tsx:
 * - FaqItem open=false (initial): Collapsible data-state="closed"
 * - FaqItem open=true (after click): Collapsible data-state="open" (open state branch)
 * - Clicking open item again: data-state back to "closed" (close branch)
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import ContactPage from "@/features/contact/components/ContactPage";

function renderPage() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <ContactPage />
    </ChakraProvider>,
  );
}

function getFaqRoot(questionText: RegExp) {
  const text = screen.getByText(questionText);
  return text.closest('[data-scope="collapsible"]') as HTMLElement;
}

describe("ContactPage", () => {
  it("renders 'Get Help' heading", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Get Help", level: 1 }),
    ).toBeInTheDocument();
  });

  it("renders FAQ section heading", () => {
    renderPage();
    expect(screen.getByText("Frequently Asked Questions")).toBeInTheDocument();
  });
});

describe("FaqItem – open/close toggle (line 49 branch)", () => {
  it("starts closed (data-state=closed, open=false branch)", () => {
    renderPage();
    const root = getFaqRoot(/Can I change a result after/i);
    expect(root.getAttribute("data-state")).toBe("closed");
  });

  it("opens on click (data-state=open, open=true branch)", async () => {
    renderPage();
    const root = getFaqRoot(/Can I change a result after/i);
    const trigger = screen.getByText(/Can I change a result after/i);
    await userEvent.click(trigger);
    expect(root.getAttribute("data-state")).toBe("open");
  });

  it("closes again on second click (toggling back to closed)", async () => {
    renderPage();
    const root = getFaqRoot(/Can I change a result after/i);
    const trigger = screen.getByText(/Can I change a result after/i);
    await userEvent.click(trigger);
    expect(root.getAttribute("data-state")).toBe("open");
    await userEvent.click(trigger);
    expect(root.getAttribute("data-state")).toBe("closed");
  });
});
