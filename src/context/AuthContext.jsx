import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);

    // Helper to set auth state from server response
    const setAuthFromResponse = (token, user) => {
        localStorage.setItem('access_token', token);
        localStorage.setItem('user_data', JSON.stringify(user));
        setCurrentUser({ token, ...user });
        setSubscriptionStatus({
            plan: user.plan,
            isTrialActive: user.isTrialActive,
            isSubscriptionActive: user.isSubscriptionActive,
            trialEndsAt: user.trialEndsAt,
            trialEndsAtMs: user.trialEndsAtMs,
            subscriptionExpiresAt: user.subscriptionExpiresAt,
            subscriptionExpiresAtMs: user.subscriptionExpiresAtMs
        });
    };

    // Register new user (starts 1-day trial automatically)
    const register = async (email, password, name) => {
        const response = await axios.post('/api/auth/register', { email, password, name });
        if (response.data.success) {
            setAuthFromResponse(response.data.token, response.data.user);
            return response.data;
        }
        throw new Error(response.data.error || 'Registration failed');
    };

    // Login with email + password
    const login = async (email, password) => {
        const response = await axios.post('/api/auth/login', { email, password });
        if (response.data.success) {
            setAuthFromResponse(response.data.token, response.data.user);
            return response.data;
        }
        throw new Error(response.data.error || 'Login failed');
    };

    // Legacy JWT token verify (kept for compatibility)
    const verifyToken = async (token) => {
        const response = await axios.post('/api/auth/verify', { token });
        if (response.data.valid) {
            const user = { token, ...response.data.payload };
            localStorage.setItem('access_token', token);
            setCurrentUser(user);
            return user;
        }
        throw new Error('Invalid Token');
    };

    // Logout
    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
        setCurrentUser(null);
        setSubscriptionStatus(null);
    };

    // Refresh subscription status from server
    const refreshSubscription = useCallback(async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        try {
            const response = await axios.get('/api/payment/status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const status = response.data;
            setSubscriptionStatus(status);
            // Update user data in state
            setCurrentUser(prev => prev ? { ...prev, plan: status.plan, ...status } : prev);
        } catch {
            // Silently fail — use cached status
        }
    }, []);

    // Computed helpers
    const isTrialActive = subscriptionStatus?.isTrialActive ?? false;
    const isSubscriptionActive = subscriptionStatus?.isSubscriptionActive ?? false;
    const hasAccess = isTrialActive || isSubscriptionActive;
    const trialTimeLeftMs = subscriptionStatus?.trialEndsAtMs
        ? Math.max(0, subscriptionStatus.trialEndsAtMs - Date.now())
        : 0;

    // On app load: restore session from localStorage
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const cachedUser = localStorage.getItem('user_data');

        if (token && cachedUser) {
            try {
                const user = JSON.parse(cachedUser);
                setCurrentUser({ token, ...user });

                // Determine subscription from cached data
                const now = Date.now();
                setSubscriptionStatus({
                    plan: user.plan,
                    isTrialActive: !!(user.trialEndsAtMs && now < user.trialEndsAtMs),
                    isSubscriptionActive: !!(user.subscriptionExpiresAtMs && now < user.subscriptionExpiresAtMs),
                    trialEndsAt: user.trialEndsAt,
                    trialEndsAtMs: user.trialEndsAtMs,
                    subscriptionExpiresAt: user.subscriptionExpiresAt,
                    subscriptionExpiresAtMs: user.subscriptionExpiresAtMs,
                    hasPendingPayment: user.hasPendingPayment
                });

                // Refresh from server in background
                refreshSubscription();
            } catch {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user_data');
            }
        }
        setLoading(false);
    }, [refreshSubscription]);

    // Poll subscription status every 5 minutes while app is open
    useEffect(() => {
        if (!currentUser) return;
        const interval = setInterval(refreshSubscription, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [currentUser, refreshSubscription]);

    const value = {
        currentUser,
        subscriptionStatus,
        isTrialActive,
        isSubscriptionActive,
        hasAccess,
        trialTimeLeftMs,
        register,
        login,
        logout,
        verifyToken,
        refreshSubscription
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
