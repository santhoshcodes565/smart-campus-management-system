import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useApp } from './AppContext';

const SocketContext = createContext();

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const { isAuthenticated, user, token } = useAuth();
    const { addNotification } = useApp();

    useEffect(() => {
        if (isAuthenticated && token) {
            const newSocket = io(SOCKET_URL, {
                auth: { token },
                transports: ['websocket', 'polling'],
            });

            newSocket.on('connect', () => {
                console.log('Socket connected');
                setIsConnected(true);

                // Join user-specific room
                if (user?.role) {
                    newSocket.emit('join-room', `${user.role}-${user.id}`);
                    newSocket.emit('join-room', user.role); // Join role-based room
                }
            });

            newSocket.on('disconnect', () => {
                console.log('Socket disconnected');
                setIsConnected(false);
            });

            // Listen for real-time notifications
            newSocket.on('new-notice', (notice) => {
                addNotification({
                    _id: notice._id || Date.now(),
                    title: notice.title,
                    message: notice.message,
                    type: 'notice',
                    createdAt: new Date().toISOString(),
                    read: false,
                });
            });

            newSocket.on('attendance-update', (data) => {
                addNotification({
                    _id: Date.now(),
                    title: 'Attendance Updated',
                    message: data.message,
                    type: 'attendance',
                    createdAt: new Date().toISOString(),
                    read: false,
                });
            });

            newSocket.on('timetable-update', (data) => {
                addNotification({
                    _id: Date.now(),
                    title: 'Timetable Updated',
                    message: 'Your timetable has been updated',
                    type: 'timetable',
                    createdAt: new Date().toISOString(),
                    read: false,
                });
            });

            newSocket.on('fee-update', (data) => {
                addNotification({
                    _id: Date.now(),
                    title: 'Fee Update',
                    message: data.message,
                    type: 'fee',
                    createdAt: new Date().toISOString(),
                    read: false,
                });
            });

            setSocket(newSocket);

            return () => {
                newSocket.close();
            };
        } else {
            if (socket) {
                socket.close();
                setSocket(null);
                setIsConnected(false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, token, user?.id, user?.role]);

    const emitEvent = useCallback((event, data) => {
        if (socket && isConnected) {
            socket.emit(event, data);
        }
    }, [socket, isConnected]);

    const subscribeToEvent = useCallback((event, callback) => {
        if (socket) {
            socket.on(event, callback);
            return () => socket.off(event, callback);
        }
    }, [socket]);

    return (
        <SocketContext.Provider
            value={{
                socket,
                isConnected,
                emitEvent,
                subscribeToEvent,
            }}
        >
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export default SocketContext;
