import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
export declare const initSocket: (server: HttpServer) => SocketServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const getIO: () => SocketServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const emitToAdmin: (event: string, data: any) => void;
export declare const emitToUser: (userId: string, event: string, data: any) => void;
//# sourceMappingURL=socket.d.ts.map