import { io, Socket } from 'socket.io-client';
import { BACKEND_URL } from './api';

const SOCKET_URL = BACKEND_URL;

class SocketService {
    private socket: Socket | null = null;

    connect(userId?: string, isAdminOrAgent?: boolean) {
        if (this.socket) return;

        this.socket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
            console.log('Connected to WebSocket server');
            if (isAdminOrAgent) {
                // Notify server that we are an admin (to join the admin room)
                this.socket?.emit('join-admin');
            }
            if (userId) {
                // Notify server of the authenticated user (to join user room)
                this.socket?.emit('join-user', userId);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
        });

        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    on(event: string, callback: (data: any) => void) {
        this.socket?.on(event, callback);
    }

    off(event: string) {
        this.socket?.off(event);
    }

    emit(event: string, data: any) {
        this.socket?.emit(event, data);
    }
}

export const socketService = new SocketService();
