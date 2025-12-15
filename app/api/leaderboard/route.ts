import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { RowDataPacket } from 'mysql2';

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'all';

interface LeaderboardRow extends RowDataPacket {
  user_id: number;
  username: string;
  profile_picture: string | null;
  total_score: number;
  best_score: number;
  games_played: number;
  games_won: number;
}

function getStartDateSQL(period: TimePeriod): string | null {
  switch (period) {
    case 'daily':
      return 'CURDATE()';
    case 'weekly':
      return 'DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)';
    case 'monthly':
      return 'DATE_FORMAT(CURDATE(), "%Y-%m-01")';
    case 'all':
    default:
      return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'all') as TimePeriod;
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const startDate = getStartDateSQL(period);
    
    // Build the query with optional date filter
    let query = `
      SELECT 
        g.user_id,
        u.username,
        u.profile_picture,
        SUM(g.score) as total_score,
        MAX(g.score) as best_score,
        COUNT(*) as games_played,
        SUM(CASE WHEN g.won = 1 THEN 1 ELSE 0 END) as games_won
      FROM game_records g
      JOIN users u ON g.user_id = u.id
    `;
    
    if (startDate) {
      query += ` WHERE g.played_at >= ${startDate}`;
    }
    
    query += `
      GROUP BY g.user_id, u.username, u.profile_picture
      ORDER BY total_score DESC
      LIMIT ?
    `;
    
    const [rows] = await pool.execute<LeaderboardRow[]>(query, [limit]);
    
    // Calculate win rate and format response
    const leaderboard = rows.map((entry, index) => ({
      rank: index + 1,
      odbc: entry.user_id,
      username: entry.username,
      profilePicture: entry.profile_picture || null,
      totalScore: Number(entry.total_score) || 0,
      bestScore: Number(entry.best_score) || 0,
      gamesPlayed: Number(entry.games_played) || 0,
      gamesWon: Number(entry.games_won) || 0,
      winRate: entry.games_played > 0 
        ? Math.round((Number(entry.games_won) / Number(entry.games_played)) * 100) 
        : 0,
    }));
    
    return NextResponse.json({
      period,
      leaderboard,
      count: leaderboard.length,
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
