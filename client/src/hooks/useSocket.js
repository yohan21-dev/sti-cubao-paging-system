import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket(room = null) {
  const socketRef = useRef(null);

  useEffect(() => {
    const url = import.meta.env.VITE_API_URL || window.location.origin;

    socketRef.current = io(url, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    // Server only supports joining the 'display' room via 'join_display'
    if (room) {
      socketRef.current.emit('join_display');
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [room]);

  return socketRef;
}
