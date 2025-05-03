// Central configuration for API-related settings
export const apiConfig = {
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:3000",
  endpoints: {
    register: "/user/register",
    userExists: "/user/exists",
    login: "/auth/login", // Updated to use auth routes
    logout: "/auth/logout", // Updated to use auth routes
    guest: "/guest", // Updated to use new guest routes
    guestUpdateUsername: "/guest/username", // Updated to use new guest routes
    token: "/auth/token",
    passwordReset: "/password-reset",
  },
};
