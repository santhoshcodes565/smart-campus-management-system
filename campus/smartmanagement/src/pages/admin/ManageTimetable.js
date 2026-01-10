import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiPlus, FiEdit2, FiTrash2, FiCalendar, FiClock } from 'react-icons/fi';

const ManageTimetable = () => {
    const [timetables, setTimetables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState('CSE-3-A');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [facultyList, setFacultyList] = useState([]);
    const { emitEvent } = useSocket();

    const [formData, setFormData] = useState({
        day: 'Monday',
        period: 1,
        subject: '',
        faculty: '',
        startTime: '09:00',
        endTime: '10:00',
        room: '',
        department: 'CSE',
        year: 3,
        section: 'A',
    });

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const periods = [1, 2, 3, 4, 5, 6, 7, 8];
    const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];
    const subjects = ['Data Structures', 'Algorithms', 'Database Systems', 'Operating Systems', 'Computer Networks', 'Machine Learning', 'Web Development', 'Mathematics', 'Physics'];

    useEffect(() => {
        fetchTimetables();
    }, [selectedClass]);

    const fetchTimetables = async () => {
        try {
            setLoading(true);
            const [ttRes, facRes] = await Promise.all([
                adminAPI.getTimetables(),
                adminAPI.getFaculty()
            ]);

            if (ttRes.data.success) {
                setTimetables(ttRes.data.data);
            }
            if (facRes.data.success) {
                setFacultyList(facRes.data.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            // Fallback for faculty if needed
            setFacultyList([
                { _id: 'f1', userId: { name: 'Dr. Robert Smith' } },
                { _id: 'f2', userId: { name: 'Prof. Emily Davis' } },
                { _id: 'f3', userId: { name: 'Dr. Michael Lee' } },
            ]);
            // Demo data
            setTimetables([
                { _id: '1', day: 'Monday', period: 1, subject: 'Data Structures', faculty: 'Dr. Robert Smith', startTime: '09:00', endTime: '10:00', room: 'CS-101', department: 'CSE', year: 3, section: 'A' },
                { _id: '2', day: 'Monday', period: 2, subject: 'Algorithms', faculty: 'Prof. Emily Davis', startTime: '10:00', endTime: '11:00', room: 'CS-102', department: 'CSE', year: 3, section: 'A' },
                { _id: '3', day: 'Monday', period: 3, subject: 'Database Systems', faculty: 'Dr. Michael Lee', startTime: '11:15', endTime: '12:15', room: 'CS-103', department: 'CSE', year: 3, section: 'A' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (selectedEntry) {
                await adminAPI.updateTimetable(selectedEntry._id, formData);
                toast.success('Timetable entry updated');
            } else {
                await adminAPI.createTimetable(formData);
                toast.success('Timetable entry added');
            }

            // Emit real-time update
            emitEvent('timetable-update', {
                department: formData.department,
                year: formData.year,
                section: formData.section,
            });

            fetchTimetables();
            handleCloseModal();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Operation failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (entry) => {
        setSelectedEntry(entry);
        setFormData({
            day: entry.day || 'Monday',
            period: entry.period || 1,
            subject: entry.subject || '',
            faculty: entry.faculty || '',
            startTime: entry.startTime || '09:00',
            endTime: entry.endTime || '10:00',
            room: entry.room || '',
            department: entry.department || 'CSE',
            year: entry.year || 3,
            section: entry.section || 'A',
        });
        setShowModal(true);
    };

    const handleDelete = async () => {
        setIsSubmitting(true);
        try {
            await adminAPI.deleteTimetable(selectedEntry._id);
            toast.success('Entry deleted');
            fetchTimetables();
            setShowDeleteModal(false);
            setSelectedEntry(null);
        } catch (error) {
            toast.error('Delete failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedEntry(null);
        setFormData({
            day: 'Monday', period: 1, subject: '', faculty: '', startTime: '09:00',
            endTime: '10:00', room: '', department: 'CSE', year: 3, section: 'A'
        });
    };

    // Group timetable by day
    const groupedTimetable = days.reduce((acc, day) => {
        acc[day] = timetables.filter(t => t.day === day).sort((a, b) => a.period - b.period);
        return acc;
    }, {});

    const getSubjectColor = (subject) => {
        const colors = [
            'bg-primary-100 text-primary-700 border-primary-200',
            'bg-success-50 text-success-700 border-success-200',
            'bg-warning-50 text-warning-700 border-warning-200',
            'bg-danger-50 text-danger-700 border-danger-200',
            'bg-purple-100 text-purple-700 border-purple-200',
            'bg-blue-100 text-blue-700 border-blue-200',
        ];
        const index = subjects.indexOf(subject) % colors.length;
        return colors[index >= 0 ? index : 0];
    };

    return (
        <div className="animate-fade-in">
            <Breadcrumb />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Timetable Management</h1>
                    <p className="text-secondary-500 mt-1">Create and manage class schedules</p>
                </div>
                <div className="flex gap-3 mt-4 md:mt-0">
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="input w-40"
                    >
                        <option value="CSE-3-A">CSE 3rd Year A</option>
                        <option value="CSE-3-B">CSE 3rd Year B</option>
                        <option value="ECE-3-A">ECE 3rd Year A</option>
                        <option value="MECH-3-A">MECH 3rd Year A</option>
                    </select>
                    <button onClick={() => setShowModal(true)} className="btn-primary">
                        <FiPlus size={18} />
                        Add Class
                    </button>
                </div>
            </div>

            {/* Timetable Grid */}
            {loading ? (
                <SkeletonTable rows={6} />
            ) : (
                <div className="card overflow-x-auto">
                    <div className="min-w-[800px]">
                        {/* Time slots header */}
                        <div className="grid grid-cols-9 gap-2 mb-4 pb-4 border-b border-gray-100">
                            <div className="text-sm font-semibold text-secondary-600">Day / Period</div>
                            {periods.map(period => (
                                <div key={period} className="text-center">
                                    <p className="text-sm font-semibold text-secondary-600">Period {period}</p>
                                    <p className="text-xs text-secondary-400">
                                        {`${8 + period}:00 - ${9 + period}:00`}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Days */}
                        {days.map(day => (
                            <div key={day} className="grid grid-cols-9 gap-2 mb-3">
                                <div className="flex items-center">
                                    <span className="font-medium text-secondary-700">{day}</span>
                                </div>
                                {periods.map(period => {
                                    const entry = groupedTimetable[day]?.find(t => t.period === period);
                                    return (
                                        <div key={period} className="min-h-[80px]">
                                            {entry ? (
                                                <div
                                                    className={`p-2 rounded-lg border ${getSubjectColor(entry.subject)} h-full cursor-pointer hover:shadow-md transition-shadow group relative`}
                                                    onClick={() => handleEdit(entry)}
                                                >
                                                    <p className="font-medium text-sm truncate">{entry.subject}</p>
                                                    <p className="text-xs mt-1 opacity-75">{entry.faculty}</p>
                                                    <p className="text-xs opacity-60">{entry.room}</p>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedEntry(entry);
                                                            setShowDeleteModal(true);
                                                        }}
                                                        className="absolute top-1 right-1 p-1 rounded bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity text-danger-500"
                                                    >
                                                        <FiTrash2 size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div
                                                    className="h-full border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:border-primary-300 hover:bg-primary-50 cursor-pointer transition-colors"
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, day, period }));
                                                        setShowModal(true);
                                                    }}
                                                >
                                                    <FiPlus size={16} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="mt-6 card">
                <h3 className="font-semibold text-secondary-700 mb-3">Subject Colors</h3>
                <div className="flex flex-wrap gap-3">
                    {subjects.slice(0, 6).map((subject, i) => (
                        <span key={subject} className={`px-3 py-1 rounded-lg border text-sm ${getSubjectColor(subject)}`}>
                            {subject}
                        </span>
                    ))}
                </div>
            </div>

            {/* Modal */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={selectedEntry ? 'Edit Class' : 'Add Class'}
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="label">Day *</label>
                            <select
                                name="day"
                                value={formData.day}
                                onChange={handleChange}
                                className="input"
                                required
                            >
                                {days.map(day => (
                                    <option key={day} value={day}>{day}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="label">Period *</label>
                            <select
                                name="period"
                                value={formData.period}
                                onChange={handleChange}
                                className="input"
                                required
                            >
                                {periods.map(p => (
                                    <option key={p} value={p}>Period {p}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="label">Subject *</label>
                            <select
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                className="input"
                                required
                            >
                                <option value="">Select Subject</option>
                                {subjects.map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="label">Faculty *</label>
                            <select
                                name="faculty"
                                value={formData.faculty}
                                onChange={handleChange}
                                className="input"
                                required
                            >
                                <option value="">Select Faculty</option>
                                {facultyList.map(f => (
                                    <option key={f._id} value={f.userId?.name || f.name}>{f.userId?.name || f.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="label">Start Time</label>
                            <input
                                type="time"
                                name="startTime"
                                value={formData.startTime}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">End Time</label>
                            <input
                                type="time"
                                name="endTime"
                                value={formData.endTime}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Room</label>
                            <input
                                type="text"
                                name="room"
                                value={formData.room}
                                onChange={handleChange}
                                className="input"
                                placeholder="e.g., CS-101"
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Section</label>
                            <select
                                name="section"
                                value={formData.section}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="A">Section A</option>
                                <option value="B">Section B</option>
                                <option value="C">Section C</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={handleCloseModal} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : selectedEntry ? 'Update' : 'Add Class'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Class"
                message="Are you sure you want to remove this class from the timetable?"
                confirmText="Delete"
                isLoading={isSubmitting}
            />
        </div>
    );
};

export default ManageTimetable;
