import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useApp } from '../../context/AppContext';

const DashboardLayout = () => {
    const { sidebarOpen, setSidebar, sidebarCollapsed } = useApp();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={() => setSidebar(false)}
                />
            )}

            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <div
                className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
                    }`}
            >
                {/* Navbar */}
                <Navbar />

                {/* Page Content */}
                <main className="p-4 lg:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
