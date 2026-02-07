import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useToast } from '../context/ToastContext';


export default function Pricing() {
    const [billingCycle, setBillingCycle] = useState('monthly');
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Use environment variable for Paystack Public Key
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

    const plans = [
        {
            name: 'Free',
            price: 0,
            description: 'Essential tools for beginner traders',
            features: ['Daily Market Bias', 'Basic Charting', 'Limited Trade Setups', 'Community Access'],
            notIncluded: ['AI-Powered Signals', 'Institutional Order Flow', 'Private Mentorship'],
            buttonText: 'Get Started',
            popular: false,
            amount: 0 // In Kobo/Cents
        },
        {
            name: 'Pro',
            price: billingCycle === 'monthly' ? 29 : 24,
            description: 'Advanced analytics for serious traders',
            features: ['Everything in Free', 'Real-time Trade Setups', 'Institutional Order Flow', 'Position Size Calculator', 'Priority Support'],
            notIncluded: ['Private Mentorship'],
            buttonText: 'Upgrade to Pro',
            popular: true,
            amount: (billingCycle === 'monthly' ? 29 : 24) * 100 * 1500 // Approx conversion to NGN kobo logic for demo
        },
        {
            name: 'Elite',
            price: billingCycle === 'monthly' ? 99 : 79,
            description: 'Complete institutional access',
            features: ['Everything in Pro', '1-on-1 Mentorship', 'Direct Analyst Access', 'Custom Strategy Builder', 'VIP Signals'],
            notIncluded: [],
            buttonText: 'Go Elite',
            popular: false,
            amount: (billingCycle === 'monthly' ? 99 : 79) * 100 * 1500
        }
    ];

    const { addToast } = useToast();

    // ...

    const handleSuccess = async (reference, planName) => {
        console.log(reference);
        addToast(`Payment Successful! Reference: ${reference.reference}`, 'success');

        if (currentUser) {
            // Update user plan in Firestore
            try {
                const userRef = doc(db, "users", currentUser.uid);
                await updateDoc(userRef, {
                    plan: planName.toLowerCase(),
                    subscriptionStatus: 'active',
                    lastPaymentDate: new Date().toISOString()
                });
                navigate('/app/account');
                addToast(`Plan updated to ${planName}`, 'success');
            } catch (error) {
                console.error("Error updating profile", error);
                addToast("Payment successful but profile update failed. Contact support.", 'warning');
            }
        }
    };

    const handleClose = () => {
        console.log('Payment closed');
    };

    const PayButton = ({ plan, amount }) => {
        const config = {
            reference: (new Date()).getTime().toString(),
            email: currentUser?.email || "user@example.com",
            amount: amount, // Amount in kobo
            publicKey: publicKey,
            currency: 'NGN',
        };

        const initializePayment = usePaystackPayment(config);

        const handleClick = () => {
            if (!currentUser) {
                navigate('/login');
                return;
            }
            if (plan.price === 0) {
                navigate('/app');
                return;
            }
            initializePayment({
                onSuccess: (ref) => handleSuccess(ref, plan.name),
                onClose: handleClose
            });
        };

        return (
            <button
                className={`btn ${plan.popular ? 'btn-primary' : 'btn-outline'}`}
                style={{ width: '100%' }}
                onClick={handleClick}
            >
                {plan.buttonText}
            </button>
        );
    };

    return (
        <div style={{ padding: '80px 24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '64px' }}>
                <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '16px' }}>Simple, Transparent Pricing</h1>
                <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
                    Choose the plan that fits your trading style. No hidden fees. Cancel anytime.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '32px' }}>
                    <span style={{ color: billingCycle === 'monthly' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>Monthly</span>
                    <div
                        onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                        style={{ width: '56px', height: '28px', background: 'var(--color-bg-tertiary)', borderRadius: '14px', position: 'relative', cursor: 'pointer', border: '1px solid var(--border-color)' }}
                    >
                        <div style={{
                            width: '24px',
                            height: '24px',
                            background: 'var(--color-accent-primary)',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '1px',
                            left: billingCycle === 'monthly' ? '1px' : '29px',
                            transition: 'all 0.3s ease'
                        }}></div>
                    </div>
                    <span style={{ color: billingCycle === 'annual' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>Annual <span style={{ color: 'var(--color-success)', fontSize: '12px' }}>Save 20%</span></span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
                {plans.map(plan => (
                    <div key={plan.name} className="card" style={{
                        border: plan.popular ? '2px solid var(--color-accent-primary)' : '1px solid var(--border-color)',
                        position: 'relative'
                    }}>
                        {plan.popular && (
                            <div style={{
                                position: 'absolute',
                                top: '-12px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'var(--color-accent-primary)',
                                color: 'white',
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 'bold'
                            }}>
                                MOST POPULAR
                            </div>
                        )}

                        <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>{plan.name}</h3>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
                            <span style={{ fontSize: '48px', fontWeight: 'bold' }}>${plan.price}</span>
                            <span style={{ color: 'var(--color-text-secondary)' }}>/mo</span>
                        </div>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px' }}>{plan.description}</p>

                        <PayButton plan={plan} amount={plan.amount} />

                        <div style={{ height: '1px', background: 'var(--border-color)', margin: '32px 0' }}></div>

                        <div className="flex-col gap-sm">
                            {plan.features.map(feature => (
                                <div key={feature} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <Check size={20} color="var(--color-success)" />
                                    <span>{feature}</span>
                                </div>
                            ))}
                            {plan.notIncluded.map(feature => (
                                <div key={feature} style={{ display: 'flex', gap: '12px', alignItems: 'center', opacity: 0.5 }}>
                                    <X size={20} color="var(--color-text-secondary)" />
                                    <span>{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
