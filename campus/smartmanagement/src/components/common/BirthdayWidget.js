/**
 * BirthdayWidget Component
 * 
 * Card-based widget displaying today's birthdays.
 * Used on Admin dashboard for visibility and planning.
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { birthdayAPI } from '../../services/api';
import './BirthdayWidget.css';

const BirthdayWidget = ({ showRoleBadge = true }) => {
    const [birthdays, setBirthdays] = useState([]);
    const [date, setDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchTodaysBirthdays();
    }, []);

    const fetchTodaysBirthdays = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await birthdayAPI.getTodaysBirthdays();
            if (response.data?.success) {
                setBirthdays(response.data.data.users || []);
                setDate(response.data.data.date || '');
            }
        } catch (err) {
            console.error('Error fetching birthdays:', err);
            setError('Failed to load birthdays');
        } finally {
            setLoading(false);
        }
    };

    const getRoleBadgeClass = (role) => {
        switch (role) {
            case 'student': return 'role-badge role-student';
            case 'faculty': return 'role-badge role-faculty';
            case 'admin': return 'role-badge role-admin';
            default: return 'role-badge';
        }
    };

    if (loading) {
        return (
            <div className="birthday-widget">
                <div className="birthday-widget-header">
                    <span className="birthday-icon">🎉</span>
                    <h3>Today's Birthdays</h3>
                </div>
                <div className="birthday-widget-body">
                    <div className="birthday-loading">
                        <div className="loading-spinner-small"></div>
                        <span>Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="birthday-widget birthday-widget-error">
                <div className="birthday-widget-header">
                    <span className="birthday-icon">🎉</span>
                    <h3>Today's Birthdays</h3>
                </div>
                <div className="birthday-widget-body">
                    <p className="error-text">{error}</p>
                    <button onClick={fetchTodaysBirthdays} className="retry-btn">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="birthday-widget">
            <div className="birthday-widget-header">
                <span className="birthday-icon">🎉</span>
                <h3>Today's Birthdays</h3>
                {date && <span className="birthday-date">{date}</span>}
            </div>
            <div className="birthday-widget-body">
                {birthdays.length === 0 ? (
                    <div className="birthday-empty">
                        <span className="empty-icon">🎈</span>
                        <p>No birthdays today</p>
                    </div>
                ) : (
                    <ul className="birthday-list">
                        {birthdays.map((user, index) => (
                            <li key={user.id || index} className="birthday-item">
                                <div className="birthday-avatar">
                                    {user.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="birthday-info">
                                    <span className="birthday-name">{user.name}</span>
                                    <span className="birthday-department">{user.department}</span>
                                </div>
                                {showRoleBadge && (
                                    <span className={getRoleBadgeClass(user.role)}>
                                        {user.role}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {birthdays.length > 0 && (
                <div className="birthday-widget-footer">
                    <span className="birthday-count">
                        🎂 {birthdays.length} birthday{birthdays.length !== 1 ? 's' : ''} today
                    </span>
                </div>
            )}
        </div>
    );
};

export default BirthdayWidget;
