import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { facultyAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiCheck, FiX, FiSave, FiCalendar, FiUsers } from 'react-icons/fi';

const MarkAttendance = () => {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const { emitEvent } = useSocket();

    const demoClasses = [
        { _id: '1', name: 'CSE 3rd Year A', department: 'CSE', year: 3, section: 'A' },
        { _id: '2', name: 'CSE 3rd Year B', department: 'CSE', year: 3, section: 'B' },
        { _id: '3', name: 'CSE 2nd Year A', department: 'CSE', year: 2, section: 'A' },
    ];

    const demoStudents = [
        { _id: '1', rollNo: 'CS2021001', userId: { name: 'John Doe' } },
        { _id: '2', rollNo: 'CS2021002', userId: { name: 'Jane Smith' } },
        { _id: '3', rollNo: 'CS2021003', userId: { name: 'Mike Johnson' } },
        { _id: '4', rollNo: 'CS2021004', userId: { name: 'Sarah Williams' } },
        { _id: '5', rollNo: 'CS2021005', userId: { name: 'Chris Brown' } },
        { _id: '6', rollNo: 'CS2021006', userId: { name: 'Emily Davis' } },
        { _id: '7', rollNo: 'CS2021007', userId: { name: 'David Wilson' } },
        { _id: '8', rollNo: 'CS2021008', userId: { name: 'Lisa Anderson' } },
    ];

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClass) {
            fetchStudents();
        }
    }, [selectedClass, selectedDate]);

    const fetchClasses = async () => {
        try {
            const response = await facultyAPI.getClasses();
            if (response.data.success) {
                setClasses(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching classes:', error);
            setClasses(demoClasses);
        }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const response = await facultyAPI.getStudents(selectedClass);
            if (response.data.success) {
                setStudents(response.data.data);
                // Initialize attendance state
                const initialAttendance = {};
                response.data.data.forEach(student => {
                    initialAttendance[student._id] = 'present';
                });
                setAttendance(initialAttendance);
            }
        } catch (error) {
            console.error('Error fetching students:', error);
            setStudents(demoStudents);
            const initialAttendance = {};
            demoStudents.forEach(student => {
                initialAttendance[student._id] = 'present';
            });
            setAttendance(initialAttendance);
        } finally {
            setLoading(false);
        }
    };

    const handleAttendanceChange = (studentId, status) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: status
        }));
    };

    const markAllPresent = () => {
        const newAttendance = {};
        students.forEach(student => {
            newAttendance[student._id] = 'present';
        });
        setAttendance(newAttendance);
    };

    const markAllAbsent = () => {
        const newAttendance = {};
        students.forEach(student => {
            newAttendance[student._id] = 'absent';
        });
        setAttendance(newAttendance);
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            const attendanceData = Object.entries(attendance).map(([studentId, status]) => ({
                studentId,
                status,
                date: selectedDate,
                classId: selectedClass,
            }));

            await facultyAPI.markAttendance({ attendance: attendanceData });

            // Emit real-time update
            emitEvent('attendance-marked', {
                classId: selectedClass,
                date: selectedDate,
                count: attendanceData.length,
            });

            toast.success('Attendance saved successfully!');
        } catch (error) {
            toast.error('Failed to save attendance');
        } finally {
            setSaving(false);
        }
    };

    const presentCount = Object.values(attendance).filter(s => s === 'present').length;
    const absentCount = Object.values(attendance).filter(s => s === 'absent').length;

    return (
        <div className="animate-fade-in">
            <Breadcrumb />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Mark Attendance</h1>
                    <p className="text-secondary-500 mt-1">Record student attendance for your classes</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="form-group mb-0">
                        <label className="label">Select Class</label>
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="input"
                        >
                            <option value="">Choose a class</option>
                            {classes.map(cls => (
                                <option key={cls._id} value={cls._id}>{cls.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group mb-0">
                        <label className="label">Date</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="input"
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </div>
                    <div className="form-group mb-0">
                        <label className="label">Quick Actions</label>
                        <div className="flex gap-2">
                            <button onClick={markAllPresent} className="btn-success flex-1">
                                <FiCheck size={16} />
                                All Present
                            </button>
                            <button onClick={markAllAbsent} className="btn-danger flex-1">
                                <FiX size={16} />
                                All Absent
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Student List */}
            {!selectedClass ? (
                <EmptyState
                    icon={FiCalendar}
                    title="Select a class"
                    description="Please select a class to mark attendance"
                />
            ) : loading ? (
                <SkeletonTable rows={8} />
            ) : students.length === 0 ? (
                <EmptyState
                    icon={FiUsers}
                    title="No students found"
                    description="No students are enrolled in this class"
                />
            ) : (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="card text-center">
                            <p className="text-3xl font-bold text-secondary-800">{students.length}</p>
                            <p className="text-sm text-secondary-500">Total Students</p>
                        </div>
                        <div className="card text-center">
                            <p className="text-3xl font-bold text-success-500">{presentCount}</p>
                            <p className="text-sm text-secondary-500">Present</p>
                        </div>
                        <div className="card text-center">
                            <p className="text-3xl font-bold text-danger-500">{absentCount}</p>
                            <p className="text-sm text-secondary-500">Absent</p>
                        </div>
                    </div>

                    {/* Attendance Table */}
                    <div className="card">
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Roll No</th>
                                        <th>Student Name</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((student) => (
                                        <tr key={student._id}>
                                            <td className="font-medium">{student.rollNo}</td>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-sm">
                                                        {student.userId?.name?.charAt(0) || 'S'}
                                                    </div>
                                                    <span>{student.userId?.name}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${attendance[student._id] === 'present' ? 'badge-success' : 'badge-danger'}`}>
                                                    {attendance[student._id] || 'present'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleAttendanceChange(student._id, 'present')}
                                                        className={`p-2 rounded-lg transition-colors ${attendance[student._id] === 'present'
                                                                ? 'bg-success-100 text-success-600'
                                                                : 'hover:bg-success-50 text-secondary-400'
                                                            }`}
                                                        title="Mark Present"
                                                    >
                                                        <FiCheck size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleAttendanceChange(student._id, 'absent')}
                                                        className={`p-2 rounded-lg transition-colors ${attendance[student._id] === 'absent'
                                                                ? 'bg-danger-100 text-danger-600'
                                                                : 'hover:bg-danger-50 text-secondary-400'
                                                            }`}
                                                        title="Mark Absent"
                                                    >
                                                        <FiX size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
                            <button
                                onClick={handleSubmit}
                                className="btn-primary"
                                disabled={saving || students.length === 0}
                            >
                                <FiSave size={18} />
                                {saving ? 'Saving...' : 'Save Attendance'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default MarkAttendance;
