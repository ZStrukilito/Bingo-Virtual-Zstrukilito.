/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RoomSummary } from '../types.js';
import {
  User,
  Users,
  Compass,
  PlusCircle,
  LogIn,
  RefreshCw,
  Info,
  ArrowRight,
  Sparkles,
  Ticket,
  AlertCircle
} from 'lucide-react';

interface RoomLobbyProps {
  onJoinRoom: (roomId: string, name: string) => void;
  onCreateRoom: (roomName: string, adminName: string) => void;
}

export function RoomLobby({ onJoinRoom, onCreateRoom }: RoomLobbyProps) {
  const [name, setName] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomNameInput, setRoomNameInput] = useState('');
  const [activeTab, setActiveTab] = useState<'join' | 'create'>('join');
  const [roomsList, setRoomsList] = useState<RoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Persist user nickname in localStorage
  useEffect(() => {
    const savedName = localStorage.getItem('bingo-player-name');
    if (savedName) setName(savedName);
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoadingRooms(true);
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setRoomsList(data);
      }
    } catch (e) {
      console.error('Error fetching rooms:', e);
    } finally {
      setLoadingRooms(false);
      setTimeout(() => setIsRefreshing(false), 650);
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    localStorage.setItem('bingo-player-name', val);
    setErrorMessage('');
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Por favor, ingresa tu nombre o apodo para jugar.');
      return;
    }
    if (!roomIdInput.trim()) {
      setErrorMessage('Por favor, ingresa el código de 6 dígitos de la sala.');
      return;
    }
    setErrorMessage('');
    onJoinRoom(roomIdInput.trim().toUpperCase(), name.trim());
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Por favor, especifica un apodo (serás el organizador de la sala).');
      return;
    }
    if (!roomNameInput.trim()) {
      setErrorMessage('Por favor, especifica un nombre descriptivo para tu sala.');
      return;
    }
    setErrorMessage('');
    onCreateRoom(roomNameInput.trim(), name.trim());
  };

  const selectPatternTag = (pattern: string) => {
    switch (pattern) {
      case 'BINGO':
        return 'Cartón Lleno';
      case 'LINE':
        return 'Línea';
      case 'DIAGONAL':
        return 'Diagonal';
      case 'CORNERS':
        return '4 Esquinas';
      default:
        return pattern;
    }
  };

  return (
    <div 
      className="max-w-md w-full mx-auto bg-white border border-slate-200 shadow-[0_20px_50px_rgba(15,23,42,0.06)] rounded-[2rem] overflow-hidden p-6 md:p-8 flex flex-col gap-6 transition-all"
      id="room-lobby-card"
    >
      {/* Brand Header */}
      <div className="text-center flex flex-col items-center">
        <div className="relative mb-4 flex items-center justify-center">
          {/* Subtle glowing ambient backdrop */}
          <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full w-14 h-14" />
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md text-white">
            <Ticket className="w-7 h-7 stroke-[2.25]" />
          </div>
          {/* Sparkle micro badge */}
          <span className="absolute -top-1 -right-1.5 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500 justify-center items-center text-[8px] text-white font-bold">
              +
            </span>
          </span>
        </div>
        
        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-1.5 justify-center">
          BINGO <span className="text-blue-600">VIRTUAL</span>
        </h2>
        <p className="text-xs text-slate-500 font-semibold mt-2 max-w-[280px]">
          Multijugador en tiempo real con sistema de verificación y cartones interactivos.
        </p>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200/75 text-red-700 text-xs font-semibold rounded-2xl flex items-start gap-2.5 animate-bounce">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Nickname Form Field */}
      <div className="flex flex-col gap-2.5 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            Tu Apodo o Nombre
          </label>
          <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100/50 rounded-full px-2 py-0.5 font-bold flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-blue-600" />
            Identifícate
          </span>
        </div>
        
        <input
          type="text"
          value={name}
          maxLength={18}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Ej: Sra. María o Javi 555-1234"
          className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 text-slate-800 rounded-xl py-3 px-3.5 text-sm font-bold transition-all outline-none"
          id="nickname-input"
        />

        {/* Tip section with beautiful layout */}
        <div className="flex items-start gap-2 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100/40 text-left">
          <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-indigo-800 font-medium leading-normal">
            Se sugiere incluir tu <strong>número de contacto</strong> (ej: Marisa 555-2233) para que el organizador identifique tu identidad y te entregue tus premios.
          </p>
        </div>
      </div>

      {/* Action Tabs Selectors */}
      <div className="grid grid-cols-2 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 select-none">
        <button
          type="button"
          onClick={() => { setActiveTab('join'); setErrorMessage(''); }}
          className={`py-2.5 px-3 text-xs font-black rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'join'
              ? 'bg-white shadow-sm text-blue-600 scale-[1.01]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LogIn className="w-3.5 h-3.5" />
          Entrar a Sala
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('create'); setErrorMessage(''); }}
          className={`py-2.5 px-3 text-xs font-black rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'create'
              ? 'bg-white shadow-sm text-blue-600 scale-[1.01]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Crear Sala
        </button>
      </div>

      {/* Inputs per Flow */}
      {activeTab === 'join' ? (
        <form onSubmit={handleJoinSubmit} className="flex flex-col gap-4 animate-fade-in">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              🎟️ Código de la Sala (6 dígitos)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomIdInput}
                maxLength={6}
                onChange={(e) => setRoomIdInput(e.target.value)}
                placeholder="CÓDIGO"
                className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 text-slate-800 placeholder-slate-400 rounded-2xl py-3 px-4 text-center font-mono font-black text-xl tracking-widest uppercase transition-all outline-none"
                id="room-code-input"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-black text-sm py-3 px-6 rounded-2xl cursor-pointer transition-all active:scale-95 hover:shadow-lg flex items-center justify-center gap-1 shrink-0"
              >
                <span>Entrar</span>
                <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </form>
      ) : (
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4 animate-fade-in">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              🏢 Nombre del Sorteo o Sala
            </label>
            <input
              type="text"
              value={roomNameInput}
              maxLength={25}
              onChange={(e) => setRoomNameInput(e.target.value)}
              placeholder="Ej: Mi Bingo de Madres"
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 text-slate-800 rounded-2xl py-3 px-4 text-sm font-bold transition-all outline-none"
              id="room-name-input"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-sm py-3.5 px-6 rounded-2xl cursor-pointer transition-all active:scale-95 hover:shadow-lg flex items-center justify-center gap-2"
            id="create-room-btn"
          >
            <span>Crear Sala Administrativa</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </form>
      )}

      {/* Public Rooms List Panel */}
      <div className="border-t border-slate-100 pt-5 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-blue-500" />
            Salas Públicas Activas
          </h3>
          <button
            type="button"
            onClick={fetchRooms}
            disabled={loadingRooms}
            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 p-1 flex items-center gap-1 cursor-pointer transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {loadingRooms ? 'Buscando...' : 'Actualizar'}
          </button>
        </div>

        <div className="max-h-[160px] overflow-y-auto flex flex-col gap-2 pr-1 scrollbar-thin">
          {loadingRooms && roomsList.length === 0 ? (
            <div className="text-center text-slate-400 py-6 text-xs font-semibold flex flex-col items-center gap-1">
              <RefreshCw className="w-5 h-5 text-slate-300 animate-spin" />
              <span>Buscando salas en curso...</span>
            </div>
          ) : roomsList.length === 0 ? (
            <div className="text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl py-7 px-4 text-xs font-semibold bg-slate-50">
              No hay salas activas creadas hoy. ¡Crea una sala y sé la primera estrella de bingo!
            </div>
          ) : (
            roomsList.map((room) => (
              <button
                key={room.id}
                onClick={() => {
                  if (!name.trim()) {
                    setErrorMessage('Por favor, ingresa tu apodo primero arriba.');
                    return;
                  }
                  setErrorMessage('');
                  onJoinRoom(room.id, name.trim());
                }}
                className="w-full text-left bg-slate-50 hover:bg-blue-50/50 border border-slate-100 hover:border-blue-200 p-3 rounded-2xl transition-all flex items-center justify-between group cursor-pointer"
                id={`room-item-${room.id}`}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="font-black text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                    {room.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 font-mono">
                    ID: <span className="text-slate-800 uppercase font-black">{room.id}</span>
                    <span className="text-slate-300">•</span>
                    <span>Modo: {selectPatternTag(room.pattern)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-extrabold text-slate-600 bg-slate-200/50 group-hover:bg-blue-100 group-hover:text-blue-700 px-2.5 py-1 rounded-full transition-all flex items-center gap-1 font-mono">
                    <Users className="w-3 h-3 text-slate-400 group-hover:text-blue-500" />
                    <span>{room.playerCount}</span>
                  </div>
                  {room.status === 'playing' ? (
                    <span className="relative flex h-2 w-2" title="Jugando">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  ) : room.status === 'paused' ? (
                    <span className="w-2 h-2 rounded-full bg-amber-400" title="En Pausa" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-300" title="Abierta / Esperando" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
