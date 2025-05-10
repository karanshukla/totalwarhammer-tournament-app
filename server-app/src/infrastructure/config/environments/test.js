// Test environment configuration
export default {
  port: 3000,
  mongoUri: "mongodb://localhost:27017/test_db",
  jwtSecret: "test_jwt_secret",
  jwtRefreshSecret: "test_refresh_secret",
  sessionSecret: "test_session_secret",
  baseUrl: "http://localhost:3000/",
  clientUrl: "http://localhost:3001/",
  resendApiKey: "test_resend_api_key",
};
