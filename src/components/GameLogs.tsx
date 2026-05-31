/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';

interface LogItem {
  id: string;
  text: string;
  timestamp: number;
}

interface GameLogsProps {
  logs: LogItem[];
}

export function GameLogs({ logs }: GameLogsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of logs on new activities
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [logs]);

  const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);

  const getLogStyle = (text: string) => {
    if (text.includes('RECLAMO VERIFICADO') || text.includes('ganador') || text.includes('aprobado')) {
      return 'bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500 font-bold';
    }
    if (text.includes('RECLAMO RECHAZADO') || text.includes('retirado') || text.includes('abandonó')) {
      return 'bg-rose-50 text-rose-800 border-l-4 border-rose-400';
    }
    if (text.includes('cantó')) {
      return 'bg-amber-50 text-amber-900 border-l-4 border-amber-500 font-semibold';
    }
    if (text.includes('creada') || text.includes('unió') || text.includes('regresado')) {
      return 'bg-blue-50 text-blue-800 border-l-4 border-blue-400';
    }
    return 'bg-white text-slate-600 border-l-4 border-slate-300';
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm max-w-md w-full mx-auto flex flex-col h-[300px] overflow-hidden">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-2">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
          <span>🔔</span> Transmisión en Vivo (Logs)
        </h3>
        <span className="text-[10px] bg-slate-100 text-slate-500 font-mono py-0.5 px-2 rounded-full font-bold">
          Actualización activa
        </span>
      </div>

      <div 
        ref={listRef} 
        className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-slate-200"
        id="logs-container"
      >
        {sortedLogs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-3 text-slate-400">
            <span className="text-xl">📭</span>
            <span className="text-xs font-medium">Bandeja vacía</span>
          </div>
        ) : (
          sortedLogs.map((log) => (
            <div
              key={log.id}
              className={`p-2 rounded-xl text-xs font-mono transition-all leading-normal flex flex-col gap-0.5 shadow-2xs ${getLogStyle(log.text)}`}
            >
              <div className="flex justify-between items-start gap-2">
                <span>{log.text}</span>
                <span className="text-[9px] opacity-60 shrink-0 self-end">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
