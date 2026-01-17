import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Breadcrumb from '../../../components/common/Breadcrumb';
import {
    FiUser,
    FiShield,
    FiSettings,
    FiBook,
    FiUserCheck,
    FiLock,
    FiActivity,
    FiDownload
} from 'react-icons/fi';

const AdminSettingsLayout = () => {
    const location = useLocation();

    const settingsTabs = [
        { path: '/admin/settings/profile', icon: FiUser, label: 'My Profile' },
        { path: '/admin/settings/security', icon: FiShield, label: 'Security' },
        { path: '/admin/settings/system', icon: FiSettings, label: 'System' },
        { path: '/admin/settings/academic', icon: FiBook, label: 'Academic Rules' },
        { path: '/admin/settings/policies', icon: FiUserCheck, label: 'User Policies' },
        { path: '/admin/settings/access', icon: FiLock, label: 'Access Control' },
        { path: '/admin/settings/audit', icon: FiActivity, label: 'Audit Logs' },
        { path: '/admin/settings/export', icon: FiDownload, label: 'Export Data' },
    ];

    return (
        <div className="animate-fade-in">
            <Breadcrumb />

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Settings Sidebar */}
                <div className="lg:w-64 flex-shrink-0">
                    <div className="bg-white rounded-xl border shadow-sm sticky top-4">
                        <div className="p-4 border-b">
                            <h2 className="font-semibold text-secondary-800 flex items-center gap-2">
                                <FiSettings className="text-primary-600" />
                                Settings
                            </h2>
                        </div>
                        <nav className="p-2">
                            {settingsTabs.map(tab => {
                                const isActive = location.pathname === tab.path;
                                return (
                                    <NavLink
                                        key={tab.path}
                                        to={tab.path}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${isActive
                                                ? 'bg-primary-50 text-primary-700 font-medium'
                                                : 'text-secondary-600 hover:bg-gray-50 hover:text-secondary-800'
                                            }`}
                                    >
                                        <tab.icon size={18} className={isActive ? 'text-primary-600' : ''} />
                                        {tab.label}
                                    </NavLink>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default AdminSettingsLayout;
