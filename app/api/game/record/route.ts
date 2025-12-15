import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { getCurrentUser } from '@/lib/auth';
import { ResultSetHeader } from 'mysql2';

// POST record a game
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    // Allow recording without being logged in (just don't save to DB)
    if (!currentUser) {
      return NextResponse.json({
        success: true,
        saved: false,
        message: 'Game not recorded - user not logged in',
      });
    }
    
    const { difficulty, completed, won, timeSeconds, score } = await request.json();
    
    // Validate required fields
    if (!difficulty || typeof timeSeconds !== 'number') {
      return NextResponse.json(
        { error: 'Difficulty and time are required' },
        { status: 400 }
      );
    }

    // Validate difficulty
    const validDifficulties = ['easy', 'medium', 'hard', 'extreme'];
    if (!validDifficulties.includes(difficulty)) {
      return NextResponse.json(
        { error: 'Invalid difficulty level' },
        { status: 400 }
      );
    }

    // Create game record
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO game_records (user_id, difficulty, completed, won, time_seconds, score) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        currentUser.userId,
        difficulty,
        completed ?? true,
        won ?? false,
        Math.max(0, timeSeconds),
        score ?? 0
      ]
    );

    return NextResponse.json({
      success: true,
      saved: true,
      gameRecord: {
        id: result.insertId,
        difficulty,
        won: won ?? false,
        timeSeconds: Math.max(0, timeSeconds),
        score: score ?? 0,
      },
    });
  } catch (error) {
    console.error('Record game error:', error);
    return NextResponse.json(
      { error: 'Failed to record game' },
      { status: 500 }
    );
  }
}
