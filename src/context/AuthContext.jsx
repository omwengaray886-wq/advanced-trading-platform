import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Verify Token (Login)
    async function verifyToken(token) {
        try {
            // Verify with backend
            const response = await axios.post('http://localhost:3001/api/auth/verify', { token });

            if (response.data.valid) {
                const user = {
                    token,
                    ...response.data.payload
                };

                // Persist session
                localStorage.setItem('access_token', token);
                setCurrentUser(user);
                return user;
            } else {
                throw new Error('Invalid Token');
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            throw error;
        }
    }

    // Logout
    function logout() {
        localStorage.removeItem('access_token');
        setCurrentUser(null);
    }

    useEffect(() => {
        // Check for existing token on load
        const storedToken = localStorage.getItem('access_token');

        if (storedToken) {
            verifyToken(storedToken)
                .catch(() => {
                    // If verification fails, clear storage
                    localStorage.removeItem('access_token');
                    setCurrentUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const value = {
        currentUser,
        verifyToken,
        logout
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


