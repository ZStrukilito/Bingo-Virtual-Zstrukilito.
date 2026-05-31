/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BingoCard {
  // 5x5 grid representing rows. Rows are arrays of 5 cells.
  // Each cell is either a number or null (for the central FREE space)
  grid: (number | null)[][];
  cardId: string;
}

export interface Player {
  id: string;
  name: string;
  card: BingoCard;
  joinedAt: number;
  markedCells: boolean[][]; // 5x5 grid mirroring grid to track player's self-marking
  isOnline: boolean;
}

export type BingoPattern = 'BINGO' | 'LINE' | 'DIAGONAL' | 'CORNERS';

export interface BingoClaim {
  id: string;
  playerId: string;
  playerName: string;
  type: 'LINE' | 'BINGO';
  timestamp: number;
  status: 'pending' | 'verified' | 'rejected';
  cardGrid: (number | null)[][];
  missingNumbers: number[]; // Numbers in the pattern that haven't been called yet
}

export interface GameRoom {
  id: string; // 6-digit uppercase code (e.g. "AX93PL")
  name: string;
  adminKey: string; // Secret key for admin tasks
  status: 'idle' | 'playing' | 'paused' | 'finished';
  pattern: BingoPattern;
  calledNumbers: number[];
  currentNumber: number | null;
  autoDraw: boolean;
  drawInterval: number; // in seconds
  players: { [id: string]: Player };
  claims: BingoClaim[];
  logs: { id: string; text: string; timestamp: number }[];
  maxPlayers: number;
}

export interface RoomSummary {
  id: string;
  name: string;
  playerCount: number;
  status: GameRoom['status'];
  pattern: GameRoom['pattern'];
}
