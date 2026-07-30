import React, { useState, useRef } from "react";
import { Button, Icon, type ButtonProps } from "@chakra-ui/react";
import { FiLogOut } from "react-icons/fi";
import { useNavigate } from "react-router";
import { logoutUser } from "../api/authenticationApi";

interface LogoutButtonProps {
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({
  size = "sm",
  variant = "outline",
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const isLoggingOutRef = useRef(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (isLoggingOutRef.current) {
      return;
    }

    try {
      setIsLoading(true);
      isLoggingOutRef.current = true;

      await logoutUser();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
      navigate("/");
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        isLoggingOutRef.current = false;
      }, 1000);
    }
  };

  return (
    <Button
      variant={variant}
      colorPalette="ink"
      size={size}
      onClick={handleLogout}
      loading={isLoading}
      loadingText="Logging out"
      disabled={isLoggingOutRef.current}
    >
      <Icon as={FiLogOut} boxSize={4} mr={2} /> Logout
    </Button>
  );
};
