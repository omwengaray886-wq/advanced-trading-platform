import axios from 'axios';

class ExchangeService {
    constructor() {
        this.apiBase = '/api/binance';
    }

    /**
     * Get stored credentials from the Vault
     */
    _getCredentials() {
        const encrypted = localStorage.getItem('tradealgo_vault');
        if (!encrypted) return null;

        // In a real app, we would decrypt here with a user-provided master password.
        // For this local terminal proof-of-concept, we'll use a simplified storage.
        try {
            return JSON.parse(encrypted);
        } catch (e) {
            return null;
        }
    }

    /**
     * Submit a New Order
     * @param {Object} order - { symbol, side, type, quantity, price, stopPrice }
     */
    async placeOrder(order) {
        const creds = this._getCredentials();
        if (!creds) throw new Error('API Keys not configured in Vault');

        // TRADE GUARD: Check Daily Loss Limit (Simulated Safety)
        const dailyLoss = localStorage.getItem('tradealgo_daily_loss') || 0;
        const maxLoss = 1000; // Hard limit for proof-of-concept
        if (parseFloat(dailyLoss) > maxLoss) {
            throw new Error(`TRADE GUARD: Daily Loss Limit ($${maxLoss}) reached. Execution halted.`);
        }

        try {
            // Simulated Latency for Institutional Execution
            await new Promise(r => setTimeout(r, 100));

            const response = await axios.post(`${this.apiBase}/order`, order, {
                headers: {
                    'X-API-KEY': creds.apiKey,
                    'X-API-SECRET': creds.apiSecret
                }
            });
            return response.data;
        } catch (error) {
            console.error('Order placement failed:', error.response?.data || error.message);
            throw error.response?.data || error;
        }
    }

    /**
     * Get Account Balances
     */
    async getBalances() {
        const creds = this._getCredentials();
        if (!creds) return null;

        try {
            const response = await axios.get(`${this.apiBase}/account`, {
                headers: {
                    'X-API-KEY': creds.apiKey,
                    'X-API-SECRET': creds.apiSecret
                }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch balance:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * Get Open Orders
     */
    async getOpenOrders(symbol) {
        const creds = this._getCredentials();
        if (!creds) return [];

        try {
            const response = await axios.get(`${this.apiBase}/open-orders`, {
                params: { symbol },
                headers: {
                    'X-API-KEY': creds.apiKey,
                    'X-API-SECRET': creds.apiSecret
                }
            });
            return response.data;
        } catch (error) {
            return [];
        }
    }
    /**
     * Cancel an Order
     */
    async cancelOrder(symbol, orderId) {
        const creds = this._getCredentials();
        if (!creds) throw new Error('API Keys not configured');

        try {
            const response = await axios.delete(`${this.apiBase}/order`, {
                params: { symbol, orderId },
                headers: {
                    'X-API-KEY': creds.apiKey,
                    'X-API-SECRET': creds.apiSecret
                }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to cancel order:', error);
            throw error;
        }
    }
    /**
     * Get Trade History (My Trades)
     */
    async getTradeHistory(symbol, limit = 50) {
        const creds = this._getCredentials();
        if (!creds) return [];

        try {
            const response = await axios.get(`${this.apiBase}/my-trades`, {
                params: { symbol, limit },
                headers: {
                    'X-API-KEY': creds.apiKey,
                    'X-API-SECRET': creds.apiSecret
                }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch trade history:', error);
            return [];
        }
    }
}

export const exchangeService = new ExchangeService();
