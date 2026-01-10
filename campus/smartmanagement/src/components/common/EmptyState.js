import React from 'react';
import { FiInbox, FiAlertCircle, FiSearch, FiUsers } from 'react-icons/fi';

const EmptyState = ({
    icon: Icon = FiInbox,
    title = 'No data found',
    description = 'There are no items to display at the moment.',
    action,
    actionLabel,
}) => {
    return (
        <div className="text-center py-12 px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon size={28} className="text-secondary-400" />
            </div>
            <h3 className="text-lg font-medium text-secondary-700 mb-2">{title}</h3>
            <p className="text-secondary-500 text-sm max-w-sm mx-auto mb-6">{description}</p>
            {action && (
                <button onClick={action} className="btn-primary">
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export const NoResults = ({ searchTerm }) => (
    <EmptyState
        icon={FiSearch}
        title="No results found"
        description={`No results found for "${searchTerm}". Try adjusting your search.`}
    />
);

export const NoStudents = ({ action, actionLabel = 'Add Student' }) => (
    <EmptyState
        icon={FiUsers}
        title="No students found"
        description="There are no students registered yet. Add your first student to get started."
        action={action}
        actionLabel={actionLabel}
    />
);

export const ErrorState = ({ message, onRetry }) => (
    <div className="text-center py-12 px-4">
        <div className="w-16 h-16 bg-danger-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle size={28} className="text-danger-500" />
        </div>
        <h3 className="text-lg font-medium text-secondary-700 mb-2">Something went wrong</h3>
        <p className="text-secondary-500 text-sm max-w-sm mx-auto mb-6">
            {message || 'An error occurred while fetching data. Please try again.'}
        </p>
        {onRetry && (
            <button onClick={onRetry} className="btn-primary">
                Try Again
            </button>
        )}
    </div>
);

export default EmptyState;
