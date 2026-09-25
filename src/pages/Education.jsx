import React, { useState, useEffect } from 'react';
import { PlayCircle, BookOpen, Clock, Tag, Search, Zap, Target, ArrowUpRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { scannerService } from '../services/ScannerService';
import { motion, AnimatePresence } from 'framer-motion';

import { PIPSOLOGY_CURRICULUM, INSTITUTIONAL_CURRICULUM } from '../services/academyData';
import { TugOfWar, FXLadder, SessionOverlap, CandleAnatomy, SRBounce } from '../components/AcademyVisuals';

const ContentRenderer = ({ content }) => {
    if (!content) return null;

    // Split content by segments (text vs custom visual tags)
    const segments = content.split(/(\[.*?\])/g);

    return (
        <div>
            {segments.map((segment, i) => {
                if (segment === '[TUG_OF_WAR]') return <TugOfWar key={i} />;
                if (segment === '[FX_LADDER]') return <FXLadder key={i} />;
                if (segment === '[SESSION_OVERLAP]') return <SessionOverlap key={i} />;
                if (segment === '[CANDLE_ANATOMY]') return <CandleAnatomy key={i} />;
                if (segment === '[SR_BOUNCE]') return <SRBounce key={i} />;

                // Basic Markdown transformation
                return (
                    <div key={i} style={{ marginBottom: '16px' }}>
                        {segment.split('\n').map((line, j) => {
                            if (line.startsWith('# ')) return <h1 key={j} style={{ fontSize: '24px', color: 'var(--color-text-primary)', marginTop: '24px', marginBottom: '16px' }}>{line.replace('# ', '')}</h1>;
                            if (line.startsWith('## ')) return <h2 key={j} style={{ fontSize: '20px', color: 'var(--color-text-primary)', marginTop: '20px', marginBottom: '12px' }}>{line.replace('## ', '')}</h2>;
                            if (line.startsWith('### ')) return <h3 key={j} style={{ fontSize: '18px', color: 'var(--color-text-primary)', marginTop: '16px', marginBottom: '8px' }}>{line.replace('### ', '')}</h3>;
                            if (line.trim().startsWith('- ')) return <li key={j} style={{ marginLeft: '20px', marginBottom: '4px' }}>{line.trim().replace('- ', '')}</li>;

                            // Handling bold text
                            const parts = line.split(/(\*\*.*?\*\*)/g);
                            return (
                                <p key={j} style={{ margin: '4px 0', minHeight: line.trim() === '' ? '12px' : 'auto' }}>
                                    {parts.map((part, k) => {
                                        if (part.startsWith('**') && part.endsWith('**')) {
                                            return <strong key={k}>{part.slice(2, -2)}</strong>;
                                        }
                                        return part;
                                    })}
                                </p>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};

export default function Education() {
    const [activeTrack, setActiveTrack] = useState('INSTITUTIONAL'); // 'INSTITUTIONAL' or 'FOUNDATIONAL'
    const [liveSetups, setLiveSetups] = useState([]);
    const [scanning, setScanning] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedModule, setSelectedModule] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Track-specific progress
    const [institutionalProgress, setInstitutionalProgress] = useState(() => {
        const saved = localStorage.getItem('academy_progress_institutional');
        return saved ? JSON.parse(saved) : [];
    });
    const [foundationalProgress, setFoundationalProgress] = useState(() => {
        const saved = localStorage.getItem('academy_progress_foundational');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('academy_progress_institutional', JSON.stringify(institutionalProgress));
    }, [institutionalProgress]);

    useEffect(() => {
        localStorage.setItem('academy_progress_foundational', JSON.stringify(foundationalProgress));
    }, [foundationalProgress]);

    const curriculum = activeTrack === 'INSTITUTIONAL' ? INSTITUTIONAL_CURRICULUM : PIPSOLOGY_CURRICULUM;
    const completedModules = activeTrack === 'INSTITUTIONAL' ? institutionalProgress : foundationalProgress;
    const setCompletedModules = activeTrack === 'INSTITUTIONAL' ? setInstitutionalProgress : setFoundationalProgress;

    const categories = activeTrack === 'INSTITUTIONAL'
        ? ['Institutional SMC', 'Liquidity & Inducements', 'Risk Engineering', 'Psychology & Performance']
        : ['Foundational Forex', 'Technical Analysis', 'Market Psychology'];

    const progressPercentage = (completedModules.length / curriculum.length) * 100;

    useEffect(() => {
        const fetchSetups = async () => {
            setScanning(true);
            const data = await scannerService.scanAll();
            setLiveSetups(data.filter(d => d.hasSetup));
            setScanning(false);
        };
        fetchSetups();
        const interval = setInterval(fetchSetups, 120000); // 2 min refresh
        return () => clearInterval(interval);
    }, []);

    const filteredCurriculum = curriculum.filter(item => {
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.content.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const toggleModuleCompletion = (id) => {
        setCompletedModules(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: 'var(--color-text-primary)' }}>
            {/* Academy Header */}
            <div className="flex-row justify-between items-center" style={{ marginBottom: '40px', background: 'var(--color-bg-secondary)', padding: '32px', borderRadius: '16px', border: '1px solid var(--color-border-primary)' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                        {activeTrack === 'INSTITUTIONAL' ? 'Institutional Academy' : 'School of Pipsology'}
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        {activeTrack === 'INSTITUTIONAL'
                            ? 'Mastering the footprints of central banks and algorithms.'
                            : 'Acquire the skills to become a superstar trader. Make Pips. Keep Pips. Repeat.'}
                    </p>
                </div>

                <div style={{ textAlign: 'right', minWidth: '240px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                        <span style={{ fontWeight: 'bold' }}>Academy Progress</span>
                        <span style={{ color: 'var(--color-accent-primary)' }}>{progressPercentage.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercentage}%` }}
                            style={{ height: '100%', background: 'linear-gradient(90deg, var(--color-accent-primary), #00d2ff)' }}
                        />
                    </div>
                </div>
            </div>

            {/* Track Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '12px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.05)' }}>
                <button
                    onClick={() => { setActiveTrack('INSTITUTIONAL'); setSelectedCategory('All'); }}
                    className={`btn ${activeTrack === 'INSTITUTIONAL' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ borderRadius: '8px', fontSize: '13px' }}
                >
                    Masters Track (SMC)
                </button>
                <button
                    onClick={() => { setActiveTrack('FOUNDATIONAL'); setSelectedCategory('All'); }}
                    className={`btn ${activeTrack === 'FOUNDATIONAL' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ borderRadius: '8px', fontSize: '13px' }}
                >
                    Foundations (Pipsology)
                </button>
            </div>

            <div className="flex-row gap-xl">
                <div style={{ flex: 1 }}>
                    {/* Search and Filters */}
                    <div className="flex-row gap-md items-center" style={{ marginBottom: '32px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                            <input
                                type="text"
                                placeholder="Search modules, concepts, or keywords..."
                                className="input"
                                style={{ paddingLeft: '40px', width: '100%', background: 'var(--color-bg-secondary)' }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setSelectedCategory('All')}
                                className={`btn btn-sm ${selectedCategory === 'All' ? 'btn-primary' : 'btn-outline'}`}
                            >
                                All
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-outline'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Content Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                        {filteredCurriculum.map(item => (
                            <div
                                key={item.id}
                                className="card"
                                style={{ padding: '0', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s', position: 'relative' }}
                                onClick={() => setSelectedModule(item)}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <div style={{ height: '160px', background: 'var(--color-bg-tertiary)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {item.type === 'Video' ? <PlayCircle size={40} color="rgba(255,255,255,0.2)" /> : <BookOpen size={40} color="rgba(255,255,255,0.2)" />}

                                    {completedModules.includes(item.id) && (
                                        <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'var(--color-success)', color: 'white', borderRadius: '50%', padding: '4px' }}>
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                    )}

                                    <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px' }}>
                                        <span className="badge badge-neutral" style={{ fontSize: '10px' }}>{item.category}</span>
                                        <span style={{
                                            fontSize: '10px',
                                            background: item.difficulty === 'Expert' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                            color: item.difficulty === 'Expert' ? '#ef4444' : '#10b981',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontWeight: 'bold'
                                        }}>{item.difficulty}</span>
                                    </div>
                                </div>
                                <div style={{ padding: '20px' }}>
                                    <h3 style={{ fontSize: '17px', fontWeight: 'bold', marginBottom: '12px', lineHeight: '1.4' }}>{item.title}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--color-text-tertiary)', fontSize: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Clock size={14} /> {item.duration}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Tag size={14} /> {item.type}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content Viewer Modal */}
                <AnimatePresence>
                    {selectedModule && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0,0,0,0.85)',
                                backdropFilter: 'blur(10px)',
                                zIndex: 10000,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '40px'
                            }}
                            onClick={() => setSelectedModule(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="card"
                                style={{
                                    width: '100%',
                                    maxWidth: '900px',
                                    maxHeight: '90vh',
                                    overflowY: 'auto',
                                    position: 'relative',
                                    padding: '40px'
                                }}
                                onClick={e => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => setSelectedModule(null)}
                                    style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer' }}
                                >
                                    CLOSE [ESC]
                                </button>

                                <div style={{ marginBottom: '24px' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--color-accent-primary)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>
                                        {selectedModule.category} • {selectedModule.difficulty}
                                    </div>
                                    <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>{selectedModule.title}</h1>
                                </div>

                                {selectedModule.type === 'Video' && (
                                    <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <PlayCircle size={64} color="var(--color-primary)" />
                                            <p style={{ marginTop: '12px', color: 'var(--color-text-secondary)' }}>Institutional Lesson Stream Loading...</p>
                                        </div>
                                    </div>
                                )}

                                <div style={{ fontSize: '16px', lineHeight: '1.8', color: 'var(--color-text-secondary)' }}>
                                    <ContentRenderer content={selectedModule.content} />
                                </div>

                                <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--color-border-primary)', display: 'flex', justifyContent: 'space-between' }}>
                                    <button
                                        className="btn btn-outline"
                                        disabled={curriculum.findIndex(m => m.id === selectedModule.id) === 0}
                                        onClick={() => {
                                            const idx = curriculum.findIndex(m => m.id === selectedModule.id);
                                            if (idx > 0) setSelectedModule(curriculum[idx - 1]);
                                        }}
                                    >
                                        PREVIOUS LESSON
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => {
                                            if (!completedModules.includes(selectedModule.id)) {
                                                toggleModuleCompletion(selectedModule.id);
                                            }
                                            setSelectedModule(null);
                                        }}
                                    >
                                        {completedModules.includes(selectedModule.id) ? 'ALREADY COMPLETED' : 'MARK AS COMPLETE'}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Live Institutional Examples Sidebar */}
                <div style={{ width: '320px', flexShrink: 0 }}>
                    <div className="card" style={{ position: 'sticky', top: '24px', background: 'rgba(56, 189, 248, 0.03)', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
                        <div className="flex-row items-center gap-sm" style={{ marginBottom: '20px' }}>
                            <Zap size={20} color="var(--color-accent-primary)" />
                            <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Live Examples</h2>
                        </div>

                        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                            Real-time setups matching our Market Structure curriculum.
                        </p>

                        <div className="flex-col gap-md">
                            {scanning && <div className="animate-pulse" style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>Scanning markets for setups...</div>}

                            {!scanning && liveSetups.length === 0 && (
                                <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                                    No institutional setups detected. Waiting for liquidity sweeps...
                                </div>
                            )}

                            {liveSetups.map((setup, i) => (
                                <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div className="flex-row justify-between items-center" style={{ marginBottom: '8px' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{setup.symbol}</span>
                                        <span style={{ fontSize: '10px', color: setup.trend === 'BULLISH' ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 'bold' }}>
                                            {setup.trend}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                                        {setup.structure} detected at ${setup.price.toLocaleString()}
                                    </div>
                                    <div className="flex-row items-center gap-xs" style={{ fontSize: '10px', color: 'var(--color-accent-primary)', fontWeight: 'bold' }}>
                                        <Target size={12} /> {(setup.confidence * 100).toFixed(0)}% Conviction <ArrowUpRight size={12} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button className="btn btn-ghost btn-xs" style={{ marginTop: '20px', width: '100%', fontSize: '10px' }}>
                            View Setup Guide &rarr;
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
