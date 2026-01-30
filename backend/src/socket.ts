import { Server } from 'socket.io';

// Global socket instance - will be initialized in index.ts
let io: Server;

export function initSocket(socketServer: Server) {
  io = socketServer;
}

export function getSocket(): Server {
  if (!io) {
    throw new Error('Socket.IO not initialized!');
  }
  return io;
}
