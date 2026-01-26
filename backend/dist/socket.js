"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
exports.getSocket = getSocket;
// Global socket instance - will be initialized in index.ts
let io;
function initSocket(socketServer) {
    io = socketServer;
}
function getSocket() {
    if (!io) {
        throw new Error('Socket.IO not initialized!');
    }
    return io;
}
//# sourceMappingURL=socket.js.map