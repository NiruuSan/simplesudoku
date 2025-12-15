import mongoose, { Document, Model } from 'mongoose';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme';

export interface IGameRecord extends Document {
  userId: mongoose.Types.ObjectId;
  difficulty: Difficulty;
  completed: boolean;
  won: boolean;
  timeSeconds: number;
  score: number;
  playedAt: Date;
}

const gameRecordSchema = new mongoose.Schema<IGameRecord>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'extreme'],
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  won: {
    type: Boolean,
    default: false,
  },
  timeSeconds: {
    type: Number,
    required: true,
    min: 0,
  },
  score: {
    type: Number,
    default: 0,
  },
  playedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient stats queries
gameRecordSchema.index({ userId: 1, difficulty: 1, won: 1 });

// Prevent model recompilation in development
const GameRecord: Model<IGameRecord> = mongoose.models.GameRecord || mongoose.model<IGameRecord>('GameRecord', gameRecordSchema);

export default GameRecord;

