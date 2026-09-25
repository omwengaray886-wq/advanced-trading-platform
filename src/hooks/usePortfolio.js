import { useState, useEffect, useCallback } from 'react';
import { exchangeService } from '../services/exchangeService';
import { useToast } from '../context/ToastContext';

export function usePortfolio(symbol) {
    const [balances, setBalances] = useState([]);
    const [openOrders, setOpenOrders] = useState([]);
    const [equity, setEquity] = useState(0);
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    const fetchPortfolio = useCallback(async () => {
        setLoading(true);
        try {
            // Parallel Fetch
            const [balData, ordData] = await Promise.all([
                exchangeService.getBalances(),
                symbol ? exchangeService.getOpenOrders(symbol) : Promise.resolve([])
            ]);

            if (balData) {
                // Filter non-zero balances and calculate equity (rough est)
                const activeBalances = (balData.balances || []).filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
                setBalances(activeBalances);

                // Note: Real equity calc requires ticker prices for all assets. 
                // MVP: Just show raw balances or USDT total if available.
            }

            if (ordData) {
                setOpenOrders(ordData);
            }

        } catch (err) {
            console.error('Portfolio fetch failed:', err);
        } finally {
            setLoading(false);
        }
    }, [symbol]);

    useEffect(() => {
        fetchPortfolio();
        // Poll every 10 seconds for updates
        const interval = setInterval(fetchPortfolio, 10000);
        return () => clearInterval(interval);
    }, [fetchPortfolio]);

    const cancelOrder = async (orderId) => {
        try {
            await exchangeService.cancelOrder(symbol, orderId);
            addToast('Order Cancelled', 'success');
            fetchPortfolio(); // Refresh immediately
        } catch (err) {
            addToast('Failed to cancel order', 'error');
        }
    };

    return {
        balances,
        openOrders,
        equity,
        loading,
        refresh: fetchPortfolio,
        cancelOrder
    };
}
