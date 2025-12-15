'use client';

import { useState } from 'react';
import './rules.css';

interface Rule {
  id: string;
  name: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  description: string;
  howTo: string[];
  example: {
    grid: (number | null)[];
    highlights: { cell: number; type: 'target' | 'pair' | 'triple' | 'eliminator' | 'affected' }[];
    candidates?: { cell: number; values: number[] }[];
  };
}

const rules: Rule[] = [
  {
    id: 'last-free-cell',
    name: 'Last Free Cell',
    difficulty: 'Beginner',
    description: 'When a row, column, or 3x3 box has only one empty cell remaining, that cell must contain the only missing number.',
    howTo: [
      'Scan a row, column, or box',
      'Count filled cells - if 8 are filled, only 1 is empty',
      'Find the missing number (1-9)',
      'Place that number in the empty cell'
    ],
    example: {
      grid: [
        1, 2, 3, 4, 5, 6, 7, 8, null,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
      highlights: [
        { cell: 8, type: 'target' },
        { cell: 0, type: 'eliminator' }, { cell: 1, type: 'eliminator' }, { cell: 2, type: 'eliminator' },
        { cell: 3, type: 'eliminator' }, { cell: 4, type: 'eliminator' }, { cell: 5, type: 'eliminator' },
        { cell: 6, type: 'eliminator' }, { cell: 7, type: 'eliminator' }
      ]
    }
  },
  {
    id: 'last-remaining-cell',
    name: 'Last Remaining Cell',
    difficulty: 'Beginner',
    description: 'When a number can only be placed in one cell within a row, column, or box because all other cells are blocked.',
    howTo: [
      'Pick a number (1-9) and focus on one unit',
      'Check which cells could hold this number',
      'If only one cell is available, place it there'
    ],
    example: {
      grid: [
        0, 0, 0, 0, 5, 0, 0, 0, 0,
        0, 0, 5, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 5,
        5, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 5, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 5, 0, 0, 0, 0, 0,
        0, 5, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, null, 0, 0, 0,
      ],
      highlights: [
        { cell: 4, type: 'eliminator' }, { cell: 11, type: 'eliminator' }, { cell: 26, type: 'eliminator' },
        { cell: 27, type: 'eliminator' }, { cell: 42, type: 'eliminator' }, { cell: 57, type: 'eliminator' },
        { cell: 64, type: 'eliminator' }, { cell: 77, type: 'target' }
      ]
    }
  },
  {
    id: 'naked-singles',
    name: 'Naked Singles',
    difficulty: 'Beginner',
    description: 'A cell where only one candidate remains after eliminating all numbers that appear in its row, column, and box.',
    howTo: [
      'For each empty cell, list possible candidates (1-9)',
      'Eliminate numbers in the same row, column, or box',
      'If only one candidate remains, place it'
    ],
    example: {
      grid: [
        null, 2, 3, 4, 5, 6, 7, 8, 9,
        4, 5, 6, 0, 0, 0, 0, 0, 0,
        7, 8, 9, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
      highlights: [
        { cell: 0, type: 'target' },
        { cell: 1, type: 'eliminator' }, { cell: 2, type: 'eliminator' }, { cell: 3, type: 'eliminator' },
        { cell: 4, type: 'eliminator' }, { cell: 5, type: 'eliminator' }, { cell: 6, type: 'eliminator' },
        { cell: 7, type: 'eliminator' }, { cell: 8, type: 'eliminator' },
        { cell: 9, type: 'eliminator' }, { cell: 10, type: 'eliminator' }, { cell: 11, type: 'eliminator' },
        { cell: 18, type: 'eliminator' }, { cell: 19, type: 'eliminator' }, { cell: 20, type: 'eliminator' }
      ]
    }
  },
  {
    id: 'hidden-singles',
    name: 'Hidden Singles',
    difficulty: 'Beginner',
    description: 'When a candidate appears in only one cell within a row, column, or box, it must go there, even if the cell has other candidates.',
    howTo: [
      'Focus on one unit (row, column, or box)',
      'For each number 1-9, count possible positions',
      'If a number can only go in one cell, place it'
    ],
    example: {
      grid: [
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
      highlights: [
        { cell: 4, type: 'target' },
        { cell: 0, type: 'affected' }, { cell: 1, type: 'affected' }, { cell: 2, type: 'affected' },
        { cell: 3, type: 'affected' }, { cell: 5, type: 'affected' }, { cell: 6, type: 'affected' },
        { cell: 7, type: 'affected' }, { cell: 8, type: 'affected' }
      ],
      candidates: [
        { cell: 0, values: [2, 3, 5] },
        { cell: 1, values: [3, 5, 8] },
        { cell: 2, values: [2, 8, 9] },
        { cell: 3, values: [3, 5, 9] },
        { cell: 4, values: [1, 3, 5, 7] },
        { cell: 5, values: [2, 3, 9] },
        { cell: 6, values: [5, 8, 9] },
        { cell: 7, values: [2, 3, 8] },
        { cell: 8, values: [3, 5, 9] }
      ]
    }
  },
  {
    id: 'naked-pairs',
    name: 'Naked Pairs',
    difficulty: 'Intermediate',
    description: 'When two cells in the same unit contain only the same two candidates, those numbers can be eliminated from all other cells in that unit.',
    howTo: [
      'Find two cells with exactly the same two candidates',
      'They must be in the same row, column, or box',
      'Remove those two numbers from other cells in the unit'
    ],
    example: {
      grid: [
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
      highlights: [
        { cell: 0, type: 'pair' }, { cell: 3, type: 'pair' },
        { cell: 1, type: 'affected' }, { cell: 2, type: 'affected' },
        { cell: 4, type: 'affected' }, { cell: 5, type: 'affected' }
      ],
      candidates: [
        { cell: 0, values: [3, 7] },
        { cell: 1, values: [1, 3, 5, 7] },
        { cell: 2, values: [2, 7, 9] },
        { cell: 3, values: [3, 7] },
        { cell: 4, values: [3, 4, 7] },
        { cell: 5, values: [1, 3] }
      ]
    }
  },
  {
    id: 'naked-triples',
    name: 'Naked Triples',
    difficulty: 'Intermediate',
    description: 'When three cells in a unit contain only candidates from a set of three numbers, those numbers can be eliminated from other cells.',
    howTo: [
      'Find three cells with candidates from only three numbers',
      'Each cell can have 2 or 3 of these candidates',
      'Remove these three numbers from other cells in the unit'
    ],
    example: {
      grid: [
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
      highlights: [
        { cell: 0, type: 'triple' }, { cell: 1, type: 'triple' }, { cell: 2, type: 'triple' },
        { cell: 3, type: 'affected' }, { cell: 4, type: 'affected' }, { cell: 5, type: 'affected' }
      ],
      candidates: [
        { cell: 0, values: [1, 2] },
        { cell: 1, values: [2, 3] },
        { cell: 2, values: [1, 3] },
        { cell: 3, values: [1, 4, 5] },
        { cell: 4, values: [2, 3, 6] },
        { cell: 5, values: [1, 2, 3, 7] }
      ]
    }
  },
  {
    id: 'hidden-pairs',
    name: 'Hidden Pairs',
    difficulty: 'Intermediate',
    description: 'When two candidates appear only in the same two cells within a unit, all other candidates can be removed from these cells.',
    howTo: [
      'Find two numbers that appear in only two cells',
      'These two cells must contain both numbers',
      'Remove all other candidates from these two cells'
    ],
    example: {
      grid: [
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
      highlights: [
        { cell: 2, type: 'pair' }, { cell: 6, type: 'pair' }
      ],
      candidates: [
        { cell: 0, values: [3, 5, 8] },
        { cell: 1, values: [3, 5, 9] },
        { cell: 2, values: [1, 2, 3, 5] },
        { cell: 3, values: [3, 8, 9] },
        { cell: 4, values: [5, 8, 9] },
        { cell: 5, values: [3, 5, 8] },
        { cell: 6, values: [1, 2, 5, 9] },
        { cell: 7, values: [3, 5, 8] },
        { cell: 8, values: [5, 8, 9] }
      ]
    }
  },
  {
    id: 'hidden-triples',
    name: 'Hidden Triples',
    difficulty: 'Advanced',
    description: 'When three candidates appear only in three cells within a unit, all other candidates can be removed from these cells.',
    howTo: [
      'Find three numbers appearing only in three cells',
      'Each cell must have at least one of these numbers',
      'Remove all other candidates from these three cells'
    ],
    example: {
      grid: [
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
      highlights: [
        { cell: 1, type: 'triple' }, { cell: 4, type: 'triple' }, { cell: 7, type: 'triple' }
      ],
      candidates: [
        { cell: 0, values: [5, 8, 9] },
        { cell: 1, values: [1, 2, 3, 5, 8] },
        { cell: 2, values: [5, 8, 9] },
        { cell: 3, values: [5, 9] },
        { cell: 4, values: [1, 3, 5, 9] },
        { cell: 5, values: [5, 8, 9] },
        { cell: 6, values: [8, 9] },
        { cell: 7, values: [2, 3, 8, 9] },
        { cell: 8, values: [5, 8, 9] }
      ]
    }
  },
  {
    id: 'pointing-pairs',
    name: 'Pointing Pairs',
    difficulty: 'Intermediate',
    description: 'When a candidate in a box is restricted to one row or column, it can be eliminated from that row/column outside the box.',
    howTo: [
      'In a box, find a candidate in only one row or column',
      'This number must go in that row/column within the box',
      'Remove it from the same row/column outside the box'
    ],
    example: {
      grid: [
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
      highlights: [
        { cell: 0, type: 'pair' }, { cell: 1, type: 'pair' },
        { cell: 3, type: 'affected' }, { cell: 4, type: 'affected' },
        { cell: 5, type: 'affected' }, { cell: 6, type: 'affected' },
        { cell: 7, type: 'affected' }, { cell: 8, type: 'affected' }
      ],
      candidates: [
        { cell: 0, values: [4, 7] },
        { cell: 1, values: [4, 5, 8] },
        { cell: 2, values: [5, 8, 9] },
        { cell: 3, values: [3, 4, 6] },
        { cell: 4, values: [4, 7, 9] },
        { cell: 5, values: [2, 4] },
        { cell: 6, values: [1, 4, 8] },
        { cell: 7, values: [4, 5] },
        { cell: 8, values: [2, 4, 9] }
      ]
    }
  },
  {
    id: 'pointing-triples',
    name: 'Pointing Triples',
    difficulty: 'Intermediate',
    description: 'Same as Pointing Pairs but with three cells. When a candidate appears only in one row/column within a box.',
    howTo: [
      'In a box, find a candidate in only one row or column (3 cells)',
      'This number must go in that row/column within the box',
      'Remove it from the same row/column outside the box'
    ],
    example: {
      grid: [
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
      highlights: [
        { cell: 0, type: 'triple' }, { cell: 1, type: 'triple' }, { cell: 2, type: 'triple' },
        { cell: 3, type: 'affected' }, { cell: 4, type: 'affected' },
        { cell: 5, type: 'affected' }, { cell: 6, type: 'affected' },
        { cell: 7, type: 'affected' }, { cell: 8, type: 'affected' }
      ],
      candidates: [
        { cell: 0, values: [3, 6] },
        { cell: 1, values: [3, 5, 8] },
        { cell: 2, values: [3, 9] },
        { cell: 3, values: [3, 5, 7] },
        { cell: 4, values: [1, 3, 9] },
        { cell: 5, values: [3, 4] },
        { cell: 6, values: [1, 3, 8] },
        { cell: 7, values: [2, 3] },
        { cell: 8, values: [3, 5, 9] }
      ]
    }
  },
  {
    id: 'x-wing',
    name: 'X-Wing',
    difficulty: 'Advanced',
    description: 'When a candidate appears in exactly two cells in two different rows, and these cells align in columns, eliminate from other cells in those columns.',
    howTo: [
      'Find a candidate in exactly two positions in a row',
      'Find another row with the same candidate in the same columns',
      'Remove this candidate from other cells in those columns'
    ],
    example: {
      grid: [
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
      highlights: [
        { cell: 1, type: 'pair' }, { cell: 7, type: 'pair' },
        { cell: 55, type: 'pair' }, { cell: 61, type: 'pair' },
        { cell: 10, type: 'affected' }, { cell: 19, type: 'affected' },
        { cell: 28, type: 'affected' }, { cell: 37, type: 'affected' },
        { cell: 16, type: 'affected' }, { cell: 25, type: 'affected' },
        { cell: 34, type: 'affected' }, { cell: 43, type: 'affected' }
      ],
      candidates: [
        { cell: 1, values: [3, 5] },
        { cell: 7, values: [3, 8] },
        { cell: 55, values: [3, 9] },
        { cell: 61, values: [3, 4] },
        { cell: 10, values: [2, 3, 7] },
        { cell: 19, values: [3, 6] },
        { cell: 28, values: [3, 5, 8] },
        { cell: 37, values: [1, 3, 9] },
        { cell: 16, values: [3, 4, 8] },
        { cell: 25, values: [3, 7, 9] },
        { cell: 34, values: [2, 3, 6] },
        { cell: 43, values: [3, 5] }
      ]
    }
  },
  {
    id: 'y-wing',
    name: 'Y-Wing',
    difficulty: 'Advanced',
    description: 'Three cells forming a Y pattern. The pivot shares one candidate with each wing, and cells seeing both wings can eliminate their common candidate.',
    howTo: [
      'Find a pivot cell with exactly 2 candidates (A,B)',
      'Find two wings: one with (A,C) and one with (B,C)',
      'Cells seeing both wings cannot have candidate C'
    ],
    example: {
      grid: [
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
      highlights: [
        { cell: 0, type: 'target' },
        { cell: 2, type: 'pair' }, { cell: 18, type: 'pair' },
        { cell: 20, type: 'affected' }
      ],
      candidates: [
        { cell: 0, values: [1, 2] },
        { cell: 2, values: [1, 5] },
        { cell: 18, values: [2, 5] },
        { cell: 20, values: [3, 5, 7] }
      ]
    }
  },
  {
    id: 'swordfish',
    name: 'Swordfish',
    difficulty: 'Expert',
    description: 'Extension of X-Wing to three rows and three columns. When a candidate appears in 2-3 cells in three rows covering exactly three columns.',
    howTo: [
      'Find three rows where a candidate appears in 2-3 cells each',
      'These cells must collectively cover exactly 3 columns',
      'Remove the candidate from other cells in those columns'
    ],
    example: {
      grid: [
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
      highlights: [
        { cell: 0, type: 'triple' }, { cell: 4, type: 'triple' },
        { cell: 31, type: 'triple' }, { cell: 35, type: 'triple' },
        { cell: 54, type: 'triple' }, { cell: 62, type: 'triple' },
        { cell: 9, type: 'affected' }, { cell: 18, type: 'affected' },
        { cell: 13, type: 'affected' }, { cell: 22, type: 'affected' },
        { cell: 17, type: 'affected' }, { cell: 26, type: 'affected' }
      ],
      candidates: [
        { cell: 0, values: [2, 7] },
        { cell: 4, values: [2, 5] },
        { cell: 31, values: [2, 3] },
        { cell: 35, values: [2, 8] },
        { cell: 54, values: [2, 4] },
        { cell: 62, values: [2, 6] },
        { cell: 9, values: [2, 4, 8] },
        { cell: 18, values: [1, 2, 9] },
        { cell: 13, values: [2, 7] },
        { cell: 22, values: [2, 5, 6] },
        { cell: 17, values: [2, 3, 8] },
        { cell: 26, values: [2, 4, 9] }
      ]
    }
  }
];

// Mini Sudoku Grid Component - Matches main game design
function MiniGrid({ rule }: { rule: Rule }) {
  const getHighlightType = (index: number): string | null => {
    const highlight = rule.example.highlights.find(h => h.cell === index);
    return highlight ? highlight.type : null;
  };

  const getCellContent = (index: number) => {
    const value = rule.example.grid[index];
    const candidates = rule.example.candidates?.find(c => c.cell === index);
    
    if (value === null) {
      // This is the answer cell
      return <span className="answer">?</span>;
    }
    
    if (value !== 0) {
      return <span className="given">{value}</span>;
    }
    
    if (candidates) {
      return (
        <div className="mini-candidates">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <span key={n} className={candidates.values.includes(n) ? 'has-candidate' : ''}>
              {candidates.values.includes(n) ? n : ''}
            </span>
          ))}
        </div>
      );
    }
    
    return null;
  };

  // Render 9 boxes, each containing 9 cells
  const renderGrid = () => {
    const boxes = [];
    
    for (let boxRow = 0; boxRow < 3; boxRow++) {
      for (let boxCol = 0; boxCol < 3; boxCol++) {
        const cells = [];
        
        for (let cellRow = 0; cellRow < 3; cellRow++) {
          for (let cellCol = 0; cellCol < 3; cellCol++) {
            const row = boxRow * 3 + cellRow;
            const col = boxCol * 3 + cellCol;
            const index = row * 9 + col;
            const highlightType = getHighlightType(index);
            
            cells.push(
              <div 
                key={index} 
                className={`mini-cell ${highlightType ? `highlight-${highlightType}` : ''}`}
              >
                {getCellContent(index)}
              </div>
            );
          }
        }
        
        boxes.push(
          <div key={`box-${boxRow}-${boxCol}`} className="mini-box">
            {cells}
          </div>
        );
      }
    }
    
    return boxes;
  };

  return (
    <div className="mini-sudoku-grid">
      {renderGrid()}
    </div>
  );
}

export default function RulesPage() {
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  const filteredRules = filterDifficulty === 'all' 
    ? rules 
    : rules.filter(r => r.difficulty === filterDifficulty);

  const difficulties = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

  return (
    <div className="rules-page">
      <div className="rules-container">
        <header className="rules-header">
          <h1>Sudoku Solving Techniques</h1>
          <p>Master these strategies to solve any Sudoku puzzle, from easy to expert level.</p>
          
          <div className="difficulty-filter">
            <button 
              className={filterDifficulty === 'all' ? 'active' : ''} 
              onClick={() => setFilterDifficulty('all')}
            >
              All
            </button>
            {difficulties.map(d => (
              <button 
                key={d}
                className={`${filterDifficulty === d ? 'active' : ''} ${d.toLowerCase()}`}
                onClick={() => setFilterDifficulty(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </header>

        <div className="rules-grid">
          {filteredRules.map(rule => (
            <div key={rule.id} className="rule-card">
              <div className="rule-card-header">
                <span className={`difficulty-badge ${rule.difficulty.toLowerCase()}`}>
                  {rule.difficulty}
                </span>
                <h3>{rule.name}</h3>
              </div>
              
              <div className="rule-card-body">
                <p className="rule-description">{rule.description}</p>
                
                <div className="rule-visual">
                  <MiniGrid rule={rule} />
                  <div className="legend">
                    {rule.example.highlights.some(h => h.type === 'target') && (
                      <span className="legend-item target">
                        <span className="legend-color"></span> Target
                      </span>
                    )}
                    {rule.example.highlights.some(h => h.type === 'pair') && (
                      <span className="legend-item pair">
                        <span className="legend-color"></span> Pair
                      </span>
                    )}
                    {rule.example.highlights.some(h => h.type === 'triple') && (
                      <span className="legend-item triple">
                        <span className="legend-color"></span> Triple
                      </span>
                    )}
                    {rule.example.highlights.some(h => h.type === 'eliminator') && (
                      <span className="legend-item eliminator">
                        <span className="legend-color"></span> Blockers
                      </span>
                    )}
                    {rule.example.highlights.some(h => h.type === 'affected') && (
                      <span className="legend-item affected">
                        <span className="legend-color"></span> Affected
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="how-to">
                  <h4>How to Apply</h4>
                  <ol>
                    {rule.howTo.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
