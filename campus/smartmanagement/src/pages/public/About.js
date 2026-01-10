import React from 'react';
import { Link } from 'react-router-dom';
import { FiTarget, FiHeart, FiUsers, FiAward } from 'react-icons/fi';

const About = () => {
    const values = [
        { icon: <FiTarget size={24} />, title: 'Innovation', desc: 'Constantly evolving to meet the changing needs of modern education.' },
        { icon: <FiHeart size={24} />, title: 'Student-Centric', desc: 'Every feature designed with students and educators in mind.' },
        { icon: <FiUsers size={24} />, title: 'Collaboration', desc: 'Building strong partnerships with educational institutions.' },
        { icon: <FiAward size={24} />, title: 'Excellence', desc: 'Committed to delivering the highest quality solutions.' },
    ];

    const team = [
        { name: 'Dr. Rajesh Kumar', role: 'Founder & CEO', initials: 'RK' },
        { name: 'Priya Sharma', role: 'CTO', initials: 'PS' },
        { name: 'Amit Patel', role: 'Head of Product', initials: 'AP' },
        { name: 'Sneha Reddy', role: 'Head of Customer Success', initials: 'SR' },
    ];

    return (
        <div className="animate-fade-in">
            {/* Hero */}
            <section className="bg-gradient-to-br from-primary-50 to-white py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <h1 className="text-4xl md:text-5xl font-bold text-secondary-800">
                            About <span className="text-primary-600">SmartCampus+</span>
                        </h1>
                        <p className="mt-6 text-lg text-secondary-500 leading-relaxed">
                            We're on a mission to transform educational institutions with smart, connected campus management solutions that empower administrators, teachers, students, and parents.
                        </p>
                    </div>
                </div>
            </section>

            {/* Story */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-3xl font-bold text-secondary-800">Our Story</h2>
                            <p className="mt-6 text-secondary-500 leading-relaxed">
                                Founded in 2020, SmartCampus+ was born from a simple observation: educational institutions were drowning in paperwork while the rest of the world was going digital.
                            </p>
                            <p className="mt-4 text-secondary-500 leading-relaxed">
                                Our founders, with decades of combined experience in education and technology, set out to build a comprehensive platform that would handle everything from student admissions to alumni management – all in one place.
                            </p>
                            <p className="mt-4 text-secondary-500 leading-relaxed">
                                Today, we serve over 500 institutions across India, helping them save time, reduce costs, and focus on what matters most: education.
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-8 text-white">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="text-center p-4">
                                    <p className="text-4xl font-bold">500+</p>
                                    <p className="text-primary-200 text-sm mt-1">Institutions</p>
                                </div>
                                <div className="text-center p-4">
                                    <p className="text-4xl font-bold">1M+</p>
                                    <p className="text-primary-200 text-sm mt-1">Students</p>
                                </div>
                                <div className="text-center p-4">
                                    <p className="text-4xl font-bold">50K+</p>
                                    <p className="text-primary-200 text-sm mt-1">Faculty</p>
                                </div>
                                <div className="text-center p-4">
                                    <p className="text-4xl font-bold">15+</p>
                                    <p className="text-primary-200 text-sm mt-1">States</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-12">
                        <h2 className="text-3xl font-bold text-secondary-800">Our Values</h2>
                        <p className="mt-4 text-secondary-500">The principles that guide everything we do.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {values.map((value, index) => (
                            <div key={index} className="bg-white p-6 rounded-xl text-center border border-gray-100">
                                <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto">
                                    {value.icon}
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-secondary-800">{value.title}</h3>
                                <p className="mt-2 text-sm text-secondary-500">{value.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Team */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-12">
                        <h2 className="text-3xl font-bold text-secondary-800">Leadership Team</h2>
                        <p className="mt-4 text-secondary-500">Meet the people driving our mission forward.</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {team.map((member, index) => (
                            <div key={index} className="text-center">
                                <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mx-auto text-xl font-bold">
                                    {member.initials}
                                </div>
                                <h3 className="mt-4 font-semibold text-secondary-800">{member.name}</h3>
                                <p className="text-sm text-secondary-500">{member.role}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 bg-primary-600">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold text-white">Join Us on Our Journey</h2>
                    <p className="mt-4 text-primary-100">Be part of the educational transformation.</p>
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link to="/login" className="px-8 py-4 text-lg font-semibold bg-white text-primary-600 rounded-xl hover:bg-primary-50 transition-all">
                            Login
                        </Link>
                        <Link to="/contact" className="px-8 py-4 text-lg font-semibold border-2 border-white/30 text-white rounded-xl hover:bg-white/10 transition-all">
                            Contact Us
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default About;
