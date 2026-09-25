import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, BarChart2, Zap, BookOpen,
    Calculator, User, Settings, FlaskConical,
    Search, Bell, X, TrendingUp, LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navGroups = [
    {
        label: 'Trading',
        items: [
            { icon: LayoutDashboard, label: 'Overview',     path: '/app' },
            { icon: BarChart2,       label: 'Markets',      path: '/app/markets' },
            { icon: Zap,             label: 'Trade Setups', path: '/app/setups' },
            { icon: Bell,            label: 'Alerts',       path: '/app/alerts' },
            { icon: Search,          label: 'Scanner',      path: '/app/scanner' },
        ]
    },
    {
        label: 'Tools',
        items: [
            { icon: FlaskConical,    label: 'Signal Lab',   path: '/app/lab' },
            { icon: BookOpen,        label: 'Education',    path: '/app/education' },
            { icon: Calculator,      label: 'Risk Calc',    path: '/app/risk' },
        ]
    }
];

const Sidebar = ({ isOpen, closeSidebar }) => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
        closeSidebar?.();
    };

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            {/* Brand */}
            <div className="sidebar-brand">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="sidebar-logo-mark" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingUp size={14} color="white" />
                    </div>
                    <h2 className="sidebar-title">
                        TRADE<span>ALGO</span>
                    </h2>
                </div>
                <button className="btn btn-ghost btn-sm hide-desktop" onClick={closeSidebar} style={{ padding: '4px' }}>
                    <X size={18} />
                </button>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: '8px' }}>
                {navGroups.map(group => (
                    <div key={group.label}>
                        <p className="sidebar-section-label">{group.label}</p>
                        {group.items.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/app'}
                                className={({ isActive }) =>
                                    `btn btn-ghost nav-item ${isActive ? 'active' : ''}`
                                }
                                onClick={closeSidebar}
                            >
                                <item.icon size={16} style={{ flexShrink: 0 }} />
                                {item.label}
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="sidebar-footer">
                <NavLink
                    to="/app/account"
                    className={({ isActive }) => `btn btn-ghost nav-item ${isActive ? 'active' : ''}`}
                    onClick={closeSidebar}
                >
                    <User size={16} style={{ flexShrink: 0 }} />
                    Account
                </NavLink>
                <button
                    onClick={handleLogout}
                    className="btn btn-ghost nav-item"
                    style={{ color: 'var(--color-danger)', marginTop: '2px' }}
                >
                    <LogOut size={16} style={{ flexShrink: 0 }} />
                    Sign Out
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
