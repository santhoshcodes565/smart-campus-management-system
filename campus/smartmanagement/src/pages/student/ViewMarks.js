import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiTrendingUp, FiAward, FiBookOpen } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const ViewMarks = () => {
    const [marks, setMarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ gpa: 0, credits: 0, passed: 0 });

    useEffect(() => {
        fetchMarks();
    }, []);

    const fetchMarks = async () => {
        try {
            setLoading(true);
            const response = await studentAPI.getMarks();
            if (response.data.success) {
                setMarks(response.data.data);
                // Calculate summary
                const totalGpa = response.data.data.reduce((sum, m) => sum + (m.gradePoint || 0), 0);
                setSummary({
                    gpa: (totalGpa / response.data.data.length).toFixed(2),
                    credits: response.data.data.reduce((sum, m) => sum + (m.credits || 0), 0),
                    passed: response.data.data.filter(m => m.grade !== 'F').length
                });
            }
        } catch (error) {
            console.error('Error fetching marks:', error);
            // Fallback
            const demoMarks = [
                { subject: 'Data Structures', marks: 85, maxMarks: 100, grade: 'A', gradePoint: 9, credits: 4, type: 'Internal' },
                { subject: 'Algorithms', marks: 78, maxMarks: 100, grade: 'B+', gradePoint: 8, credits: 4, type: 'Internal' },
                { subject: 'Database Systems', marks: 92, maxMarks: 100, grade: 'O', gradePoint: 10, credits: 3, type: 'Internal' },
                { subject: 'Operating Systems', marks: 88, maxMarks: 100, grade: 'A', gradePoint: 9, credits: 4, type: 'Internal' },
            ];
            setMarks(demoMarks);
            setSummary({ gpa: '9.00', credits: 15, passed: 4 });
        } finally {
            setLoading(false);
        }
    };

    const getGradeColor = (grade) => {
        switch (grade) {
            case 'O': return 'text-purple-600 bg-purple-50';
            case 'A': return 'text-success-600 bg-success-50';
            case 'B+': return 'text-primary-600 bg-primary-50';
            case 'F': return 'text-danger-600 bg-danger-50';
            default: return 'text-secondary-600 bg-secondary-50';
        }
    };

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[{ label: 'Dashboard', path: '/student/dashboard' }, { label: 'My Marks', path: '/student/marks', isLast: true }]} />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Academic Results</h1>
                    <p className="text-secondary-500 mt-1">View your marks, grades and performance reports</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="card flex items-center gap-4 bg-gradient-to-br from-primary-600 to-primary-700 text-white border-none">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                        <FiTrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-3xl font-bold">{summary.gpa}</p>
                        <p className="text-xs text-primary-100 uppercase tracking-wider font-medium">Current GPA</p>
                    </div>
                </div>
                <div className="card flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                        <FiAward size={24} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-secondary-800">{summary.credits}</p>
                        <p className="text-xs text-secondary-500 uppercase tracking-wider font-medium">Total Credits</p>
                    </div>
                </div>
                <div className="card flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-success-50 text-success-600 flex items-center justify-center">
                        <FiBookOpen size={24} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-secondary-800">{summary.passed} / {marks.length}</p>
                        <p className="text-xs text-secondary-500 uppercase tracking-wider font-medium">Subjects Passed</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart */}
                <div className="lg:col-span-1">
                    <div className="card h-full">
                        <h3 className="card-title mb-6">Performance Analysis</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={marks}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="subject" hide />
                                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="marks" radius={[4, 4, 0, 0]}>
                                        {marks.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.marks >= 80 ? '#6366f1' : entry.marks >= 60 ? '#818cf8' : '#ef4444'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-secondary-400 text-center mt-4">Subject-wise marks distribution</p>
                    </div>
                </div>

                {/* Marks Table */}
                <div className="lg:col-span-2">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Exam Type</th>
                                    <th>Marks</th>
                                    <th>Grade</th>
                                    <th>Credits</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    [1, 2, 3, 4].map(i => (
                                        <tr key={i}>
                                            <td colSpan="5"><div className="h-4 bg-gray-100 animate-pulse rounded" /></td>
                                        </tr>
                                    ))
                                ) : marks.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-8 text-secondary-500">No marks records found</td>
                                    </tr>
                                ) : (
                                    marks.map((m, index) => (
                                        <tr key={index}>
                                            <td className="font-semibold text-secondary-800">{m.subject}</td>
                                            <td><span className="text-secondary-500">{m.type}</span></td>
                                            <td>
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-bold text-secondary-800">{m.marks} / {m.maxMarks}</span>
                                                    <div className="w-24 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${m.marks >= 80 ? 'bg-success-500' : m.marks >= 40 ? 'bg-primary-500' : 'bg-danger-500'}`}
                                                            style={{ width: `${(m.marks / m.maxMarks) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`px-3 py-1 rounded-lg font-bold text-sm ${getGradeColor(m.grade)}`}>
                                                    {m.grade}
                                                </span>
                                            </td>
                                            <td className="font-medium text-secondary-600">{m.credits}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewMarks;
