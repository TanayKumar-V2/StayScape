import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api-config';

// Derive root URL from API_BASE_URL (strip /api/v1)
export const SOCKET_URL =
  process.env['NEXT_PUBLIC_SOCKET_URL'] ?? API_BASE_URL.replace(/\/api\/v1\/?$/, '');

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
