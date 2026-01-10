import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { facultyAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiSave, FiClipboard } from 'react-icons/fi';

const UploadMarks = () => {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [examType, setExamType] = useState('internal');
    const [students, setStudents] = useState([]);
    const [marks, setMarks] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [maxMarks, setMaxMarks] = useState(100);

    const subjects = ['Data Structures', 'Algorithms', 'Database Systems', 'Operating Systems', 'Computer Networks'];
    const examTypes = [
        { value: 'internal', label: 'Internal Assessment', maxMarks: 30 },
        { value: 'midterm', label: 'Mid-term Exam', maxMarks: 50 },
        { value: 'semester', label: 'Semester Exam', maxMarks: 100 },
        { value: 'practical', label: 'Practical/Lab', maxMarks: 50 },
    ];

    const demoClasses = [
        { _id: '1', name: 'CSE 3rd Year A' },
        { _id: '2', name: 'CSE 3rd Year B' },
        { _id: '3', name: 'CSE 2nd Year A' },
    ];

    const demoStudents = [
        { _id: '1', rollNo: 'CS2021001', userId: { name: 'John Doe' } },
        { _id: '2', rollNo: 'CS2021002', userId: { name: 'Jane Smith' } },
        { _id: '3', rollNo: 'CS2021003', userId: { name: 'Mike Johnson' } },
        { _id: '4', rollNo: 'CS2021004', userId: { name: 'Sarah Williams' } },
        { _id: '5', rollNo: 'CS2021005', userId: { name: 'Chris Brown' } },
        { _id: '6', rollNo: 'CS2021006', userId: { name: 'Emily Davis' } },
    ];

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClass && selectedSubject) {
            fetchStudents();
        }
    }, [selectedClass, selectedSubject]);

    useEffect(() => {
        const exam = examTypes.find(e => e.value === examType);
        setMaxMarks(exam?.maxMarks || 100);
    }, [examType]);

    const fetchClasses = async () => {
        try {
            const response = await facultyAPI.getClasses();
            if (response.data.success) {
                setClasses(response.data.data);
            }
        } catch (error) {
            setClasses(demoClasses);
        }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const response = await facultyAPI.getStudents(selectedClass);
            if (response.data.success) {
                setStudents(response.data.data);
                const initialMarks = {};
                response.data.data.forEach(student => {
                    initialMarks[student._id] = '';
                });
                setMarks(initialMarks);
            }
        } catch (error) {
            setStudents(demoStudents);
            const initialMarks = {};
            demoStudents.forEach(student => {
                initialMarks[student._id] = '';
            });
            setMarks(initialMarks);
        } finally {
            setLoading(false);
        }
    };

    const handleMarksChange = (studentId, value) => {
        const numValue = parseFloat(value);
        if (value === '' || (numValue >= 0 && numValue <= maxMarks)) {
            setMarks(prev => ({
                ...prev,
                [studentId]: value
            }));
        }
    };

    const calculateGrade = (marks) => {
        if (marks === '' || marks === null) return '-';
        const percentage = (parseFloat(marks) / maxMarks) * 100;
        if (percentage >= 90) return 'A+';
        if (percentage >= 80) return 'A';
        if (percentage >= 70) return 'B+';
        if (percentage >= 60) return 'B';
        if (percentage >= 50) return 'C';
        if (percentage >= 40) return 'D';
        return 'F';
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            const marksData = Object.entries(marks)
                .filter(([_, value]) => value !== '')
                .map(([studentId, marksObtained]) => ({
                    studentId,
                    subject: selectedSubject,
                    examType,
                    marksObtained: parseFloat(marksObtained),
                    maxMarks,
                }));

            await facultyAPI.uploadMarks({ marks: marksData, classId: selectedClass });
            toast.success('Marks uploaded successfully!');
        } catch (error) {
            toast.error('Failed to upload marks');
        } finally {
            setSaving(false);
        }
    };

    const filledCount = Object.values(marks).filter(m => m !== '').length;
    const avgMarks = filledCount > 0
        ? (Object.values(marks).filter(m => m !== '').reduce((sum, m) => sum + parseFloat(m), 0) / filledCount).toFixed(1)
        : 0;

    return (
        <div className="animate-fade-in">
            <Breadcrumb />

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-secondary-800">Upload Marks</h1>
                <p className="text-secondary-500 mt-1">Enter student marks for exams and assessments</p>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="form-group mb-0">
                        <label className="label">Class</label>
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="input"
                        >
                            <option value="">Select Class</option>
                            {classes.map(cls => (
                                <option key={cls._id} value={cls._id}>{cls.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group mb-0">
                        <label className="label">Subject</label>
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="input"
                        >
                            <option value="">Select Subject</option>
                            {subjects.map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group mb-0">
                        <label className="label">Exam Type</label>
                        <select
                            value={examType}
                            onChange={(e) => setExamType(e.target.value)}
                            className="input"
                        >
                            {examTypes.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group mb-0">
                        <label className="label">Max Marks</label>
                        <input
                            type="number"
                            value={maxMarks}
                            onChange={(e) => setMaxMarks(parseInt(e.target.value) || 100)}
                            className="input"
                            min="1"
                        />
                    </div>
                </div>
            </div>

            {/* Marks Entry */}
            {!selectedClass || !selectedSubject ? (
                <EmptyState
                    icon={FiClipboard}
                    title="Select class and subject"
                    description="Please select a class and subject to enter marks"
                />
            ) : loading ? (
                <SkeletonTable rows={6} />
            ) : students.length === 0 ? (
                <EmptyState
                    icon={FiClipboard}
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
                            <p className="text-3xl font-bold text-primary-600">{filledCount}</p>
                            <p className="text-sm text-secondary-500">Marks Entered</p>
                        </div>
                        <div className="card text-center">
                            <p className="text-3xl font-bold text-success-500">{avgMarks}</p>
                            <p className="text-sm text-secondary-500">Average Marks</p>
                        </div>
                    </div>

                    {/* Marks Table */}
                    <div className="card">
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Roll No</th>
                                        <th>Student Name</th>
                                        <th>Marks (out of {maxMarks})</th>
                                        <th>Percentage</th>
                                        <th>Grade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((student) => {
                                        const studentMarks = marks[student._id];
                                        const percentage = studentMarks !== ''
                                            ? ((parseFloat(studentMarks) / maxMarks) * 100).toFixed(1)
                                            : '-';
                                        const grade = calculateGrade(studentMarks);

                                        return (
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
                                                    <input
                                                        type="number"
                                                        value={studentMarks}
                                                        onChange={(e) => handleMarksChange(student._id, e.target.value)}
                                                        className="input w-24"
                                                        min="0"
                                                        max={maxMarks}
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td>
                                                    <span className={`font-medium ${percentage !== '-' && parseFloat(percentage) < 40 ? 'text-danger-500' : 'text-secondary-800'
                                                        }`}>
                                                        {percentage !== '-' ? `${percentage}%` : '-'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge ${grade === 'A+' || grade === 'A' ? 'badge-success' :
                                                            grade === 'B+' || grade === 'B' ? 'badge-primary' :
                                                                grade === 'C' || grade === 'D' ? 'badge-warning' :
                                                                    grade === 'F' ? 'badge-danger' : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {grade}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
                            <button
                                onClick={handleSubmit}
                                className="btn-primary"
                                disabled={saving || filledCount === 0}
                            >
                                <FiSave size={18} />
                                {saving ? 'Saving...' : 'Save Marks'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default UploadMarks;
