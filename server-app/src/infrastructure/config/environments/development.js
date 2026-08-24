// Development environment configuration
export default {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI,
  sessionSecret: process.env.SESSION_SECRET,
  baseUrl: process.env.BASE_URL || "http://localhost:3000/",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  resendApiKey: process.env.RESEND_API_KEY,
  rateLimitGlobalMax: Number(process.env.RATE_LIMIT_GLOBAL_MAX) || 300,
  rateLimitAuthMax: Number(process.env.RATE_LIMIT_AUTH_MAX) || 20,
};
