import React, { createContext, useContext, useReducer, useCallback } from 'react';

const AppContext = createContext();

const initialState = {
    sidebarOpen: true,
    sidebarCollapsed: false,
    notifications: [],
    unreadCount: 0,
    theme: 'light',
    loading: {},
};

const appReducer = (state, action) => {
    switch (action.type) {
        case 'TOGGLE_SIDEBAR':
            return { ...state, sidebarOpen: !state.sidebarOpen };
        case 'SET_SIDEBAR':
            return { ...state, sidebarOpen: action.payload };
        case 'TOGGLE_SIDEBAR_COLLAPSE':
            return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
        case 'ADD_NOTIFICATION':
            return {
                ...state,
                notifications: [action.payload, ...state.notifications],
                unreadCount: state.unreadCount + 1,
            };
        case 'SET_NOTIFICATIONS':
            return {
                ...state,
                notifications: action.payload,
                unreadCount: action.payload.filter(n => !n.read).length,
            };
        case 'MARK_NOTIFICATION_READ':
            return {
                ...state,
                notifications: state.notifications.map(n =>
                    n._id === action.payload ? { ...n, read: true } : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1),
            };
        case 'CLEAR_NOTIFICATIONS':
            return { ...state, notifications: [], unreadCount: 0 };
        case 'SET_THEME':
            return { ...state, theme: action.payload };
        case 'SET_LOADING':
            return {
                ...state,
                loading: { ...state.loading, [action.payload.key]: action.payload.value },
            };
        default:
            return state;
    }
};

export const AppProvider = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);

    const toggleSidebar = useCallback(() => {
        dispatch({ type: 'TOGGLE_SIDEBAR' });
    }, []);

    const setSidebar = useCallback((open) => {
        dispatch({ type: 'SET_SIDEBAR', payload: open });
    }, []);

    const toggleSidebarCollapse = useCallback(() => {
        dispatch({ type: 'TOGGLE_SIDEBAR_COLLAPSE' });
    }, []);

    const addNotification = useCallback((notification) => {
        dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
    }, []);

    const setNotifications = useCallback((notifications) => {
        dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications });
    }, []);

    const markNotificationRead = useCallback((id) => {
        dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
    }, []);

    const setLoading = useCallback((key, value) => {
        dispatch({ type: 'SET_LOADING', payload: { key, value } });
    }, []);

    const setTheme = useCallback((theme) => {
        dispatch({ type: 'SET_THEME', payload: theme });
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, []);

    return (
        <AppContext.Provider
            value={{
                ...state,
                toggleSidebar,
                setSidebar,
                toggleSidebarCollapse,
                addNotification,
                setNotifications,
                markNotificationRead,
                setLoading,
                setTheme,
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};

export default AppContext;
