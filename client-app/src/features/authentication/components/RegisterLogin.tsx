"use client";

import {
  Box,
  Button,
  Drawer,
  IconButton,
  Portal,
  createOverlay,
} from "@chakra-ui/react";
import { AuthenticationForm } from "./AuthenticationForm";
import React, { useEffect, useState } from "react";
import { LuSearch } from "react-icons/lu";
import { BiArrowBack } from "react-icons/bi";
import { FiX } from "react-icons/fi";

interface DialogProps {
  title: string;
  description?: string;
  content?: React.ReactNode;
  placement?: Drawer.RootProps["placement"];
}

export const RegisterLogin = () => {
  const [overlayId] = useState<string>("authentication");

  const drawer = createOverlay<DialogProps>((props) => {
    const { title, description, ...rest } = props;
    return (
      <Drawer.Root {...rest}>
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              {title && (
                <>
                  <Drawer.Header>
                    <Drawer.Title>{title}</Drawer.Title>
                  </Drawer.Header>
                  <Box position="absolute" top="4" right="4">
                    <IconButton
                      aria-label="Close"
                      variant="ghost"
                      onClick={() => drawer.close(overlayId)}
                    >
                      <FiX />
                    </IconButton>
                  </Box>
                </>
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
      description: "Register, login or reset your password",
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
