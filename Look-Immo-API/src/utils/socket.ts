import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketServer;

export const initSocket = (server: HttpServer) => {
    io = new SocketServer(server, {
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
        socket.on('join-user', (userId: string) => {
            socket.join(`user:${userId}`);
            console.log(`Socket ${socket.id} joined user room: user:${userId}`);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected from socket');
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

export const emitToAdmin = (event: string, data: any) => {
    if (io) {
        io.to('admin-room').emit(event, data);
    }
};

export const emitToUser = (userId: string, event: string, data: any) => {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    }
};
