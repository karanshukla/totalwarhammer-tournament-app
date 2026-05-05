import mongoose from "mongoose";

const playerSlotSchema = new mongoose.Schema(
  {
    participantId: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String, required: true, trim: true },
    faction: { type: String, default: "" },
  },
  { _id: false },
);

const resultOverrideSchema = new mongoose.Schema(
  {
    previousWinnerId: { type: mongoose.Schema.Types.ObjectId, default: null },
    newWinnerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    overriddenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: { type: String, default: "" },
    overriddenAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const reportedResultSchema = new mongoose.Schema(
  {
    reportedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    reportedByName: { type: String, required: true },
    winnerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reportedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const matchSchema = new mongoose.Schema({
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tournament",
    required: true,
    index: true,
  },
  round: { type: Number, required: true, min: 1 },
  matchNumber: { type: Number, required: true, min: 1 },

  player1: { type: playerSlotSchema, required: true },
  player2: { type: playerSlotSchema, required: true },

  winnerId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  loserId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },

  reportedResults: { type: [reportedResultSchema], default: [] },

  status: {
    type: String,
    enum: ["pending", "in_progress", "completed", "disputed"],
    default: "pending",
  },

  notes: { type: String, default: "" },

  resultOverrides: { type: [resultOverrideSchema], default: [] },

  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
});

matchSchema.index(
  { tournament: 1, round: 1, matchNumber: 1 },
  { unique: true },
);

const Match = mongoose.model("Match", matchSchema);

export default Match;
