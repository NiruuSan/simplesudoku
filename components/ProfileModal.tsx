'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

interface UserStats {
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

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'stats'>('profile');
  
  // Profile state
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setEmail(user.email);
      setUsername(user.username);
      setProfilePicture(user.profilePicture || null);
      setMessage(null);
      loadStats();
    }
  }, [isOpen, user]);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/user/stats');
      const data = await res.json();
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be less than 2MB' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setProfilePicture(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, profilePicture }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
        return;
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      if (refreshUser) {
        await refreshUser();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to update password' });
        return;
      }

      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update password' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number | null): string => {
    if (seconds === null || seconds === 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getWinRate = (won: number, total: number): string => {
    if (total === 0) return '0%';
    return `${Math.round((won / total) * 100)}%`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>×</button>
        
        <div className="profile-tabs">
          <button 
            className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Profile
          </button>
          <button 
            className={`profile-tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
            Statistics
          </button>
        </div>

        {message && (
          <div className={`profile-message ${message.type}`}>
            {message.text}
          </div>
        )}

        {activeTab === 'profile' ? (
          <div className="profile-content">
            {/* Profile Picture Section */}
            <div className="profile-picture-section">
              <div 
                className="profile-picture-container"
                onClick={() => fileInputRef.current?.click()}
              >
                {profilePicture ? (
                  <img src={profilePicture} alt="Profile" className="profile-picture" />
                ) : (
                  <div className="profile-picture-placeholder">
                    {username?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <div className="profile-picture-overlay">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
                style={{ display: 'none' }}
              />
              <p className="profile-picture-hint">Click to change photo</p>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleUpdateProfile} className="profile-form">
              <h3>Account Information</h3>
              
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={3}
                  required
                />
              </div>

              <button type="submit" className="profile-submit-btn" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>

            {/* Password Form */}
            <form onSubmit={handleUpdatePassword} className="profile-form password-form">
              <h3>Change Password</h3>
              
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              <button type="submit" className="profile-submit-btn secondary" disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        ) : (
          <div className="stats-content">
            {statsLoading ? (
              <div className="stats-loading">Loading statistics...</div>
            ) : stats ? (
              <>
                {/* Overview Cards */}
                <div className="stats-overview">
                  <div className="stat-card">
                    <div className="stat-value">{stats.gamesPlayed}</div>
                    <div className="stat-label">Games Played</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.gamesWon.total}</div>
                    <div className="stat-label">Games Won</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{getWinRate(stats.gamesWon.total, stats.gamesPlayed)}</div>
                    <div className="stat-label">Win Rate</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.totalScore.toLocaleString()}</div>
                    <div className="stat-label">Total Score</div>
                  </div>
                </div>

                {/* Wins by Difficulty */}
                <div className="stats-section">
                  <h3>Wins by Difficulty</h3>
                  <div className="difficulty-stats">
                    {(['easy', 'medium', 'hard', 'extreme'] as const).map((diff) => (
                      <div key={diff} className={`difficulty-stat ${diff}`}>
                        <div className="difficulty-label">{diff.charAt(0).toUpperCase() + diff.slice(1)}</div>
                        <div className="difficulty-value">{stats.gamesWon[diff]}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Average Times */}
                <div className="stats-section">
                  <h3>Average Completion Times</h3>
                  <div className="time-stats">
                    <div className="time-stat overall">
                      <div className="time-label">Overall</div>
                      <div className="time-value">{formatTime(stats.averageTime.overall)}</div>
                    </div>
                    {(['easy', 'medium', 'hard', 'extreme'] as const).map((diff) => (
                      <div key={diff} className={`time-stat ${diff}`}>
                        <div className="time-label">{diff.charAt(0).toUpperCase() + diff.slice(1)}</div>
                        <div className="time-value">{formatTime(stats.averageTime[diff])}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Best Times */}
                <div className="stats-section">
                  <h3>Best Times</h3>
                  <div className="time-stats best-times">
                    {(['easy', 'medium', 'hard', 'extreme'] as const).map((diff) => (
                      <div key={diff} className={`time-stat ${diff}`}>
                        <div className="time-label">{diff.charAt(0).toUpperCase() + diff.slice(1)}</div>
                        <div className="time-value best">{formatTime(stats.bestTimes[diff])}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="stats-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 20V10M12 20V4M6 20v-6" />
                </svg>
                <p>No statistics yet</p>
                <span>Complete some games to see your stats!</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

