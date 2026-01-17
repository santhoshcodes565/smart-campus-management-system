import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { facultyAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import { SkeletonCard, SkeletonTable } from '../../components/common/LoadingSpinner';
import {
    FiCheckSquare,
    FiUsers,
    FiCalendar,
    FiClock,
    FiCheck,
    FiX,
    FiSave,
    FiList,
    FiLock
} from 'react-icons/fi';
import { getErrorMessage } from '../../utils/errorNormalizer';

const FacultyAttendanceV2 = () => {
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [selectedSection, setSelectedSection] = useState('A');
    const [attendance, setAttendance] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [activeTab, setActiveTab] = useState('mark');
    const [history, setHistory] = useState([]);
    const [alreadyMarked, setAlreadyMarked] = useState(false);

    useEffect(() => {
        fetchSubjects();
    }, []);

    useEffect(() => {
        if (selectedSubject && selectedSemester) {
            fetchStudents();
        }
    }, [selectedSubject, selectedSemester, selectedSection]);

    const fetchSubjects = async () => {
        try {
            const response = await facultyAPI.attendanceV2.getAssignedSubjects();
            if (response.data.success) {
                setSubjects(response.data.data.subjects || []);
            }
        } catch (error) {
            toast.error('Failed to load subjects');
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const response = await facultyAPI.attendanceV2.getStudentsForAttendance({
                subjectId: selectedSubject,
                semester: selectedSemester,
                section: selectedSection
            });
            if (response.data.success) {
                const data = response.data.data;
                setStudents(data.students || []);
                setAlreadyMarked(data.alreadyMarked);

                // Initialize attendance with existing records or default
                const initialAttendance = {};
                if (data.existingAttendance?.records) {
                    data.existingAttendance.records.forEach(r => {
                        initialAttendance[r.studentId] = r.status;
                    });
                } else {
                    data.students?.forEach(s => {
                        initialAttendance[s._id] = 'present';
                    });
                }
                setAttendance(initialAttendance);
            }
        } catch (error) {
            toast.error('Failed to load students');
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const response = await facultyAPI.attendanceV2.getAttendanceHistory({ limit: 30 });
            if (response.data.success) {
                setHistory(response.data.data.history || []);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    const toggleAttendance = (studentId) => {
        if (alreadyMarked) return;
        setAttendance(prev => ({
            ...prev,
            [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
        }));
    };

    const markAllPresent = () => {
        if (alreadyMarked) return;
        const all = {};
        students.forEach(s => { all[s._id] = 'present'; });
        setAttendance(all);
    };

    const markAllAbsent = () => {
        if (alreadyMarked) return;
        const all = {};
        students.forEach(s => { all[s._id] = 'absent'; });
        setAttendance(all);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const records = students.map(s => ({
                studentId: s._id,
                status: attendance[s._id] || 'present'
            }));

            const response = await facultyAPI.attendanceV2.markAttendance({
                subjectId: selectedSubject,
                semester: parseInt(selectedSemester),
                section: selectedSection,
                records
            });

            if (response.data.success) {
                toast.success('Attendance marked successfully!');
                setShowConfirm(false);
                setAlreadyMarked(true);
                fetchHistory();
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to mark attendance'));
        } finally {
            setSubmitting(false);
        }
    };

    const presentCount = Object.values(attendance).filter(s => s === 'present').length;
    const absentCount = Object.values(attendance).filter(s => s === 'absent').length;

    if (loading && subjects.length === 0) return <SkeletonCard />;

    return (
        <div className="animate-fade-in">
            <Breadcrumb />

            {/* Header */}
            <div className="card mb-6 border-l-4 border-l-primary-500">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary-100 text-primary-600">
                        <FiCheckSquare size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-secondary-800">Mark Attendance</h1>
                        <p className="text-sm text-secondary-500">Mark attendance for your assigned subjects</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                <button
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'mark' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-secondary-600 hover:bg-gray-200'
                        }`}
                    onClick={() => setActiveTab('mark')}
                >
                    <FiCheckSquare className="inline mr-2" /> Mark Attendance
                </button>
                <button
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'history' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-secondary-600 hover:bg-gray-200'
                        }`}
                    onClick={() => { setActiveTab('history'); fetchHistory(); }}
                >
                    <FiList className="inline mr-2" /> History
                </button>
            </div>

            {activeTab === 'mark' ? (
                <>
                    {/* Filters */}
                    <div className="card mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="label">Subject</label>
                                <select
                                    className="input"
                                    value={selectedSubject}
                                    onChange={(e) => {
                                        setSelectedSubject(e.target.value);
                                        const subject = subjects.find(s => s._id === e.target.value);
                                        if (subject) setSelectedSemester(subject.semester?.toString() || '');
                                    }}
                                >
                                    <option value="">Select Subject</option>
                                    {subjects.map(s => (
                                        <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Semester</label>
                                <select className="input" value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)}>
                                    <option value="">Select</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label">Section</label>
                                <select className="input" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
                                    {['A', 'B', 'C', 'D'].map(s => <option key={s} value={s}>Section {s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label">Date</label>
                                <div className="input bg-gray-100 flex items-center gap-2">
                                    <FiCalendar />
                                    {new Date().toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Already Marked Warning */}
                    {alreadyMarked && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 flex items-center gap-3">
                            <FiLock className="text-yellow-600" size={20} />
                            <p className="text-yellow-700">Attendance already marked for today. View-only mode.</p>
                        </div>
                    )}

                    {/* Student List */}
                    {students.length > 0 && (
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-secondary-800">
                                    <FiUsers className="inline mr-2" />
                                    Students ({students.length})
                                </h3>
                                {!alreadyMarked && (
                                    <div className="flex gap-2">
                                        <button onClick={markAllPresent} className="btn-secondary text-sm">All Present</button>
                                        <button onClick={markAllAbsent} className="btn-secondary text-sm">All Absent</button>
                                    </div>
                                )}
                            </div>

                            {/* Summary */}
                            <div className="flex gap-4 mb-4">
                                <div className="px-4 py-2 bg-green-100 rounded-lg text-green-700 font-medium">
                                    <FiCheck className="inline mr-1" /> Present: {presentCount}
                                </div>
                                <div className="px-4 py-2 bg-red-100 rounded-lg text-red-700 font-medium">
                                    <FiX className="inline mr-1" /> Absent: {absentCount}
                                </div>
                            </div>

                            {/* Student Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                                {students.map(student => (
                                    <div
                                        key={student._id}
                                        onClick={() => toggleAttendance(student._id)}
                                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${attendance[student._id] === 'present'
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-red-500 bg-red-50'
                                            } ${alreadyMarked ? 'cursor-not-allowed opacity-80' : 'hover:shadow-md'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-sm">{student.name}</p>
                                                <p className="text-xs text-secondary-500">{student.rollNo}</p>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${attendance[student._id] === 'present' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                                }`}>
                                                {attendance[student._id] === 'present' ? <FiCheck /> : <FiX />}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Submit */}
                            {!alreadyMarked && (
                                <div className="mt-6 flex justify-end">
                                    <button onClick={() => setShowConfirm(true)} className="btn-primary">
                                        <FiSave /> Submit Attendance
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {selectedSubject && selectedSemester && students.length === 0 && !loading && (
                        <div className="card text-center py-12 text-secondary-500">
                            No students found for this class
                        </div>
                    )}
                </>
            ) : (
                /* History Tab */
                <div className="card">
                    <h3 className="font-semibold text-secondary-800 mb-4">Attendance History</h3>
                    {history.length === 0 ? (
                        <p className="text-center py-8 text-secondary-500">No attendance history</p>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Subject</th>
                                        <th>Semester</th>
                                        <th>Section</th>
                                        <th>Present</th>
                                        <th>Absent</th>
                                        <th>%</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map(h => (
                                        <tr key={h._id}>
                                            <td>{new Date(h.date).toLocaleDateString()}</td>
                                            <td>{h.subject}</td>
                                            <td>Sem {h.semester}</td>
                                            <td>{h.section}</td>
                                            <td className="text-green-600 font-medium">{h.presentCount}</td>
                                            <td className="text-red-600 font-medium">{h.absentCount}</td>
                                            <td>{h.percentage}%</td>
                                            <td>
                                                {h.isLocked ? (
                                                    <span className="badge badge-secondary"><FiLock size={12} /> Locked</span>
                                                ) : (
                                                    <span className="badge badge-success">Open</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-semibold mb-4">Confirm Attendance</h3>
                        <p className="text-secondary-600 mb-4">
                            You are about to submit attendance for <strong>{students.length}</strong> students:
                        </p>
                        <div className="flex gap-4 mb-6">
                            <div className="flex-1 text-center p-4 bg-green-50 rounded-lg">
                                <p className="text-2xl font-bold text-green-600">{presentCount}</p>
                                <p className="text-sm text-green-700">Present</p>
                            </div>
                            <div className="flex-1 text-center p-4 bg-red-50 rounded-lg">
                                <p className="text-2xl font-bold text-red-600">{absentCount}</p>
                                <p className="text-sm text-red-700">Absent</p>
                            </div>
                        </div>
                        <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg mb-4">
                            <FiLock className="inline mr-1" /> Attendance will be locked after submission.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={handleSubmit} className="btn-primary flex-1" disabled={submitting}>
                                {submitting ? 'Submitting...' : 'Confirm Submit'}
                            </button>
                            <button onClick={() => setShowConfirm(false)} className="btn-secondary flex-1">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacultyAttendanceV2;
