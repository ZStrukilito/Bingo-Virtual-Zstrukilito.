/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface BallBoardProps {
  calledNumbers: number[];
  currentNumber: number | null;
}

export function BallBoard({ calledNumbers, currentNumber }: BallBoardProps) {
  const categories = [
    { name: 'B', min: 1, max: 15, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    { name: 'I', min: 16, max: 30, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
    { name: 'N', min: 31, max: 45, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    { name: 'G', min: 46, max: 60, color: 'text-emerald-300', bg: 'bg-emerald-50 border-emerald-200' },
    { name: 'O', min: 61, max: 75, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  ];

  return (
    <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-4 md:p-6 shadow-sm w-full mx-auto max-w-4xl overflow-hidden">
      <div className="flex border-b-2 border-slate-200 pb-3 mb-4 justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            <span>📺</span> Tablero Metálico de Balotas
          </h2>
          <p className="text-xs text-slate-500 font-medium">Números cantados: {calledNumbers.length} / 75</p>
        </div>
        <div className="hidden sm:flex gap-1 items-center bg-white border border-slate-200 rounded-full py-1 px-3 shadow-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono text-slate-600 font-semibold uppercase">Tablero Sincronizado</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {categories.map((cat) => {
          const numbers = Array.from({ length: cat.max - cat.min + 1 }, (_, idx) => cat.min + idx);
          return (
            <div 
              key={cat.name} 
              className={`grid grid-cols-12 md:grid-cols-17 gap-1 md:gap-1.5 p-1.5 rounded-2xl border ${cat.bg} items-center`}
              id={`board-row-${cat.name}`}
            >
              <div className="col-span-2 md:col-span-1 flex items-center justify-center font-black text-lg md:text-xl text-slate-800 border-r border-slate-200 pr-1 select-none">
                <span className={cat.color}>{cat.name}</span>
              </div>
              <div className="col-span-10 md:col-span-16 flex flex-wrap gap-1 md:gap-1.5 pl-1.5 justify-start">
                {numbers.map((n) => {
                  const isCalled = calledNumbers.includes(n);
                  const isCurrent = currentNumber === n;
                  
                  return (
                    <div
                      key={n}
                      className={`w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full font-bold text-xs transition-all pointer-events-none select-none ${
                        isCurrent
                          ? 'bg-rose-500 text-white border-2 border-rose-600 ring-4 ring-rose-200 scale-110 shadow-lg z-10 animate-bounce'
                          : isCalled
                            ? 'bg-emerald-500 text-white border-2 border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-400 border border-slate-200 hover:text-slate-600'
                      }`}
                      id={`board-ball-${n}`}
                    >
                      {n}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-slate-200 pt-3 flex flex-wrap gap-x-4 gap-y-1.5 items-center justify-between text-[11px] md:text-xs">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-slate-300 border border-slate-400" />
            <span className="text-slate-500 font-medium">Disponible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-emerald-600" />
            <span className="text-slate-500 font-medium">Cantado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-rose-500 border border-rose-600 ring-2 ring-rose-200" />
            <span className="text-slate-500 font-medium">Último Cantado</span>
          </div>
        </div>
        <span className="text-slate-400 italic font-mono hidden md:inline">Bingo 75 estándar (columna B: 1-15, I: 16-30...)</span>
      </div>
    </div>
  );
}
