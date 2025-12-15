'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  isGroupComplete,
  getRowIndices,
  getColIndices,
  getBoxIndices,
  isPuzzleSolved,
  calculateScore,
  getTodayDateString
} from '@/lib/sudoku';

export default function DailyChallengePage() {
  const [grid, setGrid] = useState<number[]>(Array(81).fill(0));
  const [solution, setSolution] = useState<number[]>(Array(81).fill(0));
  const [given, setGiven] = useState<boolean[]>(Array(81).fill(false));
  const [notes, setNotes] = useState<Set<number>[]>(Array(81).fill(null).map(() => new Set()));
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [comboTimer, setComboTimer] = useState(100);
  const [showWin, setShowWin] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [animatingCells, setAnimatingCells] = useState<Set<number>>(new Set());
  const [scorePopups, setScorePopups] = useState<{ id: number; x: number; y: number; points: number; type: string }[]>([]);
  const [scoredCells, setScoredCells] = useState<Set<number>>(new Set());
  const [history, setHistory] = useState<{ grid: number[]; notes: Set<number>[]; scoredCells: Set<number> }[]>([]);
  const [gameStartTime, setGameStartTime] = useState<number>(Date.now());
  const [gameTime, setGameTime] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [loading, setLoading] = useState(true);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [previousRecord, setPreviousRecord] = useState<{ score: number; timeSeconds: number; won: boolean } | null>(null);
  const [todayDate, setTodayDate] = useState<string>('');
  
  const lastPlacementTime = useRef<number | null>(null);
  const comboIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const popupIdRef = useRef(0);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load daily challenge
  useEffect(() => {
    const loadDailyChallenge = async () => {
      setLoading(true);
      
      try {
        // Get today's date
        const today = getTodayDateString();
        setTodayDate(today);
        
        // Check if already completed
        const statusRes = await fetch(`/api/daily-challenge/record?date=${today}`);
        const statusData = await statusRes.json();
        
        if (statusData.completed && statusData.record) {
          setAlreadyCompleted(true);
          setPreviousRecord(statusData.record);
        }
        
        // Fetch daily puzzle
        const res = await fetch('/api/daily-challenge');
        const data = await res.json();
        
        if (data.puzzle && data.solution) {
          setGrid(data.puzzle);
          setSolution(data.solution);
          setGiven(data.puzzle.map((v: number) => v !== 0));
          setGameStartTime(Date.now());
        }
      } catch (error) {
        console.error('Failed to load daily challenge:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDailyChallenge();
  }, []);

  // Game timer
  useEffect(() => {
    if (showWin || showGameOver || loading || alreadyCompleted) {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
        gameTimerRef.current = null;
      }
      return;
    }

    gameTimerRef.current = setInterval(() => {
      setGameTime(Math.floor((Date.now() - gameStartTime) / 1000));
    }, 1000);

    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
    };
  }, [gameStartTime, showWin, showGameOver, loading, alreadyCompleted]);

  // Save game record
  const saveGameRecord = useCallback(async (finalScore: number, timeSeconds: number, won: boolean = true) => {
    try {
      await fetch('/api/daily-challenge/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: todayDate,
          completed: true,
          won,
          timeSeconds,
          score: finalScore,
        }),
      });
    } catch (error) {
      console.error('Failed to save daily challenge record:', error);
    }
  }, [todayDate]);

  // Combo decay timer
  const startComboDecay = useCallback(() => {
    if (comboIntervalRef.current) {
      clearInterval(comboIntervalRef.current);
    }
    
    const startTime = Date.now();
    const duration = 5000;
    
    comboIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      
      setComboTimer(remaining);
      
      if (remaining === 0) {
        setCombo(1);
        if (comboIntervalRef.current) {
          clearInterval(comboIntervalRef.current);
          comboIntervalRef.current = null;
        }
      }
    }, 50);
  }, []);

  // Show score popup
  const showScorePopup = useCallback((cellIndex: number, points: number, type: string = 'normal') => {
    const cellElement = document.querySelector(`[data-cell-index="${cellIndex}"]`);
    if (!cellElement) return;
    
    const rect = cellElement.getBoundingClientRect();
    const id = popupIdRef.current++;
    
    setScorePopups(prev => [...prev, {
      id,
      x: rect.left + rect.width / 2,
      y: rect.top,
      points,
      type
    }]);
    
    setTimeout(() => {
      setScorePopups(prev => prev.filter(p => p.id !== id));
    }, 1000);
  }, []);

  // Award points
  const awardPoints = useCallback((cellIndex: number) => {
    const now = Date.now();
    
    if (lastPlacementTime.current) {
      const timeSinceLastPlacement = now - lastPlacementTime.current;
      if (timeSinceLastPlacement < 2000) {
        const speedBonus = Math.floor((2000 - timeSinceLastPlacement) / 500);
        setCombo(c => Math.min(10, c + speedBonus));
      }
    }
    
    lastPlacementTime.current = now;
    const points = calculateScore(combo, 'hard');
    setScore(s => s + points);
    showScorePopup(cellIndex, points);
    startComboDecay();
  }, [combo, showScorePopup, startComboDecay]);

  // Check completions
  const checkCompletions = useCallback((cellIndex: number, currentGrid: number[]) => {
    const row = Math.floor(cellIndex / 9);
    const col = cellIndex % 9;
    const boxRow = Math.floor(row / 3);
    const boxCol = Math.floor(col / 3);
    
    const completedCells: number[] = [];
    
    const rowIndices = getRowIndices(row);
    if (isGroupComplete(currentGrid, rowIndices)) {
      completedCells.push(...rowIndices);
    }
    
    const colIndices = getColIndices(col);
    if (isGroupComplete(currentGrid, colIndices)) {
      completedCells.push(...colIndices);
    }
    
    const boxIndices = getBoxIndices(boxRow, boxCol);
    if (isGroupComplete(currentGrid, boxIndices)) {
      completedCells.push(...boxIndices);
    }
    
    if (completedCells.length > 0) {
      const uniqueCells = [...new Set(completedCells)];
      
      uniqueCells.forEach((cellIdx, i) => {
        setTimeout(() => {
          setAnimatingCells(prev => new Set([...prev, cellIdx]));
          
          setTimeout(() => {
            setAnimatingCells(prev => {
              const next = new Set(prev);
              next.delete(cellIdx);
              return next;
            });
          }, 500);
        }, i * 30);
      });
    }
  }, []);

  // Save to history
  const saveToHistory = useCallback(() => {
    setHistory(prev => [...prev, {
      grid: [...grid],
      notes: notes.map(n => new Set(n)),
      scoredCells: new Set(scoredCells)
    }]);
  }, [grid, notes, scoredCells]);

  // Undo
  const undo = useCallback(() => {
    if (history.length === 0) return;
    
    const lastState = history[history.length - 1];
    setGrid(lastState.grid);
    setNotes(lastState.notes);
    setScoredCells(lastState.scoredCells);
    setHistory(prev => prev.slice(0, -1));
    setCombo(1);
  }, [history]);

  // Input number
  const inputNumber = (num: number) => {
    if (selectedCell === null || given[selectedCell]) return;
    if (showWin || showGameOver || lives <= 0 || alreadyCompleted) return;
    
    saveToHistory();

    if (notesMode) {
      setNotes(prev => {
        const newNotes = [...prev];
        const cellNotes = new Set(newNotes[selectedCell]);
        if (cellNotes.has(num)) {
          cellNotes.delete(num);
        } else {
          cellNotes.add(num);
        }
        newNotes[selectedCell] = cellNotes;
        return newNotes;
      });
    } else {
      const newGrid = [...grid];
      newGrid[selectedCell] = num;
      setGrid(newGrid);
      
      // Clear notes for this cell and related cells
      setNotes(prev => {
        const newNotes = prev.map((cellNotes, idx) => {
          if (idx === selectedCell) {
            return new Set<number>();
          }
          
          const row = Math.floor(selectedCell / 9);
          const col = selectedCell % 9;
          const cellRow = Math.floor(idx / 9);
          const cellCol = idx % 9;
          const boxRow = Math.floor(row / 3);
          const boxCol = Math.floor(col / 3);
          const cellBoxRow = Math.floor(cellRow / 3);
          const cellBoxCol = Math.floor(cellCol / 3);
          
          if (cellRow === row || cellCol === col || (cellBoxRow === boxRow && cellBoxCol === boxCol)) {
            const updated = new Set(cellNotes);
            updated.delete(num);
            return updated;
          }
          
          return cellNotes;
        });
        return newNotes;
      });
      
      if (num === solution[selectedCell]) {
        if (!scoredCells.has(selectedCell)) {
          awardPoints(selectedCell);
          setScoredCells(prev => new Set([...prev, selectedCell]));
        }
        
        checkCompletions(selectedCell, newGrid);
        
        if (isPuzzleSolved(newGrid, solution)) {
          if (comboIntervalRef.current) {
            clearInterval(comboIntervalRef.current);
          }
          const finalTime = Math.floor((Date.now() - gameStartTime) / 1000);
          const lastPoints = !scoredCells.has(selectedCell) ? calculateScore(combo, 'hard') : 0;
          const finalScore = score + lastPoints;
          saveGameRecord(finalScore, finalTime, true);
          setTimeout(() => setShowWin(true), 100);
        }
      } else {
        setScore(s => Math.max(0, s - 30));
        setCombo(1);
        setComboTimer(100);
        
        setLives(currentLives => {
          const newLives = currentLives - 1;
          if (newLives <= 0) {
            if (comboIntervalRef.current) {
              clearInterval(comboIntervalRef.current);
            }
            const finalTime = Math.floor((Date.now() - gameStartTime) / 1000);
            saveGameRecord(score, finalTime, false);
            setTimeout(() => setShowGameOver(true), 100);
          }
          return newLives;
        });
      }
    }
  };

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '9') {
        inputNumber(parseInt(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'z' || e.key === 'Z') {
        undo();
      } else if (e.key === 'n' || e.key === 'N') {
        setNotesMode(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, notesMode, given, grid, solution, combo, score, scoredCells, lives, showWin, showGameOver, gameStartTime, alreadyCompleted]);

  // Get cell classes
  const getCellClasses = (index: number, value: number): string => {
    const classes = ['cell'];
    
    if (selectedCell === index) {
      classes.push('selected');
    } else if (selectedCell !== null) {
      const selRow = Math.floor(selectedCell / 9);
      const selCol = selectedCell % 9;
      const row = Math.floor(index / 9);
      const col = index % 9;
      
      if (row === selRow || col === selCol) {
        classes.push('highlighted-line');
      }
      
      const selValue = grid[selectedCell];
      if (selValue !== 0 && value === selValue) {
        classes.push('highlighted-same');
      }
    }
    
    if (given[index]) {
      classes.push('given');
    } else if (value !== 0) {
      classes.push('user-input');
      if (value !== solution[index]) {
        classes.push('error');
      }
    }
    
    if (animatingCells.has(index)) {
      classes.push('complete-animate');
    }
    
    return classes.join(' ');
  };

  // Render cell content
  const renderCellContent = (index: number, value: number) => {
    if (value !== 0) {
      return value;
    }
    
    const cellNotes = notes[index];
    if (cellNotes && cellNotes.size > 0) {
      const selValue = selectedCell !== null ? grid[selectedCell] : 0;
      
      return (
        <div className="notes-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => {
            const hasNote = cellNotes.has(n);
            return (
              <span
                key={n}
                className={`note ${hasNote && selValue === n ? 'highlighted' : ''}`}
              >
                {hasNote ? n : ''}
              </span>
            );
          })}
        </div>
      );
    }
    
    return null;
  };

  // Render grid
  const renderGrid = () => {
    const boxes = [];
    for (let boxRow = 0; boxRow < 3; boxRow++) {
      for (let boxCol = 0; boxCol < 3; boxCol++) {
        const cells = [];
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const row = boxRow * 3 + r;
            const col = boxCol * 3 + c;
            const index = row * 9 + col;
            const value = grid[index];
            
            cells.push(
              <div
                key={index}
                data-cell-index={index}
                className={getCellClasses(index, value)}
                onClick={() => !alreadyCompleted && setSelectedCell(index)}
              >
                {renderCellContent(index, value)}
              </div>
            );
          }
        }
        boxes.push(
          <div key={`box-${boxRow}-${boxCol}`} className="box">
            {cells}
          </div>
        );
      }
    }
    return boxes;
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="daily-challenge-page">
        <div className="daily-loading">
          <div className="loading-spinner"></div>
          <p>Loading Daily Challenge...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="daily-challenge-page">
      <div className="container">
        <header className="header">
          <Link href="/" className="back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Game
          </Link>
          <h1 className="daily-title">📅 Daily Challenge</h1>
          <p className="daily-date">{todayDate && formatDate(todayDate)}</p>
          <div className="daily-badge">Hard Difficulty</div>
        </header>

        {alreadyCompleted && previousRecord ? (
          <div className="already-completed">
            <div className="completed-icon">✅</div>
            <h2>You've completed today's challenge!</h2>
            <div className="completed-stats">
              <div className="completed-stat">
                <span className="stat-label">Score</span>
                <span className="stat-value">{previousRecord.score}</span>
              </div>
              <div className="completed-stat">
                <span className="stat-label">Time</span>
                <span className="stat-value">
                  {Math.floor(previousRecord.timeSeconds / 60)}:{(previousRecord.timeSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="completed-stat">
                <span className="stat-label">Result</span>
                <span className={`stat-value ${previousRecord.won ? 'won' : 'lost'}`}>
                  {previousRecord.won ? '🏆 Won' : '❌ Lost'}
                </span>
              </div>
            </div>
            <p className="comeback-text">Come back tomorrow for a new challenge!</p>
            <Link href="/" className="play-regular-btn">
              Play Regular Game
            </Link>
          </div>
        ) : (
          <main>
            <div className="score-panel">
              <div className="score-display">
                <span className="score-label">Score</span>
                <span className="score-value">{score}</span>
              </div>
              <div className="lives-display">
                <span className="score-label">Lives</span>
                <div className="lives-hearts">
                  {[1, 2, 3].map(i => (
                    <span key={i} className={`heart ${i <= lives ? 'active' : 'lost'}`}>
                      ♥
                    </span>
                  ))}
                </div>
              </div>
              <div className="time-display">
                <span className="score-label">Time</span>
                <span className="time-value">{Math.floor(gameTime / 60)}:{(gameTime % 60).toString().padStart(2, '0')}</span>
              </div>
              <div className="combo-display">
                <span className="score-label">Combo</span>
                <span className={`combo-value ${combo > 1 ? 'active' : ''}`}>x{combo}</span>
                <div className="combo-timer">
                  <div
                    className={`combo-timer-fill ${comboTimer < 20 ? 'critical' : comboTimer < 50 ? 'warning' : ''}`}
                    style={{ width: `${comboTimer}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="sudoku-grid">
              {renderGrid()}
            </div>

            <div className="number-pad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                const count = grid.filter(v => v === num).length;
                const isComplete = count >= 9;
                return (
                  <button
                    key={num}
                    className={`num-btn ${isComplete ? 'completed' : ''}`}
                    onClick={() => inputNumber(num)}
                    disabled={isComplete}
                  >
                    {num}
                  </button>
                );
              })}
            </div>

            <div className="action-buttons">
              <button
                className={`action-btn ${notesMode ? 'active' : ''}`}
                onClick={() => setNotesMode(!notesMode)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Notes</span>
              </button>
              <button className="action-btn" onClick={undo} disabled={history.length === 0}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7v6h6" />
                  <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                </svg>
                <span>Undo</span>
              </button>
            </div>
          </main>
        )}

        {/* Score popups */}
        {scorePopups.map(popup => (
          <div
            key={popup.id}
            className={`score-popup ${popup.type}`}
            style={{ left: popup.x, top: popup.y }}
          >
            +{popup.points}
          </div>
        ))}

        {/* Win modal */}
        {showWin && (
          <div className="win-modal">
            <div className="modal-content">
              <h2>🎉 Daily Challenge Complete!</h2>
              <p>You solved today's puzzle!</p>
              <div className="final-score">{score}</div>
              <p>points</p>
              <div className="final-time">
                Time: {Math.floor(gameTime / 60)}:{(gameTime % 60).toString().padStart(2, '0')}
              </div>
              <Link href="/leaderboard" className="play-again-btn">
                View Leaderboard
              </Link>
            </div>
          </div>
        )}

        {/* Game over modal */}
        {showGameOver && (
          <div className="game-over-modal">
            <div className="modal-content game-over">
              <h2>💔 Challenge Failed</h2>
              <p>You ran out of lives!</p>
              <div className="final-score game-over">{score}</div>
              <p>points</p>
              <div className="final-time">
                Time: {Math.floor(gameTime / 60)}:{(gameTime % 60).toString().padStart(2, '0')}
              </div>
              <p className="comeback-text">Try again tomorrow!</p>
              <Link href="/" className="play-again-btn">
                Play Regular Game
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



