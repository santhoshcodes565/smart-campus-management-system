import React from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiCalendar, FiDollarSign, FiTruck, FiBarChart2, FiBell, FiArrowRight, FiCheck } from 'react-icons/fi';
import heroImage from '../../assets/hero-campus.png';

const Home = () => {
    const features = [
        { icon: <FiUsers size={24} />, title: 'Student Management', desc: 'Complete student lifecycle management from admission to graduation.' },
        { icon: <FiCalendar size={24} />, title: 'Attendance Tracking', desc: 'Digital attendance with real-time updates and reports.' },
        { icon: <FiDollarSign size={24} />, title: 'Fee Management', desc: 'Online payments, receipts, and comprehensive fee tracking.' },
        { icon: <FiTruck size={24} />, title: 'Transport System', desc: 'Route management, tracking, and student allocations.' },
        { icon: <FiBarChart2 size={24} />, title: 'Analytics & Reports', desc: 'Insightful dashboards and exportable reports.' },
        { icon: <FiBell size={24} />, title: 'Notifications', desc: 'Real-time alerts for students, faculty, and parents.' },
    ];

    const stats = [
        { value: '500+', label: 'Institutions' },
        { value: '1M+', label: 'Students' },
        { value: '50K+', label: 'Faculty' },
        { value: '99.9%', label: 'Uptime' },
    ];

    return (
        <div className="animate-fade-in">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 relative">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Left: Text Content */}
                        <div className="max-w-xl">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                                Transform Your Campus with
                                <span className="text-primary-200"> Smart Management</span>
                            </h1>
                            <p className="mt-6 text-lg md:text-xl text-primary-100 leading-relaxed">
                                An all-in-one platform for managing students, faculty, attendance, fees, transport, and more. Built for modern educational institutions.
                            </p>
                            <div className="mt-10 flex flex-col sm:flex-row gap-4">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold bg-white text-primary-600 rounded-xl hover:bg-primary-50 transition-all shadow-xl"
                                >
                                    Login to Portal <FiArrowRight />
                                </Link>
                                <Link
                                    to="/features"
                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold border-2 border-white/30 text-white rounded-xl hover:bg-white/10 transition-all"
                                >
                                    Explore Features
                                </Link>
                            </div>
                        </div>

                        {/* Right: Hero Illustration */}
                        <div className="hidden lg:flex justify-center lg:justify-end">
                            <img
                                src={heroImage}
                                alt="Smart Campus Management Illustration"
                                className="w-full max-w-md xl:max-w-lg object-contain drop-shadow-2xl animate-fade-in"
                                loading="lazy"
                            />
                        </div>
                    </div>

                    {/* Mobile/Tablet Image - Below Text */}
                    <div className="lg:hidden mt-12 flex justify-center">
                        <img
                            src={heroImage}
                            alt="Smart Campus Management Illustration"
                            className="w-full max-w-sm object-contain drop-shadow-xl"
                            loading="lazy"
                        />
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="bg-white py-12 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, index) => (
                            <div key={index} className="text-center">
                                <p className="text-3xl md:text-4xl font-bold text-primary-600">{stat.value}</p>
                                <p className="mt-1 text-secondary-500">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 lg:py-28 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-secondary-800">Everything You Need</h2>
                        <p className="mt-4 text-lg text-secondary-500">
                            Powerful features to streamline campus operations and enhance educational outcomes.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="bg-white p-8 rounded-2xl border border-gray-100 hover:shadow-xl hover:border-primary-100 transition-all group"
                            >
                                <div className="w-14 h-14 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-colors">
                                    {feature.icon}
                                </div>
                                <h3 className="mt-6 text-xl font-semibold text-secondary-800">{feature.title}</h3>
                                <p className="mt-3 text-secondary-500 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-primary-600">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white">
                        Ready to Modernize Your Campus?
                    </h2>
                    <p className="mt-4 text-lg text-primary-100">
                        Join hundreds of institutions already using SmartCampus+
                    </p>
                    <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold bg-white text-primary-600 rounded-xl hover:bg-primary-50 transition-all shadow-xl"
                        >
                            Login Now <FiArrowRight />
                        </Link>
                        <Link
                            to="/contact"
                            className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold border-2 border-white/30 text-white rounded-xl hover:bg-white/10 transition-all"
                        >
                            Contact Sales
                        </Link>
                    </div>
                </div>
            </section>

            {/* Testimonial / Trust Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-12">
                        <h2 className="text-3xl font-bold text-secondary-800">Trusted by Leading Institutions</h2>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-12 opacity-50">
                        {['IIT Delhi', 'NIT Trichy', 'BITS Pilani', 'VIT University', 'SRM Institute'].map((name) => (
                            <div key={name} className="text-xl font-bold text-secondary-400">{name}</div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
