"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitToUser = exports.emitToAdmin = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const cookie_1 = require("cookie");
const logger_1 = require("./logger");
let io;
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
const authenticateSocket = (socket, next) => {
    try {
        const cookieHeader = socket.handshake.headers.cookie;
        const cookies = cookieHeader ? (0, cookie_1.parse)(cookieHeader) : {};
        let token = cookies['access_token'];
        // Fallback: allow token via auth payload for non-browser/native clients
        if (!token && socket.handshake.auth?.token) {
            token = socket.handshake.auth.token;
        }
        if (!token) {
            // No credentials — connect as anonymous, no privileged rooms.
            return next();
        }
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            logger_1.logger.error('[SOCKET] JWT_SECRET not set — rejecting authenticated handshake');
            return next();
        }
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        socket.data.userId = decoded.id;
        socket.data.role = decoded.role;
        next();
    }
    catch {
        // Invalid/expired token — treat as anonymous rather than hard-failing
        // the connection (frontend may still want a non-privileged socket).
        next();
    }
};
const initSocket = (server) => {
    // Mirror the same multi-origin allow-list used by the REST CORS config.
    // This handles both bare domain and www, plus local dev ports.
    const allowedOrigins = [
        process.env.FRONTEND_URL,
        'https://www.look-immo.tn',
        'https://look-immo.tn',
        'http://localhost:5173',
        'http://localhost:3000',
    ].filter(Boolean);
    io = new socket_io_1.Server(server, {
        cors: {
            origin: (origin, callback) => {
                // Allow server-to-server or non-browser requests (no origin header)
                if (!origin)
                    return callback(null, true);
                if (allowedOrigins.includes(origin))
                    return callback(null, true);
                return callback(new Error('Socket.io CORS: origin not allowed'));
            },
            methods: ["GET", "POST"],
            credentials: true
        },
        // Allow both transports so nginx can perform the HTTP→WS upgrade cleanly
        transports: ['polling', 'websocket'],
    });
    io.use(authenticateSocket);
    io.on('connection', (socket) => {
        const { userId, role } = socket.data;
        logger_1.logger.info('Client connected to socket:', socket.id, userId ? `(user:${userId}, role:${role})` : '(anonymous)');
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
            logger_1.logger.info('Client disconnected from socket:', socket.id);
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