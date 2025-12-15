// Hint system - analyzes Sudoku board and provides visual explanations
// Implements all standard Sudoku solving techniques

export interface HintHighlight {
  cells: number[];
  type: 'target' | 'eliminator' | 'pair' | 'triple' | 'affected';
  number?: number;
}

export interface Hint {
  cellIndex: number;
  value: number;
  technique: string;
  explanation: string;
  highlights: HintHighlight[];
  eliminatedNumbers: { number: number; reason: string }[];
  notesToRemove?: { cell: number; number: number }[];
}

// Get row, column, and box for a cell
function getCellInfo(index: number) {
  const row = Math.floor(index / 9);
  const col = index % 9;
  const boxRow = Math.floor(row / 3);
  const boxCol = Math.floor(col / 3);
  return { row, col, boxRow, boxCol };
}

// Get all indices in a row
function getRowIndices(row: number): number[] {
  return Array.from({ length: 9 }, (_, i) => row * 9 + i);
}

// Get all indices in a column
function getColIndices(col: number): number[] {
  return Array.from({ length: 9 }, (_, i) => i * 9 + col);
}

// Get all indices in a 3x3 box
function getBoxIndices(boxRow: number, boxCol: number): number[] {
  const indices: number[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      indices.push((boxRow * 3 + r) * 9 + (boxCol * 3 + c));
    }
  }
  return indices;
}

// Check if two cells see each other (same row, column, or box)
function cellsSeeEachOther(a: number, b: number): boolean {
  const infoA = getCellInfo(a);
  const infoB = getCellInfo(b);
  return infoA.row === infoB.row || 
         infoA.col === infoB.col || 
         (infoA.boxRow === infoB.boxRow && infoA.boxCol === infoB.boxCol);
}

// Get possible values for a cell based on Sudoku rules
function getPossibleValues(grid: number[], index: number): number[] {
  if (grid[index] !== 0) return [];
  
  const { row, col, boxRow, boxCol } = getCellInfo(index);
  const used = new Set<number>();
  
  getRowIndices(row).forEach(i => { if (grid[i] !== 0) used.add(grid[i]); });
  getColIndices(col).forEach(i => { if (grid[i] !== 0) used.add(grid[i]); });
  getBoxIndices(boxRow, boxCol).forEach(i => { if (grid[i] !== 0) used.add(grid[i]); });
  
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => !used.has(n));
}

// Get candidates for a cell - uses notes if available, otherwise calculates
function getCandidates(grid: number[], notes: Set<number>[], index: number): number[] {
  if (grid[index] !== 0) return [];
  
  const possible = getPossibleValues(grid, index);
  const cellNotes = notes[index];
  
  // If player has notes, intersect with possible values
  if (cellNotes && cellNotes.size > 0) {
    return possible.filter(n => cellNotes.has(n));
  }
  
  return possible;
}

// Get all candidates for all cells
function getAllCandidates(grid: number[], notes: Set<number>[]): Set<number>[] {
  return Array.from({ length: 81 }, (_, i) => new Set(getCandidates(grid, notes, i)));
}

// Get elimination info for a cell
function getEliminationInfo(grid: number[], index: number): { number: number; reason: string; cell: number }[] {
  const { row, col, boxRow, boxCol } = getCellInfo(index);
  const eliminated: { number: number; reason: string; cell: number }[] = [];
  const seen = new Set<number>();
  
  getRowIndices(row).forEach(i => {
    if (grid[i] !== 0 && !seen.has(grid[i])) {
      seen.add(grid[i]);
      eliminated.push({ number: grid[i], reason: `row ${row + 1}`, cell: i });
    }
  });
  
  getColIndices(col).forEach(i => {
    if (grid[i] !== 0 && !seen.has(grid[i])) {
      seen.add(grid[i]);
      eliminated.push({ number: grid[i], reason: `column ${col + 1}`, cell: i });
    }
  });
  
  const boxNumber = boxRow * 3 + boxCol + 1;
  getBoxIndices(boxRow, boxCol).forEach(i => {
    if (grid[i] !== 0 && !seen.has(grid[i])) {
      seen.add(grid[i]);
      eliminated.push({ number: grid[i], reason: `box ${boxNumber}`, cell: i });
    }
  });
  
  return eliminated;
}

// ============ BEGINNER TECHNIQUES ============

// Last Free Cell - When a unit has only one empty cell
function findLastFreeCell(grid: number[], candidates: Set<number>[]): Hint | null {
  // Check rows
  for (let row = 0; row < 9; row++) {
    const indices = getRowIndices(row);
    const empty = indices.filter(i => grid[i] === 0);
    if (empty.length === 1) {
      const cell = empty[0];
      const value = candidates[cell].values().next().value;
      if (value) {
        return {
          cellIndex: cell,
          value,
          technique: 'Last Free Cell',
          explanation: `Row ${row + 1} has only one empty cell. The missing number is ${value}.`,
          highlights: [
            { cells: [cell], type: 'target' },
            { cells: indices.filter(i => grid[i] !== 0), type: 'eliminator' }
          ],
          eliminatedNumbers: []
        };
      }
    }
  }
  
  // Check columns
  for (let col = 0; col < 9; col++) {
    const indices = getColIndices(col);
    const empty = indices.filter(i => grid[i] === 0);
    if (empty.length === 1) {
      const cell = empty[0];
      const value = candidates[cell].values().next().value;
      if (value) {
        return {
          cellIndex: cell,
          value,
          technique: 'Last Free Cell',
          explanation: `Column ${col + 1} has only one empty cell. The missing number is ${value}.`,
          highlights: [
            { cells: [cell], type: 'target' },
            { cells: indices.filter(i => grid[i] !== 0), type: 'eliminator' }
          ],
          eliminatedNumbers: []
        };
      }
    }
  }
  
  // Check boxes
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const indices = getBoxIndices(boxRow, boxCol);
      const empty = indices.filter(i => grid[i] === 0);
      if (empty.length === 1) {
        const cell = empty[0];
        const value = candidates[cell].values().next().value;
        if (value) {
          const boxNum = boxRow * 3 + boxCol + 1;
          return {
            cellIndex: cell,
            value,
            technique: 'Last Free Cell',
            explanation: `Box ${boxNum} has only one empty cell. The missing number is ${value}.`,
            highlights: [
              { cells: [cell], type: 'target' },
              { cells: indices.filter(i => grid[i] !== 0), type: 'eliminator' }
            ],
            eliminatedNumbers: []
          };
        }
      }
    }
  }
  
  return null;
}

// Naked Single / Last Possible Number - Cell with only one candidate
function findNakedSingle(grid: number[], candidates: Set<number>[]): Hint | null {
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) continue;
    
    if (candidates[i].size === 1) {
      const value = candidates[i].values().next().value as number | undefined;
      // Safety guard for TypeScript – in practice size === 1 guarantees a value,
      // but we still handle the extremely unlikely undefined case.
      if (value === undefined) {
        continue;
      }
      const elimInfo = getEliminationInfo(grid, i);
      const { row, col } = getCellInfo(i);
      
      return {
        cellIndex: i,
        value,
        technique: 'Naked Single',
        explanation: `Cell R${row + 1}C${col + 1} can only be ${value}. All other numbers are blocked.`,
        highlights: [
          { cells: [i], type: 'target' },
          { cells: [...new Set(elimInfo.map(e => e.cell))], type: 'eliminator' }
        ],
        eliminatedNumbers: elimInfo.map(e => ({ number: e.number, reason: `in ${e.reason}` }))
      };
    }
  }
  return null;
}

// Hidden Single - Number can only go in one place in a unit
function findHiddenSingle(grid: number[], candidates: Set<number>[]): Hint | null {
  // Check rows
  for (let row = 0; row < 9; row++) {
    const indices = getRowIndices(row);
    
    for (let num = 1; num <= 9; num++) {
      if (indices.some(i => grid[i] === num)) continue;
      
      const possibleCells = indices.filter(i => candidates[i].has(num));
      
      if (possibleCells.length === 1) {
        const cell = possibleCells[0];
        const { col } = getCellInfo(cell);
        
        return {
          cellIndex: cell,
          value: num,
          technique: 'Hidden Single',
          explanation: `In row ${row + 1}, ${num} can only go at column ${col + 1}. Other cells are blocked.`,
          highlights: [
            { cells: [cell], type: 'target' },
            { cells: indices.filter(i => i !== cell && grid[i] === 0), type: 'affected' }
          ],
          eliminatedNumbers: []
        };
      }
    }
  }
  
  // Check columns
  for (let col = 0; col < 9; col++) {
    const indices = getColIndices(col);
    
    for (let num = 1; num <= 9; num++) {
      if (indices.some(i => grid[i] === num)) continue;
      
      const possibleCells = indices.filter(i => candidates[i].has(num));
      
      if (possibleCells.length === 1) {
        const cell = possibleCells[0];
        const { row } = getCellInfo(cell);
        
        return {
          cellIndex: cell,
          value: num,
          technique: 'Hidden Single',
          explanation: `In column ${col + 1}, ${num} can only go at row ${row + 1}. Other cells are blocked.`,
          highlights: [
            { cells: [cell], type: 'target' },
            { cells: indices.filter(i => i !== cell && grid[i] === 0), type: 'affected' }
          ],
          eliminatedNumbers: []
        };
      }
    }
  }
  
  // Check boxes
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const indices = getBoxIndices(boxRow, boxCol);
      const boxNum = boxRow * 3 + boxCol + 1;
      
      for (let num = 1; num <= 9; num++) {
        if (indices.some(i => grid[i] === num)) continue;
        
        const possibleCells = indices.filter(i => candidates[i].has(num));
        
        if (possibleCells.length === 1) {
          const cell = possibleCells[0];
          const { row, col } = getCellInfo(cell);
          
          return {
            cellIndex: cell,
            value: num,
            technique: 'Hidden Single',
            explanation: `In box ${boxNum}, ${num} can only go at R${row + 1}C${col + 1}. Other cells are blocked.`,
            highlights: [
              { cells: [cell], type: 'target' },
              { cells: indices.filter(i => i !== cell && grid[i] === 0), type: 'affected' }
            ],
            eliminatedNumbers: []
          };
        }
      }
    }
  }
  
  return null;
}

// ============ INTERMEDIATE TECHNIQUES ============

// Naked Pairs
function findNakedPairs(grid: number[], candidates: Set<number>[], notes: Set<number>[]): Hint | null {
  const checkUnit = (indices: number[], unitName: string): Hint | null => {
    const emptyCells = indices.filter(i => grid[i] === 0 && candidates[i].size === 2);
    
    for (let a = 0; a < emptyCells.length; a++) {
      for (let b = a + 1; b < emptyCells.length; b++) {
        const cellA = emptyCells[a];
        const cellB = emptyCells[b];
        const candsA = Array.from(candidates[cellA]);
        const candsB = Array.from(candidates[cellB]);
        
        if (candsA.length === 2 && candsB.length === 2 &&
            candsA[0] === candsB[0] && candsA[1] === candsB[1]) {
          // Found a naked pair
          const pairNums = candsA;
          const affected = indices.filter(i => 
            i !== cellA && i !== cellB && grid[i] === 0 &&
            (candidates[i].has(pairNums[0]) || candidates[i].has(pairNums[1]))
          );
          
          // Only show hint if there are actual player notes to remove
          const notesToRemove = affected.flatMap(cell => {
            const cellNotes = notes[cell];
            if (!cellNotes || cellNotes.size === 0) return [];
            return pairNums.filter(n => cellNotes.has(n)).map(n => ({ cell, number: n }));
          });
          
          if (notesToRemove.length > 0) {
            return {
              cellIndex: cellA,
              value: 0,
              technique: 'Naked Pairs',
              explanation: `Cells form a naked pair with {${pairNums.join(', ')}} in ${unitName}. These numbers can be removed from other cells.`,
              highlights: [
                { cells: [cellA, cellB], type: 'pair' },
                { cells: affected.filter(c => notes[c]?.size > 0), type: 'affected' }
              ],
              eliminatedNumbers: pairNums.map(n => ({ number: n, reason: 'forms naked pair' })),
              notesToRemove
            };
          }
        }
      }
    }
    return null;
  };
  
  // Check all rows
  for (let row = 0; row < 9; row++) {
    const result = checkUnit(getRowIndices(row), `row ${row + 1}`);
    if (result) return result;
  }
  
  // Check all columns
  for (let col = 0; col < 9; col++) {
    const result = checkUnit(getColIndices(col), `column ${col + 1}`);
    if (result) return result;
  }
  
  // Check all boxes
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const result = checkUnit(getBoxIndices(boxRow, boxCol), `box ${boxRow * 3 + boxCol + 1}`);
      if (result) return result;
    }
  }
  
  return null;
}

// Naked Triples
function findNakedTriples(grid: number[], candidates: Set<number>[], notes: Set<number>[]): Hint | null {
  const checkUnit = (indices: number[], unitName: string): Hint | null => {
    const emptyCells = indices.filter(i => grid[i] === 0 && candidates[i].size >= 2 && candidates[i].size <= 3);
    
    for (let a = 0; a < emptyCells.length; a++) {
      for (let b = a + 1; b < emptyCells.length; b++) {
        for (let c = b + 1; c < emptyCells.length; c++) {
          const cells = [emptyCells[a], emptyCells[b], emptyCells[c]];
          const allCands = new Set<number>();
          cells.forEach(cell => candidates[cell].forEach(n => allCands.add(n)));
          
          if (allCands.size === 3) {
            const tripleNums = Array.from(allCands);
            const affected = indices.filter(i => 
              !cells.includes(i) && grid[i] === 0 &&
              tripleNums.some(n => candidates[i].has(n))
            );
            
            // Only show hint if there are actual player notes to remove
            const notesToRemove = affected.flatMap(cell => {
              const cellNotes = notes[cell];
              if (!cellNotes || cellNotes.size === 0) return [];
              return tripleNums.filter(n => cellNotes.has(n)).map(n => ({ cell, number: n }));
            });
            
            if (notesToRemove.length > 0) {
              return {
                cellIndex: cells[0],
                value: 0,
                technique: 'Naked Triples',
                explanation: `Three cells form a naked triple with {${tripleNums.join(', ')}} in ${unitName}. Remove these from other cells.`,
                highlights: [
                  { cells, type: 'triple' },
                  { cells: affected.filter(c => notes[c]?.size > 0), type: 'affected' }
                ],
                eliminatedNumbers: tripleNums.map(n => ({ number: n, reason: 'forms naked triple' })),
                notesToRemove
              };
            }
          }
        }
      }
    }
    return null;
  };
  
  for (let row = 0; row < 9; row++) {
    const result = checkUnit(getRowIndices(row), `row ${row + 1}`);
    if (result) return result;
  }
  
  for (let col = 0; col < 9; col++) {
    const result = checkUnit(getColIndices(col), `column ${col + 1}`);
    if (result) return result;
  }
  
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const result = checkUnit(getBoxIndices(boxRow, boxCol), `box ${boxRow * 3 + boxCol + 1}`);
      if (result) return result;
    }
  }
  
  return null;
}

// Hidden Pairs
function findHiddenPairs(grid: number[], candidates: Set<number>[], notes: Set<number>[]): Hint | null {
  const checkUnit = (indices: number[], unitName: string): Hint | null => {
    const emptyCells = indices.filter(i => grid[i] === 0);
    
    for (let n1 = 1; n1 <= 9; n1++) {
      for (let n2 = n1 + 1; n2 <= 9; n2++) {
        const cellsWithN1 = emptyCells.filter(i => candidates[i].has(n1));
        const cellsWithN2 = emptyCells.filter(i => candidates[i].has(n2));
        
        if (cellsWithN1.length === 2 && cellsWithN2.length === 2 &&
            cellsWithN1[0] === cellsWithN2[0] && cellsWithN1[1] === cellsWithN2[1]) {
          const pairCells = cellsWithN1;
          
          // Only return hint if player has notes to remove
          const toRemove: { cell: number; number: number }[] = [];
          pairCells.forEach(cell => {
            const cellNotes = notes[cell];
            if (cellNotes && cellNotes.size > 0) {
              cellNotes.forEach(n => {
                if (n !== n1 && n !== n2 && getPossibleValues(grid, cell).includes(n)) {
                  toRemove.push({ cell, number: n });
                }
              });
            }
          });
          
          // Only show hint if there are actual notes to remove
          if (toRemove.length > 0) {
            return {
              cellIndex: pairCells[0],
              value: 0,
              technique: 'Hidden Pairs',
              explanation: `{${n1}, ${n2}} can only go in these two cells in ${unitName}. Remove other candidates from them.`,
              highlights: [
                { cells: pairCells, type: 'pair' }
              ],
              eliminatedNumbers: toRemove.map(t => ({ number: t.number, reason: 'hidden pair' })),
              notesToRemove: toRemove
            };
          }
        }
      }
    }
    return null;
  };
  
  for (let row = 0; row < 9; row++) {
    const result = checkUnit(getRowIndices(row), `row ${row + 1}`);
    if (result) return result;
  }
  
  for (let col = 0; col < 9; col++) {
    const result = checkUnit(getColIndices(col), `column ${col + 1}`);
    if (result) return result;
  }
  
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const result = checkUnit(getBoxIndices(boxRow, boxCol), `box ${boxRow * 3 + boxCol + 1}`);
      if (result) return result;
    }
  }
  
  return null;
}

// Hidden Triples
function findHiddenTriples(grid: number[], candidates: Set<number>[], notes: Set<number>[]): Hint | null {
  const checkUnit = (indices: number[], unitName: string): Hint | null => {
    const emptyCells = indices.filter(i => grid[i] === 0);
    
    for (let n1 = 1; n1 <= 9; n1++) {
      for (let n2 = n1 + 1; n2 <= 9; n2++) {
        for (let n3 = n2 + 1; n3 <= 9; n3++) {
          const cellsWithAny = emptyCells.filter(i => 
            candidates[i].has(n1) || candidates[i].has(n2) || candidates[i].has(n3)
          );
          
          if (cellsWithAny.length === 3) {
            // Only return hint if player has notes to remove
            const toRemove: { cell: number; number: number }[] = [];
            cellsWithAny.forEach(cell => {
              const cellNotes = notes[cell];
              if (cellNotes && cellNotes.size > 0) {
                cellNotes.forEach(n => {
                  if (n !== n1 && n !== n2 && n !== n3 && getPossibleValues(grid, cell).includes(n)) {
                    toRemove.push({ cell, number: n });
                  }
                });
              }
            });
            
            // Only show hint if there are actual notes to remove
            if (toRemove.length > 0) {
              return {
                cellIndex: cellsWithAny[0],
                value: 0,
                technique: 'Hidden Triples',
                explanation: `{${n1}, ${n2}, ${n3}} can only go in these three cells in ${unitName}. Remove other candidates.`,
                highlights: [
                  { cells: cellsWithAny, type: 'triple' }
                ],
                eliminatedNumbers: toRemove.map(t => ({ number: t.number, reason: 'hidden triple' })),
                notesToRemove: toRemove
              };
            }
          }
        }
      }
    }
    return null;
  };
  
  for (let row = 0; row < 9; row++) {
    const result = checkUnit(getRowIndices(row), `row ${row + 1}`);
    if (result) return result;
  }
  
  for (let col = 0; col < 9; col++) {
    const result = checkUnit(getColIndices(col), `column ${col + 1}`);
    if (result) return result;
  }
  
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const result = checkUnit(getBoxIndices(boxRow, boxCol), `box ${boxRow * 3 + boxCol + 1}`);
      if (result) return result;
    }
  }
  
  return null;
}

// Pointing Pairs/Triples
function findPointingPairs(grid: number[], candidates: Set<number>[], notes: Set<number>[]): Hint | null {
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const boxIndices = getBoxIndices(boxRow, boxCol);
      const boxNum = boxRow * 3 + boxCol + 1;
      
      for (let num = 1; num <= 9; num++) {
        if (boxIndices.some(i => grid[i] === num)) continue;
        
        const cellsWithNum = boxIndices.filter(i => candidates[i].has(num));
        if (cellsWithNum.length < 2 || cellsWithNum.length > 3) continue;
        
        // Check if all cells are in same row
        const rows = new Set(cellsWithNum.map(i => getCellInfo(i).row));
        if (rows.size === 1) {
          const rowIter = rows.values().next();
          if (rowIter.done || rowIter.value === undefined) {
            continue;
          }
          const row = rowIter.value as number;
          const rowIndices = getRowIndices(row);
          const affected = rowIndices.filter(i => 
            !boxIndices.includes(i) && candidates[i].has(num)
          );
          
          // Only show hint if there are actual player notes to remove
          const notesToRemove = affected.filter(cell => notes[cell]?.has(num)).map(cell => ({ cell, number: num }));
          
          if (notesToRemove.length > 0) {
            return {
              cellIndex: cellsWithNum[0],
              value: 0,
              technique: cellsWithNum.length === 2 ? 'Pointing Pairs' : 'Pointing Triples',
              explanation: `${num} in box ${boxNum} is limited to row ${row + 1}. Remove ${num} from other cells in this row.`,
              highlights: [
                { cells: cellsWithNum, type: cellsWithNum.length === 2 ? 'pair' : 'triple' },
                { cells: affected.filter(c => notes[c]?.has(num)), type: 'affected' }
              ],
              eliminatedNumbers: [{ number: num, reason: `pointing from box ${boxNum}` }],
              notesToRemove
            };
          }
        }
        
        // Check if all cells are in same column
        const cols = new Set(cellsWithNum.map(i => getCellInfo(i).col));
        if (cols.size === 1) {
          const colIter = cols.values().next();
          if (colIter.done || colIter.value === undefined) {
            continue;
          }
          const col = colIter.value as number;
          const colIndices = getColIndices(col);
          const affected = colIndices.filter(i => 
            !boxIndices.includes(i) && candidates[i].has(num)
          );
          
          // Only show hint if there are actual player notes to remove
          const notesToRemove = affected.filter(cell => notes[cell]?.has(num)).map(cell => ({ cell, number: num }));
          
          if (notesToRemove.length > 0) {
            return {
              cellIndex: cellsWithNum[0],
              value: 0,
              technique: cellsWithNum.length === 2 ? 'Pointing Pairs' : 'Pointing Triples',
              explanation: `${num} in box ${boxNum} is limited to column ${col + 1}. Remove ${num} from other cells in this column.`,
              highlights: [
                { cells: cellsWithNum, type: cellsWithNum.length === 2 ? 'pair' : 'triple' },
                { cells: affected.filter(c => notes[c]?.has(num)), type: 'affected' }
              ],
              eliminatedNumbers: [{ number: num, reason: `pointing from box ${boxNum}` }],
              notesToRemove
            };
          }
        }
      }
    }
  }
  
  return null;
}

// ============ ADVANCED TECHNIQUES ============

// X-Wing
function findXWing(grid: number[], candidates: Set<number>[], notes: Set<number>[]): Hint | null {
  for (let num = 1; num <= 9; num++) {
    // Check rows for X-Wing
    for (let row1 = 0; row1 < 9; row1++) {
      const row1Indices = getRowIndices(row1);
      const row1Cells = row1Indices.filter(i => candidates[i].has(num));
      
      if (row1Cells.length !== 2) continue;
      
      const cols = row1Cells.map(i => getCellInfo(i).col);
      
      for (let row2 = row1 + 1; row2 < 9; row2++) {
        const row2Indices = getRowIndices(row2);
        const row2Cells = row2Indices.filter(i => candidates[i].has(num));
        
        if (row2Cells.length !== 2) continue;
        
        const row2Cols = row2Cells.map(i => getCellInfo(i).col);
        
        if (cols[0] === row2Cols[0] && cols[1] === row2Cols[1]) {
          // Found X-Wing pattern
          const xWingCells = [...row1Cells, ...row2Cells];
          const affected: number[] = [];
          
          cols.forEach(col => {
            getColIndices(col).forEach(i => {
              if (!xWingCells.includes(i) && candidates[i].has(num)) {
                affected.push(i);
              }
            });
          });
          
          // Only show hint if there are actual player notes to remove
          const notesToRemove = affected.filter(cell => notes[cell]?.has(num)).map(cell => ({ cell, number: num }));
          
          if (notesToRemove.length > 0) {
            return {
              cellIndex: row1Cells[0],
              value: 0,
              technique: 'X-Wing',
              explanation: `X-Wing on ${num} in rows ${row1 + 1} & ${row2 + 1}, columns ${cols[0] + 1} & ${cols[1] + 1}. Remove ${num} from other cells in these columns.`,
              highlights: [
                { cells: xWingCells, type: 'pair' },
                { cells: affected.filter(c => notes[c]?.has(num)), type: 'affected' }
              ],
              eliminatedNumbers: [{ number: num, reason: 'X-Wing elimination' }],
              notesToRemove
            };
          }
        }
      }
    }
    
    // Check columns for X-Wing
    for (let col1 = 0; col1 < 9; col1++) {
      const col1Indices = getColIndices(col1);
      const col1Cells = col1Indices.filter(i => candidates[i].has(num));
      
      if (col1Cells.length !== 2) continue;
      
      const rows = col1Cells.map(i => getCellInfo(i).row);
      
      for (let col2 = col1 + 1; col2 < 9; col2++) {
        const col2Indices = getColIndices(col2);
        const col2Cells = col2Indices.filter(i => candidates[i].has(num));
        
        if (col2Cells.length !== 2) continue;
        
        const col2Rows = col2Cells.map(i => getCellInfo(i).row);
        
        if (rows[0] === col2Rows[0] && rows[1] === col2Rows[1]) {
          const xWingCells = [...col1Cells, ...col2Cells];
          const affected: number[] = [];
          
          rows.forEach(row => {
            getRowIndices(row).forEach(i => {
              if (!xWingCells.includes(i) && candidates[i].has(num)) {
                affected.push(i);
              }
            });
          });
          
          // Only show hint if there are actual player notes to remove
          const notesToRemove = affected.filter(cell => notes[cell]?.has(num)).map(cell => ({ cell, number: num }));
          
          if (notesToRemove.length > 0) {
            return {
              cellIndex: col1Cells[0],
              value: 0,
              technique: 'X-Wing',
              explanation: `X-Wing on ${num} in columns ${col1 + 1} & ${col2 + 1}, rows ${rows[0] + 1} & ${rows[1] + 1}. Remove ${num} from other cells in these rows.`,
              highlights: [
                { cells: xWingCells, type: 'pair' },
                { cells: affected.filter(c => notes[c]?.has(num)), type: 'affected' }
              ],
              eliminatedNumbers: [{ number: num, reason: 'X-Wing elimination' }],
              notesToRemove
            };
          }
        }
      }
    }
  }
  
  return null;
}

// Y-Wing
function findYWing(grid: number[], candidates: Set<number>[], notes: Set<number>[]): Hint | null {
  const biValueCells = Array.from({ length: 81 }, (_, i) => i)
    .filter(i => grid[i] === 0 && candidates[i].size === 2);
  
  for (const pivot of biValueCells) {
    const pivotCands = Array.from(candidates[pivot]);
    const [a, b] = pivotCands;
    
    // Find wings that share one candidate with pivot
    const wings = biValueCells.filter(cell => 
      cell !== pivot && 
      cellsSeeEachOther(pivot, cell) &&
      (candidates[cell].has(a) !== candidates[cell].has(b)) // XOR - has exactly one
    );
    
    for (let w1 = 0; w1 < wings.length; w1++) {
      for (let w2 = w1 + 1; w2 < wings.length; w2++) {
        const wing1 = wings[w1];
        const wing2 = wings[w2];
        
        const wing1Cands = Array.from(candidates[wing1]);
        const wing2Cands = Array.from(candidates[wing2]);
        
        // Wing1 has A and C, Wing2 has B and C (C is the common candidate)
        const wing1HasA = candidates[wing1].has(a);
        const wing2HasB = candidates[wing2].has(b);
        
        if (wing1HasA && wing2HasB) {
          const c1 = wing1Cands.find(n => n !== a);
          const c2 = wing2Cands.find(n => n !== b);
          
          if (c1 === c2 && c1 !== undefined) {
            const c = c1;
            
            // Find cells that see both wings and have candidate C
            const affected = Array.from({ length: 81 }, (_, i) => i)
              .filter(i => 
                i !== pivot && i !== wing1 && i !== wing2 &&
                grid[i] === 0 &&
                candidates[i].has(c) &&
                cellsSeeEachOther(i, wing1) &&
                cellsSeeEachOther(i, wing2)
              );
            
            // Only show hint if there are actual player notes to remove
            const notesToRemove = affected.filter(cell => notes[cell]?.has(c)).map(cell => ({ cell, number: c }));
            
            if (notesToRemove.length > 0) {
              return {
                cellIndex: pivot,
                value: 0,
                technique: 'Y-Wing',
                explanation: `Y-Wing: Pivot has {${a},${b}}, wings have {${a},${c}} and {${b},${c}}. Cells seeing both wings cannot have ${c}.`,
                highlights: [
                  { cells: [pivot], type: 'target' },
                  { cells: [wing1, wing2], type: 'pair' },
                  { cells: affected.filter(cell => notes[cell]?.has(c)), type: 'affected' }
                ],
                eliminatedNumbers: [{ number: c, reason: 'Y-Wing elimination' }],
                notesToRemove
              };
            }
          }
        }
        
        // Also check the reverse: Wing1 has B and C, Wing2 has A and C
        const wing1HasB = candidates[wing1].has(b);
        const wing2HasA = candidates[wing2].has(a);
        
        if (wing1HasB && wing2HasA) {
          const c1 = wing1Cands.find(n => n !== b);
          const c2 = wing2Cands.find(n => n !== a);
          
          if (c1 === c2 && c1 !== undefined) {
            const c = c1;
            
            const affected = Array.from({ length: 81 }, (_, i) => i)
              .filter(i => 
                i !== pivot && i !== wing1 && i !== wing2 &&
                grid[i] === 0 &&
                candidates[i].has(c) &&
                cellsSeeEachOther(i, wing1) &&
                cellsSeeEachOther(i, wing2)
              );
            
            // Only show hint if there are actual player notes to remove
            const notesToRemove = affected.filter(cell => notes[cell]?.has(c)).map(cell => ({ cell, number: c }));
            
            if (notesToRemove.length > 0) {
              return {
                cellIndex: pivot,
                value: 0,
                technique: 'Y-Wing',
                explanation: `Y-Wing: Pivot has {${a},${b}}, wings have {${b},${c}} and {${a},${c}}. Cells seeing both wings cannot have ${c}.`,
                highlights: [
                  { cells: [pivot], type: 'target' },
                  { cells: [wing1, wing2], type: 'pair' },
                  { cells: affected.filter(cell => notes[cell]?.has(c)), type: 'affected' }
                ],
                eliminatedNumbers: [{ number: c, reason: 'Y-Wing elimination' }],
                notesToRemove
              };
            }
          }
        }
      }
    }
  }
  
  return null;
}

// Swordfish
function findSwordfish(grid: number[], candidates: Set<number>[], notes: Set<number>[]): Hint | null {
  for (let num = 1; num <= 9; num++) {
    // Check rows for Swordfish
    const rowsWithNum: { row: number; cols: number[] }[] = [];
    
    for (let row = 0; row < 9; row++) {
      const rowIndices = getRowIndices(row);
      const cols = rowIndices
        .filter(i => candidates[i].has(num))
        .map(i => getCellInfo(i).col);
      
      if (cols.length >= 2 && cols.length <= 3) {
        rowsWithNum.push({ row, cols });
      }
    }
    
    // Find three rows that together cover exactly 3 columns
    for (let r1 = 0; r1 < rowsWithNum.length; r1++) {
      for (let r2 = r1 + 1; r2 < rowsWithNum.length; r2++) {
        for (let r3 = r2 + 1; r3 < rowsWithNum.length; r3++) {
          const allCols = new Set([
            ...rowsWithNum[r1].cols,
            ...rowsWithNum[r2].cols,
            ...rowsWithNum[r3].cols
          ]);
          
          if (allCols.size === 3) {
            const rows = [rowsWithNum[r1].row, rowsWithNum[r2].row, rowsWithNum[r3].row];
            const cols = Array.from(allCols);
            
            const swordfishCells: number[] = [];
            rows.forEach(row => {
              cols.forEach(col => {
                const idx = row * 9 + col;
                if (candidates[idx].has(num)) {
                  swordfishCells.push(idx);
                }
              });
            });
            
            const affected: number[] = [];
            cols.forEach(col => {
              getColIndices(col).forEach(i => {
                if (!swordfishCells.includes(i) && candidates[i].has(num)) {
                  affected.push(i);
                }
              });
            });
            
            // Only show hint if there are actual player notes to remove
            const notesToRemove = affected.filter(cell => notes[cell]?.has(num)).map(cell => ({ cell, number: num }));
            
            if (notesToRemove.length > 0) {
              return {
                cellIndex: swordfishCells[0],
                value: 0,
                technique: 'Swordfish',
                explanation: `Swordfish on ${num} in rows ${rows.map(r => r + 1).join(', ')} and columns ${cols.map(c => c + 1).join(', ')}. Remove ${num} from other cells in these columns.`,
                highlights: [
                  { cells: swordfishCells, type: 'triple' },
                  { cells: affected.filter(c => notes[c]?.has(num)), type: 'affected' }
                ],
                eliminatedNumbers: [{ number: num, reason: 'Swordfish elimination' }],
                notesToRemove
              };
            }
          }
        }
      }
    }
    
    // Check columns for Swordfish
    const colsWithNum: { col: number; rows: number[] }[] = [];
    
    for (let col = 0; col < 9; col++) {
      const colIndices = getColIndices(col);
      const rows = colIndices
        .filter(i => candidates[i].has(num))
        .map(i => getCellInfo(i).row);
      
      if (rows.length >= 2 && rows.length <= 3) {
        colsWithNum.push({ col, rows });
      }
    }
    
    for (let c1 = 0; c1 < colsWithNum.length; c1++) {
      for (let c2 = c1 + 1; c2 < colsWithNum.length; c2++) {
        for (let c3 = c2 + 1; c3 < colsWithNum.length; c3++) {
          const allRows = new Set([
            ...colsWithNum[c1].rows,
            ...colsWithNum[c2].rows,
            ...colsWithNum[c3].rows
          ]);
          
          if (allRows.size === 3) {
            const cols = [colsWithNum[c1].col, colsWithNum[c2].col, colsWithNum[c3].col];
            const rows = Array.from(allRows);
            
            const swordfishCells: number[] = [];
            rows.forEach(row => {
              cols.forEach(col => {
                const idx = row * 9 + col;
                if (candidates[idx].has(num)) {
                  swordfishCells.push(idx);
                }
              });
            });
            
            const affected: number[] = [];
            rows.forEach(row => {
              getRowIndices(row).forEach(i => {
                if (!swordfishCells.includes(i) && candidates[i].has(num)) {
                  affected.push(i);
                }
              });
            });
            
            // Only show hint if there are actual player notes to remove
            const notesToRemove = affected.filter(cell => notes[cell]?.has(num)).map(cell => ({ cell, number: num }));
            
            if (notesToRemove.length > 0) {
              return {
                cellIndex: swordfishCells[0],
                value: 0,
                technique: 'Swordfish',
                explanation: `Swordfish on ${num} in columns ${cols.map(c => c + 1).join(', ')} and rows ${rows.map(r => r + 1).join(', ')}. Remove ${num} from other cells in these rows.`,
                highlights: [
                  { cells: swordfishCells, type: 'triple' },
                  { cells: affected.filter(c => notes[c]?.has(num)), type: 'affected' }
                ],
                eliminatedNumbers: [{ number: num, reason: 'Swordfish elimination' }],
                notesToRemove
              };
            }
          }
        }
      }
    }
  }
  
  return null;
}

// Check for invalid notes that should be removed
function findInvalidNotes(grid: number[], notes: Set<number>[], candidates: Set<number>[]): Hint | null {
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) continue;
    
    const cellNotes = notes[i];
    if (!cellNotes || cellNotes.size === 0) continue;
    
    const possible = getPossibleValues(grid, i);
    const invalidNotes: number[] = [];
    const eliminatorCells: number[] = [];
    
    cellNotes.forEach(note => {
      if (!possible.includes(note)) {
        invalidNotes.push(note);
        const elimInfo = getEliminationInfo(grid, i);
        const blocker = elimInfo.find(e => e.number === note);
        if (blocker) {
          eliminatorCells.push(blocker.cell);
        }
      }
    });
    
    if (invalidNotes.length > 0) {
      const { row, col } = getCellInfo(i);
      
      return {
        cellIndex: i,
        value: 0,
        technique: 'Invalid Notes',
        explanation: `Notes {${invalidNotes.join(', ')}} at R${row + 1}C${col + 1} are blocked. Remove them.`,
        highlights: [
          { cells: [i], type: 'target' },
          { cells: [...new Set(eliminatorCells)], type: 'eliminator' }
        ],
        eliminatedNumbers: invalidNotes.map(n => ({ number: n, reason: 'blocked' })),
        notesToRemove: invalidNotes.map(n => ({ cell: i, number: n }))
      };
    }
  }
  return null;
}

// Main function to get a hint
export function getHint(grid: number[], solution: number[], notes: Set<number>[]): Hint | null {
  const candidates = getAllCandidates(grid, notes);
  
  // Priority 1: Invalid notes
  const invalidNotes = findInvalidNotes(grid, notes, candidates);
  if (invalidNotes) return invalidNotes;
  
  // Priority 2: Last Free Cell (easiest to spot)
  const lastFree = findLastFreeCell(grid, candidates);
  if (lastFree) return lastFree;
  
  // Priority 3: Naked Single
  const nakedSingle = findNakedSingle(grid, candidates);
  if (nakedSingle) return nakedSingle;
  
  // Priority 4: Hidden Single
  const hiddenSingle = findHiddenSingle(grid, candidates);
  if (hiddenSingle) return hiddenSingle;
  
  // Priority 5: Pointing Pairs/Triples
  const pointing = findPointingPairs(grid, candidates, notes);
  if (pointing) return pointing;
  
  // Priority 6: Naked Pairs
  const nakedPairs = findNakedPairs(grid, candidates, notes);
  if (nakedPairs) return nakedPairs;
  
  // Priority 7: Hidden Pairs
  const hiddenPairs = findHiddenPairs(grid, candidates, notes);
  if (hiddenPairs) return hiddenPairs;
  
  // Priority 8: Naked Triples
  const nakedTriples = findNakedTriples(grid, candidates, notes);
  if (nakedTriples) return nakedTriples;
  
  // Priority 9: Hidden Triples
  const hiddenTriples = findHiddenTriples(grid, candidates, notes);
  if (hiddenTriples) return hiddenTriples;
  
  // Priority 10: X-Wing
  const xWing = findXWing(grid, candidates, notes);
  if (xWing) return xWing;
  
  // Priority 11: Y-Wing
  const yWing = findYWing(grid, candidates, notes);
  if (yWing) return yWing;
  
  // Priority 12: Swordfish
  const swordfish = findSwordfish(grid, candidates, notes);
  if (swordfish) return swordfish;
  
  return null;
}

// Get hint count from localStorage
export function getStoredHints(): number {
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem('sudoku_hints');
  return stored ? parseInt(stored, 10) : 0;
}

// Set hint count in localStorage
export function setStoredHints(count: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('sudoku_hints', Math.max(0, count).toString());
}

// Add hints (called when completing a game)
export function addHint(): number {
  const current = getStoredHints();
  const newCount = current + 1;
  setStoredHints(newCount);
  return newCount;
}

// Use a hint (returns false if no hints available)
export function useHint(): boolean {
  const current = getStoredHints();
  if (current <= 0) return false;
  setStoredHints(current - 1);
  return true;
}
