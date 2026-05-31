/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BingoCard } from '../types.js';
import { BingoGrid } from './BingoGrid.js';

interface CardPrinterProps {
  onClose?: () => void;
}

export function CardPrinter({ onClose }: CardPrinterProps) {
  const [numCards, setNumCards] = useState<number>(4);
  const [generatedCards, setGeneratedCards] = useState<BingoCard[]>([]);

  // Local helper to generate a unique card of numbers (ranges: B: 1-15, I: 16-30...)
  const localGenerateCard = (): BingoCard => {
    const cardId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const columns: number[][] = [];
    
    const ranges = [
      { min: 1, max: 15 },   // B
      { min: 16, max: 30 },  // I
      { min: 31, max: 45 },  // N
      { min: 46, max: 60 },  // G
      { min: 61, max: 75 }   // O
    ];
    
    for (let c = 0; c < 5; c++) {
      const range = ranges[c];
      const available: number[] = [];
      for (let i = range.min; i <= range.max; i++) {
        available.push(i);
      }
      
      const columnNumbers: number[] = [];
      const countNeeded = c === 2 ? 4 : 5;
      for (let k = 0; k < countNeeded; k++) {
        const idx = Math.floor(Math.random() * available.length);
        columnNumbers.push(available.splice(idx, 1)[0]);
      }
      columnNumbers.sort((a, b) => a - b);
      columns.push(columnNumbers);
    }
    
    const grid: (number | null)[][] = [];
    for (let r = 0; r < 5; r++) {
      const row: (number | null)[] = [];
      for (let c = 0; c < 5; c++) {
        if (r === 2 && c === 2) {
          row.push(null); // FREE space
        } else {
          const val = c === 2 
            ? (r < 2 ? columns[c][r] : columns[c][r - 1])
            : columns[c][r];
          row.push(val);
        }
      }
      grid.push(row);
    }
    
    return { grid, cardId };
  };

  const handleGenerate = () => {
    const qty = Math.max(1, Math.min(100, numCards));
    const list: BingoCard[] = [];
    for (let i = 0; i < qty; i++) {
      list.push(localGenerateCard());
    }
    setGeneratedCards(list);
  };

  const handlePrint = () => {
    window.print();
  };

  const emptyMarked = Array.from({ length: 5 }, () => Array(5).fill(false));
  emptyMarked[2][2] = true;

  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-xl max-w-4xl w-full mx-auto" id="card-printer-modal">
      <div className="print:hidden border-b border-slate-100 pb-4 mb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span>🖨️</span> Generador de Cartones PDF / Impresión
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Crea cartones listos para imprimir en papel. Recorta y reparte a jugadores físicos.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 py-2 px-4 rounded-xl cursor-pointer"
          >
            Regresar al Juego
          </button>
        )}
      </div>

      {/* Printing Controls panel */}
      <div className="print:hidden bg-slate-50 rounded-2xl border border-slate-200 p-4 mb-6 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
          <label className="text-xs font-bold text-slate-600 block uppercase tracking-wider">
            Cantidad de Cartones
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={numCards}
            onChange={(e) => setNumCards(parseInt(e.target.value) || 1)}
            className="bg-white border border-slate-200 focus:border-blue-500 py-2.5 px-3.5 rounded-xl font-bold text-slate-800 text-sm outline-none w-full"
          />
        </div>
        <button
          onClick={handleGenerate}
          className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-sm py-2.5 px-6 rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap"
        >
          ⚙️ Generar Cartones
        </button>

        {generatedCards.length > 0 && (
          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm py-2.5 px-6 rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>🖨️ Mandar a Imprimir ({generatedCards.length})</span>
          </button>
        )}
      </div>

      {/* Printer Preview Box */}
      {generatedCards.length === 0 ? (
        <div className="print:hidden border-2 border-dashed border-slate-200 rounded-3xl py-12 px-4 text-center text-slate-400">
          <div className="text-4xl mb-3">🎴</div>
          <p className="font-bold text-slate-600 text-sm">No has generado cartones aún</p>
          <p className="text-xs text-slate-400 mt-1">Digita la cantidad deseada arriba y pulsa "Generar Cartones"</p>
        </div>
      ) : (
        <div>
          <div className="print:hidden flex justify-between items-center text-xs text-slate-500 mb-4 bg-blue-50 text-blue-800 p-3 rounded-xl border border-blue-100">
            <span>💡 <strong>Consejo de Impresión:</strong> Configura "Márgenes: Ninguno" o "Escala: Ajustar a página" en la ventana emergente de impresión para un encuadre impecable.</span>
          </div>

          {/* This wrapper is styled so that in screen they look organized, but during printing, page breaks are properly handled */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 print:text-black">
            {generatedCards.map((card, idx) => (
              <div 
                key={card.cardId} 
                className="print:break-inside-avoid print:mb-8 print:p-2 border border-slate-100 rounded-2xl p-2 bg-white flex flex-col items-center"
              >
                <div className="text-xs text-slate-400 font-mono mb-1 print:hidden">
                  Cartón #{idx + 1}
                </div>
                <BingoGrid
                  card={card}
                  markedCells={emptyMarked}
                  isPrintView={true}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
