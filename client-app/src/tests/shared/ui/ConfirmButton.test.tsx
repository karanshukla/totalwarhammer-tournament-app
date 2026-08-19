import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import ConfirmButton from "@/shared/ui/ConfirmButton";

function renderButton(onConfirm: () => void) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <ConfirmButton onConfirm={onConfirm}>Delete</ConfirmButton>
    </ChakraProvider>,
  );
}

describe("ConfirmButton", () => {
  it("does not run the action on the first click", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderButton(onConfirm);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Yes" })).toBeInTheDocument();
  });

  it("runs the action only after confirmation", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderButton(onConfirm);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Yes" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("cancelling disarms without running the action", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderButton(onConfirm);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });
});
