export const apiConfig = {
  baseUrl: import.meta.env.VITE_API_URL || "",
  endpoints: {
    register: "/user/register",
    userExists: "/user/exists",
    login: "/auth/login",
    logout: "/auth/logout",
    guest: "/guest",
    guestUpdateUsername: "/guest/username",
    token: "/auth/token",
    passwordReset: "/password-reset",
    updateUsername: "/user/update-username",
    updatePassword: "/user/update-password",
    deleteAccount: "/user/account",
    userStats: "/user/stats",
    stats: "/stats",
  },
};
