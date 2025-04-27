// Central configuration for API-related settings
export const apiConfig = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  endpoints: {
    register: '/user/register',
  }
};