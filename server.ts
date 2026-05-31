/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GameRoom, BingoCard, Player, BingoPattern, BingoClaim, RoomSummary } from './src/types.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory store for rooms
const rooms: { [id: string]: GameRoom } = {};
// Track last drawing timestamp for each room with auto-draw enabled
const lastDrawTimes: { [roomId: string]: number } = {};

// Clean up stale rooms (no activity for 12 hours)
const roomLastActive: { [roomId: string]: number } = {};
setInterval(() => {
  const now = Date.now();
  const twelveHours = 12 * 60 * 60 * 1000;
  for (const roomId in roomLastActive) {
    if (now - roomLastActive[roomId] > twelveHours) {
      delete rooms[roomId];
      delete lastDrawTimes[roomId];
      delete roomLastActive[roomId];
      console.log(`GC: Cleaned up inactive room ${roomId}`);
    }
  }
}, 1 * 60 * 60 * 1000); // Check every hour

// Helper to update room activity
function touchRoom(roomId: string) {
  roomLastActive[roomId] = Date.now();
}

// Generate code for letters B-I-N-G-O
function getLetterForNumber(n: number): string {
  if (n >= 1 && n <= 15) return 'B';
  if (n >= 16 && n <= 30) return 'I';
  if (n >= 31 && n <= 45) return 'N';
  if (n >= 46 && n <= 60) return 'G';
  if (n >= 61 && n <= 75) return 'O';
  return '';
}

// Generates a standard 75-Ball Bingo Card
function generateCard(): BingoCard {
  const cardId = Math.random().toString(36).substring(2, 9).toUpperCase();
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
    
    // Sort columns ascending for standard easy scanning
    columnNumbers.sort((a, b) => a - b);
    columns.push(columnNumbers);
  }
  
  // Construct 5x5 grid
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
}

// Draw a random undrawn number for a room
function drawNextNumberForRoom(room: GameRoom) {
  if (room.calledNumbers.length >= 75) {
    room.status = 'finished';
    room.autoDraw = false;
    room.logs.push({
      id: Math.random().toString(),
      text: 'Se han cantado todos los 75 números. ¡Sorteo completado!',
      timestamp: Date.now()
    });
    return;
  }
  
  const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
  const remaining = allNumbers.filter(n => !room.calledNumbers.includes(n));
  if (remaining.length === 0) return;
  
  const randomIndex = Math.floor(Math.random() * remaining.length);
  const drawn = remaining[randomIndex];
  
  room.calledNumbers.push(drawn);
  room.currentNumber = drawn;
  
  room.logs.push({
    id: Math.random().toString(),
    text: `ADMIN cantó el número ${getLetterForNumber(drawn)}-${drawn}`,
    timestamp: Date.now()
  });
}

// Verify a winning claim mathematically
function verifyPattern(
  cardGrid: (number | null)[][], 
  calledNumbers: number[], 
  patternType: BingoPattern
): { won: boolean; missing: number[] } {
  const calledSet = new Set<number>(calledNumbers);
  
  const checkCell = (r: number, c: number): number | null => {
    const val = cardGrid[r][c];
    if (val === null) return null; // FREE space is always completed
    if (calledSet.has(val)) return null; // Number already drawn
    return val; // Missing number
  };

  if (patternType === 'BINGO') {
    const missing: number[] = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const val = checkCell(r, c);
        if (val !== null) missing.push(val);
      }
    }
    return { won: missing.length === 0, missing };
  }

  if (patternType === 'LINE') {
    // Check 5 rows
    let bestMissing: number[] = [];
    let won = false;
    for (let r = 0; r < 5; r++) {
      const rowMissing: number[] = [];
      for (let c = 0; c < 5; c++) {
        const val = checkCell(r, c);
        if (val !== null) rowMissing.push(val);
      }
      if (rowMissing.length === 0) {
        won = true;
        bestMissing = [];
        break;
      }
      if (r === 0 || rowMissing.length < bestMissing.length) {
        bestMissing = rowMissing;
      }
    }
    return { won, missing: bestMissing };
  }

  if (patternType === 'DIAGONAL') {
    // Main diagonal
    const diag1Missing: number[] = [];
    for (let i = 0; i < 5; i++) {
      const val = checkCell(i, i);
      if (val !== null) diag1Missing.push(val);
    }
    
    // Anti diagonal
    const diag2Missing: number[] = [];
    for (let i = 0; i < 5; i++) {
      const val = checkCell(i, 4 - i);
      if (val !== null) diag2Missing.push(val);
    }

    if (diag1Missing.length === 0 || diag2Missing.length === 0) {
      return { won: true, missing: [] };
    }
    return { 
      won: false, 
      missing: diag1Missing.length < diag2Missing.length ? diag1Missing : diag2Missing 
    };
  }

  if (patternType === 'CORNERS') {
    const corners = [[0, 0], [0, 4], [4, 0], [4, 4]];
    const missing: number[] = [];
    for (const [r, c] of corners) {
      const val = checkCell(r, c);
      if (val !== null) missing.push(val);
    }
    return { won: missing.length === 0, missing };
  }

  return { won: false, missing: [] };
}

// Background scheduler for auto drawing
setInterval(() => {
  const now = Date.now();
  for (const roomId in rooms) {
    const room = rooms[roomId];
    if (room.status === 'playing' && room.autoDraw) {
      const lastDraw = lastDrawTimes[roomId] || 0;
      const intervalMs = room.drawInterval * 1000;
      if (now - lastDraw >= intervalMs) {
        drawNextNumberForRoom(room);
        lastDrawTimes[roomId] = now;
      }
    }
  }
}, 500);

// ================= API ENDPOINTS =================

// 1. Get List of Public Rooms
app.get('/api/rooms', (req, res) => {
  const list: RoomSummary[] = Object.values(rooms).map(room => ({
    id: room.id,
    name: room.name,
    playerCount: Object.keys(room.players).length,
    status: room.status,
    pattern: room.pattern,
    maxPlayers: room.maxPlayers
  }));
  res.json(list);
});

// 2. Create Room
app.post('/api/rooms', (req, res) => {
  const { roomName } = req.body;
  if (!roomName || typeof roomName !== 'string' || roomName.trim() === '') {
    res.status(400).json({ error: 'El nombre de la sala es obligatorio' });
    return;
  }

  // Create unique short room ID
  let roomId = '';
  do {
    roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (rooms[roomId]);

  const adminKey = Math.random().toString(36).substring(2, 12).toUpperCase();

  const newRoom: GameRoom = {
    id: roomId,
    name: roomName.trim(),
    adminKey,
    status: 'idle',
    pattern: 'BINGO',
    calledNumbers: [],
    currentNumber: null,
    autoDraw: false,
    drawInterval: 5,
    players: {},
    claims: [],
    logs: [
      {
        id: Math.random().toString(),
        text: `Sala "${roomName.trim()}" creada con éxito.`,
        timestamp: Date.now()
      }
    ],
    maxPlayers: 500
  };

  rooms[roomId] = newRoom;
  touchRoom(roomId);

  res.json({ roomId, adminKey, roomName: newRoom.name });
});

// 3. Get Room state
app.get('/api/rooms/:id', (req, res) => {
  const { id } = req.params;
  const room = rooms[id.toUpperCase()];
  if (!room) {
    res.status(404).json({ error: 'La sala de bingo especificada no existe' });
    return;
  }
  
  touchRoom(room.id);

  // Return full state.
  res.json(room);
});

// 4. Join Room
app.post('/api/rooms/:id/join', (req, res) => {
  const { id } = req.params;
  const { name, playerId } = req.body;
  const room = rooms[id.toUpperCase()];

  if (!room) {
    res.status(404).json({ error: 'La sala de bingo especificada no existe' });
    return;
  }

  touchRoom(room.id);

  if (!name || typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'El nombre del jugador es obligatorio' });
    return;
  }

  const cleanName = name.trim();

  // If a player is rejoining using their stored ID (e.g., page reload)
  if (playerId && room.players[playerId]) {
    const oldPlayer = room.players[playerId];
    oldPlayer.isOnline = true;
    oldPlayer.name = cleanName; // support editing name slightly if they want
    
    room.logs.push({
      id: Math.random().toString(),
      text: `${cleanName} ha regresado a la sala.`,
      timestamp: Date.now()
    });

    res.json({ playerId, playerCard: oldPlayer.card, roomState: room });
    return;
  }

  // Check 500 limit
  const activePlayersCount = Object.keys(room.players).length;
  if (activePlayersCount >= room.maxPlayers) {
    res.status(403).json({ error: 'La sala de bingo está llena. Límite de 500 jugadores alcanzado.' });
    return;
  }

  // Generate new player details
  const newPlayerId = Math.random().toString(36).substring(2, 10).toUpperCase();
  const emptyMarked: boolean[][] = Array.from({ length: 5 }, () => Array(5).fill(false));
  emptyMarked[2][2] = true; // Middle FREE space is pre-marked!

  const playerObj: Player = {
    id: newPlayerId,
    name: cleanName,
    card: generateCard(),
    joinedAt: Date.now(),
    markedCells: emptyMarked,
    isOnline: true
  };

  room.players[newPlayerId] = playerObj;

  room.logs.push({
    id: Math.random().toString(),
    text: `${cleanName} se unió a la sala de bingo.`,
    timestamp: Date.now()
  });

  res.json({ playerId: newPlayerId, playerCard: playerObj.card, roomState: room });
});

// 5. Update Player Cell Markings (Self-Tracking for interface / printing sync)
app.post('/api/rooms/:id/mark', (req, res) => {
  const { id } = req.params;
  const { playerId, r, c, marked } = req.body;
  const room = rooms[id.toUpperCase()];

  if (!room) {
    res.status(404).json({ error: 'La sala no existe' });
    return;
  }

  const player = room.players[playerId];
  if (!player) {
    res.status(404).json({ error: 'El jugador no pertenece a esta sala' });
    return;
  }

  if (r >= 0 && r < 5 && c >= 0 && c < 5) {
    player.markedCells[r][c] = marked;
    res.json({ success: true });
    return;
  }

  res.status(400).json({ error: 'Coordenadas inválidas' });
});

// 6. Claim Line / Bingo
app.post('/api/rooms/:id/claim', (req, res) => {
  const { id } = req.params;
  const { playerId, type } = req.body;
  const room = rooms[id.toUpperCase()];

  if (!room) {
    res.status(404).json({ error: 'Sala no encontrada' });
    return;
  }

  const player = room.players[playerId];
  if (!player) {
    res.status(404).json({ error: 'Jugador no registrado en esta sala' });
    return;
  }

  if (type !== 'LINE' && type !== 'BINGO') {
    res.status(400).json({ error: 'Tipo de canto inválido. Debe ser LINE o BINGO' });
    return;
  }

  // Mathematically calculate if they are actually winning right now!
  const verification = verifyPattern(player.card.grid, room.calledNumbers, type === 'LINE' ? 'LINE' : 'BINGO');

  const claimId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const claim: BingoClaim = {
    id: claimId,
    playerId,
    playerName: player.name,
    type,
    timestamp: Date.now(),
    status: 'pending',
    cardGrid: player.card.grid,
    missingNumbers: verification.missing
  };

  room.claims.push(claim);

  room.logs.push({
    id: Math.random().toString(),
    text: `¡${player.name} cantó ¡${type === 'LINE' ? 'LÍNEA' : 'BINGO'}! (Canto ID: ${claimId})`,
    timestamp: Date.now()
  });

  res.json({ claimId, claimStatus: 'pending', missing: verification.missing, won: verification.won });
});

// 7. Leave room
app.post('/api/rooms/:id/leave', (req, res) => {
  const { id } = req.params;
  const { playerId } = req.body;
  const room = rooms[id.toUpperCase()];

  if (room && playerId && room.players[playerId]) {
    const player = room.players[playerId];
    room.logs.push({
      id: Math.random().toString(),
      text: `${player.name} abandonó el juego.`,
      timestamp: Date.now()
    });
    delete room.players[playerId];
    res.json({ success: true });
    return;
  }

  res.status(400).json({ error: 'Jugador o sala no coincide' });
});

// ================= ADMIN ACTIONS =================

// Verification middleware for Admin key
const verifyAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { id } = req.params;
  const adminKey = req.headers['x-admin-key'] || req.query.adminKey;
  
  const room = rooms[id.toUpperCase()];
  if (!room) {
    res.status(404).json({ error: 'La sala de bingo no existe' });
    return;
  }

  if (room.adminKey !== adminKey) {
    res.status(401).json({ error: 'Acceso denegado: El código administrador es incorrecto' });
    return;
  }

  req.body.room = room; // inject room to avoid re-lookup
  next();
};

// A. Draw a single ball manually
app.post('/api/rooms/:id/admin/draw', verifyAdmin, (req, res) => {
  const room: GameRoom = req.body.room;
  drawNextNumberForRoom(room);
  lastDrawTimes[room.id] = Date.now(); // reset timer
  res.json(room);
});

// B. Toggle Autodraw state
app.post('/api/rooms/:id/admin/autodraw', verifyAdmin, (req, res) => {
  const room: GameRoom = req.body.room;
  const { autoDraw, interval } = req.body;

  room.autoDraw = !!autoDraw;
  if (interval && typeof interval === 'number' && interval >= 2) {
    room.drawInterval = interval;
  }

  if (room.autoDraw) {
    room.status = 'playing';
    lastDrawTimes[room.id] = Date.now();
  }

  room.logs.push({
    id: Math.random().toString(),
    text: `ADMIN cambio auto-cantor a: ${room.autoDraw ? 'ENCENDIDO' : 'APAGADO'} (${room.drawInterval}s de intervalo)`,
    timestamp: Date.now()
  });

  res.json(room);
});

// C. Verify Claim (Approve/Reject)
app.post('/api/rooms/:id/admin/verify-claim', verifyAdmin, (req, res) => {
  const room: GameRoom = req.body.room;
  const { claimId, status } = req.body;

  if (status !== 'verified' && status !== 'rejected') {
    res.status(400).json({ error: 'Estado de reclamo inválido.' });
    return;
  }

  const claim = room.claims.find(c => c.id === claimId);
  if (!claim) {
    res.status(404).json({ error: 'El reclamo no existe' });
    return;
  }

  claim.status = status;

  if (status === 'verified') {
    room.logs.push({
      id: Math.random().toString(),
      text: `🏆 RECLAMO VERIFICADO: El canto de ¡${claim.type === 'LINE' ? 'LÍNEA' : 'BINGO'}! de ${claim.playerName} ha sido aprobado por el Admin.`,
      timestamp: Date.now()
    });
    
    if (claim.type === 'BINGO') {
      room.status = 'finished';
      room.autoDraw = false;
    }
  } else {
    room.logs.push({
      id: Math.random().toString(),
      text: `❌ RECLAMO RECHAZADO: El canto de ¡${claim.type === 'LINE' ? 'LÍNEA' : 'BINGO'}! de ${claim.playerName} fue marcado como inválido. El juego sigue.`,
      timestamp: Date.now()
    });
  }

  res.json(room);
});

// D. Change winning pattern
app.post('/api/rooms/:id/admin/pattern', verifyAdmin, (req, res) => {
  const room: GameRoom = req.body.room;
  const { pattern } = req.body;

  const validPatterns: BingoPattern[] = ['BINGO', 'LINE', 'DIAGONAL', 'CORNERS'];
  if (!validPatterns.includes(pattern)) {
    res.status(400).json({ error: 'Patrón de juego no soportado' });
    return;
  }

  room.pattern = pattern;
  room.logs.push({
    id: Math.random().toString(),
    text: `Patrón objetivo modificado a: ${pattern === 'BINGO' ? 'Cartón Lleno (Bingo)' : pattern === 'LINE' ? 'Línea Horizontal' : pattern === 'DIAGONAL' ? 'Líneas Diagonales' : 'Cuatro Esquinas'}`,
    timestamp: Date.now()
  });

  res.json(room);
});

// E. Game controls (Pause, Resume, Restar)
app.post('/api/rooms/:id/admin/status', verifyAdmin, (req, res) => {
  const room: GameRoom = req.body.room;
  const { status } = req.body;

  if (status === 'playing' || status === 'paused' || status === 'idle') {
    room.status = status;
    if (status === 'paused') {
      room.autoDraw = false;
    }
    
    room.logs.push({
      id: Math.random().toString(),
      text: `Estado del sorteo ajustado a: ${status === 'playing' ? 'En Juego' : status === 'paused' ? 'Pausado' : 'Esperando Jugadores'}`,
      timestamp: Date.now()
    });

    res.json(room);
    return;
  }

  res.status(400).json({ error: 'Estado del sorteo no válido' });
});

// F. Restart / Reset Game Roll
app.post('/api/rooms/:id/admin/restart', verifyAdmin, (req, res) => {
  const room: GameRoom = req.body.room;

  room.calledNumbers = [];
  room.currentNumber = null;
  room.status = 'idle';
  room.autoDraw = false;
  room.claims = [];
  
  // Re-generate fresh cards for every registered player automatically so a new game starts fresh!
  for (const playerId in room.players) {
    const player = room.players[playerId];
    player.card = generateCard();
    const emptyMarked: boolean[][] = Array.from({ length: 5 }, () => Array(5).fill(false));
    emptyMarked[2][2] = true; // pre-mark FREE
    player.markedCells = emptyMarked;
  }

  room.logs.push({
    id: Math.random().toString(),
    text: '🔄 ¡Sorteo reiniciado! Todos los cartones han sido recreados y las balotas regresaron al bombo.',
    timestamp: Date.now()
  });

  res.json(room);
});

// G. Kick / Remove player
app.post('/api/rooms/:id/admin/kick', verifyAdmin, (req, res) => {
  const room: GameRoom = req.body.room;
  const { playerId } = req.body;

  if (playerId && room.players[playerId]) {
    const pName = room.players[playerId].name;
    delete room.players[playerId];
    
    room.logs.push({
      id: Math.random().toString(),
      text: `🚫 El jugador ${pName} fue retirado de la sala por el Administrador.`,
      timestamp: Date.now()
    });
    
    res.json(room);
    return;
  }

  res.status(404).json({ error: 'El jugador no se encuentra en esta sala' });
});

// H. Delete room entirely
app.delete('/api/rooms/:id', verifyAdmin, (req, res) => {
  const room: GameRoom = req.body.room;
  const rId = room.id;
  delete rooms[rId];
  delete lastDrawTimes[rId];
  delete roomLastActive[rId];
  res.json({ success: true, message: `La sala ${rId} ha sido eliminada por completo.` });
});


// ================ INTEGRATE VITE FOR SPA FLOW =================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
