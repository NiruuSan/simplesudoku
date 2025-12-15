import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { getCurrentUser } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

export interface UserStats {
  gamesPlayed: number;
  gamesWon: {
    total: number;
    easy: number;
    medium: number;
    hard: number;
    extreme: number;
  };
  averageTime: {
    overall: number;
    easy: number;
    medium: number;
    hard: number;
    extreme: number;
  };
  totalScore: number;
  bestTimes: {
    easy: number | null;
    medium: number | null;
    hard: number | null;
    extreme: number | null;
  };
}

interface GameRow extends RowDataPacket {
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  won: boolean;
  time_seconds: number;
  score: number;
}

// GET user statistics
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Get all games for the user
    const [games] = await pool.execute<GameRow[]>(
      'SELECT difficulty, won, time_seconds, score FROM game_records WHERE user_id = ?',
      [currentUser.userId]
    );
    
    // Calculate statistics
    const stats: UserStats = {
      gamesPlayed: games.length,
      gamesWon: {
        total: 0,
        easy: 0,
        medium: 0,
        hard: 0,
        extreme: 0,
      },
      averageTime: {
        overall: 0,
        easy: 0,
        medium: 0,
        hard: 0,
        extreme: 0,
      },
      totalScore: 0,
      bestTimes: {
        easy: null,
        medium: null,
        hard: null,
        extreme: null,
      },
    };

    const difficulties = ['easy', 'medium', 'hard', 'extreme'] as const;
    const timeSums: Record<string, number> = { overall: 0, easy: 0, medium: 0, hard: 0, extreme: 0 };
    const winCounts: Record<string, number> = { overall: 0, easy: 0, medium: 0, hard: 0, extreme: 0 };

    games.forEach(game => {
      stats.totalScore += game.score;
      
      // MySQL returns 1/0 for boolean, convert to boolean
      const isWon = Boolean(game.won);
      
      if (isWon) {
        stats.gamesWon.total++;
        stats.gamesWon[game.difficulty]++;
        winCounts.overall++;
        winCounts[game.difficulty]++;
        timeSums.overall += game.time_seconds;
        timeSums[game.difficulty] += game.time_seconds;

        // Track best times
        const currentBest = stats.bestTimes[game.difficulty];
        if (currentBest === null || game.time_seconds < currentBest) {
          stats.bestTimes[game.difficulty] = game.time_seconds;
        }
      }
    });

    // Calculate average times
    if (winCounts.overall > 0) {
      stats.averageTime.overall = Math.round(timeSums.overall / winCounts.overall);
    }
    
    difficulties.forEach(diff => {
      if (winCounts[diff] > 0) {
        stats.averageTime[diff] = Math.round(timeSums[diff] / winCounts[diff]);
      }
    });

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get statistics' },
      { status: 500 }
    );
  }
}
