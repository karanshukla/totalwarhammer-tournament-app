import crypto from "crypto";

import mongoose from "mongoose";

import Tournament from "../../../domain/models/tournament.js";
import logger from "../../../infrastructure/utils/logger.js";

export const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id) && /^[a-f\d]{24}$/i.test(id);

// Math.random().toString(36) drops trailing zeros, so slicing it produced codes
// shorter than 6 characters (and, for a value like 0.5, a single character),
// which made collisions on the unique index far likelier than the nominal
// space suggests. Ambiguous glyphs (0/O, 1/I) are excluded so codes survive
// being read aloud or copied by hand.
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;

export function generateCode() {
  // crypto.randomInt rejection-samples, so the distribution stays uniform
  // whatever the alphabet length. Taking randomBytes modulo the length is only
  // unbiased while that length divides 256 — a silent trap the next time
  // someone edits the alphabet.
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export async function ensureCode(tournament) {
  if (tournament && !tournament.code) {
    const newCode = generateCode();
    const updated = await Tournament.findOneAndUpdate(
      {
        _id: tournament._id,
        $or: [{ code: { $exists: false } }, { code: null }, { code: "" }],
      },
      { $set: { code: newCode } },
      { new: true },
    );
    if (updated) return updated;
    // Another request already set the code — re-fetch to get it
    return (await Tournament.findById(tournament._id)) || tournament;
  }
  return tournament;
}

export const CODE_COLLISION_RETRIES = 5;

export async function createWithUniqueCode(attributes) {
  for (let attempt = 0; attempt < CODE_COLLISION_RETRIES; attempt++) {
    try {
      return await Tournament.create({ ...attributes, code: generateCode() });
    } catch (error) {
      const isDuplicateCode =
        error?.code === 11000 && "code" in (error.keyPattern ?? {});
      if (!isDuplicateCode) throw error;
      logger.warn("Tournament join code collided, regenerating");
    }
  }
  throw new Error(
    `Could not allocate a unique join code in ${CODE_COLLISION_RETRIES} attempts`,
  );
}
