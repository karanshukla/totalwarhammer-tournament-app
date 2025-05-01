// Central configuration for API-related settings
export const apiConfig = {
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:3000",
  endpoints: {
    register: "/user/register",
    userExists: "/user/exists",
    login: "/user/login",
    logout: "/user/logout",
    guest: "/user/guest",
    token: "/auth/token", // New endpoint for PKCE token exchange
  },
};
