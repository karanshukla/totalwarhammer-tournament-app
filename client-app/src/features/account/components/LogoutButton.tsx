import React from "react";
import { Button } from "@chakra-ui/react";
import { logoutUser } from "@/features/authentication/api/authenticationApi";
import { useNavigate } from "react-router-dom";
import { set } from "react-hook-form";

interface LogoutButtonProps {
  variant?: string;
  size?: string;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ variant, size }) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      setIsSubmitting(true);
      await logoutUser();
      setIsSubmitting(false);
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      onClick={handleLogout}
      variant={variant}
      size={size}
      loading={isSubmitting}
    >
      Logout
    </Button>
  );
};

export default LogoutButton;
