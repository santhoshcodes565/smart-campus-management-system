import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useSocket } from '../../context/SocketContext';
import {
    FiMenu, FiBell, FiSearch, FiUser, FiSettings, FiLogOut, FiCircle
} from 'react-icons/fi';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { toggleSidebar, notifications, unreadCount, markNotificationRead } = useApp();
    const { isConnected } = useSocket();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const notifRef = useRef(null);
    const profileRef = useRef(null);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setShowProfile(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    };

    const handleLogout = () => {
        logout();
    };

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
            {/* Left Section */}
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleSidebar}
                    className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-secondary-600"
                >
                    <FiMenu size={20} />
                </button>

                {/* Search Bar */}
                <div className="hidden md:flex items-center relative">
                    <FiSearch className="absolute left-3 text-secondary-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
                {/* Connection Status */}
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 text-xs">
                    <FiCircle
                        size={8}
                        className={isConnected ? 'text-success-500 fill-success-500' : 'text-danger-500 fill-danger-500'}
                    />
                    <span className="text-secondary-600">{isConnected ? 'Live' : 'Offline'}</span>
                </div>

                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-secondary-600 relative"
                    >
                        <FiBell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-4 h-4 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notifications Dropdown */}
                    {showNotifications && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in">
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="font-semibold text-secondary-800">Notifications</h3>
                                {unreadCount > 0 && (
                                    <span className="badge-primary">{unreadCount} new</span>
                                )}
                            </div>
                            <div className="max-h-96 overflow-y-auto scrollbar-thin">
                                {notifications.length > 0 ? (
                                    notifications.slice(0, 10).map((notif) => (
                                        <div
                                            key={notif._id}
                                            className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${!notif.read ? 'bg-primary-50/30' : ''
                                                }`}
                                            onClick={() => markNotificationRead(notif._id)}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-2 h-2 mt-2 rounded-full ${!notif.read ? 'bg-primary-500' : 'bg-gray-300'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm text-secondary-800 truncate">{notif.title}</p>
                                                    <p className="text-xs text-secondary-500 mt-0.5 line-clamp-2">{notif.message}</p>
                                                    <p className="text-xs text-secondary-400 mt-1">{formatTime(notif.createdAt)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-secondary-400">
                                        <FiBell size={32} className="mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No notifications yet</p>
                                    </div>
                                )}
                            </div>
                            {notifications.length > 0 && (
                                <div className="p-3 border-t border-gray-100 text-center">
                                    <Link to={`/${user?.role}/notifications`} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                                        View all notifications
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Profile Dropdown */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => setShowProfile(!showProfile)}
                        className="flex items-center gap-2 p-1.5 pl-2 rounded-lg hover:bg-gray-100"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-secondary-800">{user?.name}</p>
                            <p className="text-xs text-secondary-500 capitalize">{user?.role}</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                    </button>

                    {/* Profile Dropdown Menu */}
                    {showProfile && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in">
                            <div className="p-4 border-b border-gray-100">
                                <p className="font-medium text-secondary-800">{user?.name}</p>
                                <p className="text-sm text-secondary-500">{user?.email}</p>
                            </div>
                            <div className="py-2">
                                <Link
                                    to={`/${user?.role}/profile`}
                                    className="flex items-center gap-3 px-4 py-2.5 text-secondary-600 hover:bg-gray-50 transition-colors"
                                    onClick={() => setShowProfile(false)}
                                >
                                    <FiUser size={18} />
                                    <span className="text-sm">My Profile</span>
                                </Link>
                                <Link
                                    to={`/${user?.role}/settings`}
                                    className="flex items-center gap-3 px-4 py-2.5 text-secondary-600 hover:bg-gray-50 transition-colors"
                                    onClick={() => setShowProfile(false)}
                                >
                                    <FiSettings size={18} />
                                    <span className="text-sm">Settings</span>
                                </Link>
                            </div>
                            <div className="py-2 border-t border-gray-100">
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-3 px-4 py-2.5 text-danger-500 hover:bg-danger-50 transition-colors w-full"
                                >
                                    <FiLogOut size={18} />
                                    <span className="text-sm">Logout</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Navbar;
