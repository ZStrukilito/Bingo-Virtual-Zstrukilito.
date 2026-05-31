/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameRoom, BingoCard, Player, BingoPattern } from './types.js';
import { RoomLobby } from './components/RoomLobby.js';
import { BingoGrid } from './components/BingoGrid.js';
import { BallBoard } from './components/BallBoard.js';
import { GameLogs } from './components/GameLogs.js';
import { AdminPanel } from './components/AdminPanel.js';
import { CardPrinter } from './components/CardPrinter.js';

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<GameRoom | null>(null);
  const [playerObj, setPlayerObj] = useState<Player | null>(null);
  
  const [showPrinter, setShowPrinter] = useState(false);
  const [isAdminConsole, setIsAdminConsole] = useState(false);
  
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);
  const [joiningError, setJoiningError] = useState('');
  const [claimStatus, setClaimStatus] = useState<{ type: 'LINE' | 'BINGO'; status: string; missing: number[] } | null>(null);

  // Parse URL queries on Mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      // Pre-fill / join flow could be initiated in lobby
      localStorage.setItem('bingo-last-suggested-room', roomParam.toUpperCase());
    }

    // Recover session from localStorage
    const savedRoomId = localStorage.getItem('bingo-room-id');
    const savedPlayerId = localStorage.getItem('bingo-player-id');
    const savedAdminKey = localStorage.getItem('bingo-admin-key');

    if (savedRoomId) {
      if (savedPlayerId) {
        setRoomId(savedRoomId);
        setPlayerId(savedPlayerId);
        if (savedAdminKey) setAdminKey(savedAdminKey);
      } else if (savedAdminKey) {
        setRoomId(savedRoomId);
        setAdminKey(savedAdminKey);
        setIsAdminConsole(true);
      }
    }
  }, []);

  const handleLeaveGame = async () => {
    if (roomId && playerId) {
      try {
        await fetch(`/api/rooms/${roomId}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId }),
        });
      } catch (e) {
        // Safe to ignore on hard exit
      }
    }

    setRoomId(null);
    setPlayerId(null);
    setAdminKey(null);
    setRoomState(null);
    setPlayerObj(null);
    setIsAdminConsole(false);
    setClaimStatus(null);

    localStorage.removeItem('bingo-room-id');
    localStorage.removeItem('bingo-player-id');
    localStorage.removeItem('bingo-admin-key');
  };

  const handleRefreshRoom = async () => {
    if (!roomId) {
      setRoomState(null);
      setPlayerObj(null);
      return;
    }
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (!res.ok) {
        if (res.status === 404) {
          handleLeaveGame();
        }
        return;
      }
      const data: GameRoom = await res.json();
      setRoomState(data);

      // Find active player object in data
      if (playerId && data.players && data.players[playerId]) {
        setPlayerObj(data.players[playerId]);
      } else if (playerId && (!data.players || !data.players[playerId])) {
        // If kicked or removed
        setPlayerId(null);
        setPlayerObj(null);
        localStorage.removeItem('bingo-player-id');
      }
    } catch (err) {
      console.error('Error polling room:', err);
    }
  };

  // Sync state with server periodically
  useEffect(() => {
    if (!roomId) return;

    handleRefreshRoom();
    const interval = window.setInterval(handleRefreshRoom, 2000);
    return () => clearInterval(interval);
  }, [roomId, playerId]);

  const handleJoinOrCreateSuccess = (rId: string, pId: string, card: BingoCard, resolvedAdminKey?: string) => {
    setRoomId(rId);
    setPlayerId(pId);
    
    localStorage.setItem('bingo-room-id', rId);
    localStorage.setItem('bingo-player-id', pId);

    if (resolvedAdminKey) {
      setAdminKey(resolvedAdminKey);
      localStorage.setItem('bingo-admin-key', resolvedAdminKey);
      setIsAdminConsole(true);
    }
  };

  const handleJoinGame = async (roomCode: string, playerName: string) => {
    setJoiningError('');
    try {
      // Test if joining matches reconnecting player
      const activePlayerId = localStorage.getItem('bingo-player-id') || undefined;

      const res = await fetch(`/api/rooms/${roomCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName, playerId: activePlayerId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudo unir a la sala');
      }

      const info = await res.json();
      handleJoinOrCreateSuccess(roomCode, info.playerId, info.playerCard);
    } catch (e: any) {
      setJoiningError(e.message || 'Error de conexión');
    }
  };

  const handleCreateGame = async (roomName: string, adminNickname: string) => {
    setJoiningError('');
    try {
      // 1. Create Room first
      const createRes = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.error || 'No se pudo crear la sala');
      }

      const roomData = await createRes.json();

      // Creador de la sala NO JUEGA. No se conecta como jugador. Va directo a Consola.
      setRoomId(roomData.roomId);
      setPlayerId(null);
      setAdminKey(roomData.adminKey);
      setIsAdminConsole(true);

      localStorage.setItem('bingo-room-id', roomData.roomId);
      localStorage.removeItem('bingo-player-id');
      localStorage.setItem('bingo-admin-key', roomData.adminKey);
    } catch (e: any) {
      setJoiningError(e.message || 'Error de conexión');
    }
  };

  const handleCellClick = async (r: number, c: number) => {
    if (!roomId || !playerId || !playerObj) return;

    const newValue = !playerObj.markedCells[r][c];
    
    // Optimistic Update
    const updatedMarked = [...playerObj.markedCells.map(row => [...row])];
    updatedMarked[r][c] = newValue;
    setPlayerObj({
      ...playerObj,
      markedCells: updatedMarked
    });

    try {
      await fetch(`/api/rooms/${roomId}/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, r, c, marked: newValue }),
      });
    } catch (e) {
      console.error('Error highlighting card dabbing cell:', e);
    }
  };

  const handleClaim = async (type: 'LINE' | 'BINGO') => {
    if (!roomId || !playerId) return;

    setClaimStatus(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, type }),
      });

      if (res.ok) {
        const data = await res.json();
        setClaimStatus({
          type,
          status: data.won ? 'verified' : 'pending',
          missing: data.missing
        });
      }
    } catch (e) {
      console.error('Error processing claim:', e);
    }
  };



  const getPatternTitle = (pat: BingoPattern): string => {
    switch (pat) {
      case 'BINGO':
        return '🎡 Cartón Lleno (Bingo)';
      case 'LINE':
        return '📏 Cualquier Fila Horizontal (Línea)';
      case 'DIAGONAL':
        return '❌ Líneas Diagonales cruzadas';
      case 'CORNERS':
        return '📐 Las Cuatro Esquinas';
      default:
        return pat;
    }
  };

  const verifiedBingoWinners = (roomState?.claims || []).filter(c => c.type === 'BINGO' && c.status === 'verified');
  const verifiedLineWinners = (roomState?.claims || []).filter(c => c.type === 'LINE' && c.status === 'verified');
  const pendingClaimsCount = (roomState?.claims || []).filter(c => c.status === 'pending').length;

  // Printable screen state
  if (showPrinter) {
    return (
      <div className="min-h-screen bg-slate-100 py-6 px-4">
        <CardPrinter onClose={() => setShowPrinter(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* Header Bar */}
      <header className="print:hidden bg-slate-900 text-white shadow-sm py-4 px-6 sticky top-0 z-50 select-none">
        <div className="max-w-6xl mx-auto flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎟️</span>
            <div>
              <h1 className="font-black tracking-tight text-base sm:text-lg leading-tight">BINGO VIRTUAL</h1>
              <p className="text-[10px] text-slate-400 font-mono">Soporte Multijugador (Límite 500)</p>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            {roomId && (
              <div className="bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-mono">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Sala:</span>
                <strong className="text-amber-400 tracking-wider uppercase">{roomId}</strong>
              </div>
            )}

            {adminKey && roomId && playerId && (
              <button
                onClick={() => setIsAdminConsole(!isAdminConsole)}
                className={`py-1.5 px-3 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                  isAdminConsole 
                    ? 'bg-amber-500 text-slate-900 shadow-md' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {isAdminConsole ? '🙋‍♂️ Ver mi Cartón' : '⚙️ Consola Admin'}
              </button>
            )}

            <button
              onClick={() => setShowPrinter(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 px-3 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center gap-1"
            >
              <span>🖨️</span> <span className="hidden sm:inline">Imprimir Cartones</span>
            </button>

            {roomId && (
              <button
                onClick={handleLeaveGame}
                className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 border border-rose-800 py-1.5 px-3.5 rounded-xl font-bold text-xs cursor-pointer transition-all"
              >
                Salir
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 md:py-8">

        {/* Universal Winner Proclamation Banner */}
        {roomId && roomState && (verifiedBingoWinners.length > 0 || verifiedLineWinners.length > 0) && (
          <div className="mb-6 flex flex-col gap-3 select-none animate-fade-in" id="winner-announcement-banner">
            {verifiedBingoWinners.map((winner) => (
              <div key={winner.id} className="bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 border-2 border-yellow-300 text-black rounded-3xl p-5 shadow-xl flex items-center justify-between flex-wrap gap-4 relative overflow-hidden">
                <div className="flex items-center gap-3">
                  <span className="text-4xl animate-bounce">🏆</span>
                  <div>
                    <h2 className="text-base font-black tracking-tight leading-tight uppercase text-amber-950">¡Tenemos Ganador del BINGO!</h2>
                    <p className="text-xs font-bold text-black/80">El jugador <span className="bg-black text-yellow-400 py-0.5 px-2 rounded-lg font-bold select-all">{winner.playerName}</span> completó el Cartón Lleno.</p>
                  </div>
                </div>
                <div className="bg-black/10 border border-black/15 py-1 px-3 rounded-full text-[10px] font-black font-mono text-black">
                  VERIFICADO POR EL JURADO
                </div>
              </div>
            ))}

            {verifiedLineWinners.map((winner) => (
              <div key={winner.id} className="bg-gradient-to-r from-blue-600 to-indigo-600 border-2 border-blue-400 text-white rounded-3xl p-4 shadow-md flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⭐</span>
                  <div>
                    <h2 className="text-xs font-black tracking-tight uppercase leading-tight">¡Línea Confirmada!</h2>
                    <p className="text-xs font-medium opacity-90">Felicitaciones a <span className="bg-white/25 text-white py-0.5 px-2 rounded-md font-bold select-all">{winner.playerName}</span> por completar el patrón de línea.</p>
                  </div>
                </div>
                <div className="bg-white/10 border border-white/25 py-1 px-3 rounded-full text-[9px] font-bold font-mono">
                  LÍNEA VERIFICADA
                </div>
              </div>
            ))}
          </div>
        )}

        {roomId && roomState && pendingClaimsCount > 0 && (
          <div className="mb-6 bg-pink-50 border-2 border-pink-200 text-pink-900 rounded-3xl p-4 flex items-center gap-3 animate-pulse">
            <span className="text-2xl">🚨</span>
            <div className="text-xs font-medium flex-1">
              <strong>¡Un jugador cantó un reclamo!</strong> El organizador de la sala está verificando si el cartón es correcto. ¡Sintoniza el juego!
            </div>
          </div>
        )}

        {joiningError && (
          <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-800 text-xs font-mono rounded-2xl flex items-start gap-2.5 animate-bounce">
            <strong>⚠️ Error:</strong> {joiningError}
          </div>
        )}

        {/* 1. LOBBY VIEW (When not in a room) */}
        {!roomId && (
          <div className="py-6 md:py-12 flex flex-col items-center">
            <RoomLobby 
              onJoinRoom={handleJoinGame} 
              onCreateRoom={handleCreateGame} 
            />
          </div>
        )}

        {/* 2. ADMIN PANEL VIEW (Toggle control center) */}
        {roomId && adminKey && (isAdminConsole || !playerId) && roomState && (
          <div className="flex flex-col gap-6 animate-fade-in mb-8">
            {playerId && (
              <div className="flex bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 font-medium justify-between items-center select-none gap-4">
                <span>👑 Estás visualizando la consola administrativa. Puedes usar el auto-cantor de balotas o darlas manualmente.</span>
                <button
                  onClick={() => setIsAdminConsole(false)}
                  className="bg-slate-800 text-white font-extrabold px-3 py-1.5 rounded-xl cursor-pointer"
                >
                  Ir a mi Cartón
                </button>
              </div>
            )}
            
            <AdminPanel
              room={roomState}
              adminKey={adminKey}
              onRefreshRoom={handleRefreshRoom}
              onLeaveAdmin={() => {
                if (playerId) {
                  setIsAdminConsole(false);
                } else {
                  handleLeaveGame();
                }
              }}
              onDeleteSuccess={handleLeaveGame}
            />

            <BallBoard 
              calledNumbers={roomState.calledNumbers || []} 
              currentNumber={roomState.currentNumber} 
            />
          </div>
        )}

        {/* 3. ACTIVE JUGADOR PLAYING SCREEN */}
        {roomId && roomState && (!isAdminConsole || !adminKey) && (
          <div className="flex flex-col gap-6 animate-fade-in">
            
            {/* Winning status block notifications */}
            {roomState.status === 'finished' && (
              <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-900 rounded-3xl p-5 text-center shadow-lg animate-pulse" id="victory-modal">
                <span className="text-4xl">🏆</span>
                <h2 className="text-xl font-black mt-2">¡Sorteo Completado!</h2>
                <p className="text-xs mt-1 text-emerald-700 font-medium">Revisa la lista de ganadores verificados por el administrador en la bitácora.</p>
              </div>
            )}

            {/* Game target goals banner info */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-3xl p-5 md:p-6 shadow-md flex justify-between items-center flex-wrap gap-4 select-none">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-300 uppercase font-black tracking-widest">
                  Patrón en juego actual
                </span>
                <span className="text-base sm:text-lg font-black tracking-tight text-white">
                  {getPatternTitle(roomState.pattern)}
                </span>
              </div>

              {/* Connected players counter */}
              <div className="bg-white/10 border border-white/10 px-3.5 py-2 rounded-2xl flex items-center gap-1.5 text-xs font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Jugadores: <strong className="text-white">{Object.keys(roomState.players || {}).length} / 500</strong></span>
              </div>
            </div>

            {/* Main Interactive Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT: Game Card Interactive Segment */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                
                {playerObj ? (
                  <div className="flex flex-col gap-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex justify-between items-center shadow-2xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-mono">TU APODO CONTENDIENTE</span>
                        <strong className="text-slate-700 text-sm">{playerObj.name}</strong>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-500 font-mono py-1 px-2.5 rounded-full font-bold">
                        DAB / Marcar Manual
                      </span>
                    </div>

                    <BingoGrid
                      card={playerObj.card}
                      markedCells={playerObj.markedCells}
                      onCellClick={handleCellClick}
                      calledNumbers={roomState.calledNumbers}
                    />

                    {/* Claim Controls Trigger */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col gap-3">
                      <span className="text-xs font-bold text-slate-600 block uppercase tracking-wider text-center border-b border-slate-100 pb-2">
                        📣 Cantar Premios al Administrador
                      </span>

                      {claimStatus && (
                        <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-xl text-xs font-mono">
                          {claimStatus.status === 'verified' ? (
                            <span className="text-emerald-700 font-semibold block">
                              ✅ Canto de {claimStatus.type} enviado. El administrador revisará tu cartón en breves minutos.
                            </span>
                          ) : (
                            <div>
                              <span className="font-bold text-amber-700">Cantado con éxito {claimStatus.type}.</span>
                              {claimStatus.missing.length > 0 && (
                                <p className="text-[11px] text-rose-600 mt-1">
                                  Advertencia: Faltan marcar los siguientes números: {claimStatus.missing.join(', ')}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleClaim('LINE')}
                          disabled={roomState.status !== 'playing'}
                          className="bg-amber-500 hover:bg-amber-600 font-bold py-3 px-4 rounded-xl cursor-pointer text-xs transition-all text-slate-900 shadow-sm disabled:opacity-40"
                          id="btn-claim-line"
                        >
                          🙋‍♂️ ¡Cantar LÍNEA!
                        </button>
                        <button
                          onClick={() => handleClaim('BINGO')}
                          disabled={roomState.status !== 'playing'}
                          className="bg-rose-600 hover:bg-rose-700 font-bold py-3 px-4 rounded-xl cursor-pointer text-xs transition-all text-white shadow-sm disabled:opacity-40"
                          id="btn-claim-bingo"
                        >
                          🎉 ¡CANTAR BINGO!
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center text-slate-500 shadow-sm">
                    ⚠️ Error de registro del jugador.
                  </div>
                )}

              </div>

              {/* CENTER-RIGHT: Ball board & logs ticker panel */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                
                {/* Visualizer Ball Board of standards */}
                <BallBoard 
                  calledNumbers={roomState.calledNumbers || []} 
                  currentNumber={roomState.currentNumber} 
                />

                {/* Audit Log Streaming Tracker */}
                <GameLogs logs={roomState.logs || []} />

              </div>

            </div>

          </div>
        )}

      </main>

      {/* Elegant minimalist footer */}
      <footer className="print:hidden bg-slate-900 border-t border-slate-800 text-slate-400 py-6 text-center text-xs select-none mt-auto">
        <p className="font-mono">Plataforma de Bingo Virtual • Sorteos Independientes Seguros</p>
        <p className="text-[10px] text-slate-500 mt-1.5 font-sans">© 2026 Virtual Bingo Engine. Hecho con excelencia técnica y diseño responsivo.</p>
      </footer>
    </div>
  );
}
