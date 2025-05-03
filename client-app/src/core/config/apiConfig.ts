// Central configuration for API-related settings
export const apiConfig = {
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:3000",
  endpoints: {
    register: "/user/register",
    userExists: "/user/exists",
    login: "/auth/login",
    logout: "/auth/logout",
    guest: "/guest",
    guestUpdateUsername: "/guest/username",
    token: "/auth/token",
    passwordReset: "/password-reset",
  },
};
