/**
 * BirthdayBanner Component
 * 
 * Personal birthday banner shown when user's birthday is today.
 * Dismissible with localStorage persistence.
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { birthdayAPI } from '../../services/api';
import './BirthdayBanner.css';

const BirthdayBanner = ({ userName }) => {
    const [isBirthday, setIsBirthday] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const [loading, setLoading] = useState(true);

    const DISMISS_KEY = 'birthday_banner_dismissed';
    const DISMISS_DATE_KEY = 'birthday_banner_dismiss_date';

    useEffect(() => {
        checkBirthday();
    }, []);

    const checkBirthday = async () => {
        try {
            // Check if already dismissed today
            const dismissDate = localStorage.getItem(DISMISS_DATE_KEY);
            const today = new Date().toDateString();

            if (dismissDate === today) {
                setIsDismissed(true);
                setLoading(false);
                return;
            }

            const response = await birthdayAPI.checkMyBirthday();
            if (response.data?.success) {
                setIsBirthday(response.data.data.isBirthdayToday);
            }
        } catch (err) {
            console.error('Error checking birthday:', err);
            setIsBirthday(false);
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = () => {
        setIsDismissed(true);
        const today = new Date().toDateString();
        localStorage.setItem(DISMISS_KEY, 'true');
        localStorage.setItem(DISMISS_DATE_KEY, today);
    };

    // Don't render if loading, not birthday, or dismissed
    if (loading || !isBirthday || isDismissed) {
        return null;
    }

    const displayName = userName || 'there';

    return (
        <div className="birthday-banner">
            <div className="birthday-banner-content">
                <div className="birthday-banner-confetti">
                    <span>🎊</span>
                    <span>🎉</span>
                    <span>✨</span>
                </div>
                <div className="birthday-banner-message">
                    <span className="birthday-cake">🎂</span>
                    <h2>Happy Birthday, {displayName}!</h2>
                    <p>Wishing you a wonderful day filled with joy and success! 🌟</p>
                </div>
                <div className="birthday-banner-confetti">
                    <span>✨</span>
                    <span>🎉</span>
                    <span>🎊</span>
                </div>
            </div>
            <button
                className="birthday-banner-dismiss"
                onClick={handleDismiss}
                aria-label="Dismiss birthday banner"
            >
                ×
            </button>
        </div>
    );
};

export default BirthdayBanner;
