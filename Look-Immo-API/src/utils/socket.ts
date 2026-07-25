import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';

interface AuthedSocket extends Socket {
    data: {
        userId?: string;
        role?: string;
    };
}

let io: SocketServer;

/**
 * Verifies the `access_token` HTTP-only cookie (same cookie/secret used by
 * the REST auth middleware) during the Socket.io handshake.
 *
 * Sockets are never trusted to self-report their identity or role — the
 * server derives both from a verified JWT and uses them to decide which
 * rooms the socket is allowed to join. A socket with no valid token still
 * connects (so anonymous visitors can use non-privileged, unauthenticated
 * features if any exist) but is not joined to any admin/user room.
 */
const authenticateSocket = (socket: AuthedSocket, next: (err?: Error) => void) => {
    try {
        const cookieHeader = socket.handshake.headers.cookie;
        const cookies = cookieHeader ? parseCookie(cookieHeader) : {};
        let token = cookies['access_token'];

        // Fallback: allow token via auth payload for non-browser/native clients
        if (!token && socket.handshake.auth?.token) {
            token = socket.handshake.auth.token as string;
        }

        if (!token) {
            // No credentials — connect as anonymous, no privileged rooms.
            return next();
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('[SOCKET] JWT_SECRET not set — rejecting authenticated handshake');
            return next();
        }

        const decoded = jwt.verify(token, secret) as { id: string; role: string };
        socket.data.userId = decoded.id;
        socket.data.role = decoded.role;
        next();
    } catch {
        // Invalid/expired token — treat as anonymous rather than hard-failing
        // the connection (frontend may still want a non-privileged socket).
        next();
    }
};

export const initSocket = (server: HttpServer) => {
    io = new SocketServer(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.use(authenticateSocket as any);

    io.on('connection', (socket: AuthedSocket) => {
        const { userId, role } = socket.data;
        console.log('Client connected to socket:', socket.id, userId ? `(user:${userId}, role:${role})` : '(anonymous)');

        // Room membership is derived ONLY from the verified JWT — never from
        // client-declared events. This prevents any socket from joining
        // another user's room or the admin room without a valid token.
        if (userId) {
            socket.join(`user:${userId}`);
            if (role === 'admin' || role === 'agent') {
                socket.join('admin-room');
            }
        }

        socket.on('disconnect', () => {
            console.log('Client disconnected from socket:', socket.id);
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
