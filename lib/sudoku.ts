// Sudoku game logic

export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme';

const DIFFICULTY_CELLS: Record<Difficulty, number> = {
  easy: 45,
  medium: 35,
  hard: 28,
  extreme: 22
};

const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1,
  medium: 1.5,
  hard: 2,
  extreme: 3
};

// Seeded random number generator (Mulberry32)
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

// Get seed from date string (YYYY-MM-DD)
export function getDateSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Shuffle array using seeded random
function shuffleArraySeeded<T>(array: T[], rng: SeededRandom): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Shuffle array in place using Fisher-Yates
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Check if a number can be placed at a position (for generation)
function canPlace(grid: number[], row: number, col: number, num: number): boolean {
  // Check row
  for (let c = 0; c < 9; c++) {
    if (grid[row * 9 + c] === num) return false;
  }
  
  // Check column
  for (let r = 0; r < 9; r++) {
    if (grid[r * 9 + col] === num) return false;
  }
  
  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (grid[(boxRow + r) * 9 + (boxCol + c)] === num) return false;
    }
  }
  
  return true;
}

// Generate a complete valid Sudoku grid using backtracking
export function generateCompleteGrid(): number[] {
  const grid: number[] = Array(81).fill(0);
  
  function solve(pos: number): boolean {
    // If we've filled all cells, we're done
    if (pos === 81) return true;
    
    const row = Math.floor(pos / 9);
    const col = pos % 9;
    
    // Try numbers 1-9 in random order for variety
    const numbers = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    
    for (const num of numbers) {
      if (canPlace(grid, row, col, num)) {
        grid[pos] = num;
        
        if (solve(pos + 1)) {
          return true;
        }
        
        // Backtrack
        grid[pos] = 0;
      }
    }
    
    return false;
  }
  
  solve(0);
  return grid;
}

// Verify a grid is valid (no conflicts)
export function isValidGrid(grid: number[]): boolean {
  // Check all rows
  for (let row = 0; row < 9; row++) {
    const seen = new Set<number>();
    for (let col = 0; col < 9; col++) {
      const val = grid[row * 9 + col];
      if (val !== 0) {
        if (seen.has(val)) return false;
        seen.add(val);
      }
    }
  }
  
  // Check all columns
  for (let col = 0; col < 9; col++) {
    const seen = new Set<number>();
    for (let row = 0; row < 9; row++) {
      const val = grid[row * 9 + col];
      if (val !== 0) {
        if (seen.has(val)) return false;
        seen.add(val);
      }
    }
  }
  
  // Check all 3x3 boxes
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const seen = new Set<number>();
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const val = grid[(boxRow * 3 + r) * 9 + (boxCol * 3 + c)];
          if (val !== 0) {
            if (seen.has(val)) return false;
            seen.add(val);
          }
        }
      }
    }
  }
  
  return true;
}

// Create puzzle by removing cells from complete grid
export function createPuzzle(
  difficulty: Difficulty
): { puzzle: number[]; solution: number[] } {
  // Generate a complete valid grid
  const solution = generateCompleteGrid();
  
  // Verify the solution is valid
  if (!isValidGrid(solution)) {
    console.error('Generated invalid grid, retrying...');
    return createPuzzle(difficulty);
  }
  
  const cellsToReveal = DIFFICULTY_CELLS[difficulty];
  const cellsToRemove = 81 - cellsToReveal;
  
  // Create puzzle by removing cells
  const puzzle = [...solution];
  const positions = shuffleArray(Array.from({ length: 81 }, (_, i) => i));
  
  let removed = 0;
  for (const pos of positions) {
    if (removed >= cellsToRemove) break;
    puzzle[pos] = 0;
    removed++;
  }
  
  return { puzzle, solution };
}

// Check if a number can be placed at a position (for gameplay validation)
export function isValidPlacement(
  grid: number[],
  index: number,
  num: number
): boolean {
  const row = Math.floor(index / 9);
  const col = index % 9;

  // Check row
  for (let c = 0; c < 9; c++) {
    if (c !== col && grid[row * 9 + c] === num) return false;
  }

  // Check column
  for (let r = 0; r < 9; r++) {
    if (r !== row && grid[r * 9 + col] === num) return false;
  }

  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const idx = (boxRow + r) * 9 + (boxCol + c);
      if (idx !== index && grid[idx] === num) return false;
    }
  }

  return true;
}

// Check if a group (row, col, or box) is complete
export function isGroupComplete(grid: number[], indices: number[]): boolean {
  const values = indices.map(i => grid[i]).filter(v => v !== 0);
  if (values.length !== 9) return false;
  return new Set(values).size === 9;
}

// Get indices for a row
export function getRowIndices(row: number): number[] {
  return Array.from({ length: 9 }, (_, i) => row * 9 + i);
}

// Get indices for a column
export function getColIndices(col: number): number[] {
  return Array.from({ length: 9 }, (_, i) => i * 9 + col);
}

// Get indices for a 3x3 box
export function getBoxIndices(boxRow: number, boxCol: number): number[] {
  const indices: number[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      indices.push((boxRow * 3 + r) * 9 + (boxCol * 3 + c));
    }
  }
  return indices;
}

// Check if puzzle is solved
export function isPuzzleSolved(grid: number[], solution: number[]): boolean {
  return grid.every((val, i) => val === solution[i]);
}

// Calculate score for a placement
export function calculateScore(
  combo: number,
  difficulty: Difficulty
): number {
  const basePoints = 10;
  const multiplier = DIFFICULTY_MULTIPLIER[difficulty];
  return Math.floor(basePoints * combo * multiplier);
}

// Get difficulty multiplier
export function getDifficultyMultiplier(difficulty: Difficulty): number {
  return DIFFICULTY_MULTIPLIER[difficulty];
}

// Generate a complete valid Sudoku grid using backtracking with seeded RNG
export function generateSeededGrid(rng: SeededRandom): number[] {
  const grid: number[] = Array(81).fill(0);
  
  function canPlaceSeeded(row: number, col: number, num: number): boolean {
    // Check row
    for (let c = 0; c < 9; c++) {
      if (grid[row * 9 + c] === num) return false;
    }
    
    // Check column
    for (let r = 0; r < 9; r++) {
      if (grid[r * 9 + col] === num) return false;
    }
    
    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (grid[(boxRow + r) * 9 + (boxCol + c)] === num) return false;
      }
    }
    
    return true;
  }
  
  function solve(pos: number): boolean {
    if (pos === 81) return true;
    
    const row = Math.floor(pos / 9);
    const col = pos % 9;
    
    // Use seeded shuffle for consistent generation
    const numbers = shuffleArraySeeded([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
    
    for (const num of numbers) {
      if (canPlaceSeeded(row, col, num)) {
        grid[pos] = num;
        
        if (solve(pos + 1)) {
          return true;
        }
        
        grid[pos] = 0;
      }
    }
    
    return false;
  }
  
  solve(0);
  return grid;
}

// Create daily challenge puzzle with a specific date seed
export function createDailyPuzzle(dateStr: string, difficulty: Difficulty = 'hard'): {
  puzzle: number[];
  solution: number[];
  date: string;
} {
  const seed = getDateSeed(dateStr);
  const rng = new SeededRandom(seed);
  
  // Generate seeded solution
  const solution = generateSeededGrid(rng);
  
  // Verify the solution is valid
  if (!isValidGrid(solution)) {
    // If somehow invalid, regenerate with different seed offset
    const rng2 = new SeededRandom(seed + 1);
    const solution2 = generateSeededGrid(rng2);
    return createDailyPuzzleFromSolution(solution2, rng2, dateStr, difficulty);
  }
  
  return createDailyPuzzleFromSolution(solution, rng, dateStr, difficulty);
}

function createDailyPuzzleFromSolution(
  solution: number[],
  rng: SeededRandom,
  dateStr: string,
  difficulty: Difficulty
): { puzzle: number[]; solution: number[]; date: string } {
  const cellsToReveal = DIFFICULTY_CELLS[difficulty];
  const cellsToRemove = 81 - cellsToReveal;
  
  // Create puzzle by removing cells using seeded shuffle
  const puzzle = [...solution];
  const positions = shuffleArraySeeded(Array.from({ length: 81 }, (_, i) => i), rng);
  
  let removed = 0;
  for (const pos of positions) {
    if (removed >= cellsToRemove) break;
    puzzle[pos] = 0;
    removed++;
  }
  
  return { puzzle, solution, date: dateStr };
}

// Get today's date string in YYYY-MM-DD format
export function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
