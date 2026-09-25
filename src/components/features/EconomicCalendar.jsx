import React from 'react';
import { Calendar, Clock, Globe } from 'lucide-react';

const events = [
    { id: 1, time: '13:30', currency: 'USD', event: 'Core PCE Price Index (MoM)', impact: 'HIGH', forecast: '0.2%', previous: '0.1%' },
    { id: 2, time: '14:00', currency: 'EUR', event: 'Lagarde Speaks', impact: 'MEDIUM', forecast: '-', previous: '-' },
    { id: 3, time: '15:45', currency: 'USD', event: 'Flash Services PMI', impact: 'HIGH', forecast: '51.0', previous: '50.5' },
    { id: 4, time: '19:00', currency: 'USD', event: 'FOMC Meeting Minutes', impact: 'HIGH', forecast: '-', previous: '-' },
];

const ImpactBadge = ({ impact }) => {
    const colors = {
        'HIGH': 'var(--color-danger)',
        'MEDIUM': 'var(--color-warning)',
        'LOW': 'var(--color-success)',
    };
    return (
        <span style={{
            fontSize: '10px',
            fontWeight: 'bold',
            color: colors[impact],
            border: `1px solid ${colors[impact]}`,
            padding: '2px 6px',
            borderRadius: '4px'
        }}>
            {impact}
        </span>
    );
};

export default function EconomicCalendar() {
    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={18} color="var(--color-primary)" />
                    <h3 className="card-title">Economic Calendar</h3>
                </div>
                <span className="badge badge-neutral" style={{ fontSize: '11px' }}>Today</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                {events.map((e, index) => (
                    <div key={e.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 0',
                        borderBottom: index !== events.length - 1 ? '1px solid var(--border-color)' : 'none'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '500' }}>{e.time}</span>
                                <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>UTC</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '500' }}>{e.event}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Globe size={10} color="var(--color-text-tertiary)" />
                                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{e.currency}</span>
                                </div>
                            </div>
                        </div>
                        <ImpactBadge impact={e.impact} />
                    </div>
                ))}
            </div>

            <button className="btn btn-outline" style={{ marginTop: 'auto', width: '100%', fontSize: '12px' }}>
                View Full Calendar
            </button>
        </div>
    );
}
