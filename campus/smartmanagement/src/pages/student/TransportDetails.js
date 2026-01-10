import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonStats } from '../../components/common/LoadingSpinner';
import { FiTruck, FiMapPin, FiClock, FiUser, FiPhone, FiAlertCircle } from 'react-icons/fi';

const TransportDetails = () => {
    const [transport, setTransport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTransport();
    }, []);

    const fetchTransport = async () => {
        try {
            setLoading(true);
            const response = await studentAPI.getTransport();
            if (response.data.success) {
                setTransport(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching transport:', error);
            // Fallback
            setTransport({
                isEnrolled: true,
                busNumber: 'BUS-001',
                routeName: 'City Center Route',
                stop: 'Railway Station',
                pickUpTime: '08:05 AM',
                dropTime: '04:45 PM',
                driver: { name: 'Ramesh Kumar', phone: '9876543210' },
                stops: [
                    { name: 'Railway Station', time: '08:05 AM' },
                    { name: 'Bus Stand', time: '08:15 AM' },
                    { name: 'Market', time: '08:25 AM' },
                    { name: 'College Gate', time: '08:45 AM' },
                ]
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8"><SkeletonStats /></div>;

    if (!transport?.isEnrolled) {
        return (
            <div className="animate-fade-in">
                <Breadcrumb items={[{ label: 'Dashboard', path: '/student/dashboard' }, { label: 'Transport', path: '/student/transport', isLast: true }]} />
                <EmptyState
                    icon={FiTruck}
                    title="Not Enrolled in Transport"
                    description="You are currently not enrolled in the college transport service."
                    action={() => { }}
                    actionLabel="Apply for Transport"
                />
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[{ label: 'Dashboard', path: '/student/dashboard' }, { label: 'Transport', path: '/student/transport', isLast: true }]} />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Transport Details</h1>
                    <p className="text-secondary-500 mt-1">Bus route, timings and driver information</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card bg-gradient-to-br from-secondary-800 to-secondary-900 text-white border-none overflow-hidden relative">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
                                    <FiTruck size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">{transport.busNumber}</h2>
                                    <p className="text-secondary-300 text-sm">{transport.routeName}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6 mt-8">
                                <div>
                                    <p className="text-secondary-400 text-xs uppercase tracking-wider mb-1">Your Stop</p>
                                    <p className="text-lg font-bold flex items-center gap-2">
                                        <FiMapPin className="text-primary-400" /> {transport.stop}
                                    </p>
                                </div>
                                <div className="flex gap-8">
                                    <div>
                                        <p className="text-secondary-400 text-xs uppercase tracking-wider mb-1">Pick Up</p>
                                        <p className="text-lg font-bold">{transport.pickUpTime}</p>
                                    </div>
                                    <div>
                                        <p className="text-secondary-400 text-xs uppercase tracking-wider mb-1">Drop</p>
                                        <p className="text-lg font-bold">{transport.dropTime}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <FiTruck size={140} className="absolute -right-10 -bottom-10 text-white/5 rotate-12" />
                    </div>

                    {/* Route Timeline */}
                    <div className="card">
                        <h3 className="card-title mb-6">Route Stops</h3>
                        <div className="relative pl-8 space-y-8 before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                            {transport.stops.map((s, i) => (
                                <div key={i} className="relative">
                                    <div className={`absolute -left-[25px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm ${s.name === transport.stop ? 'bg-primary-500 scale-125' : 'bg-gray-300'
                                        }`} />
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className={`font-bold ${s.name === transport.stop ? 'text-primary-600' : 'text-secondary-800'}`}>
                                                {s.name}
                                            </p>
                                            {s.name === transport.stop && <p className="text-xs text-primary-500 font-medium">Your designated stop</p>}
                                        </div>
                                        <span className="text-sm font-medium text-secondary-500 bg-gray-50 px-3 py-1 rounded-lg">
                                            {s.time}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Driver & Status */}
                <div className="space-y-6">
                    <div className="card">
                        <h3 className="card-title mb-4">Driver Profile</h3>
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 mb-4">
                            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                                {transport.driver.name.charAt(0)}
                            </div>
                            <div>
                                <h4 className="font-bold text-secondary-800">{transport.driver.name}</h4>
                                <p className="text-xs text-secondary-500">Official Driver</p>
                            </div>
                        </div>
                        <button className="w-full btn-secondary flex items-center justify-center gap-2">
                            <FiPhone size={16} /> {transport.driver.phone}
                        </button>
                    </div>

                    <div className="card bg-warning-50 border-warning-100">
                        <div className="flex items-start gap-3">
                            <FiAlertCircle className="text-warning-600 mt-1" size={20} />
                            <div>
                                <h4 className="font-bold text-warning-800 text-sm">Real-time Location</h4>
                                <p className="text-xs text-warning-700 mt-1 leading-relaxed">
                                    GPS tracking is currently unavailable for this vehicle due to maintenance. Please contact the driver for current location.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransportDetails;
