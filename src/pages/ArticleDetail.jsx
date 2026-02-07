import React from 'react';
import { ArrowLeft, Clock, Calendar, Share2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

export default function ArticleDetail() {
    const { id } = useParams();

    // Mock content fetching
    const article = {
        title: 'Understanding Order Blocks in Institutional Trading',
        subtitle: 'How to identify and trade probable reversal zones used by large banks.',
        author: 'Sarah Jenkins, Chief Analyst',
        date: 'Oct 14, 2025',
        readTime: '10 min read',
        content: `
      <p>Institutional trading is not about trend lines and retail patterns. It is about understanding where the liquidity resides. Order blocks represent specific price candles where institutions have placed large orders.</p>
      
      <h3>What is an Order Block?</h3>
      <p>An order block is the last candle before a strong move that breaks structure (BOS). If the market moves aggressively up, the last down candle is the bullish order block.</p>
      
      <h3>Why do they work?</h3>
      <p>Institutions cannot enter their full position size at once without slipping the market. They leave "footprints" in the form of these blocks, often returning to mitigate losses or fill remaining orders before the real move continues.</p>
    `
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Link to="/app/education" className="btn btn-ghost" style={{ paddingLeft: 0, marginBottom: '24px', opacity: 0.7 }}>
                <ArrowLeft size={16} /> Back to Library
            </Link>

            <article className="card" style={{ padding: '40px' }}>
                <div style={{ marginBottom: '32px', paddingBottom: '32px', borderBottom: '1px solid var(--border-color)' }}>
                    <div className="flex-row gap-sm" style={{ marginBottom: '16px' }}>
                        <span className="badge badge-neutral">Market Structure</span>
                        <span className="badge badge-success">Beginner Friendly</span>
                    </div>

                    <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px', lineHeight: '1.2' }}>{article.title}</h1>
                    <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>{article.subtitle}</p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '24px', height: '24px', background: '#3b82f6', borderRadius: '50%' }}></div>
                                <span style={{ color: 'var(--color-text-primary)' }}>{article.author}</span>
                            </div>
                            <span>•</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={14} /> {article.date}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Clock size={14} /> {article.readTime}
                            </div>
                        </div>
                        <button className="btn btn-ghost"><Share2 size={16} /></button>
                    </div>
                </div>

                <div style={{ lineHeight: '1.8', fontSize: '16px', color: 'var(--color-text-primary)' }}>
                    {/* Dangerous HTML just for mock demo */}
                    <div dangerouslySetInnerHTML={{ __html: article.content }} />
                </div>
            </article>
        </div>
    );
}
