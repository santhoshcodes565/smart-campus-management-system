import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import {
    FiTrendingUp,
    FiUsers,
    FiCheckCircle,
    FiXCircle,
    FiBarChart2,
    FiPercent,
    FiTarget,
    FiAlertTriangle,
    FiFilter,
    FiRefreshCw,
    FiX,
    FiArrowLeft,
    FiClock,
    FiUser,
    FiBook,
    FiCalendar,
    FiAward,
    FiActivity
} from 'react-icons/fi';

// KPI Card Component
const KPICard = ({ icon: Icon, label, value, suffix = '', color = 'primary', trend = null }) => (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${color}-100`}>
                <Icon className={`text-${color}-600`} size={20} />
            </div>
            {trend !== null && (
                <span className={`text-xs px-2 py-0.5 rounded ${trend >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {trend >= 0 ? '+' : ''}{trend}%
                </span>
            )}
        </div>
        <p className="text-2xl font-bold text-secondary-800">{value}{suffix}</p>
        <p className="text-xs text-secondary-500 mt-1">{label}</p>
    </div>
);

// Difficulty Badge Component
const DifficultyBadge = ({ level }) => {
    const config = {
        'Easy': 'bg-green-100 text-green-700 border-green-300',
        'Moderate': 'bg-yellow-100 text-yellow-700 border-yellow-300',
        'Hard': 'bg-red-100 text-red-700 border-red-300'
    };
    return (
        <span className={`px-2 py-0.5 text-xs rounded-full border ${config[level] || 'bg-gray-100'}`}>
            {level}
        </span>
    );
};

// Risk Level Badge
const RiskBadge = ({ level }) => {
    const config = {
        'critical': { label: '🔴 Critical', class: 'bg-red-100 text-red-700' },
        'at_risk': { label: '🟡 At Risk', class: 'bg-yellow-100 text-yellow-700' }
    };
    const c = config[level] || { label: level, class: 'bg-gray-100' };
    return <span className={`px-2 py-1 text-xs rounded-full ${c.class}`}>{c.label}</span>;
};

const AdminExamAnalyticsV2 = () => {
    // State
    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState({});
    const [exams, setExams] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [filterOptions, setFilterOptions] = useState({});
    const [showFilters, setShowFilters] = useState(true);
    const [selectedExam, setSelectedExam] = useState(null);
    const [examDetails, setExamDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [activeTab, setActiveTab] = useState('exams'); // exams, departments, faculty, risk

    // Analytics data
    const [departments, setDepartments] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [facultyPerf, setFacultyPerf] = useState([]);
    const [riskStudents, setRiskStudents] = useState({ critical: [], atRisk: [], summary: {} });

    // Filters
    const [filters, setFilters] = useState({
        department: '',
        course: '',
        semester: '',
        subject: '',
        faculty: '',
        examType: '',
        status: ''
    });

    // Fetch filter options
    const fetchFilterOptions = async () => {
        try {
            const response = await adminAPI.examAnalyticsV2.getFilterOptions();
            if (response.data.success) {
                setFilterOptions(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching filters:', error);
        }
    };

    // Fetch KPIs
    const fetchKPIs = async () => {
        try {
            const response = await adminAPI.examAnalyticsV2.getKPIs(filters);
            if (response.data.success) {
                setKpis(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching KPIs:', error);
        }
    };

    // Fetch exams
    const fetchExams = async () => {
        try {
            const response = await adminAPI.examAnalyticsV2.getExams({ ...filters, page: pagination.page, limit: pagination.limit });
            if (response.data.success) {
                setExams(response.data.data.exams);
                setPagination(prev => ({ ...prev, ...response.data.data.pagination }));
            }
        } catch (error) {
            console.error('Error fetching exams:', error);
        }
    };

    // Fetch all data
    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchFilterOptions(),
                fetchKPIs(),
                fetchExams()
            ]);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch analytics data based on active tab
    const fetchTabData = async (tab) => {
        try {
            if (tab === 'departments') {
                const res = await adminAPI.examAnalyticsV2.getDepartments(filters);
                if (res.data.success) setDepartments(res.data.data);
            } else if (tab === 'semesters') {
                const res = await adminAPI.examAnalyticsV2.getSemesters(filters);
                if (res.data.success) setSemesters(res.data.data);
            } else if (tab === 'faculty') {
                const res = await adminAPI.examAnalyticsV2.getFaculty(filters);
                if (res.data.success) setFacultyPerf(res.data.data);
            } else if (tab === 'risk') {
                const res = await adminAPI.examAnalyticsV2.getRiskStudents(filters);
                if (res.data.success) setRiskStudents(res.data.data);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    // Fetch exam details
    const fetchExamDetails = async (examId) => {
        setLoadingDetails(true);
        try {
            const response = await adminAPI.examAnalyticsV2.getExamDrillDown(examId);
            if (response.data.success) {
                setExamDetails(response.data.data);
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load exam details');
        } finally {
            setLoadingDetails(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // Fetch data on filter change
    useEffect(() => {
        if (!loading) {
            fetchKPIs();
            fetchExams();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    // Fetch tab data when tab changes
    useEffect(() => {
        if (activeTab !== 'exams') {
            fetchTabData(activeTab);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // Handle filter change
    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Clear filters
    const clearFilters = () => {
        setFilters({
            department: '',
            course: '',
            semester: '',
            subject: '',
            faculty: '',
            examType: '',
            status: ''
        });
    };

    // Open exam details
    const openExamDetails = (examId) => {
        setSelectedExam(examId);
        fetchExamDetails(examId);
    };

    // Close exam details
    const closeExamDetails = () => {
        setSelectedExam(null);
        setExamDetails(null);
    };

    // Render filter panel
    const renderFilters = () => (
        <div className={`bg-white rounded-xl border p-4 mb-6 ${showFilters ? 'block' : 'hidden'}`}>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <select name="department" value={filters.department} onChange={handleFilterChange} className="input text-sm">
                    <option value="">All Departments</option>
                    {filterOptions.departments?.map(d => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                </select>
                <select name="course" value={filters.course} onChange={handleFilterChange} className="input text-sm">
                    <option value="">All Courses</option>
                    {filterOptions.courses?.map(c => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                </select>
                <select name="semester" value={filters.semester} onChange={handleFilterChange} className="input text-sm">
                    <option value="">All Semesters</option>
                    {filterOptions.semesters?.map(s => (
                        <option key={s} value={s}>Semester {s}</option>
                    ))}
                </select>
                <select name="subject" value={filters.subject} onChange={handleFilterChange} className="input text-sm">
                    <option value="">All Subjects</option>
                    {filterOptions.subjects?.map(s => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                </select>
                <select name="faculty" value={filters.faculty} onChange={handleFilterChange} className="input text-sm">
                    <option value="">All Faculty</option>
                    {filterOptions.faculty?.map(f => (
                        <option key={f._id} value={f._id}>{f.name}</option>
                    ))}
                </select>
                <select name="examType" value={filters.examType} onChange={handleFilterChange} className="input text-sm">
                    <option value="">All Exam Types</option>
                    {filterOptions.examTypes?.map(t => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                </select>
                <button onClick={clearFilters} className="btn-secondary text-sm">
                    <FiX size={14} /> Clear
                </button>
            </div>
        </div>
    );

    // Render KPI cards
    const renderKPIs = () => (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <KPICard icon={FiBarChart2} label="Total Exams" value={kpis.totalExams || 0} color="primary" />
            <KPICard icon={FiUsers} label="Students Appeared" value={kpis.studentsAppeared || 0} color="info" />
            <KPICard icon={FiCheckCircle} label="Pass Rate" value={kpis.passPercentage || 0} suffix="%" color="success" />
            <KPICard icon={FiXCircle} label="Fail Rate" value={kpis.failPercentage || 0} suffix="%" color="danger" />
            <KPICard icon={FiTarget} label="Average Score" value={kpis.averageScore || 0} suffix="%" color="warning" />
            <KPICard icon={FiPercent} label="Median Score" value={kpis.medianScore || 0} suffix="%" color="secondary" />
            <KPICard icon={FiActivity} label="Std Deviation" value={kpis.standardDeviation || 0} color="primary" />
            <KPICard icon={FiUsers} label="Total Enrolled" value={kpis.totalStudentsEnrolled || 0} color="info" />
            <KPICard icon={FiAlertTriangle} label="Absent Count" value={kpis.absentCount || 0} color="warning" />
            <KPICard icon={FiTrendingUp} label="Improvement" value={kpis.improvementPercentage || 0} suffix="%" color="success" trend={kpis.improvementPercentage} />
        </div>
    );

    // Render tabs
    const renderTabs = () => (
        <div className="flex border-b mb-4">
            {[
                { id: 'exams', label: 'Exam Results', icon: FiBook },
                { id: 'departments', label: 'Departments', icon: FiBarChart2 },
                { id: 'faculty', label: 'Faculty Performance', icon: FiUser },
                { id: 'risk', label: 'Risk Students', icon: FiAlertTriangle }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 border-b-2 transition-colors flex items-center gap-2 ${activeTab === tab.id
                            ? 'border-primary-600 text-primary-600 font-medium'
                            : 'border-transparent text-secondary-500 hover:text-secondary-700'
                        }`}
                >
                    <tab.icon size={16} />
                    {tab.label}
                </button>
            ))}
        </div>
    );

    // Render exam table
    const renderExamTable = () => (
        <div className="table-container">
            <table className="table">
                <thead>
                    <tr>
                        <th>Exam Name</th>
                        <th>Subject</th>
                        <th>Sem</th>
                        <th>Faculty</th>
                        <th>Appeared</th>
                        <th>Pass %</th>
                        <th>Avg</th>
                        <th>High / Low</th>
                        <th>Difficulty</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {exams.length === 0 ? (
                        <tr>
                            <td colSpan="10" className="text-center py-8 text-secondary-500">
                                No exams found
                            </td>
                        </tr>
                    ) : (
                        exams.map(exam => (
                            <tr
                                key={exam._id}
                                onClick={() => openExamDetails(exam._id)}
                                className="cursor-pointer hover:bg-primary-50"
                            >
                                <td className="font-medium text-primary-600">{exam.name}</td>
                                <td>{exam.subject}</td>
                                <td>{exam.semester}</td>
                                <td>{exam.faculty}</td>
                                <td>{exam.appeared}</td>
                                <td>
                                    <span className={`font-medium ${parseFloat(exam.passPercentage) >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                                        {exam.passPercentage}%
                                    </span>
                                </td>
                                <td>{exam.avgMarks}%</td>
                                <td className="text-sm">
                                    <span className="text-green-600">{exam.highest}%</span>
                                    {' / '}
                                    <span className="text-red-600">{exam.lowest}%</span>
                                </td>
                                <td><DifficultyBadge level={exam.difficultyIndex} /></td>
                                <td>
                                    <span className={`badge ${exam.status === 'completed' ? 'badge-success' :
                                            exam.status === 'ongoing' ? 'badge-warning' :
                                                exam.status === 'published' ? 'badge-info' :
                                                    'badge-secondary'
                                        }`}>
                                        {exam.status}
                                    </span>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );

    // Render department comparison
    const renderDepartments = () => (
        <div className="space-y-4">
            {departments.length === 0 ? (
                <div className="text-center py-8 text-secondary-500">No department data available</div>
            ) : (
                departments.map(dept => (
                    <div key={dept._id} className="bg-white p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-secondary-800">{dept.department}</h4>
                            <span className="text-sm text-secondary-500">{dept.totalStudents} students</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-secondary-500">Avg Marks</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-primary-500 h-2 rounded-full"
                                            style={{ width: `${Math.min(dept.avgMarks, 100)}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium">{dept.avgMarks}%</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-secondary-500">Pass Rate</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${dept.passPercentage >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                                            style={{ width: `${Math.min(dept.passPercentage, 100)}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium">{dept.passPercentage}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    // Render faculty performance
    const renderFacultyPerformance = () => (
        <div className="table-container">
            <table className="table">
                <thead>
                    <tr>
                        <th>Faculty Name</th>
                        <th>Exams Conducted</th>
                        <th>Total Attempts</th>
                        <th>Avg Student Score</th>
                        <th>Difficulty Consistency</th>
                    </tr>
                </thead>
                <tbody>
                    {facultyPerf.length === 0 ? (
                        <tr>
                            <td colSpan="5" className="text-center py-8 text-secondary-500">
                                No faculty data available
                            </td>
                        </tr>
                    ) : (
                        facultyPerf.map(f => (
                            <tr key={f._id}>
                                <td className="font-medium">{f.facultyName}</td>
                                <td>{f.examsCount}</td>
                                <td>{f.totalAttempts}</td>
                                <td>
                                    <span className={`font-medium ${f.avgStudentScore >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                                        {f.avgStudentScore || 0}%
                                    </span>
                                </td>
                                <td>
                                    <span className={`text-sm ${f.difficultyConsistency <= 10 ? 'text-green-600' : 'text-yellow-600'}`}>
                                        ±{f.difficultyConsistency || 0}
                                    </span>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );

    // Render risk students
    const renderRiskStudents = () => (
        <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-red-600">{riskStudents.summary?.criticalCount || 0}</p>
                    <p className="text-sm text-red-700">🔴 Critical Students</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-yellow-600">{riskStudents.summary?.atRiskCount || 0}</p>
                    <p className="text-sm text-yellow-700">🟡 At-Risk Students</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-secondary-600">{riskStudents.summary?.totalFlagged || 0}</p>
                    <p className="text-sm text-secondary-700">Total Flagged</p>
                </div>
            </div>

            {/* Critical Students */}
            {riskStudents.critical?.length > 0 && (
                <div>
                    <h4 className="font-semibold text-red-700 mb-3">🔴 Critical Students</h4>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Register No</th>
                                    <th>Exams</th>
                                    <th>Passed</th>
                                    <th>Failed</th>
                                    <th>Avg %</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {riskStudents.critical.map(s => (
                                    <tr key={s._id} className="bg-red-50">
                                        <td className="font-medium">{s.studentName}</td>
                                        <td>{s.registerNo || 'N/A'}</td>
                                        <td>{s.totalExams}</td>
                                        <td className="text-green-600">{s.passedExams}</td>
                                        <td className="text-red-600 font-medium">{s.failedExams}</td>
                                        <td className="text-red-600 font-medium">{s.avgPercentage}%</td>
                                        <td><RiskBadge level={s.riskLevel} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* At-Risk Students */}
            {riskStudents.atRisk?.length > 0 && (
                <div>
                    <h4 className="font-semibold text-yellow-700 mb-3">🟡 At-Risk Students</h4>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Register No</th>
                                    <th>Exams</th>
                                    <th>Passed</th>
                                    <th>Failed</th>
                                    <th>Avg %</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {riskStudents.atRisk.map(s => (
                                    <tr key={s._id} className="bg-yellow-50">
                                        <td className="font-medium">{s.studentName}</td>
                                        <td>{s.registerNo || 'N/A'}</td>
                                        <td>{s.totalExams}</td>
                                        <td className="text-green-600">{s.passedExams}</td>
                                        <td className="text-red-600">{s.failedExams}</td>
                                        <td className="text-yellow-600 font-medium">{s.avgPercentage}%</td>
                                        <td><RiskBadge level={s.riskLevel} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {riskStudents.critical?.length === 0 && riskStudents.atRisk?.length === 0 && (
                <div className="text-center py-8 text-secondary-500">
                    <FiCheckCircle size={48} className="mx-auto mb-3 text-green-500" />
                    <p className="text-lg font-medium text-green-600">No at-risk students detected!</p>
                    <p className="text-sm">All students are performing within acceptable ranges.</p>
                </div>
            )}
        </div>
    );

    // Render exam drill-down drawer
    const renderDrillDown = () => {
        if (!selectedExam) return null;

        return (
            <div className="fixed inset-0 z-50 flex">
                <div className="absolute inset-0 bg-black/50" onClick={closeExamDetails}></div>
                <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl overflow-y-auto animate-slide-in-right">
                    {loadingDetails ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        </div>
                    ) : examDetails ? (
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                                <button onClick={closeExamDetails} className="p-2 hover:bg-gray-100 rounded-lg">
                                    <FiArrowLeft size={20} />
                                </button>
                                <div>
                                    <h2 className="text-xl font-bold text-secondary-800">{examDetails.exam.name}</h2>
                                    <p className="text-sm text-secondary-500">
                                        {examDetails.exam.subject} | Semester {examDetails.exam.semester}
                                    </p>
                                </div>
                            </div>

                            {/* Exam Info */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2 text-sm text-secondary-500 mb-1">
                                        <FiUser size={14} /> Faculty
                                    </div>
                                    <p className="font-medium">{examDetails.exam.faculty.name}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2 text-sm text-secondary-500 mb-1">
                                        <FiCalendar size={14} /> Date
                                    </div>
                                    <p className="font-medium">{new Date(examDetails.exam.date).toLocaleDateString()}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2 text-sm text-secondary-500 mb-1">
                                        <FiClock size={14} /> Duration
                                    </div>
                                    <p className="font-medium">{examDetails.exam.duration} mins</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2 text-sm text-secondary-500 mb-1">
                                        <FiAward size={14} /> Max Marks
                                    </div>
                                    <p className="font-medium">{examDetails.exam.maxMarks} (Pass: {examDetails.exam.passingMarks})</p>
                                </div>
                            </div>

                            {/* Statistics */}
                            <div className="grid grid-cols-4 gap-3 mb-6">
                                <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <p className="text-2xl font-bold text-blue-600">{examDetails.statistics.totalStudents}</p>
                                    <p className="text-xs text-blue-700">Total</p>
                                </div>
                                <div className="text-center p-3 bg-purple-50 rounded-lg">
                                    <p className="text-2xl font-bold text-purple-600">{examDetails.statistics.submitted}</p>
                                    <p className="text-xs text-purple-700">Submitted</p>
                                </div>
                                <div className="text-center p-3 bg-green-50 rounded-lg">
                                    <p className="text-2xl font-bold text-green-600">{examDetails.statistics.passed}</p>
                                    <p className="text-xs text-green-700">Passed</p>
                                </div>
                                <div className="text-center p-3 bg-red-50 rounded-lg">
                                    <p className="text-2xl font-bold text-red-600">{examDetails.statistics.failed}</p>
                                    <p className="text-xs text-red-700">Failed</p>
                                </div>
                            </div>

                            {/* Grade Distribution */}
                            <div className="mb-6">
                                <h4 className="font-semibold text-secondary-800 mb-3">Grade Distribution</h4>
                                <div className="flex gap-2 flex-wrap">
                                    {Object.entries(examDetails.gradeDistribution || {}).map(([grade, count]) => (
                                        <div key={grade} className="text-center p-2 bg-gray-100 rounded-lg min-w-[50px]">
                                            <p className="text-lg font-bold text-secondary-800">{count}</p>
                                            <p className="text-xs text-secondary-500">{grade}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Marks Distribution */}
                            <div className="mb-6">
                                <h4 className="font-semibold text-secondary-800 mb-3">Marks Distribution</h4>
                                <div className="space-y-2">
                                    {examDetails.marksDistribution?.map(range => (
                                        <div key={range.range} className="flex items-center gap-3">
                                            <span className="text-sm w-16">{range.range}%</span>
                                            <div className="flex-1 bg-gray-200 rounded-full h-4">
                                                <div
                                                    className="bg-primary-500 h-4 rounded-full"
                                                    style={{ width: `${(range.count / Math.max(examDetails.statistics.totalStudents, 1)) * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm font-medium w-8">{range.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Student Results */}
                            <div>
                                <h4 className="font-semibold text-secondary-800 mb-3">Student Results</h4>
                                <div className="table-container max-h-96 overflow-y-auto">
                                    <table className="table text-sm">
                                        <thead className="sticky top-0 bg-white">
                                            <tr>
                                                <th>Name</th>
                                                <th>Reg No</th>
                                                <th>Marks</th>
                                                <th>%</th>
                                                <th>Grade</th>
                                                <th>Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {examDetails.students?.map(s => (
                                                <tr key={s.studentId} className={!s.passed ? 'bg-red-50' : ''}>
                                                    <td className="font-medium">{s.name}</td>
                                                    <td className="text-secondary-500">{s.registerNo}</td>
                                                    <td>{s.marks}/{s.maxMarks}</td>
                                                    <td className={s.passed ? 'text-green-600' : 'text-red-600'}>
                                                        {s.percentage}%
                                                    </td>
                                                    <td>
                                                        <span className={`px-2 py-0.5 rounded text-xs ${s.grade === 'A+' || s.grade === 'A' ? 'bg-green-100 text-green-700' :
                                                                s.grade === 'F' ? 'bg-red-100 text-red-700' :
                                                                    'bg-gray-100 text-gray-700'
                                                            }`}>
                                                            {s.grade}
                                                        </span>
                                                    </td>
                                                    <td className="text-secondary-500">{s.timeTaken}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-secondary-500">No data available</div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fade-in">
            <Breadcrumb />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800 flex items-center gap-2">
                        <FiTrendingUp className="text-primary-600" />
                        Exam Analytics Dashboard
                    </h1>
                    <p className="text-secondary-500 mt-1">
                        Comprehensive academic performance analytics
                    </p>
                </div>
                <div className="flex items-center gap-3 mt-4 md:mt-0">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn-secondary ${showFilters ? 'bg-gray-200' : ''}`}
                    >
                        <FiFilter size={16} />
                    </button>
                    <button onClick={fetchAllData} className="btn-secondary">
                        <FiRefreshCw size={16} />
                    </button>
                </div>
            </div>

            {loading ? (
                <SkeletonTable rows={5} />
            ) : (
                <>
                    {/* Filters */}
                    {renderFilters()}

                    {/* KPI Cards */}
                    {renderKPIs()}

                    {/* Main Content Card */}
                    <div className="card">
                        {renderTabs()}

                        {activeTab === 'exams' && renderExamTable()}
                        {activeTab === 'departments' && renderDepartments()}
                        {activeTab === 'faculty' && renderFacultyPerformance()}
                        {activeTab === 'risk' && renderRiskStudents()}
                    </div>
                </>
            )}

            {/* Drill-down Drawer */}
            {renderDrillDown()}
        </div>
    );
};

export default AdminExamAnalyticsV2;
