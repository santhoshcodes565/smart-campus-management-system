import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import {
    FiPlus, FiEdit2, FiTrash2, FiCalendar, FiClock,
    FiCheck, FiLock, FiAlertTriangle, FiSend, FiEye
} from 'react-icons/fi';
import { getErrorMessage } from '../../utils/errorNormalizer';

const ManageTimetable = () => {
    const [timetables, setTimetables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [showLockModal, setShowLockModal] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [selectedTimetable, setSelectedTimetable] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [facultyList, setFacultyList] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const { emitEvent } = useSocket();

    // Academic context
    const [academicYear, setAcademicYear] = useState('2025-26');
    const [semester, setSemester] = useState(1);

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
    const academicYears = ['2024-25', '2025-26', '2026-27'];

    useEffect(() => {
        fetchTimetables();
    }, [selectedClass, statusFilter, academicYear, semester]);

    const fetchTimetables = async () => {
        try {
            setLoading(true);
            const params = {};
            if (statusFilter !== 'all') params.status = statusFilter;
            if (academicYear) params.academicYear = academicYear;
            if (semester) params.semester = semester;

            const [ttRes, facRes] = await Promise.all([
                adminAPI.getTimetables(params),
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
            const payload = {
                ...formData,
                academicYear,
                semester,
                slots: [{
                    periodNumber: formData.period,
                    startTime: formData.startTime,
                    endTime: formData.endTime,
                    subject: formData.subject,
                    faculty: formData.faculty,
                    room: formData.room,
                    type: 'lecture'
                }]
            };

            if (selectedEntry) {
                await adminAPI.updateTimetable(selectedEntry._id, payload);
                toast.success('Timetable entry updated');
            } else {
                await adminAPI.createTimetable(payload);
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
            toast.error(getErrorMessage(error, 'Operation failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (entry) => {
        setSelectedEntry(entry);
        const firstSlot = entry.slots?.[0] || {};
        setFormData({
            day: entry.day || 'Monday',
            period: firstSlot.periodNumber || 1,
            subject: firstSlot.subject || '',
            faculty: firstSlot.faculty?._id || firstSlot.faculty || '',
            startTime: firstSlot.startTime || '09:00',
            endTime: firstSlot.endTime || '10:00',
            room: firstSlot.room || '',
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
            toast.error(getErrorMessage(error, 'Delete failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Lifecycle management functions
    const handlePublish = async () => {
        if (!selectedTimetable) return;
        setIsSubmitting(true);
        try {
            await adminAPI.publishTimetable(selectedTimetable._id);
            toast.success('Timetable published! Now visible to Faculty and Students.');
            fetchTimetables();
            setShowPublishModal(false);
            setSelectedTimetable(null);

            // Emit notification
            emitEvent('timetable-published', {
                department: selectedTimetable.department,
                year: selectedTimetable.year,
                section: selectedTimetable.section,
            });
        } catch (error) {
            toast.error(getErrorMessage(error, 'Publish failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLock = async () => {
        if (!selectedTimetable) return;
        setIsSubmitting(true);
        try {
            await adminAPI.lockTimetable(selectedTimetable._id);
            toast.success('Timetable locked! No further modifications allowed.');
            fetchTimetables();
            setShowLockModal(false);
            setSelectedTimetable(null);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Lock failed'));
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

    const getStatusBadge = (status) => {
        const statusStyles = {
            draft: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            published: 'bg-green-100 text-green-700 border-green-200',
            locked: 'bg-gray-100 text-gray-700 border-gray-200'
        };
        const statusIcons = {
            draft: <FiEdit2 size={12} />,
            published: <FiCheck size={12} />,
            locked: <FiLock size={12} />
        };
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusStyles[status] || statusStyles.draft}`}>
                {statusIcons[status]}
                {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Draft'}
            </span>
        );
    };

    // Group timetables by class
    const groupedByClass = timetables.reduce((acc, tt) => {
        const key = `${tt.department}-${tt.year}-${tt.section}`;
        if (!acc[key]) {
            acc[key] = {
                department: tt.department,
                year: tt.year,
                section: tt.section,
                entries: [],
                status: tt.status
            };
        }
        acc[key].entries.push(tt);
        // Use the most restrictive status
        if (tt.status === 'locked') acc[key].status = 'locked';
        else if (tt.status === 'published' && acc[key].status !== 'locked') acc[key].status = 'published';
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
                    <p className="text-secondary-500 mt-1">Create, publish and lock class schedules</p>
                </div>
                <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
                    {/* Academic Year Selector */}
                    <select
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        className="input w-32"
                    >
                        {academicYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    {/* Semester Selector */}
                    <select
                        value={semester}
                        onChange={(e) => setSemester(parseInt(e.target.value))}
                        className="input w-28"
                    >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                            <option key={s} value={s}>Sem {s}</option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="input w-32"
                    >
                        <option value="all">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="locked">Locked</option>
                    </select>

                    <button onClick={() => setShowModal(true)} className="btn-primary">
                        <FiPlus size={18} />
                        Add Entry
                    </button>
                </div>
            </div>

            {/* Status Legend */}
            <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                    {getStatusBadge('draft')}
                    <span className="text-sm text-secondary-600">Only Admin can see</span>
                </div>
                <div className="flex items-center gap-2">
                    {getStatusBadge('published')}
                    <span className="text-sm text-secondary-600">Visible to Faculty & Students</span>
                </div>
                <div className="flex items-center gap-2">
                    {getStatusBadge('locked')}
                    <span className="text-sm text-secondary-600">No modifications allowed</span>
                </div>
            </div>

            {/* Timetables by Class */}
            {loading ? (
                <SkeletonTable rows={6} />
            ) : Object.keys(groupedByClass).length === 0 ? (
                <div className="card text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiCalendar size={32} className="text-secondary-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-secondary-800">No timetables found</h3>
                    <p className="text-secondary-500">Create your first timetable entry to get started.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedByClass).map(([key, classData]) => (
                        <div key={key} className="card">
                            {/* Class Header */}
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-bold text-secondary-800">
                                        {classData.department} - Year {classData.year} - Section {classData.section}
                                    </h3>
                                    {getStatusBadge(classData.status)}
                                </div>
                                <div className="flex gap-2">
                                    {classData.status === 'draft' && (
                                        <button
                                            onClick={() => {
                                                setSelectedTimetable(classData.entries[0]);
                                                setShowPublishModal(true);
                                            }}
                                            className="btn-secondary h-9 text-xs gap-1"
                                        >
                                            <FiSend size={14} />
                                            Publish
                                        </button>
                                    )}
                                    {classData.status === 'published' && (
                                        <button
                                            onClick={() => {
                                                setSelectedTimetable(classData.entries[0]);
                                                setShowLockModal(true);
                                            }}
                                            className="btn-secondary h-9 text-xs gap-1"
                                        >
                                            <FiLock size={14} />
                                            Lock
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Timetable Grid */}
                            <div className="overflow-x-auto">
                                <div className="min-w-[700px]">
                                    {/* Header */}
                                    <div className="grid grid-cols-9 gap-2 mb-3">
                                        <div className="text-sm font-semibold text-secondary-600">Day</div>
                                        {periods.map(p => (
                                            <div key={p} className="text-center text-xs font-medium text-secondary-500">
                                                P{p}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Days */}
                                    {days.map(day => {
                                        const dayEntry = classData.entries.find(e => e.day === day);
                                        const slots = dayEntry?.slots || [];

                                        return (
                                            <div key={day} className="grid grid-cols-9 gap-2 mb-2">
                                                <div className="flex items-center text-sm font-medium text-secondary-700">
                                                    {day.slice(0, 3)}
                                                </div>
                                                {periods.map(p => {
                                                    const slot = slots.find(s => s.periodNumber === p);
                                                    return (
                                                        <div key={p} className="min-h-[60px]">
                                                            {slot ? (
                                                                <div
                                                                    className={`p-2 rounded-lg border ${getSubjectColor(slot.subject)} h-full cursor-pointer hover:shadow-md transition-shadow group relative`}
                                                                    onClick={() => classData.status !== 'locked' && handleEdit(dayEntry)}
                                                                >
                                                                    <p className="font-medium text-xs truncate">{slot.subject}</p>
                                                                    <p className="text-xs opacity-75 truncate">{slot.room}</p>

                                                                    {classData.status === 'draft' && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelectedEntry(dayEntry);
                                                                                setShowDeleteModal(true);
                                                                            }}
                                                                            className="absolute top-1 right-1 p-1 rounded bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity text-danger-500"
                                                                        >
                                                                            <FiTrash2 size={10} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    className={`h-full border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 ${classData.status !== 'locked' ? 'hover:border-primary-300 hover:bg-primary-50 cursor-pointer' : ''} transition-colors`}
                                                                    onClick={() => {
                                                                        if (classData.status !== 'locked') {
                                                                            setFormData(prev => ({
                                                                                ...prev,
                                                                                day,
                                                                                period: p,
                                                                                department: classData.department,
                                                                                year: classData.year,
                                                                                section: classData.section
                                                                            }));
                                                                            setShowModal(true);
                                                                        }
                                                                    }}
                                                                >
                                                                    {classData.status !== 'locked' && <FiPlus size={14} />}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={selectedEntry ? 'Edit Entry' : 'Add Entry'}
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
                                    <option key={f._id} value={f._id}>{f.userId?.name || f.name}</option>
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
                            <label className="label">Department</label>
                            <select
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                className="input"
                            >
                                {departments.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="label">Year</label>
                            <select
                                name="year"
                                value={formData.year}
                                onChange={handleChange}
                                className="input"
                            >
                                {[1, 2, 3, 4].map(y => (
                                    <option key={y} value={y}>Year {y}</option>
                                ))}
                            </select>
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
                            {isSubmitting ? 'Saving...' : selectedEntry ? 'Update' : 'Add Entry'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Entry"
                message="Are you sure you want to remove this entry from the timetable?"
                confirmText="Delete"
                isLoading={isSubmitting}
            />

            {/* Publish Confirmation */}
            <ConfirmModal
                isOpen={showPublishModal}
                onClose={() => setShowPublishModal(false)}
                onConfirm={handlePublish}
                title="Publish Timetable"
                message="Publishing will make this timetable visible to Faculty and Students. You can still edit it after publishing. Continue?"
                confirmText="Publish"
                confirmButtonClass="btn-primary"
                isLoading={isSubmitting}
            />

            {/* Lock Confirmation */}
            <ConfirmModal
                isOpen={showLockModal}
                onClose={() => setShowLockModal(false)}
                onConfirm={handleLock}
                title="Lock Timetable"
                message="Locking this timetable will prevent ALL future modifications. This action cannot be undone. Are you absolutely sure?"
                confirmText="Lock Permanently"
                isLoading={isSubmitting}
            />
        </div>
    );
};

export default ManageTimetable;
