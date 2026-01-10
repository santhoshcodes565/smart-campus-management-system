import React from 'react';

const StatCard = ({ icon, iconBg, value, label, trend, trendUp, onClick }) => {
    return (
        <div
            className={`stat-card ${onClick ? 'cursor-pointer hover:scale-105' : ''}`}
            onClick={onClick}
        >
            <div className={`stat-icon ${iconBg}`}>{icon}</div>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <p className="stat-value">{value}</p>
                    {trend && (
                        <span
                            className={`text-xs font-medium ${trendUp ? 'text-success-500' : 'text-danger-500'
                                }`}
                        >
                            {trendUp ? '↑' : '↓'} {trend}
                        </span>
                    )}
                </div>
                <p className="stat-label">{label}</p>
            </div>
        </div>
    );
};

export const StatCardMini = ({ icon, value, label, color = 'primary' }) => {
    const colorClasses = {
        primary: 'bg-primary-100 text-primary-600',
        success: 'bg-success-50 text-success-500',
        warning: 'bg-warning-50 text-warning-500',
        danger: 'bg-danger-50 text-danger-500',
    };

    return (
        <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-100">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-lg font-semibold text-secondary-800">{value}</p>
                <p className="text-xs text-secondary-500">{label}</p>
            </div>
        </div>
    );
};

export default StatCard;
