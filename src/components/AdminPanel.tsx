/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameRoom, BingoPattern, Player } from '../types.js';

interface AdminPanelProps {
  room: GameRoom;
  adminKey: string;
  onRefreshRoom: () => void;
  onLeaveAdmin: () => void;
  onDeleteSuccess?: () => void;
}

export function AdminPanel({ room, adminKey, onRefreshRoom, onLeaveAdmin, onDeleteSuccess }: AdminPanelProps) {
  const [autodrawInterval, setAutodrawInterval] = useState<number>(room.drawInterval || 5);
  const [isUpdating, setIsUpdating] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    type: 'close' | 'restart' | 'kick' | null;
    playerId?: string;
    playerName?: string;
  } | null>(null);

  // Get live object from the actual pool of players for real-time card markings updates
  const liveSelectedPlayer = selectedPlayer ? (room.players?.[selectedPlayer.id] || selectedPlayer) : null;

  const handleCloseRoom = () => {
    setConfirmConfig({ type: 'close' });
  };

  const sendAdminAction = async (endpoint: string, bodyObj: any = {}) => {
    setIsUpdating(true);
    setAdminError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/rooms/${room.id}/admin/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify(bodyObj),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Operación administrativa fallida');
      }

      onRefreshRoom();
    } catch (e: any) {
      setAdminError(e.message || 'Error de conexión');
    } finally {
      setIsUpdating(false);
    }
  };

  const drawManualNumber = () => {
    sendAdminAction('draw');
  };

  const handleToggleAutoDraw = () => {
    sendAdminAction('autodraw', {
      autoDraw: !room.autoDraw,
      interval: autodrawInterval,
    });
  };

  const handleIntervalChange = (val: number) => {
    const fixedVal = Math.max(2, Math.min(30, val));
    setAutodrawInterval(fixedVal);
    // If autodraw is already active, sync interval directly
    if (room.autoDraw) {
      sendAdminAction('autodraw', {
        autoDraw: true,
        interval: fixedVal,
      });
    }
  };

  const handleSetPattern = (pat: BingoPattern) => {
    sendAdminAction('pattern', { pattern: pat });
  };

  const handleSetStatus = (status: 'playing' | 'paused' | 'idle') => {
    sendAdminAction('status', { status });
  };

  const handleKickPlayer = (playerId: string, name: string) => {
    setConfirmConfig({ type: 'kick', playerId, playerName: name });
  };

  const handleVerifyClaim = (claimId: string, approve: boolean) => {
    sendAdminAction('verify-claim', {
      claimId,
      status: approve ? 'verified' : 'rejected',
    });
  };

  const handleRestartGame = () => {
    setConfirmConfig({ type: 'restart' });
  };

  const playersList = Object.values(room.players || {});
  const pendingClaims = (room.claims || []).filter((c) => c.status === 'pending');

  const getLetterForNumber = (n: number | null): string => {
    if (!n) return '';
    if (n >= 1 && n <= 15) return 'B';
    if (n >= 16 && n <= 30) return 'I';
    if (n >= 31 && n <= 45) return 'N';
    if (n >= 46 && n <= 60) return 'G';
    if (n >= 61 && n <= 75) return 'O';
    return '';
  };

  return (
    <div className="bg-white border-2 border-slate-300 shadow-2xl rounded-3xl p-6 md:p-8 flex flex-col gap-6 w-full mx-auto max-w-5xl" id="admin-panel">
      {/* Header Panel */}
      <div className="flex border-b border-slate-200 pb-5 justify-between items-center flex-wrap gap-4 select-none">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-red-100 text-red-600 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
              Control Admin
            </span>
            <span className="text-xs font-mono font-bold text-slate-500">
              Sala: {room.name}
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight mt-1 flex items-center gap-1.5">
            <span>⚙️</span> Consola del Administrador (Sorteador)
          </h2>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={onRefreshRoom}
            disabled={isUpdating}
            className="text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl cursor-pointer"
          >
            {isUpdating ? 'Procesando...' : '🔄 Actualizar'}
          </button>
          <button
            onClick={handleCloseRoom}
            disabled={isUpdating}
            className="text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-transparent px-4 py-2 rounded-xl cursor-pointer transition-all"
            id="close-room-btn"
          >
            🗑️ Cerrar Sala
          </button>
          <button
            onClick={onLeaveAdmin}
            className="text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-transparent px-4 py-2 rounded-xl cursor-pointer transition-all"
          >
            Salir Consola
          </button>
        </div>
      </div>

      {adminError && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-mono rounded-2xl animate-shake">
          <strong>⚠️ Alerta Admin:</strong> {adminError}
        </div>
      )}

      {/* Grid of Panel Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Controls & Pattern (col-span-7) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Section 1: Drawing Bombo Tool */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-1.5">
              <span>🎰</span> Sorteador de Balotas (Bombo)
            </h3>

            <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-stretch">
              {/* Display Big Current Ball */}
              <div className="w-28 h-28 shrink-0 bg-gradient-to-tr from-slate-930 to-slate-800 rounded-full border-4 border-slate-700 flex flex-col items-center justify-center text-white shadow-xl relative overflow-hidden select-none">
                <div className="absolute inset-0.5 rounded-full border border-dashed border-slate-600 opacity-40" />
                {room.currentNumber ? (
                  <>
                    <span className="text-[11px] uppercase tracking-widest font-black text-rose-400">
                      Letra {getLetterForNumber(room.currentNumber)}
                    </span>
                    <span className="text-4xl font-extrabold tracking-tighter text-white">
                      {room.currentNumber}
                    </span>
                  </>
                ) : (
                  <span className="text-3xl">🎱</span>
                )}
              </div>

              {/* Draw Triggers */}
              <div className="flex-1 flex flex-col justify-between gap-3 w-full">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={drawManualNumber}
                    disabled={room.status === 'finished' || room.autoDraw || isUpdating}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span>🎯</span> Cantar Manual
                  </button>
                  <button
                    onClick={handleToggleAutoDraw}
                    disabled={room.status === 'finished' || isUpdating}
                    className={`font-extrabold text-xs py-3 px-4 rounded-xl cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1 shadow-sm ${
                      room.autoDraw
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <span>⏱️</span> {room.autoDraw ? 'Pausar Auto-Cantor' : 'Iniciar Auto-Cantor'}
                  </button>
                </div>

                {/* AutoDraw interval settings */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                    <span>Intervalo de Extracción (Velocidad):</span>
                    <span className="text-indigo-600 font-extrabold font-mono">{autodrawInterval} segundos</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={15}
                    value={autodrawInterval}
                    onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 5)}
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Pattern Matcher Config */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-3">
            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-1.5">
              <span>🏆</span> Modificar Patrón Ganador
            </h3>
            <p className="text-xs text-slate-500 leading-normal mb-1">
              Selecciona el patrón requerido para validar los cantos automáticamente. Al cambiarlo, los jugadores son notificados.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 select-none">
              {(
                [
                  { id: 'BINGO', name: 'Cartón Lleno', desc: 'Sorteo normal' },
                  { id: 'LINE', name: 'Línea Horizontal', desc: 'Fila horizontal' },
                  { id: 'DIAGONAL', name: 'Diagonales', desc: 'X o diagonal' },
                  { id: 'CORNERS', name: '4 Esquinas', desc: '4 extremos' },
                ] as const
              ).map((pat) => (
                <button
                  key={pat.id}
                  type="button"
                  onClick={() => handleSetPattern(pat.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col ${
                    room.pattern === pat.id
                      ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200/50'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-black text-slate-800">{pat.name}</span>
                  <span className="text-[10px] text-slate-500 font-medium mt-0.5">{pat.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Room Status Controls */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-3">
            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-1.5">
              <span>🎮</span> Control de Estado del Juego
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleSetStatus('playing')}
                disabled={room.status === 'playing' || isUpdating}
                className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white font-extrabold text-xs text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-40"
              >
                ▶️ En Juego
              </button>
              <button
                onClick={() => handleSetStatus('paused')}
                disabled={room.status === 'paused' || isUpdating}
                className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white font-extrabold text-xs text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-40"
              >
                ⏸️ Pausar
              </button>
              <button
                onClick={handleRestartGame}
                className="py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50 font-extrabold text-xs text-rose-700 hover:bg-rose-100 cursor-pointer flex items-center justify-center gap-1"
                id="reset-room-btn"
              >
                🔄 Reiniciar
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Player Listing and Claim Verifiers (col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Claims Queue Verification Center */}
          <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5 flex flex-col gap-3">
            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-1.5">
              <span>📋</span> Verificación de Cantos de Bingo
            </h3>

            <div className="flex-1 flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
              {pendingClaims.length === 0 ? (
                <div className="text-center p-6 border border-dashed border-amber-200 rounded-2xl bg-white text-slate-400 text-xs font-medium">
                  ⏳ No hay reclamos por revisar. Los cantos de jugadores aparecerán en tiempo real aquí.
                </div>
              ) : (
                pendingClaims.map((claim) => (
                  <div
                    key={claim.id}
                    className="bg-white border border-amber-300 rounded-2xl p-3 shadow-xs flex flex-col gap-2 animate-pulse"
                    id={`claim-box-${claim.id}`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-800 font-mono">
                        👤 {claim.playerName}
                      </span>
                      <span className="bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 text-[9px] font-black uppercase font-mono">
                        {claim.type === 'LINE' ? 'Canto Línea' : 'Canto Bingo'}
                      </span>
                    </div>

                    {/* Verification report */}
                    <div className="text-[11px] font-mono p-2 bg-slate-50 text-slate-700 rounded-xl">
                      {claim.missingNumbers.length === 0 ? (
                        <span className="text-emerald-600 font-extrabold">
                          ✅ ¡MATEMÁTICAMENTE COMPLETADO! No faltan balotas.
                        </span>
                      ) : (
                        <span className="text-rose-600">
                          ❌ FALTANTES: {claim.missingNumbers.map(n => getLetterForNumber(n) + '-' + n).join(', ')}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => handleVerifyClaim(claim.id, true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] py-1.5 px-3 rounded-lg cursor-pointer transition-all text-center"
                      >
                        Aprobar Gane
                      </button>
                      <button
                        onClick={() => handleVerifyClaim(claim.id, false)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black text-[11px] py-1.5 px-3 rounded-lg cursor-pointer transition-all text-center"
                      >
                        Rechazar Canto
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Players Management Registry */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-3 flex-1">
            <div className="flex justify-between items-center text-xs font-extrabold">
              <h3 className="text-slate-800 text-sm font-extrabold flex items-center gap-1.5">
                <span>👥</span> Jugadores Registrados
              </h3>
              <span className="text-slate-500 font-mono text-[11px]">
                {playersList.length} / 500
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-2 max-h-[180px] overflow-y-auto flex flex-col gap-1 scrollbar-thin">
              {playersList.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-6 font-medium">
                  Aún no se ha unido ningún jugador físico o virtual.
                </div>
              ) : (
                playersList.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center py-1.5 px-2 hover:bg-slate-50 rounded-xl text-xs font-medium border-b border-dashed border-slate-100"
                    id={`player-row-${p.id}`}
                  >
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${p.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} title={p.isOnline ? 'Online' : 'Offline'} />
                      <span className="text-slate-700 font-bold truncate block">{p.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">({p.card.cardId})</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedPlayer(p)}
                        className="bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-100 hover:border-transparent py-0.5 px-2 rounded-md text-[10px] font-bold cursor-pointer transition-all"
                      >
                        👁️ Ver
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKickPlayer(p.id, p.name)}
                        className="text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-100 hover:border-transparent py-0.5 px-2 rounded-md text-[10px] font-bold cursor-pointer transition-all"
                      >
                        KICK
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Real-time Player Card Inspector Widget */}
          {liveSelectedPlayer && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex flex-col gap-3 animate-fade-in shadow-xs">
              <div className="flex justify-between items-center pb-1.5 border-b border-blue-200/50">
                <div>
                  <span className="text-[9px] text-blue-600 font-mono font-extrabold tracking-wider block">INSPECTOR EN TIEMPO REAL</span>
                  <h4 className="font-extrabold text-slate-800 text-xs">
                    Cartón de: <span className="text-blue-700 font-black">{liveSelectedPlayer.name}</span>
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPlayer(null)}
                  className="text-slate-500 hover:text-slate-800 text-[10px] font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200 cursor-pointer"
                >
                  ✕ Cerrar
                </button>
              </div>

              <div className="grid grid-cols-5 gap-1 w-full max-w-xs mx-auto p-1.5 bg-white rounded-xl border border-slate-100">
                {/* Headers */}
                {['B', 'I', 'N', 'G', 'O'].map((letter, idx) => (
                  <div key={idx} className="bg-slate-900 text-white rounded-md p-1 text-center font-black text-[10px]">
                    {letter}
                  </div>
                ))}

                {/* Grid */}
                {liveSelectedPlayer.card.grid.flatMap((row, rIdx) => 
                  row.map((cellValue, cIdx) => {
                    const isMarkedByPlayer = liveSelectedPlayer.markedCells?.[rIdx]?.[cIdx];
                    const isCalledByAdmin = cellValue !== null && room.calledNumbers.includes(cellValue);
                    const isFree = cellValue === null;

                    return (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        className={`aspect-square rounded-lg flex flex-col items-center justify-center font-bold text-[10px] relative select-none transition-all border ${
                          isFree
                            ? 'bg-amber-100 border-amber-300 text-amber-950 font-black text-[8px]'
                            : isMarkedByPlayer && isCalledByAdmin
                            ? 'bg-emerald-600 border-emerald-700 text-white shadow-xs font-extrabold font-mono'
                            : isMarkedByPlayer
                            ? 'bg-blue-500 border-blue-600 text-white font-extrabold font-mono'
                            : isCalledByAdmin
                            ? 'bg-amber-500/25 border-amber-400 text-slate-800 font-medium font-mono'
                            : 'bg-slate-50 border-slate-100 text-slate-700 font-medium font-mono'
                        }`}
                      >
                        {isFree ? 'LIBRE' : cellValue}
                        {isMarkedByPlayer && !isFree && (
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex gap-2 justify-center text-[9px] text-slate-500 font-medium font-sans">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>Marcado</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-amber-400/50 rounded-full" />
                  <span>Cantado</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-600 rounded-full" />
                  <span>Ambos</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Share / Invitation panel */}
      <div className="border-t border-slate-100 pt-5 flex items-center gap-4 flex-wrap select-none text-xs">
        <div className="font-extrabold text-slate-700">📣 ¡Invita a Jugadores!</div>
        <div className="flex-1 min-w-[200px] flex gap-2">
          <input
            type="text"
            readOnly
            value={`${window.location.origin}/?room=${room.id}`}
            className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-600 font-mono text-[10px] select-all w-full outline-none"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/?room=${room.id}`);
              setSuccessMsg('¡Enlace de invitación copiado!');
              setTimeout(() => setSuccessMsg(''), 2000);
            }}
            className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 rounded-xl font-bold font-mono text-[10px] transition-all cursor-pointer whitespace-nowrap"
          >
            {successMsg || 'COPIAR LINK'}
          </button>
        </div>
      </div>

      {/* Custom Confirmation Modal Overlay */}
      {confirmConfig && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" style={{ contentVisibility: 'auto' }}>
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl flex flex-col gap-4 animate-scale-up">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <span className="text-xl">
                {confirmConfig.type === 'close' ? '🚨' : confirmConfig.type === 'restart' ? '🔄' : '🚫'}
              </span>
              <h3 className="font-extrabold text-slate-950 text-sm">
                {confirmConfig.type === 'close'
                  ? '¿Cerrar Sala Permanentemente?'
                  : confirmConfig.type === 'restart'
                  ? '¿Reiniciar el Sorteo?'
                  : '¿Retirar Jugador?'}
              </h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              {confirmConfig.type === 'close'
                ? '¿Estás seguro de cerrar esta sala permanentemente? Todos los jugadores activos serán desconectados inmediatamente, se eliminará de los registros de salas públicas y todo el progreso se perderá.'
                : confirmConfig.type === 'restart'
                ? '¿Deseas REINICIAR el juego? Todas las balotas regresarán al bombo y se generarán cartones nuevos para todos los jugadores de forma automática.'
                : `¿Estás seguro de que deseas retirar al jugador "${confirmConfig.playerName}" de esta sala de bingo?`}
            </p>

            <div className="flex gap-2.5 mt-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmConfig(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-all border border-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const currentConfig = confirmConfig;
                  setConfirmConfig(null); // Close modal first
                  
                  if (currentConfig.type === 'close') {
                    // Execute Close Room logic directly
                    setIsUpdating(true);
                    setAdminError('');
                    try {
                      const res = await fetch(`/api/rooms/${room.id}`, {
                        method: 'DELETE',
                        headers: {
                          'x-admin-key': adminKey,
                        },
                      });
                      if (res.ok) {
                        if (onDeleteSuccess) {
                          onDeleteSuccess();
                        } else {
                          onLeaveAdmin();
                        }
                      } else {
                        const data = await res.json();
                        throw new Error(data.error || 'No se pudo cerrar la sala');
                      }
                    } catch (e: any) {
                      setAdminError(e.message || 'Error de conexión al cerrar la sala');
                    } finally {
                      setIsUpdating(false);
                    }
                  } else if (currentConfig.type === 'restart') {
                    sendAdminAction('restart');
                  } else if (currentConfig.type === 'kick' && currentConfig.playerId) {
                    sendAdminAction('kick', { playerId: currentConfig.playerId });
                  }
                }}
                className={`px-4 py-2 font-bold text-xs rounded-xl cursor-pointer text-white transition-all ${
                  confirmConfig.type === 'close'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {confirmConfig.type === 'close'
                  ? 'Cerrar Sala'
                  : confirmConfig.type === 'restart'
                  ? 'Reiniciar'
                  : 'Retirar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
