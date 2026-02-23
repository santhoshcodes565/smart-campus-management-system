import React, { useState } from 'react';
import { FiTruck, FiMapPin, FiUsers, FiClock, FiPhone, FiUser, FiEdit2, FiTrash2, FiPlus, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

const FAKE_ROUTES = [
    {
        id: 1,
        busNumber: 'BUS-001',
        routeName: 'City Center Route',
        driverName: 'Ramesh Kumar',
        driverPhone: '9876543210',
        capacity: 40,
        occupancy: 35,
        stops: ['Railway Station', 'Bus Stand', 'Market Square', 'College Gate'],
        departureTime: '08:00',
        arrivalTime: '08:45',
        status: 'active',
    },
    {
        id: 2,
        busNumber: 'BUS-002',
        routeName: 'Suburb North Route',
        driverName: 'Suresh Singh',
        driverPhone: '9876543211',
        capacity: 50,
        occupancy: 42,
        stops: ['New Township', 'City Mall', 'District Hospital', 'College Gate'],
        departureTime: '07:30',
        arrivalTime: '08:30',
        status: 'active',
    },
    {
        id: 3,
        busNumber: 'BUS-003',
        routeName: 'Highway Express',
        driverName: 'Mahesh Verma',
        driverPhone: '9876543212',
        capacity: 45,
        occupancy: 30,
        stops: ['Highway Junction', 'Tech Park', 'Toll Plaza', 'College Gate'],
        departureTime: '08:15',
        arrivalTime: '09:00',
        status: 'maintenance',
    },
    {
        id: 4,
        busNumber: 'BUS-004',
        routeName: 'East Zone Route',
        driverName: 'Ganesh Patel',
        driverPhone: '9876543213',
        capacity: 40,
        occupancy: 28,
        stops: ['East Colony', 'Petrol Pump', 'Skyline Apartments', 'College Gate'],
        departureTime: '07:45',
        arrivalTime: '08:40',
        status: 'active',
    },
    {
        id: 5,
        busNumber: 'BUS-005',
        routeName: 'South Hills Route',
        driverName: 'Ravi Shankar',
        driverPhone: '9876543214',
        capacity: 48,
        occupancy: 44,
        stops: ['South Hills', 'Lake View', 'Green Park', 'College Gate'],
        departureTime: '07:15',
        arrivalTime: '08:15',
        status: 'active',
    },
    {
        id: 6,
        busNumber: 'BUS-006',
        routeName: 'West Cross Route',
        driverName: 'Vikram Nair',
        driverPhone: '9876543215',
        capacity: 36,
        occupancy: 0,
        stops: ['West Cross Road', 'Industrial Area', 'Sun City', 'College Gate'],
        departureTime: '08:30',
        arrivalTime: '09:15',
        status: 'inactive',
    },
];

const statusConfig = {
    active: { label: 'Active', color: '#16a34a', bg: '#f0fdf4', icon: <FiCheckCircle size={12} /> },
    maintenance: { label: 'Maintenance', color: '#d97706', bg: '#fffbeb', icon: <FiAlertCircle size={12} /> },
    inactive: { label: 'Inactive', color: '#6b7280', bg: '#f3f4f6', icon: <FiAlertCircle size={12} /> },
};

const ManageTransport = () => {
    const [routes] = useState(FAKE_ROUTES);
    const [showModal, setShowModal] = useState(false);
    const [editRoute, setEditRoute] = useState(null);
    const [toastMsg, setToastMsg] = useState('');

    const totalStudents = routes.reduce((s, r) => s + r.occupancy, 0);
    const activeCount = routes.filter(r => r.status === 'active').length;

    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 3000);
    };

    const handleEdit = (route) => {
        setEditRoute(route);
        setShowModal(true);
    };

    const handleAdd = () => {
        setEditRoute(null);
        setShowModal(true);
    };

    const handleDelete = (route) => {
        showToast(`Route ${route.busNumber} deleted (demo mode)`);
    };

    const handleSave = () => {
        showToast(editRoute ? 'Route updated (demo mode)' : 'Route added (demo mode)');
        setShowModal(false);
    };

    return (
        <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#f8fafc' }}>

            {/* Toast */}
            {toastMsg && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 9999,
                    background: '#1e293b', color: '#fff', padding: '12px 20px',
                    borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                    fontSize: 14, fontWeight: 500,
                }}>{toastMsg}</div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Transport Management</h1>
                    <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>Manage campus bus routes and driver allocations</p>
                </div>
                <button
                    onClick={handleAdd}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: '#6366f1', color: '#fff', border: 'none',
                        borderRadius: 10, padding: '10px 18px', fontSize: 14,
                        fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#4f46e5'}
                    onMouseLeave={e => e.currentTarget.style.background = '#6366f1'}
                >
                    <FiPlus size={16} /> Add Route
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
                {[
                    { icon: <FiTruck size={22} />, value: routes.length, label: 'Total Buses', bg: '#eef2ff', color: '#6366f1' },
                    { icon: <FiMapPin size={22} />, value: activeCount, label: 'Active Routes', bg: '#f0fdf4', color: '#16a34a' },
                    { icon: <FiUsers size={22} />, value: totalStudents, label: 'Students Enrolled', bg: '#fff7ed', color: '#ea580c' },
                ].map((s, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {s.icon}
                        </div>
                        <div>
                            <p style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', margin: 0 }}>{s.value}</p>
                            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Route Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                {routes.map(route => {
                    const pct = Math.round((route.occupancy / route.capacity) * 100);
                    const cfg = statusConfig[route.status] || statusConfig.inactive;
                    return (
                        <div key={route.id} style={{
                            background: '#fff', borderRadius: 16, padding: 22,
                            boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
                            transition: 'box-shadow 0.2s',
                        }}
                            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 24px rgba(99,102,241,0.12)'}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)'}
                        >
                            {/* Card Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 12, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <FiTruck size={20} />
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', margin: 0 }}>{route.busNumber}</p>
                                        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{route.routeName}</p>
                                    </div>
                                </div>
                                <span style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    background: cfg.bg, color: cfg.color,
                                    borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600,
                                }}>
                                    {cfg.icon} {cfg.label}
                                </span>
                            </div>

                            {/* Info Rows */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                                {[
                                    { icon: <FiUser size={13} />, label: 'Driver', val: route.driverName },
                                    { icon: <FiPhone size={13} />, label: 'Phone', val: route.driverPhone },
                                    { icon: <FiClock size={13} />, label: 'Timing', val: `${route.departureTime} – ${route.arrivalTime}` },
                                    { icon: <FiUsers size={13} />, label: 'Seats', val: `${route.occupancy} / ${route.capacity}` },
                                ].map((row, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#94a3b8', fontSize: 13 }}>{row.icon}{row.label}</span>
                                        <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>{row.val}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Stops */}
                            <div style={{ marginBottom: 14 }}>
                                <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Stops</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                    {route.stops.map((stop, i) => (
                                        <span key={i} style={{
                                            background: '#f1f5f9', color: '#475569',
                                            borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 500,
                                        }}>{stop}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Occupancy Bar */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 5 }}>
                                    <span>Occupancy</span><span>{pct}%</span>
                                </div>
                                <div style={{ background: '#f1f5f9', borderRadius: 99, height: 6 }}>
                                    <div style={{
                                        width: `${pct}%`, height: '100%', borderRadius: 99,
                                        background: pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#6366f1',
                                        transition: 'width 0.5s',
                                    }} />
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                                <button
                                    onClick={() => handleEdit(route)}
                                    style={{
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                                        padding: '8px', fontSize: 13, fontWeight: 500, color: '#475569', cursor: 'pointer',
                                    }}
                                >
                                    <FiEdit2 size={14} /> Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(route)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: '#fff5f5', border: '1px solid #fee2e2', borderRadius: 8,
                                        padding: '8px 12px', color: '#ef4444', cursor: 'pointer',
                                    }}
                                >
                                    <FiTrash2 size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <div style={{ background: '#fff', borderRadius: 18, padding: 32, width: 520, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>
                            {editRoute ? `Edit ${editRoute.busNumber}` : 'Add New Route'}
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            {[
                                { label: 'Bus Number', placeholder: 'e.g. BUS-007', def: editRoute?.busNumber },
                                { label: 'Route Name', placeholder: 'e.g. East Zone Route', def: editRoute?.routeName },
                                { label: 'Driver Name', placeholder: 'Full name', def: editRoute?.driverName },
                                { label: 'Driver Phone', placeholder: '10-digit number', def: editRoute?.driverPhone },
                                { label: 'Departure Time', type: 'time', def: editRoute?.departureTime },
                                { label: 'Arrival Time', type: 'time', def: editRoute?.arrivalTime },
                            ].map((f, i) => (
                                <div key={i}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 5 }}>{f.label}</label>
                                    <input
                                        type={f.type || 'text'}
                                        defaultValue={f.def || ''}
                                        placeholder={f.placeholder}
                                        style={{
                                            width: '100%', boxSizing: 'border-box',
                                            border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 12px',
                                            fontSize: 13, color: '#1e293b', outline: 'none',
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 14 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 5 }}>Stops (comma separated)</label>
                            <textarea
                                defaultValue={editRoute?.stops?.join(', ') || ''}
                                placeholder="Stop 1, Stop 2, Stop 3, ..."
                                rows={2}
                                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#1e293b', resize: 'none', outline: 'none' }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                            >Cancel</button>
                            <button
                                onClick={handleSave}
                                style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                            >{editRoute ? 'Update Route' : 'Add Route'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageTransport;
