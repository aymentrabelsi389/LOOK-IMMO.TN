"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitToUser = exports.emitToAdmin = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
let io;
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true
        }
    });
    io.on('connection', (socket) => {
        console.log('Client connected to socket:', socket.id);
        // Join admin room if authenticated (optional, for targeted emits)
        socket.on('join-admin', () => {
            socket.join('admin-room');
            console.log('Socket joined admin-room:', socket.id);
        });
        // Join specific user room for targeted notifications
        socket.on('join-user', (userId) => {
            socket.join(`user:${userId}`);
            console.log(`Socket ${socket.id} joined user room: user:${userId}`);
        });
        socket.on('disconnect', () => {
            console.log('Client disconnected from socket');
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
exports.getIO = getIO;
const emitToAdmin = (event, data) => {
    if (io) {
        io.to('admin-room').emit(event, data);
    }
};
exports.emitToAdmin = emitToAdmin;
const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    }
};
exports.emitToUser = emitToUser;
//# sourceMappingURL=socket.js.map