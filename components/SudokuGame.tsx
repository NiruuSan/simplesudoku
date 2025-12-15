'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Difficulty,
  createPuzzle,
  isValidPlacement,
  isGroupComplete,
  getRowIndices,
  getColIndices,
  getBoxIndices,
  isPuzzleSolved,
  calculateScore
} from '@/lib/sudoku';
import { getHint, getStoredHints, setStoredHints, addHint, useHint, Hint, HintHighlight } from '@/lib/hints';

interface SudokuGameProps {
  isDailyChallenge?: boolean;
}

export default function SudokuGame({ isDailyChallenge = false }: SudokuGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
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
  const [animatingCells, setAnimatingCells] = useState<Set<number>>(new Set());
  const [scorePopups, setScorePopups] = useState<{ id: number; x: number; y: number; points: number; type: string }[]>([]);
  const [scoredCells, setScoredCells] = useState<Set<number>>(new Set()); // Track cells that already awarded points
  const [history, setHistory] = useState<{ grid: number[]; notes: Set<number>[]; scoredCells: Set<number> }[]>([]); // Undo history
  const [gameStartTime, setGameStartTime] = useState<number>(Date.now()); // Track game start time
  const [gameTime, setGameTime] = useState<number>(0); // Elapsed time in seconds
  const [lives, setLives] = useState<number>(3); // Lives system - 3 lives per game
  const [showGameOver, setShowGameOver] = useState(false); // Game over modal
  const [availableHints, setAvailableHints] = useState<number>(0); // Hints available from storage
  const [hintsUsedThisGame, setHintsUsedThisGame] = useState<number>(0); // Hints used in current game (max 3)
  const [currentHint, setCurrentHint] = useState<Hint | null>(null); // Currently displayed hint
  const [hintedCell, setHintedCell] = useState<number | null>(null); // Cell that hint is pointing to
  const [noHintMessage, setNoHintMessage] = useState(false); // Show when no deducible hint available
  
  const lastPlacementTime = useRef<number | null>(null);
  const comboIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const popupIdRef = useRef(0);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load available hints from storage on mount
  useEffect(() => {
    setAvailableHints(getStoredHints());
  }, []);

  // Generate new game
  const newGame = useCallback((diff: Difficulty = difficulty) => {
    const { puzzle, solution: sol } = createPuzzle(diff);
    
    setGrid(puzzle);
    setSolution(sol);
    setGiven(puzzle.map(v => v !== 0));
    setNotes(Array(81).fill(null).map(() => new Set()));
    setSelectedCell(null);
    setScore(0);
    setCombo(1);
    setComboTimer(100);
    setShowWin(false);
    setShowGameOver(false);
    setLives(3); // Reset lives
    setAnimatingCells(new Set());
    setScoredCells(new Set()); // Reset scored cells tracking
    setHistory([]); // Reset undo history
    setGameStartTime(Date.now()); // Reset game start time
    setGameTime(0); // Reset elapsed time
    setHintsUsedThisGame(0); // Reset hints used this game
    setCurrentHint(null); // Clear current hint
    setHintedCell(null); // Clear hinted cell
    lastPlacementTime.current = null;
    
    if (comboIntervalRef.current) {
      clearInterval(comboIntervalRef.current);
      comboIntervalRef.current = null;
    }
  }, [difficulty]);

  // Game timer - updates every second
  useEffect(() => {
    if (showWin || showGameOver) {
      // Stop timer when game is won or lost
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
  }, [gameStartTime, showWin, showGameOver]);

  // Save game record when game is won
  const saveGameRecord = useCallback(async (finalScore: number, timeSeconds: number, won: boolean = true) => {
    try {
      await fetch('/api/game/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          difficulty,
          completed: true,
          won,
          timeSeconds,
          score: finalScore,
        }),
      });
    } catch (error) {
      console.error('Failed to save game record:', error);
    }
  }, [difficulty]);

  // Initialize game
  useEffect(() => {
    newGame();
  }, []);

  // Handle difficulty change
  const handleDifficultyChange = (diff: Difficulty) => {
    setDifficulty(diff);
    newGame(diff);
  };

  // Start combo decay timer
  const startComboDecay = useCallback(() => {
    if (comboIntervalRef.current) {
      clearInterval(comboIntervalRef.current);
    }
    
    const startTime = Date.now();
    const duration = 5000; // 5 seconds
    
    comboIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, ((duration - elapsed) / duration) * 100);
      setComboTimer(remaining);
      
      if (remaining <= 0) {
        setCombo(1);
        lastPlacementTime.current = null;
        if (comboIntervalRef.current) {
          clearInterval(comboIntervalRef.current);
          comboIntervalRef.current = null;
        }
      }
    }, 50);
  }, []);

  // Show score popup
  const showScorePopup = (cellIndex: number, points: number) => {
    const cellEl = document.querySelector(`[data-cell="${cellIndex}"]`);
    if (!cellEl) return;
    
    const rect = cellEl.getBoundingClientRect();
    const id = popupIdRef.current++;
    const type = combo >= 8 ? 'super' : combo >= 4 ? 'bonus' : '';
    
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
  };

  // Award points
  const awardPoints = (cellIndex: number) => {
    const now = Date.now();
    
    if (lastPlacementTime.current !== null) {
      const timeDiff = now - lastPlacementTime.current;
      if (timeDiff < 3000) {
        const speedBonus = Math.max(1, Math.floor((3000 - timeDiff) / 500));
        setCombo(c => Math.min(10, c + speedBonus));
      }
    }
    
    lastPlacementTime.current = now;
    const points = calculateScore(combo, difficulty);
    setScore(s => s + points);
    showScorePopup(cellIndex, points);
    startComboDecay();
  };

  // Check and animate completions
  const checkCompletions = (index: number, currentGrid: number[]) => {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const boxRow = Math.floor(row / 3);
    const boxCol = Math.floor(col / 3);
    
    const cellsToAnimate: number[] = [];
    
    // Check row
    const rowIndices = getRowIndices(row);
    if (isGroupComplete(currentGrid, rowIndices)) {
      cellsToAnimate.push(...rowIndices);
    }
    
    // Check column
    const colIndices = getColIndices(col);
    if (isGroupComplete(currentGrid, colIndices)) {
      cellsToAnimate.push(...colIndices);
    }
    
    // Check box
    const boxIndices = getBoxIndices(boxRow, boxCol);
    if (isGroupComplete(currentGrid, boxIndices)) {
      cellsToAnimate.push(...boxIndices);
    }
    
    if (cellsToAnimate.length > 0) {
      const uniqueCells = [...new Set(cellsToAnimate)].sort((a, b) => a - b);
      
      uniqueCells.forEach((idx, i) => {
        setTimeout(() => {
          setAnimatingCells(prev => new Set([...prev, idx]));
          setTimeout(() => {
            setAnimatingCells(prev => {
              const next = new Set(prev);
              next.delete(idx);
              return next;
            });
          }, 500);
        }, i * 40);
      });
    }
  };

  // Save current state to history (for undo)
  const saveToHistory = () => {
    setHistory(prev => [...prev, {
      grid: [...grid],
      notes: notes.map(s => new Set(s)),
      scoredCells: new Set(scoredCells)
    }]);
  };

  // Undo last move
  const undo = () => {
    if (history.length === 0) return;
    
    const lastState = history[history.length - 1];
    setGrid(lastState.grid);
    setNotes(lastState.notes);
    setScoredCells(lastState.scoredCells);
    setHistory(prev => prev.slice(0, -1));
    
    // Reset combo to 1 when undoing
    setCombo(1);
    setComboTimer(100);
  };

  // Use a hint
  const requestHint = () => {
    // Check if hints are available and not exceeded limit
    if (isDailyChallenge) return; // No hints in daily challenge
    if (hintsUsedThisGame >= 3) return; // Max 3 hints per game
    if (availableHints <= 0) return; // No hints available
    if (showWin || showGameOver) return; // Game already ended
    
    // Get hint from solver - considers player's notes
    const hint = getHint(grid, solution, notes);
    
    if (!hint) {
      // No deducible hint available - show message but don't consume hint
      setNoHintMessage(true);
      setTimeout(() => setNoHintMessage(false), 3000);
      return;
    }
    
    // Consume a hint from storage
    if (useHint()) {
      setAvailableHints(prev => prev - 1);
      setHintsUsedThisGame(prev => prev + 1);
      setCurrentHint(hint);
      setHintedCell(hint.cellIndex);
      setSelectedCell(hint.cellIndex); // Select the hinted cell
    }
  };

  // Close hint display
  const closeHint = () => {
    setCurrentHint(null);
    // Keep hintedCell highlighted until user places a number
  };

  // Clear hinted cell when user places the correct number
  useEffect(() => {
    if (hintedCell !== null && grid[hintedCell] !== 0) {
      setHintedCell(null);
    }
  }, [grid, hintedCell]);

  // Handle number input
  const inputNumber = (num: number) => {
    if (selectedCell === null || given[selectedCell]) return;
    if (showWin || showGameOver || lives <= 0) return; // Prevent input when game ended
    
    // Save state before modification
    saveToHistory();
    
    if (notesMode) {
      // Toggle note
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
      // Check if the cell already has this number (prevent spam scoring)
      const previousValue = grid[selectedCell];
      
      // Place number
      const newGrid = [...grid];
      newGrid[selectedCell] = num;
      setGrid(newGrid);
      
      // Clear notes for this cell AND remove this number from related cells' notes
      const row = Math.floor(selectedCell / 9);
      const col = selectedCell % 9;
      const boxRow = Math.floor(row / 3);
      const boxCol = Math.floor(col / 3);
      
      setNotes(prev => {
        const newNotes = prev.map((cellNotes, idx) => {
          const cellRow = Math.floor(idx / 9);
          const cellCol = idx % 9;
          const cellBoxRow = Math.floor(cellRow / 3);
          const cellBoxCol = Math.floor(cellCol / 3);
          
          // If this is the selected cell, clear all notes
          if (idx === selectedCell) {
            return new Set<number>();
          }
          
          // If in same row, column, or box, remove the placed number from notes
          if (cellRow === row || cellCol === col || (cellBoxRow === boxRow && cellBoxCol === boxCol)) {
            const updatedNotes = new Set(cellNotes);
            updatedNotes.delete(num);
            return updatedNotes;
          }
          
          return cellNotes;
        });
        return newNotes;
      });
      
      // Check if this is the correct number
      if (num === solution[selectedCell]) {
        // Only award points if cell hasn't already been scored
        if (!scoredCells.has(selectedCell)) {
          awardPoints(selectedCell);
          // Mark this cell as scored (prevents erase+replace exploit)
          setScoredCells(prev => new Set([...prev, selectedCell]));
        }
        
        // Always check completions when correct number is placed
        checkCompletions(selectedCell, newGrid);
        
        // Check win
        if (isPuzzleSolved(newGrid, solution)) {
          if (comboIntervalRef.current) {
            clearInterval(comboIntervalRef.current);
          }
          // Calculate final time and save game record
          const finalTime = Math.floor((Date.now() - gameStartTime) / 1000);
          // Calculate what the final score will be (current score + points just awarded)
          const lastPoints = !scoredCells.has(selectedCell) ? calculateScore(combo, difficulty) : 0;
          const finalScore = score + lastPoints;
          saveGameRecord(finalScore, finalTime);
          
          // Award a hint for completing the game (not in daily challenge)
          if (!isDailyChallenge) {
            const newHintCount = addHint();
            setAvailableHints(newHintCount);
          }
          
          setTimeout(() => setShowWin(true), 100);
        }
      } else {
        // Wrong number - deduct 30 points, reset combo, and lose a life
        setScore(s => Math.max(0, s - 30));
        setCombo(1);
        setComboTimer(100);
        
        // Lose a life
        setLives(currentLives => {
          const newLives = currentLives - 1;
          if (newLives <= 0) {
            // Game over - stop timers
            if (comboIntervalRef.current) {
              clearInterval(comboIntervalRef.current);
            }
            // Save game record as lost
            const finalTime = Math.floor((Date.now() - gameStartTime) / 1000);
            saveGameRecord(score, finalTime, false); // false = did not win
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
        setNotesMode(m => !m);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, grid, notesMode, given]);

  // Get cell classes
  const getCellClasses = (index: number): string => {
    const classes = ['cell'];
    const value = grid[index];
    const row = Math.floor(index / 9);
    const col = index % 9;
    
    // Hint highlighting takes priority when a hint is active
    if (currentHint) {
      // Check if this cell is in any highlight group
      for (const highlight of currentHint.highlights) {
        if (highlight.cells.includes(index)) {
          switch (highlight.type) {
            case 'target':
              classes.push('hint-target');
              break;
            case 'eliminator':
              classes.push('hint-eliminator');
              break;
            case 'pair':
              classes.push('hint-pair');
              break;
            case 'triple':
              classes.push('hint-triple');
              break;
            case 'affected':
              classes.push('hint-affected');
              break;
          }
        }
      }
    } else {
      // Normal selection highlighting when no hint active
      if (selectedCell !== null) {
        const selRow = Math.floor(selectedCell / 9);
        const selCol = selectedCell % 9;
        
        if (index === selectedCell) {
          classes.push('selected');
        } else if (row === selRow || col === selCol) {
          classes.push('highlighted-line');
        }
        
        // Highlight same numbers
        const selValue = grid[selectedCell];
        if (selValue !== 0 && value === selValue) {
          classes.push('highlighted-same');
        }
      }
    }
    
    if (given[index]) {
      classes.push('given');
    } else if (value !== 0) {
      classes.push('user-input');
      // Show error if number doesn't match solution (wrong answer)
      if (value !== solution[index]) {
        classes.push('error');
      }
    }
    
    if (animatingCells.has(index)) {
      classes.push('complete-animate');
    }
    
    if (hintedCell === index && !currentHint) {
      classes.push('hinted');
    }
    
    return classes.join(' ');
  };

  // Render cell content
  const renderCellContent = (index: number) => {
    const value = grid[index];
    const cellNotes = notes[index];
    const selValue = selectedCell !== null ? grid[selectedCell] : null;
    
    if (value !== 0) {
      return <span className="value">{value}</span>;
    }
    
    if (cellNotes.size > 0) {
      return (
        <div className="notes-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => {
            const hasNote = cellNotes.has(n);
            return (
              <div
                key={n}
                className={`note ${hasNote ? '' : 'empty'} ${hasNote && selValue === n ? 'highlighted' : ''}`}
              >
                {hasNote ? n : ''}
              </div>
            );
          })}
        </div>
      );
    }
    
    return null;
  };

  // Render grid using nested 3x3 boxes for consistent borders
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
            
            cells.push(
              <div
                key={index}
                data-cell={index}
                className={getCellClasses(index)}
                onClick={() => setSelectedCell(index)}
              >
                {renderCellContent(index)}
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

  return (
    <div className="container">
      <header className="header">
        <div className="difficulty-selector">
          {(['easy', 'medium', 'hard', 'extreme'] as Difficulty[]).map(diff => (
            <button
              key={diff}
              className={`diff-btn ${difficulty === diff ? 'active' : ''}`}
              onClick={() => handleDifficultyChange(diff)}
            >
              {diff.charAt(0).toUpperCase() + diff.slice(1)}
            </button>
          ))}
        </div>
      </header>

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
            onClick={() => setNotesMode(m => !m)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span>Notes</span>
          </button>
          {!isDailyChallenge && (
            <button 
              className={`action-btn hint-btn ${availableHints <= 0 || hintsUsedThisGame >= 3 ? 'disabled' : ''}`}
              onClick={requestHint}
              disabled={availableHints <= 0 || hintsUsedThisGame >= 3}
              title={availableHints <= 0 ? 'No hints available. Complete games to earn hints!' : hintsUsedThisGame >= 3 ? 'Max 3 hints per game' : `${availableHints} hint${availableHints !== 1 ? 's' : ''} available`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>Hint ({availableHints})</span>
            </button>
          )}
          <button 
            className={`action-btn ${history.length === 0 ? 'disabled' : ''}`} 
            onClick={undo}
            disabled={history.length === 0}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 14L4 9l5-5" />
              <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
            </svg>
            <span>Undo</span>
          </button>
          <button className="action-btn" onClick={() => newGame()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
            <span>New</span>
          </button>
        </div>
      </main>

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
            <h2>🎉 Congratulations!</h2>
            <p>You solved the puzzle!</p>
            <div className="final-score">{score}</div>
            <p>points</p>
            <div className="final-time">
              Time: {Math.floor(gameTime / 60)}:{(gameTime % 60).toString().padStart(2, '0')}
            </div>
            <button className="play-again-btn" onClick={() => newGame()}>
              Play Again
            </button>
          </div>
        </div>
      )}

      {showGameOver && (
        <div className="game-over-modal">
          <div className="modal-content game-over">
            <h2>💔 Game Over</h2>
            <p>You ran out of lives!</p>
            <div className="final-score game-over">{score}</div>
            <p>points</p>
            <div className="final-time">
              Time: {Math.floor(gameTime / 60)}:{(gameTime % 60).toString().padStart(2, '0')}
            </div>
            <button className="play-again-btn" onClick={() => newGame()}>
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* No hint available message */}
      {noHintMessage && (
        <div className="no-hint-message">
          <span className="no-hint-icon">🤔</span>
          <div className="no-hint-text">
            <strong>No simple hint available</strong>
            <span>This puzzle requires advanced techniques. Try using notes to track possibilities!</span>
          </div>
        </div>
      )}

      {/* Hint panel - visual hint display */}
      {currentHint && (
        <div className="hint-panel">
          <div className="hint-panel-header">
            <div className="hint-panel-title">
              <span className="hint-icon">💡</span>
              <span className="hint-technique-badge">{currentHint.technique}</span>
            </div>
            <button className="hint-dismiss-btn" onClick={closeHint}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="hint-panel-body">
            <p className="hint-text">{currentHint.explanation}</p>
            
            <div className="hint-legend">
              {currentHint.highlights.some(h => h.type === 'target') && (
                <div className="hint-legend-item">
                  <span className="hint-legend-color target"></span>
                  <span>{currentHint.value !== 0 ? <>Place <strong>{currentHint.value}</strong> here</> : 'Target cell'}</span>
                </div>
              )}
              {currentHint.highlights.some(h => h.type === 'pair') && (
                <div className="hint-legend-item">
                  <span className="hint-legend-color pair"></span>
                  <span>Pair cells</span>
                </div>
              )}
              {currentHint.highlights.some(h => h.type === 'triple') && (
                <div className="hint-legend-item">
                  <span className="hint-legend-color triple"></span>
                  <span>Triple cells</span>
                </div>
              )}
              {currentHint.highlights.some(h => h.type === 'eliminator') && (
                <div className="hint-legend-item">
                  <span className="hint-legend-color eliminator"></span>
                  <span>Blocking numbers</span>
                </div>
              )}
              {currentHint.highlights.some(h => h.type === 'affected') && (
                <div className="hint-legend-item">
                  <span className="hint-legend-color affected"></span>
                  <span>Cells to update</span>
                </div>
              )}
            </div>
            
            {currentHint.eliminatedNumbers.length > 0 && (
              <div className="hint-eliminations">
                <span className="hint-elim-title">
                  {currentHint.value !== 0 ? `Why only ${currentHint.value}?` : 'Notes to remove:'}
                </span>
                <div className="hint-elim-list">
                  {currentHint.eliminatedNumbers.map((e, i) => (
                    <span key={i} className="hint-elim-item">
                      <span className="hint-elim-num">{e.number}</span>
                      <span className="hint-elim-reason">{e.reason}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="hint-panel-footer">
            <span className="hints-count">Hints used: {hintsUsedThisGame}/3 this game</span>
            <button className="hint-got-it-btn" onClick={closeHint}>Got it!</button>
          </div>
        </div>
      )}
    </div>
  );
}

