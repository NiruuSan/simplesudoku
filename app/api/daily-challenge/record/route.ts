import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { getCurrentUser } from '@/lib/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface DailyChallengeRow extends RowDataPacket {
  id: number;
  user_id: number;
  date_string: string;
  time_seconds: number;
  score: number;
  completed_at: Date;
}

// POST - Record daily challenge completion
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({
        success: true,
        saved: false,
        message: 'Not logged in - score not saved',
      });
    }
    
    const { date, completed, won, timeSeconds, score } = await request.json();
    
    if (!date || typeof timeSeconds !== 'number') {
      return NextResponse.json(
        { error: 'Date and time are required' },
        { status: 400 }
      );
    }

    // Check if user already completed this daily challenge
    const [existing] = await pool.execute<DailyChallengeRow[]>(
      'SELECT id, score FROM daily_challenge_completions WHERE user_id = ? AND date_string = ?',
      [currentUser.userId, date]
    );

    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        saved: false,
        message: 'Already completed today\'s challenge',
        previousScore: existing[0].score,
      });
    }

    // Create new record
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO daily_challenge_completions (user_id, date_string, time_seconds, score) 
       VALUES (?, ?, ?, ?)`,
      [currentUser.userId, date, Math.max(0, timeSeconds), score ?? 0]
    );

    return NextResponse.json({
      success: true,
      saved: true,
      record: {
        date,
        won: won ?? false,
        timeSeconds: Math.max(0, timeSeconds),
        score: score ?? 0,
      },
    });
  } catch (error: any) {
    // Handle duplicate key error
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({
        success: true,
        saved: false,
        message: 'Already completed today\'s challenge',
      });
    }
    
    console.error('Daily challenge record error:', error);
    return NextResponse.json(
      { error: 'Failed to record daily challenge' },
      { status: 500 }
    );
  }
}

// GET - Check if user has completed today's challenge
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({
        completed: false,
        loggedIn: false,
      });
    }
    
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    const [records] = await pool.execute<DailyChallengeRow[]>(
      'SELECT time_seconds, score, completed_at FROM daily_challenge_completions WHERE user_id = ? AND date_string = ?',
      [currentUser.userId, date]
    );

    const record = records.length > 0 ? records[0] : null;

    return NextResponse.json({
      completed: !!record,
      loggedIn: true,
      record: record ? {
        won: true,
        timeSeconds: record.time_seconds,
        score: record.score,
        completedAt: record.completed_at,
      } : null,
    });
  } catch (error) {
    console.error('Get daily challenge status error:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
