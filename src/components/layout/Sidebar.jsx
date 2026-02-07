import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BarChart2, Zap, BookOpen, Calculator, User, Settings, Beaker, Search } from 'lucide-react';

const navItems = [
    { icon: LayoutDashboard, label: 'Overview', path: '/app' },
    { icon: BarChart2, label: 'Markets', path: '/app/markets' },
    { icon: Zap, label: 'Trade Setups', path: '/app/setups' },
    { icon: Search, label: 'Scanner', path: '/app/scanner' },
    { icon: Beaker, label: 'Signal Lab', path: '/app/lab' },
    { icon: BookOpen, label: 'Education', path: '/app/education' },
    { icon: Calculator, label: 'Risk Calc', path: '/app/risk' },
    { icon: User, label: 'Account', path: '/app/account' },
];

const Sidebar = () => {
    return (
        <aside className="sidebar">
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '24px', height: '24px', background: 'var(--color-accent-primary)', borderRadius: '4px' }}></div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
                    TRADE<span style={{ color: 'var(--color-text-secondary)' }}>ALGO</span>
                </h2>
            </div>

            <nav style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', fontWeight: 600, paddingLeft: '12px', marginBottom: '8px' }}>Menu</p>

                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/app'} // Only match exact path for Overview
                        className={({ isActive }) =>
                            `btn btn-ghost nav-item ${isActive ? 'active' : ''}`
                        }
                    >
                        <item.icon size={18} />
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)' }}>
                <a href="#" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--color-text-secondary)' }}>
                    <Settings size={18} />
                    Settings
                </a>
            </div>
        </aside>
    );
};

export default Sidebar;
