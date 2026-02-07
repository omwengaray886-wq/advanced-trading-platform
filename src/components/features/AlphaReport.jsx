import React from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, BarChart, Shield, Calculator } from 'lucide-react';

export default function AlphaReport({ data, onClose }) {
    if (!data) return null;

    const printReport = () => {
        window.print();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="modal-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.8)',
                zIndex: 1000,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '40px'
            }}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="glass-panel"
                style={{
                    width: '100%',
                    maxWidth: '850px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    background: 'white',
                    color: '#0f172a',
                    padding: '60px',
                    borderRadius: '0', // Professional look
                    position: 'relative'
                }}
            >
                {/* Close Button (Hidden in Print) */}
                <button
                    onClick={onClose}
                    className="no-print"
                    style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px' }}
                >
                    ✕
                </button>

                {/* Report Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', borderBottom: '2px solid #0f172a', paddingBottom: '20px', marginBottom: '40px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: '900', margin: 0, letterSpacing: '-1px' }}>INSTITUTIONAL ALPHA REPORT</h1>
                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Strategic Performance Analysis & Quantitative Attribution</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '800', fontSize: '18px' }}>TradeAlgo Pro</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Generated: {new Date().toLocaleDateString()}</div>
                    </div>
                </div>

                {/* Executive Summary */}
                <div style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} /> Executive Summary
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px' }}>
                        <div style={{ padding: '16px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Total Return</div>
                            <div style={{ fontSize: '20px', fontWeight: '900', color: '#10b981' }}>+{data.stats.totalReturn}%</div>
                        </div>
                        <div style={{ padding: '16px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Profit Factor</div>
                            <div style={{ fontSize: '20px', fontWeight: '900' }}>{data.stats.profitFactor}x</div>
                        </div>
                        <div style={{ padding: '16px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Win Rate</div>
                            <div style={{ fontSize: '20px', fontWeight: '900' }}>{data.stats.winRate}%</div>
                        </div>
                        <div style={{ padding: '16px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Sharpe Ratio</div>
                            <div style={{ fontSize: '20px', fontWeight: '900', color: data.stats.sharpe > 1 ? '#10b981' : '#f59e0b' }}>{data.stats.sharpe.toFixed(2)}</div>
                        </div>
                    </div>
                </div>

                {/* Risk Metrics */}
                <div style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield size={16} /> Risk Analysis
                    </h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '12px 0', fontSize: '13px', color: '#64748b' }}>Maximum Drawdown</td>
                                <td style={{ padding: '12px 0', fontSize: '13px', fontWeight: '700', textAlign: 'right' }}>{data.stats.maxDrawdown}%</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '12px 0', fontSize: '13px', color: '#64748b' }}>Expectancy per Execution</td>
                                <td style={{ padding: '12px 0', fontSize: '13px', fontWeight: '700', textAlign: 'right' }}>
                                    ${((data.stats.finalBalance - 10000) / data.stats.totalTrades).toFixed(2)}
                                </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '12px 0', fontSize: '13px', color: '#64748b' }}>Asset Volatility (H)</td>
                                <td style={{ padding: '12px 0', fontSize: '13px', fontWeight: '700', textAlign: 'right' }}>0.84%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Methodology Disclosure */}
                <div style={{ marginTop: 'auto', padding: '20px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                    CONFIDENTIAL: This report is generated by the TradeAlgo quantitative engine. Past performance is not indicative of future results. All simulations assume 1% risk-per-trade on a baseline of $10,000 USD.
                </div>

                {/* Action Buttons (Hidden in Print) */}
                <div className="flex-row justify-end gap-sm no-print" style={{ marginTop: '32px' }}>
                    <button onClick={onClose} className="btn btn-outline" style={{ border: '1px solid #0f172a', color: '#0f172a' }}>Cancel</button>
                    <button onClick={printReport} className="btn btn-primary" style={{ background: '#0f172a', color: 'white', border: 'none' }}>
                        <Download size={14} /> Export PDF
                    </button>
                </div>

                {/* Print Styles */}
                <style>{`
                    @media print {
                        .no-print { display: none !important; }
                        body { background: white !important; }
                        .glass-panel { border: none !important; box-shadow: none !important; padding: 0 !important; }
                    }
                `}</style>
            </motion.div>
        </motion.div>
    );
}
