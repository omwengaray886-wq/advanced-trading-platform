import React from 'react';

export const Skeleton = ({ height = '20px', width = '100%', marginBottom = '0', borderRadius = '4px' }) => {
    return (
        <div style={{
            height,
            width,
            marginBottom,
            borderRadius,
            backgroundColor: 'var(--color-bg-tertiary)',
            animation: 'pulse 1.5s infinite ease-in-out'
        }} />
    );
};

export const CardSkeleton = () => (
    <div className="card" style={{ height: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Skeleton width="40%" height="24px" />
            <Skeleton width="20%" height="24px" />
        </div>
        <Skeleton height="150px" />
        <Skeleton height="20px" width="80%" />
        <Skeleton height="20px" width="60%" />
    </div>
);

// Add pulse animation globally since we aren't using a CSS file for this specifically
const style = document.createElement('style');
style.innerHTML = `
  @keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 0.3; }
    100% { opacity: 0.6; }
  }
`;
document.head.appendChild(style);

export default Skeleton;
