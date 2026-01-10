import React, { useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import Breadcrumb from '../../components/common/Breadcrumb';
import { FiDownload, FiCalendar, FiUsers, FiDollarSign, FiTrendingUp } from 'react-icons/fi';

const Reports = () => {
    const [activeTab, setActiveTab] = useState('attendance');
    const [dateRange, setDateRange] = useState('month');

    // Sample data
    const attendanceData = [
        { name: 'Week 1', present: 92, absent: 8 },
        { name: 'Week 2', present: 88, absent: 12 },
        { name: 'Week 3', present: 95, absent: 5 },
        { name: 'Week 4', present: 90, absent: 10 },
    ];

    const departmentAttendance = [
        { department: 'CSE', attendance: 94 },
        { department: 'ECE', attendance: 89 },
        { department: 'EEE', attendance: 91 },
        { department: 'MECH', attendance: 87 },
        { department: 'CIVIL', attendance: 85 },
    ];

    const feeData = [
        { month: 'Jan', collected: 850000, pending: 150000 },
        { month: 'Feb', collected: 920000, pending: 80000 },
        { month: 'Mar', collected: 780000, pending: 220000 },
        { month: 'Apr', collected: 890000, pending: 110000 },
        { month: 'May', collected: 950000, pending: 50000 },
    ];

    const feeBreakdown = [
        { name: 'Tuition', value: 65, color: '#6366f1' },
        { name: 'Hostel', value: 20, color: '#10b981' },
        { name: 'Transport', value: 10, color: '#f59e0b' },
        { name: 'Other', value: 5, color: '#94a3b8' },
    ];

    const performanceData = [
        { subject: 'Data Structures', avgMarks: 78, passRate: 92 },
        { subject: 'Algorithms', avgMarks: 72, passRate: 88 },
        { subject: 'Database', avgMarks: 81, passRate: 95 },
        { subject: 'Networks', avgMarks: 75, passRate: 90 },
        { subject: 'OS', avgMarks: 70, passRate: 85 },
    ];

    const gradeDistribution = [
        { grade: 'A+', count: 45 },
        { grade: 'A', count: 78 },
        { grade: 'B+', count: 120 },
        { grade: 'B', count: 95 },
        { grade: 'C', count: 67 },
        { grade: 'D', count: 35 },
        { grade: 'F', count: 10 },
    ];

    const tabs = [
        { id: 'attendance', label: 'Attendance', icon: FiUsers },
        { id: 'fees', label: 'Fee Collection', icon: FiDollarSign },
        { id: 'performance', label: 'Performance', icon: FiTrendingUp },
    ];

    return (
        <div className="animate-fade-in">
            <Breadcrumb />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Reports & Analytics</h1>
                    <p className="text-secondary-500 mt-1">View comprehensive reports and insights</p>
                </div>
                <div className="flex gap-3 mt-4 md:mt-0">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="input w-40"
                    >
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="quarter">This Quarter</option>
                        <option value="year">This Year</option>
                    </select>
                    <button className="btn-primary">
                        <FiDownload size={18} />
                        Export PDF
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${activeTab === tab.id
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-white text-secondary-600 hover:bg-gray-100'
                                }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Attendance Reports */}
            {activeTab === 'attendance' && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="card">
                            <p className="text-sm text-secondary-500">Average Attendance</p>
                            <p className="text-3xl font-bold text-primary-600 mt-2">91.2%</p>
                            <p className="text-xs text-success-500 mt-1">↑ 2.5% from last month</p>
                        </div>
                        <div className="card">
                            <p className="text-sm text-secondary-500">Students with {'<'}75%</p>
                            <p className="text-3xl font-bold text-danger-500 mt-2">23</p>
                            <p className="text-xs text-secondary-400 mt-1">Action required</p>
                        </div>
                        <div className="card">
                            <p className="text-sm text-secondary-500">Perfect Attendance</p>
                            <p className="text-3xl font-bold text-success-500 mt-2">89</p>
                            <p className="text-xs text-secondary-400 mt-1">100% this month</p>
                        </div>
                        <div className="card">
                            <p className="text-sm text-secondary-500">Classes Conducted</p>
                            <p className="text-3xl font-bold text-secondary-800 mt-2">156</p>
                            <p className="text-xs text-secondary-400 mt-1">This month</p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="card">
                            <h3 className="card-title mb-4">Weekly Attendance Trend</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={attendanceData}>
                                        <defs>
                                            <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                                        <YAxis stroke="#94a3b8" fontSize={12} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="present" stroke="#10b981" fillOpacity={1} fill="url(#colorPresent)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="card-title mb-4">Department-wise Attendance</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={departmentAttendance} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                                        <YAxis dataKey="department" type="category" stroke="#94a3b8" fontSize={12} width={50} />
                                        <Tooltip />
                                        <Bar dataKey="attendance" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Fee Reports */}
            {activeTab === 'fees' && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="card">
                            <p className="text-sm text-secondary-500">Total Collected</p>
                            <p className="text-3xl font-bold text-success-600 mt-2">₹43.9L</p>
                            <p className="text-xs text-success-500 mt-1">↑ 12% from last month</p>
                        </div>
                        <div className="card">
                            <p className="text-sm text-secondary-500">Pending Amount</p>
                            <p className="text-3xl font-bold text-warning-500 mt-2">₹6.1L</p>
                            <p className="text-xs text-secondary-400 mt-1">From 45 students</p>
                        </div>
                        <div className="card">
                            <p className="text-sm text-secondary-500">Collection Rate</p>
                            <p className="text-3xl font-bold text-primary-600 mt-2">87.8%</p>
                            <p className="text-xs text-success-500 mt-1">↑ 3.2% improvement</p>
                        </div>
                        <div className="card">
                            <p className="text-sm text-secondary-500">Overdue</p>
                            <p className="text-3xl font-bold text-danger-500 mt-2">₹2.3L</p>
                            <p className="text-xs text-danger-400 mt-1">15 students</p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="card">
                            <h3 className="card-title mb-4">Monthly Collection Trend</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={feeData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${v / 100000}L`} />
                                        <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                                        <Legend />
                                        <Bar dataKey="collected" fill="#10b981" name="Collected" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="card-title mb-4">Fee Type Breakdown</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={feeBreakdown}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            dataKey="value"
                                            label={({ name, value }) => `${name}: ${value}%`}
                                        >
                                            {feeBreakdown.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Performance Reports */}
            {activeTab === 'performance' && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="card">
                            <p className="text-sm text-secondary-500">Average CGPA</p>
                            <p className="text-3xl font-bold text-primary-600 mt-2">7.8</p>
                            <p className="text-xs text-success-500 mt-1">↑ 0.2 from last semester</p>
                        </div>
                        <div className="card">
                            <p className="text-sm text-secondary-500">Pass Rate</p>
                            <p className="text-3xl font-bold text-success-500 mt-2">92%</p>
                            <p className="text-xs text-success-500 mt-1">↑ 4% improvement</p>
                        </div>
                        <div className="card">
                            <p className="text-sm text-secondary-500">Top Performers</p>
                            <p className="text-3xl font-bold text-warning-500 mt-2">45</p>
                            <p className="text-xs text-secondary-400 mt-1">CGPA {'>'} 9.0</p>
                        </div>
                        <div className="card">
                            <p className="text-sm text-secondary-500">At Risk</p>
                            <p className="text-3xl font-bold text-danger-500 mt-2">12</p>
                            <p className="text-xs text-danger-400 mt-1">CGPA {'<'} 5.0</p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="card">
                            <h3 className="card-title mb-4">Subject-wise Performance</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={performanceData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="subject" stroke="#94a3b8" fontSize={10} angle={-20} textAnchor="end" height={60} />
                                        <YAxis stroke="#94a3b8" fontSize={12} />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="avgMarks" stroke="#6366f1" strokeWidth={2} name="Avg Marks" />
                                        <Line type="monotone" dataKey="passRate" stroke="#10b981" strokeWidth={2} name="Pass Rate %" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="card-title mb-4">Grade Distribution</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={gradeDistribution}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="grade" stroke="#94a3b8" fontSize={12} />
                                        <YAxis stroke="#94a3b8" fontSize={12} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
