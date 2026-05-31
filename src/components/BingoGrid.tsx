/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BingoCard } from '../types.js';

interface BingoGridProps {
  card: BingoCard;
  markedCells: boolean[][];
  onCellClick?: (r: number, c: number) => void;
  calledNumbers?: number[];
  isPrintView?: boolean;
}

export function BingoGrid({
  card,
  markedCells,
  onCellClick,
  calledNumbers = [],
  isPrintView = false,
}: BingoGridProps) {
  const getLetterAndColor = (colIndex: number) => {
    switch (colIndex) {
      case 0:
        return { letter: 'B', bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-200' };
      case 1:
        return { letter: 'I', bg: 'bg-rose-600', text: 'text-rose-600', border: 'border-rose-200' };
      case 2:
        return { letter: 'N', bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-200' };
      case 3:
        return { letter: 'G', bg: 'bg-emerald-600', text: 'text-emerald-300', border: 'border-emerald-200' };
      case 4:
        return { letter: 'O', bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-200' };
      default:
        return { letter: '', bg: 'bg-gray-600', text: 'text-gray-600', border: 'border-gray-200' };
    }
  };

  const isCalled = (val: number | null) => {
    if (val === null) return true;
    return calledNumbers.includes(val);
  };

  return (
    <div 
      className={`select-none mx-auto w-full max-w-md bg-white border-4 border-slate-800 rounded-3xl shadow-xl p-4 overflow-hidden ${
        isPrintView ? 'shadow-none border-black p-2 max-w-sm' : ''
      }`}
      id={`bingo-card-${card.cardId}`}
    >
      {/* Printable Title Block */}
      {isPrintView && (
        <div className="text-center mb-2 border-b-2 border-black pb-1">
          <h1 className="text-xl font-extrabold tracking-widest text-black">BINGO VIRTUAL</h1>
          <p className="text-xs font-mono text-black">Cartón ID: {card.cardId}</p>
        </div>
      )}

      {/* Grid Headers: B-I-N-G-O */}
      <div className="grid grid-cols-5 gap-1.5 mb-2">
        {Array.from({ length: 5 }).map((_, c) => {
          const info = getLetterAndColor(c);
          return (
            <div
              key={c}
              className={`text-center font-black rounded-lg py-1.5 md:py-2 flex flex-col justify-center items-center shadow-sm ${
                isPrintView 
                  ? 'bg-gray-100 border border-black text-black shadow-none' 
                  : `${info.bg} text-white`
              }`}
            >
              <span className="text-xl md:text-2xl tracking-wider">{info.letter}</span>
              {!isPrintView && (
                <span className="text-[10px] opacity-80 uppercase leading-none font-medium hidden sm:inline">
                  {c === 0 ? '1-15' : c === 1 ? '16-30' : c === 2 ? '31-45' : c === 3 ? '46-60' : '61-75'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Grid Numbers: 5x5 */}
      <div className="grid grid-cols-5 gap-1.5 md:gap-2">
        {Array.from({ length: 5 }).map((_, r) => (
          <React.Fragment key={r}>
            {card.grid[r].map((cell, c) => {
              const info = getLetterAndColor(c);
              const isMarked = markedCells[r][c];
              const matchesCall = cell !== null && isCalled(cell);
              
              if (cell === null) {
                // FREE Space
                return (
                  <div
                    key={`${r}-${c}`}
                    className={`aspect-square flex flex-col items-center justify-center rounded-xl font-bold border-2 text-center transition-all ${
                      isPrintView
                        ? 'border-black bg-gray-100 text-black text-xs'
                        : 'border-amber-400 bg-amber-50 text-amber-700 shadow-inner'
                    }`}
                  >
                    <span className="text-lg md:text-xl">⭐️</span>
                    <span className="text-[8px] md:text-[9px] uppercase tracking-tight leading-none font-bold">
                      LIBRE
                    </span>
                  </div>
                );
              }

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => onCellClick && onCellClick(r, c)}
                  disabled={isPrintView}
                  className={`relative aspect-square flex items-center justify-center rounded-xl font-extrabold text-base md:text-xl transition-all cursor-pointer ${
                    isPrintView
                      ? 'border border-black bg-white text-black text-sm'
                      : isMarked
                        ? matchesCall
                          ? 'bg-emerald-500 border-2 border-emerald-600 text-white shadow-md scale-95'
                          : 'bg-slate-400 border-2 border-slate-500 text-white shadow-md scale-95'
                        : matchesCall
                          ? 'bg-slate-100 border-2 border-slate-300 text-slate-800 hover:bg-slate-200'
                          : 'bg-slate-50 border-2 border-slate-200 text-slate-800 hover:bg-slate-100 hover:scale-[1.02]'
                  }`}
                  id={`cell-btn-${r}-${c}`}
                >
                  <span>{cell}</span>

                  {/* Stamp Dabbing Circle effect when marked (Online/Virtual mode) */}
                  {!isPrintView && isMarked && (
                    <div 
                      className={`absolute inset-1 rounded-full opacity-35 animate-ping ${
                        matchesCall ? 'bg-emerald-900' : 'bg-slate-900'
                      }`}
                    />
                  )}

                  {/* Tiny indicator for matches called numbers */}
                  {!isPrintView && matchesCall && !isMarked && (
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Footer Details */}
      <div className="mt-3 flex justify-between items-center text-[10px] md:text-xs text-slate-400 font-mono px-1">
        <span>Cartón: <strong className="text-slate-600">{card.cardId}</strong></span>
        <span>Rango: 1-75</span>
      </div>
    </div>
  );
}
