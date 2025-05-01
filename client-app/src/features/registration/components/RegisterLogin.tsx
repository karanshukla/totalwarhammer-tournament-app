"use client";

import { Button, Drawer, Portal, createOverlay } from "@chakra-ui/react";
import { AuthenticationForm } from "./AuthenticationForm";
import { useEffect, useState } from "react";

interface DialogProps {
  title: string;
  description?: string;
  content?: React.ReactNode;
  placement?: Drawer.RootProps["placement"];
}

export const RegisterLogin = () => {
  const [overlayId] = useState<string>("authentication");

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

  useEffect(() => {
    const handleAuthEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.type === "close-drawer") {
        drawer.close(overlayId);
      }
    };

    document.addEventListener("auth-event", handleAuthEvent);
    return () => {
      document.removeEventListener("auth-event", handleAuthEvent);
    };
  }, [drawer, overlayId]);

  const handleClick = () => {
    drawer.open(overlayId, {
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
