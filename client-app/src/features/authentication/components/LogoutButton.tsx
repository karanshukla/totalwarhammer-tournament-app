import React, { useState } from "react";
import { Button, Icon } from "@chakra-ui/react";
import { FiLogOut } from "react-icons/fi";
import { useRouter } from "@/core/router/RouterContext";
import { useUserStore } from "@/shared/stores/userStore";
import { toaster } from "@/shared/ui/toaster";
import { apiConfig } from "@/core/config/apiConfig";

interface LogoutButtonProps {
  size?: string;
  variant?: string;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({
  size = "sm",
  variant = "outline",
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { navigate } = useRouter();
  const { clearUser } = useUserStore();

  const handleLogout = () => {
    setIsLoading(true);
    fetch(`${apiConfig.baseUrl}${apiConfig.endpoints.logout}`, {
      method: "POST",
      credentials: "include",
    })
      .then((response) => {
        if (response.ok) {
          clearUser();
          navigate("/");
          toaster.create({
            title: "Logged out",
            description: "You're now logged out. See you next time!",
            type: "success",
          });
        } else {
          throw new Error(`Server responded with status: ${response.status}`);
        }
      })
      .catch((error) => {
        console.error("Logout failed:", error);
        toaster.create({
          title: "Logout failed",
          description: "There was an error logging out. Please try again.",
          type: "error",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      isLoading={isLoading}
      loadingText="Logging out"
    >
      <Icon as={FiLogOut} boxSize={4} mr={2} /> Logout
    </Button>
  );
};
