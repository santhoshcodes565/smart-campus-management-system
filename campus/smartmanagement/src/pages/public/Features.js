import React from 'react';
import { Link } from 'react-router-dom';
import {
    FiUsers, FiCalendar, FiDollarSign, FiTruck, FiBarChart2, FiBell,
    FiCheck, FiClipboard, FiBook, FiSettings, FiShield, FiSmartphone
} from 'react-icons/fi';

const Features = () => {
    const mainFeatures = [
        {
            icon: <FiUsers size={28} />,
            title: 'Student Information System',
            desc: 'Comprehensive student profiles with academic history, documents, and performance tracking.',
            benefits: ['Digital student records', 'Academic history tracking', 'Document management', 'Parent portal access']
        },
        {
            icon: <FiCalendar size={28} />,
            title: 'Attendance Management',
            desc: 'Digital attendance tracking with automatic notifications and detailed reports.',
            benefits: ['Real-time tracking', 'Automated alerts', 'Biometric integration', 'Attendance reports']
        },
        {
            icon: <FiDollarSign size={28} />,
            title: 'Fee & Finance',
            desc: 'Complete fee lifecycle from collection to receipts with online payment integration.',
            benefits: ['Online payments', 'Auto receipts', 'Due reminders', 'Financial reports']
        },
        {
            icon: <FiClipboard size={28} />,
            title: 'Examination System',
            desc: 'End-to-end exam management from scheduling to result publication.',
            benefits: ['Exam scheduling', 'Marks entry', 'Grade calculation', 'Result publishing']
        },
        {
            icon: <FiTruck size={28} />,
            title: 'Transport Management',
            desc: 'Route planning, vehicle tracking, and student transport allocation.',
            benefits: ['Route optimization', 'GPS tracking', 'Student allocation', 'Driver management']
        },
        {
            icon: <FiBell size={28} />,
            title: 'Communication Hub',
            desc: 'Multi-channel notifications for announcements, alerts, and updates.',
            benefits: ['Push notifications', 'SMS alerts', 'Email integration', 'Notice board']
        },
    ];

    const additionalFeatures = [
        { icon: <FiBook />, title: 'Library Management' },
        { icon: <FiBarChart2 />, title: 'Analytics Dashboard' },
        { icon: <FiSettings />, title: 'Timetable Scheduling' },
        { icon: <FiShield />, title: 'Role-based Access' },
        { icon: <FiSmartphone />, title: 'Mobile App Ready' },
        { icon: <FiUsers />, title: 'Multi-branch Support' },
    ];

    return (
        <div className="animate-fade-in">
            {/* Hero */}
            <section className="bg-gradient-to-br from-primary-50 to-white py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-secondary-800">
                        Powerful Features for <span className="text-primary-600">Modern Campuses</span>
                    </h1>
                    <p className="mt-6 text-lg text-secondary-500 max-w-2xl mx-auto">
                        Everything you need to digitize and streamline your educational institution's operations.
                    </p>
                </div>
            </section>

            {/* Main Features */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {mainFeatures.map((feature, index) => (
                            <div key={index} className="bg-white p-8 rounded-2xl border border-gray-100 hover:shadow-xl transition-shadow">
                                <div className="flex items-start gap-5">
                                    <div className="w-14 h-14 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                                        {feature.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-secondary-800">{feature.title}</h3>
                                        <p className="mt-2 text-secondary-500">{feature.desc}</p>
                                        <ul className="mt-4 grid grid-cols-2 gap-2">
                                            {feature.benefits.map((benefit, i) => (
                                                <li key={i} className="flex items-center gap-2 text-sm text-secondary-600">
                                                    <FiCheck className="text-success-500" size={14} />
                                                    {benefit}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Additional Features */}
            <section className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-bold text-secondary-800 text-center mb-10">And Much More...</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {additionalFeatures.map((feature, index) => (
                            <div key={index} className="bg-white p-6 rounded-xl text-center border border-gray-100 hover:border-primary-200 transition-colors">
                                <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center mx-auto">
                                    {feature.icon}
                                </div>
                                <p className="mt-3 text-sm font-medium text-secondary-700">{feature.title}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 bg-primary-600">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold text-white">Ready to Get Started?</h2>
                    <p className="mt-4 text-primary-100">Login to access your campus management portal.</p>
                    <Link
                        to="/login"
                        className="inline-block mt-8 px-8 py-4 text-lg font-semibold bg-white text-primary-600 rounded-xl hover:bg-primary-50 transition-all shadow-xl"
                    >
                        Login Now
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default Features;
