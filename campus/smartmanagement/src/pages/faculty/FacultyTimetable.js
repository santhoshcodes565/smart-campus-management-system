import React, { useState, useEffect } from 'react';
import { facultyAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import { FiCalendar, FiClock, FiMapPin, FiUsers, FiStar } from 'react-icons/fi';

const FacultyTimetable = () => {
    const [timetable, setTimetable] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeDay, setActiveDay] = useState(
        new Date().toLocaleDateString('en-US', { weekday: 'long' })
    );

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    useEffect(() => {
        if (!days.includes(activeDay)) setActiveDay('Monday');
        fetchTimetable();
    }, []);

    const fetchTimetable = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await facultyAPI.getTimetable();
            if (response.data.success) {
                setTimetable(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching timetable:', err);
            setError('Could not load timetable. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Get all slots for activeDay across ALL timetable entries for the dept
    const currentDayEntries = timetable.filter(t => t.day === activeDay);
    const currentDaySlots = currentDayEntries
        .flatMap(entry =>
            (entry.slots || []).map(slot => ({
                ...slot,
                _class: entry.section
                    ? `${entry.department}-${entry.year}-${entry.section}`
                    : (slot.class || ''),
            }))
        )
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    const mySlotCount = currentDaySlots.filter(s => s.isMySlot).length;

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[
                { label: 'Dashboard', path: '/faculty/dashboard' },
                { label: 'My Timetable', path: '/faculty/timetable', isLast: true }
            ]} />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">My Timetable</h1>
                    <p className="text-secondary-500 mt-1">
                        Department schedule — your classes are highlighted in green
                    </p>
                </div>
                {currentDaySlots.length > 0 && (
                    <div className="mt-3 md:mt-0 flex gap-3 text-sm">
                        <span className="flex items-center gap-1.5 text-success-700 bg-success-50 px-3 py-1.5 rounded-lg font-medium">
                            <FiStar size={13} />
                            {mySlotCount} My Class{mySlotCount !== 1 ? 'es' : ''}
                        </span>
                        <span className="flex items-center gap-1.5 text-secondary-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                            {currentDaySlots.length} Total Periods
                        </span>
                    </div>
                )}
            </div>

            {/* Day Selector */}
            <div className="flex overflow-x-auto gap-2 mb-6 pb-2">
                {days.map(day => (
                    <button
                        key={day}
                        onClick={() => setActiveDay(day)}
                        className={`px-6 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap ${activeDay === day
                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                                : 'bg-white text-secondary-600 hover:bg-gray-50 border border-gray-100'
                            }`}
                    >
                        {day}
                    </button>
                ))}
            </div>

            {/* Schedule List */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />
                    ))}
                </div>
            ) : error ? (
                <div className="card text-center py-12">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiCalendar size={32} className="text-red-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-secondary-800">Failed to load timetable</h3>
                    <p className="text-secondary-500 mb-4">{error}</p>
                    <button onClick={fetchTimetable} className="btn-primary mx-auto">Retry</button>
                </div>
            ) : currentDaySlots.length === 0 ? (
                <div className="card text-center py-12">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiCalendar size={32} className="text-secondary-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-secondary-800">No classes scheduled</h3>
                    <p className="text-secondary-500">
                        No published timetable entries for {activeDay}.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {currentDaySlots.map((slot, index) => (
                        <div
                            key={index}
                            className={`card border-l-4 hover:translate-x-1 transition-transform ${slot.isMySlot
                                    ? 'border-l-success-500 bg-success-50/30'
                                    : 'border-l-gray-300'
                                }`}
                        >
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                {/* Time */}
                                <div className="flex items-center gap-3 md:w-48">
                                    <div className={`p-2 rounded-lg ${slot.isMySlot
                                            ? 'bg-success-100 text-success-600'
                                            : 'bg-gray-100 text-secondary-400'
                                        }`}>
                                        <FiClock size={18} />
                                    </div>
                                    <span className="font-bold text-secondary-800">
                                        {slot.startTime} – {slot.endTime}
                                    </span>
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <h3 className="text-lg font-bold text-secondary-800">
                                            {slot.subject}
                                        </h3>
                                        {slot.isMySlot && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-success-100 text-success-700">
                                                <FiStar size={10} /> My Class
                                            </span>
                                        )}
                                        {slot.type && (
                                            <span className={`badge text-xs ${slot.type === 'lab'
                                                    ? 'bg-purple-50 text-purple-600'
                                                    : 'badge-primary'
                                                }`}>
                                                {slot.type}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-sm text-secondary-500">
                                        <div className="flex items-center gap-1.5">
                                            <FiUsers size={14} />
                                            {slot._class || slot.class || '—'}
                                        </div>
                                        {slot.room && (
                                            <div className="flex items-center gap-1.5">
                                                <FiMapPin size={14} /> {slot.room}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FacultyTimetable;
