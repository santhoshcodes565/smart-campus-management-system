import React from 'react';

const LoadingSpinner = ({ size = 'md', className = '' }) => {
    const sizeClasses = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-3',
        lg: 'w-12 h-12 border-4',
    };

    return (
        <div
            className={`${sizeClasses[size]} rounded-full border-primary-200 border-t-primary-600 animate-spin ${className}`}
        />
    );
};

export const PageLoader = () => (
    <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto" />
            <p className="mt-4 text-secondary-500">Loading...</p>
        </div>
    </div>
);

export const ButtonLoader = () => (
    <LoadingSpinner size="sm" className="border-white/30 border-t-white" />
);

export const SkeletonCard = () => (
    <div className="card animate-pulse">
        <div className="skeleton h-6 w-1/3 mb-4" />
        <div className="skeleton h-4 w-full mb-2" />
        <div className="skeleton h-4 w-2/3" />
    </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
    <div className="table-container animate-pulse">
        <div className="p-4 bg-gray-50">
            <div className="skeleton h-4 w-full" />
        </div>
        {[...Array(rows)].map((_, i) => (
            <div key={i} className="p-4 border-t border-gray-100">
                <div className="skeleton h-4 w-full" />
            </div>
        ))}
    </div>
);

export const SkeletonStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse flex items-center gap-4">
                <div className="skeleton w-14 h-14 rounded-xl" />
                <div className="flex-1">
                    <div className="skeleton h-6 w-16 mb-2" />
                    <div className="skeleton h-4 w-24" />
                </div>
            </div>
        ))}
    </div>
);

export default LoadingSpinner;
