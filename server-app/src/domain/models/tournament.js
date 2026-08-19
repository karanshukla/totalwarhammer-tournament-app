import mongoose from "mongoose";

const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    index: true,
  },
  description: { type: String, default: "" },
  playerCount: { type: Number, required: true, min: 2, max: 128 },
  tournamentType: {
    type: String,
    required: true,
    enum: [
      "Single Elimination",
      "Double Elimination",
      "Round Robin",
      "Swiss System",
    ],
  },
  bannedFactions: { type: [String], default: [] },
  enable40kFactions: { type: Boolean, default: false },
  participants: {
    type: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        // Guests have no User document, so their session UUID is the only
        // stable handle on the row. Without it a guest can only be identified
        // by their freely-chosen display name, which is not unique.
        guestId: { type: String, default: null },
        name: { type: String, required: true, trim: true },
        faction: { type: String, default: "" },
      },
    ],
    default: [],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "active", "completed"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
});

tournamentSchema.index({ createdBy: 1, status: 1 });
tournamentSchema.index({ status: 1, createdAt: -1 });

const Tournament = mongoose.model("Tournament", tournamentSchema);

export default Tournament;
