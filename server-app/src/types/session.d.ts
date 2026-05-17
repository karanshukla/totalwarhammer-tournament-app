import "express-session";

declare module "express-session" {
  interface SessionData {
    user?: {
      id: string;
      email?: string;
      username?: string;
      role?: string;
      isGuest?: boolean;
    };
    isAuthenticated?: boolean;
    isGuest?: boolean;
    createdAt?: Date;
    fingerprint?: {
      browser: string;
      os: string;
    };
  }
}

// Extend Express's global User interface so req.user carries our app fields.
declare global {
  namespace Express {
    interface User {
      id: string;
      email?: string;
      username?: string;
      role?: string;
      isGuest?: boolean;
    }
  }
}
