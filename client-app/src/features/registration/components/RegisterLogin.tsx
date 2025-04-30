"use client";

import { Button, Drawer, Portal, createOverlay } from "@chakra-ui/react";
import { AuthenticationForm } from "./AuthenticationForm";

interface DialogProps {
  title: string;
  description?: string;
  content?: React.ReactNode;
  placement?: Drawer.RootProps["placement"];
}

export const RegisterLogin = () => {
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
                {
                  <>
                    <AuthenticationForm />
                  </>
                }
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    );
  });

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          drawer.open("authentication", {
            title: "Authentication",
            description: "Register or Login below!",
            placement: "end",
          });
        }}
      >
        Register/Login
      </Button>
      <drawer.Viewport />
    </>
  );
};
