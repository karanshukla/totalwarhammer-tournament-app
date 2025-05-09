// Development environment configuration
export default {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  sessionSecret: process.env.SESSION_SECRET,
  baseUrl: process.env.BASE_URL || "http://localhost:3000/",
  clientUrl: process.env.CLIENT_URL || "http://localhost:3001/",
  resendApiKey: process.env.RESEND_API_KEY,
};
