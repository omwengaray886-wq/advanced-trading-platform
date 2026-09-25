import { Search, Bell, Menu, Sun, Moon, User, ChevronDown } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { alertOrchestrator } from '../../services/AlertOrchestrator';
import { useState, useEffect } from 'react';

export default function Header({ toggleSidebar, isSidebarOpen }) {
    const { theme, toggleTheme } = useTheme();
    const { currentUser, subscriptionStatus } = useAuth();
    const navigate = useNavigate();
    const [alertCount, setAlertCount] = useState(
        alertOrchestrator.getAlerts().filter(a => a.status === 'ACTIVE').length
    );

    useEffect(() => {
        const unsubscribe = alertOrchestrator.onUpdate((alerts) => {
            setAlertCount(alerts.filter(a => a.status === 'ACTIVE').length);
        });
        return unsubscribe;
    }, []);

    const displayName = currentUser?.name || currentUser?.displayName || 'Trader';
    const planLabel = subscriptionStatus?.isSubscriptionActive
        ? 'Pro'
        : subscriptionStatus?.isTrialActive
            ? 'Trial'
            : 'Expired';
    const planColor = subscriptionStatus?.isSubscriptionActive
        ? 'var(--color-success)'
        : subscriptionStatus?.isTrialActive
            ? 'var(--color-warning)'
            : 'var(--color-danger)';

    return (
        <header className="topbar" style={{ gap: '12px' }}>
            {/* Left: hamburger + search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <button
                    className="btn btn-ghost btn-sm hide-desktop"
                    onClick={toggleSidebar}
                    style={{ padding: '6px', flexShrink: 0 }}
                >
                    <Menu size={19} />
                </button>

                {/* Search */}
                <div className="input-group hide-mobile" style={{ maxWidth: '320px', width: '100%' }}>
                    <Search size={15} className="input-group-icon" />
                    <input
                        type="text"
                        placeholder="Search markets, setups..."
                        className="input"
                        style={{ fontSize: '13px', height: '34px', paddingLeft: '36px' }}
                    />
                </div>
            </div>

            {/* Right: actions + user */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {/* Theme toggle */}
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={toggleTheme}
                    style={{ padding: '7px', color: 'var(--color-text-secondary)' }}
                    title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
                >
                    {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                </button>

                {/* Alerts */}
                <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '7px', position: 'relative', color: 'var(--color-text-secondary)' }}
                    onClick={() => navigate('/app/alerts')}
                    title="Alerts"
                >
                    <Bell size={17} />
                    {alertCount > 0 && (
                        <span style={{
                            position: 'absolute',
                            top: '5px', right: '5px',
                            width: '7px', height: '7px',
                            background: 'var(--color-danger)',
                            borderRadius: '50%',
                            border: '1.5px solid var(--color-bg-primary)',
                            boxShadow: '0 0 6px var(--color-danger)'
                        }} />
                    )}
                </button>

                {/* Divider */}
                <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 4px' }} className="hide-mobile" />

                {/* User profile */}
                <button
                    className="btn btn-ghost"
                    onClick={() => navigate('/app/account')}
                    style={{
                        padding: '5px 8px',
                        gap: '9px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--color-bg-secondary)',
                    }}
                >
                    {/* Avatar */}
                    <div style={{
                        width: '28px', height: '28px',
                        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <User size={14} color="white" />
                    </div>

                    {/* Name + plan */}
                    <div className="hide-mobile" style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                            {displayName.split(' ')[0]}
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: 600, color: planColor, lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {planLabel}
                        </div>
                    </div>

                    <ChevronDown size={13} className="hide-mobile" style={{ color: 'var(--color-text-tertiary)' }} />
                </button>
            </div>
        </header>
    );
}
