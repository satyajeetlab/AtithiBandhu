import { io } from 'socket.io-client';

let socket = null;

// Lazily create a single shared socket connection, authenticated with the JWT.
export function getSocket() {
  if (socket) return socket;
  const token = localStorage.getItem('token');
  socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
    auth: { token },
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
