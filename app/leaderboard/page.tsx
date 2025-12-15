'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'all';

interface LeaderboardEntry {
  rank: number;
  odbc: string;
  username: string;
  profilePicture: string | null;
  totalScore: number;
  bestScore: number;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<TimePeriod>('all');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const res = await fetch(`/api/leaderboard?period=${period}&limit=50`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch leaderboard');
        }
        
        setLeaderboard(data.leaderboard);
      } catch (err: any) {
        setError(err.message);
        setLeaderboard([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [period]);

  const getPeriodLabel = (p: TimePeriod): string => {
    switch (p) {
      case 'daily': return 'Today';
      case 'weekly': return 'This Week';
      case 'monthly': return 'This Month';
      case 'all': return 'All Time';
    }
  };

  const getRankBadge = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <Link href="/" className="back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Game
          </Link>
          <h1>🏆 Leaderboard</h1>
          <p className="leaderboard-subtitle">Top players ranked by total score</p>
        </div>

        <div className="period-filters">
          {(['daily', 'weekly', 'monthly', 'all'] as TimePeriod[]).map((p) => (
            <button
              key={p}
              className={`period-btn ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {getPeriodLabel(p)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="leaderboard-loading">
            <div className="loading-spinner"></div>
            <p>Loading leaderboard...</p>
          </div>
        ) : error ? (
          <div className="leaderboard-error">
            <p>⚠️ {error}</p>
            <button onClick={() => setPeriod(period)}>Retry</button>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="leaderboard-empty">
            <div className="empty-icon">🎮</div>
            <h3>No scores yet</h3>
            <p>Be the first to make it to the {getPeriodLabel(period).toLowerCase()} leaderboard!</p>
            <Link href="/" className="play-now-btn">
              Play Now
            </Link>
          </div>
        ) : (
          <div className="leaderboard-table-container">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th className="rank-col">Rank</th>
                  <th className="player-col">Player</th>
                  <th className="score-col">Total Score</th>
                  <th className="games-col">Games</th>
                  <th className="winrate-col">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.odbc} className={entry.rank <= 3 ? `top-${entry.rank}` : ''}>
                    <td className="rank-col">
                      <span className={`rank-badge ${entry.rank <= 3 ? 'medal' : ''}`}>
                        {getRankBadge(entry.rank)}
                      </span>
                    </td>
                    <td className="player-col">
                      <div className="player-info">
                        <div className="player-avatar">
                          {entry.profilePicture ? (
                            <img src={entry.profilePicture} alt={entry.username} />
                          ) : (
                            <span>{entry.username.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="player-name">{entry.username}</span>
                      </div>
                    </td>
                    <td className="score-col">
                      <span className="score-value">{entry.totalScore.toLocaleString()}</span>
                    </td>
                    <td className="games-col">
                      <span className="games-value">{entry.gamesPlayed}</span>
                      <span className="games-won">({entry.gamesWon} won)</span>
                    </td>
                    <td className="winrate-col">
                      <div className="winrate-container">
                        <span className={`winrate-value ${entry.winRate >= 70 ? 'high' : entry.winRate >= 40 ? 'medium' : 'low'}`}>
                          {entry.winRate}%
                        </span>
                        <div className="winrate-bar">
                          <div 
                            className={`winrate-fill ${entry.winRate >= 70 ? 'high' : entry.winRate >= 40 ? 'medium' : 'low'}`}
                            style={{ width: `${entry.winRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

