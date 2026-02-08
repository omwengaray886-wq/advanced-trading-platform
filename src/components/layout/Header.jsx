import React, { useState } from 'react';
import { Search, Bell, Menu, X, Sun, Moon, LogOut, User } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Header({ toggleSidebar, isSidebarOpen }) {
    const { theme, toggleTheme } = useTheme();
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    // const handleLogout = async () => {
    //     try {
    //         await logout();
    //         navigate('/login');
    //     } catch (error) {
    //         console.error("Failed to log out", error);
    //     }
    // };

    return (
        <header className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', borderBottom: '1px solid var(--border-color)', padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button className="btn btn-ghost hide-desktop" onClick={toggleSidebar}>
                    {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                {/* Search Bar */}
                <div style={{ position: 'relative', width: '300px' }} className="hide-mobile">
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                    <input
                        type="text"
                        placeholder="Search markets, news, or setups..."
                        className="input"
                        style={{ paddingLeft: '40px' }}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button className="btn btn-ghost" onClick={toggleTheme}>
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <button className="btn btn-ghost" style={{ position: 'relative' }}>
                    <Bell size={20} />
                    <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', background: 'var(--color-danger)', borderRadius: '50%' }}></span>
                </button>

                <div style={{ height: '24px', width: '1px', background: 'var(--border-color)' }}></div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="hide-mobile" style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{currentUser?.displayName || 'Quantum Trader'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Institutional Access</div>
                    </div>

                    <div style={{ width: '36px', height: '36px', background: 'var(--color-accent-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <User color="white" size={20} />
                    </div>

                    {/* Logout disabled for open access */}
                    {/* <button onClick={handleLogout} className="btn btn-ghost" title="Logout">
                        <LogOut size={18} color="var(--color-danger)" />
                    </button> */}
                </div>
            </div>
        </header>
    );
}
