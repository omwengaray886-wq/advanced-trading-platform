import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Footer from '../components/layout/Footer';

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="card" style={{ marginBottom: '16px', cursor: 'pointer' }} onClick={() => setIsOpen(!isOpen)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{question}</h3>
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
            {isOpen && (
                <p style={{ marginTop: '12px', lineHeight: '1.6', color: 'var(--color-text-secondary)' }}>
                    {answer}
                </p>
            )}
        </div>
    );
};

export default function FAQ() {
    const faqs = [
        {
            category: "Platform & AI",
            questions: [
                {
                    q: "What is TradeAlgo?",
                    a: "TradeAlgo is an AI-powered market analysis platform that identifies trading opportunities using institutional-grade techniques like Smart Money Concepts (SMC), market structure analysis, and liquidity zone detection. It's designed as an educational tool to help traders understand professional analysis methods."
                },
                {
                    q: "How accurate is the AI analysis?",
                    a: "We don't guarantee accuracy because markets are inherently unpredictable. Our AI provides confidence scores (0-100%) for each setup based on historical patterns, trend strength, and confluence factors. Higher confidence doesn't guarantee success—it represents stronger alignment with our criteria. Always conduct your own analysis."
                },
                {
                    q: "What markets does TradeAlgo support?",
                    a: "We currently support Forex (major and minor pairs), Cryptocurrencies (BTC, ETH, and other major coins), and major stock indices (S&P 500, NASDAQ, etc.). More markets are being added based on user demand."
                },
                {
                    q: "Can I use this for automated trading?",
                    a: "TradeAlgo is designed as an analysis and education tool, not an automated trading system. While you could use the analysis as input for your own trading decisions, we don't provide direct broker integration or auto-execution features."
                }
            ]
        },
        {
            category: "Subscription & Billing",
            questions: [
                {
                    q: "What's included in the Free tier?",
                    a: "The Free tier includes: limited daily AI analysis (3 requests/day), access to educational articles, basic market charts, and one saved setup. It's perfect for testing the platform before upgrading."
                },
                {
                    q: "Can I cancel anytime?",
                    a: "Yes! You can cancel your subscription anytime from your Account settings. You'll retain access until the end of your current billing period, then automatically revert to the Free tier."
                },
                {
                    q: "Do you offer refunds?",
                    a: "First-time subscribers get a 7-day money-back guarantee. If you're not satisfied within 7 days of your first subscription, contact support for a full refund. After 7 days or for renewals, cancellations stop future billing but don't refund the current period. See our Refund Policy for details."
                },
                {
                    q: "What payment methods do you accept?",
                    a: "We accept all major credit/debit cards (Visa, Mastercard, American Express) through our secure payment processor, Paystack. We do not store your card information."
                }
            ]
        },
        {
            category: "Risk & Trading",
            questions: [
                {
                    q: "Is this financial advice?",
                    a: "No. TradeAlgo is an educational and analytical tool. We are not licensed financial advisors. All analysis is for informational purposes only. You are solely responsible for your trading decisions. Never trade with money you can't afford to lose."
                },
                {
                    q: "Can I lose money using TradeAlgo?",
                    a: "Yes. Trading involves substantial risk of loss. TradeAlgo provides analysis, but it cannot predict market movements with certainty. Even high-confidence setups can fail. Always use proper risk management, stop losses, and never risk more than 1-2% of your capital per trade."
                },
                {
                    q: "What's the typical success rate?",
                    a: "We don't publish win rates because they vary widely based on: market conditions, your execution, risk management, and which setups you choose to trade. Historical performance does not guarantee future results. Focus on risk-to-reward ratio and consistency, not win rate alone."
                },
                {
                    q: "Do I need trading experience to use TradeAlgo?",
                    a: "Basic understanding of trading concepts (candlesticks, support/resistance, risk management) is recommended. TradeAlgo is designed to educate, so beginners can learn while using it. However, if you're completely new to trading, we suggest starting with our Education section and practicing on a demo account first."
                }
            ]
        },
        {
            category: "Technical",
            questions: [
                {
                    q: "How often is the analysis updated?",
                    a: "Market data is updated in real-time via WebSocket connections. You can request new AI analysis anytime (subject to your plan limits). Existing setups are re-evaluated periodically and marked as 'Invalidated' if market structure changes."
                },
                {
                    q: "Can I use TradeAlgo on mobile?",
                    a: "Yes! TradeAlgo is fully responsive and works on mobile browsers. We're also developing dedicated mobile apps for iOS and Android (coming soon)."
                },
                {
                    q: "Is my data secure?",
                    a: "Absolutely. We use industry-standard encryption (HTTPS, Firebase Authentication) and never store your payment details. Your trading analysis and personal information are stored securely and never shared with third parties (except anonymized data for AI training). See our Privacy Policy for details."
                },
                {
                    q: "Do you have an API?",
                    a: "Not currently, but an API for Pro and Elite users is on our roadmap. This would allow you to integrate TradeAlgo analysis into your own tools or trading bots."
                }
            ]
        }
    ];

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header style={{ padding: '16px 32px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>TradeAlgo</h1>
                <div className="flex-row gap-md">
                    <a href="/" className="btn btn-ghost">Home</a>
                    <a href="/pricing" className="btn btn-ghost">Pricing</a>
                    <a href="/login" className="btn btn-primary">Login</a>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '40px 20px' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <h1 style={{ fontSize: '40px', marginBottom: '16px', textAlign: 'center' }}>Frequently Asked Questions</h1>
                    <p style={{ fontSize: '16px', color: 'var(--color-text-secondary)', marginBottom: '48px', textAlign: 'center' }}>
                        Got questions? We've got answers.
                    </p>

                    {faqs.map((section, idx) => (
                        <div key={idx} style={{ marginBottom: '48px' }}>
                            <h2 style={{ fontSize: '24px', marginBottom: '20px', color: 'var(--color-accent-primary)' }}>
                                {section.category}
                            </h2>
                            {section.questions.map((item, qIdx) => (
                                <FAQItem key={qIdx} question={item.q} answer={item.a} />
                            ))}
                        </div>
                    ))}

                    <div style={{ marginTop: '64px', padding: '24px', background: 'var(--color-bg-tertiary)', borderRadius: '8px', textAlign: 'center' }}>
                        <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Still have questions?</h3>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                            Contact our support team and we'll get back to you within 24 hours.
                        </p>
                        <a href="mailto:support@tradealgo.com" className="btn btn-primary">
                            Contact Support
                        </a>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
