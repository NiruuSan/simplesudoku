import { NextResponse } from 'next/server';
import { createDailyPuzzle, getTodayDateString } from '@/lib/sudoku';

export async function GET() {
  try {
    const today = getTodayDateString();
    const { puzzle, solution, date } = createDailyPuzzle(today, 'hard');
    
    return NextResponse.json({
      puzzle,
      solution,
      date,
      difficulty: 'hard',
    });
  } catch (error) {
    console.error('Daily challenge error:', error);
    return NextResponse.json(
      { error: 'Failed to generate daily challenge' },
      { status: 500 }
    );
  }
}

