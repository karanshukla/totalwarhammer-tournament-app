import React, { useState, useRef } from "react";
import { Button, Icon } from "@chakra-ui/react";
import { FiLogOut } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../api/authenticationApi";

interface LogoutButtonProps {
  size?: string;
  variant?: string;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({
  size = "sm",
  variant = "outline",
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const isLoggingOutRef = useRef(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    // Prevent duplicate logout requests
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
      // Even if server-side logout fails, the client-side state is cleared
      // in the logoutUser function, so we should still redirect
      navigate("/");
    } finally {
      setIsLoading(false);
      // Add a small delay before allowing another logout attempt
      setTimeout(() => {
        isLoggingOutRef.current = false;
      }, 1000);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      isLoading={isLoading}
      loadingText="Logging out"
      disabled={isLoggingOutRef.current}
    >
      <Icon as={FiLogOut} boxSize={4} mr={2} /> Logout
    </Button>
  );
};
