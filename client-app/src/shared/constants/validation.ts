import { z } from "zod";

/**
 * Field limits mirrored from the server's express-validator chains
 * (server-app/src/interfaces/http/middleware/validation/). Keeping them here
 * means a form rejects what the API would reject, instead of round-tripping
 * to a 400.
 */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt hashes at most 72 bytes; anything beyond it is silently ignored. */
export const PASSWORD_MAX_LENGTH = 72;

export const TOURNAMENT_NAME_MIN_LENGTH = 3;
export const TOURNAMENT_NAME_MAX_LENGTH = 100;
export const TOURNAMENT_DESCRIPTION_MAX_LENGTH = 2000;
export const PLAYER_COUNT_MIN = 2;
export const PLAYER_COUNT_MAX = 128;

export const PARTICIPANT_NAME_MAX_LENGTH = 100;
export const OVERRIDE_REASON_MAX_LENGTH = 500;

export const usernameSchema = z
  .string()
  .min(USERNAME_MIN_LENGTH, {
    message: `Username must be at least ${USERNAME_MIN_LENGTH} characters long`,
  })
  .max(USERNAME_MAX_LENGTH, {
    message: `Username cannot exceed ${USERNAME_MAX_LENGTH} characters`,
  })
  .regex(USERNAME_PATTERN, {
    message:
      "Username can only contain letters, numbers, underscores, and hyphens",
  });

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
  })
  .max(PASSWORD_MAX_LENGTH, {
    message: `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters`,
  });

export function validateUsername(username: string): string | null {
  const result = usernameSchema.safeParse(username);
  return result.success ? null : result.error.issues[0].message;
}

export function validatePassword(password: string): string | null {
  const result = passwordSchema.safeParse(password);
  return result.success ? null : result.error.issues[0].message;
}

export function validateTournamentName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < TOURNAMENT_NAME_MIN_LENGTH) {
    return `Tournament name must be at least ${TOURNAMENT_NAME_MIN_LENGTH} characters long`;
  }
  if (trimmed.length > TOURNAMENT_NAME_MAX_LENGTH) {
    return `Tournament name cannot exceed ${TOURNAMENT_NAME_MAX_LENGTH} characters`;
  }
  return null;
}
