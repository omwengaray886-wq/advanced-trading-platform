import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastItem = ({ toast, removeToast }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            removeToast(toast.id);
        }, toast.duration);

        return () => clearTimeout(timer);
    }, [toast, removeToast]);

    const icons = {
        success: <CheckCircle size={20} color="var(--color-success)" />,
        error: <AlertCircle size={20} color="var(--color-danger)" />,
        warning: <AlertTriangle size={20} color="var(--color-warning)" />,
        info: <Info size={20} color="var(--color-info)" />
    };

    const borders = {
        success: '1px solid rgba(16, 185, 129, 0.2)',
        error: '1px solid rgba(239, 68, 68, 0.2)',
        warning: '1px solid rgba(245, 158, 11, 0.2)',
        info: '1px solid rgba(59, 130, 246, 0.2)'
    };

    const backgrounds = {
        success: 'rgba(16, 185, 129, 0.1)',
        error: 'rgba(239, 68, 68, 0.1)',
        warning: 'rgba(245, 158, 11, 0.1)',
        info: 'rgba(59, 130, 246, 0.1)'
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--color-bg-secondary)',
            border: borders[toast.type] || borders.info,
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            minWidth: '300px',
            maxWidth: '400px',
            marginBottom: '10px',
            animation: 'slideIn 0.3s ease-out forwards',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{ flexShrink: 0 }}>
                {icons[toast.type] || icons.info}
            </div>
            <div style={{ flex: 1, fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {toast.message}
            </div>
            <button
                onClick={() => removeToast(toast.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: '4px' }}
            >
                <X size={16} />
            </button>

            {/* Progress bar line optionally could go here */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: '3px',
                background: backgrounds[toast.type],
                width: '100%',
            }}></div>

            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default function ToastContainer({ toasts, removeToast }) {
    return (
        <div style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
        }}>
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
            ))}
        </div>
    );
}
