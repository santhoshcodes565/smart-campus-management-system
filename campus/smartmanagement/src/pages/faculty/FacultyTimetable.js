import React, { useState, useEffect } from 'react';
import { facultyAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiCalendar, FiClock, FiMapPin, FiBook, FiUsers } from 'react-icons/fi';

const FacultyTimetable = () => {
    const [timetable, setTimetable] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeDay, setActiveDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }));

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    useEffect(() => {
        if (!days.includes(activeDay)) {
            setActiveDay('Monday');
        }
        fetchTimetable();
    }, []);

    const fetchTimetable = async () => {
        try {
            setLoading(true);
            const response = await facultyAPI.getTimetable();
            if (response.data.success) {
                setTimetable(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching timetable:', error);
            // Fallback demo data
            setTimetable([
                {
                    day: 'Monday', slots: [
                        { startTime: '09:00', endTime: '10:00', subject: 'Data Structures', class: 'CSE-3-A', room: 'CS-101', type: 'lecture' },
                        { startTime: '11:00', endTime: '12:00', subject: 'Algorithms', class: 'CSE-3-B', room: 'CS-102', type: 'lecture' },
                        { startTime: '14:00', endTime: '16:00', subject: 'Data Structures Lab', class: 'CSE-3-A', room: 'Lab-1', type: 'lab' },
                    ]
                },
                {
                    day: 'Tuesday', slots: [
                        { startTime: '10:00', endTime: '11:00', subject: 'Database Systems', class: 'CSE-2-A', room: 'CS-103', type: 'lecture' },
                    ]
                },
                // ... more days
            ]);
        } finally {
            setLoading(false);
        }
    };

    const currentDaySlots = timetable.find(t => t.day === activeDay)?.slots || [];

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[{ label: 'Dashboard', path: '/faculty/dashboard' }, { label: 'My Timetable', path: '/faculty/timetable', isLast: true }]} />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">My Timetable</h1>
                    <p className="text-secondary-500 mt-1">Manage your weekly teaching schedule</p>
                </div>
            </div>

            {/* Day Selector */}
            <div className="flex overflow-x-auto gap-2 mb-6 pb-2 scrollbar-thin">
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
                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />)}
                </div>
            ) : currentDaySlots.length === 0 ? (
                <div className="card text-center py-12">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiCalendar size={32} className="text-secondary-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-secondary-800">No classes scheduled</h3>
                    <p className="text-secondary-500">You don't have any classes on {activeDay}.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {currentDaySlots.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((slot, index) => (
                        <div key={index} className="card border-l-4 border-l-primary-500 hover:translate-x-1 transition-transform">
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                <div className="flex items-center gap-3 md:w-48">
                                    <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
                                        <FiClock size={18} />
                                    </div>
                                    <span className="font-bold text-secondary-800">{slot.startTime} - {slot.endTime}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-bold text-secondary-800">{slot.subject}</h3>
                                        <span className={`badge ${slot.type === 'lab' ? 'bg-purple-50 text-purple-600' : 'badge-primary'}`}>
                                            {slot.type}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-sm text-secondary-500">
                                        <div className="flex items-center gap-1.5">
                                            <FiUsers size={14} /> {slot.class}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <FiMapPin size={14} /> {slot.room}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="btn-secondary h-9 text-xs">View Notes</button>
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
