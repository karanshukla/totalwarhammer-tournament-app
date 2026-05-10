import React, { useState, useEffect } from "react";
import { Heading, Container, Spinner, VStack, Text } from "@chakra-ui/react";
import { useUserStore } from "@/shared/stores/userStore";
import GuestAccountSection from "./GuestAccountSection";
import AuthenticatedAccountSection from "./AuthenticatedAccountSection";
import UnauthenticatedSection from "./UnauthenticatedSection";
import { refreshSession } from "../api/accountApi";
import { useNavigate } from "react-router-dom";
import { toaster } from "@/shared/ui/Toaster";

const AccountPage: React.FC = () => {
  const user = useUserStore((state) => state.user);
  const clearUser = useUserStore((state) => state.clearUser);
  const [isValidatingSession, setIsValidatingSession] = useState(true);
  const [sessionValid, setSessionValid] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (user.isAuthenticated) {
      setIsValidatingSession(true);

      refreshSession()
        .then((valid) => {
          setSessionValid(valid);
          if (!valid && user.isAuthenticated) {
            toaster.create({
              title: "Session Expired",
              description: "Your session has expired. Please login again.",
              type: "warning",
            });
            clearUser();
            navigate("/auth");
          }
        })
        .catch((err) => {
          console.error("Error validating session:", err);
          setSessionValid(false);
        })
        .finally(() => {
          setIsValidatingSession(false);
        });
    } else {
      setIsValidatingSession(false);
    }
  }, [user.isAuthenticated, clearUser, navigate]);
  return (
    <Container maxW="5xl" py={10} px={{ base: 4, md: 8, lg: 12 }}>
      <Heading as="h1" size="xl" mb={4}>
        Account
      </Heading>

      {isValidatingSession ? (
        <VStack gap={4} mt={8}>
          <Spinner size="xl" />
          <Text>Validating your session...</Text>
        </VStack>
      ) : (
        <>
          {user.isGuest && sessionValid && <GuestAccountSection />}

          {user.isAuthenticated && !user.isGuest && sessionValid && (
            <AuthenticatedAccountSection />
          )}

          {(!user.isAuthenticated || !sessionValid) && (
            <UnauthenticatedSection />
          )}
        </>
      )}
    </Container>
  );
};

export default AccountPage;
