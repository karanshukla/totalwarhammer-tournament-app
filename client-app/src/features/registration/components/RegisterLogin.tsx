"use client";

import { Button, Drawer, Portal, createOverlay } from "@chakra-ui/react";
import { AuthenticationForm } from "./AuthenticationForm";
import { useEffect, useRef } from "react";

interface DialogProps {
  title: string;
  description?: string;
  content?: React.ReactNode;
  placement?: Drawer.RootProps["placement"];
}

export const RegisterLogin = () => {
  // Create a ref to store the drawer instance
  const drawerRef = useRef<ReturnType<
    typeof createOverlay<DialogProps>
  > | null>(null);

  // Create the drawer when the component is mounted
  const drawer = createOverlay<DialogProps>((props) => {
    const { title, description, content, ...rest } = props;
    return (
      <Drawer.Root {...rest}>
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              {title && (
                <Drawer.Header>
                  <Drawer.Title>{title}</Drawer.Title>
                </Drawer.Header>
              )}
              <Drawer.Body spaceY="4">
                {description && (
                  <Drawer.Description>{description}</Drawer.Description>
                )}
                <AuthenticationForm />
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    );
  });

  // Store the drawer in a ref
  useEffect(() => {
    drawerRef.current = drawer;

    // Listen for custom events to close the drawer
    const handleAuthEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.type === "close-drawer") {
        drawer.close();
      }
    };

    // Add and remove event listener
    document.addEventListener("auth-event", handleAuthEvent);
    return () => {
      document.removeEventListener("auth-event", handleAuthEvent);
    };
  }, [drawer]);

  const handleClick = () => {
    drawer.open("authentication", {
      title: "Authentication",
      description: "Register or Login below!",
      placement: "end",
    });
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleClick}>
        Register/Login
      </Button>
      <drawer.Viewport />
    </>
  );
};
