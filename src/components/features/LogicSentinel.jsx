import React, { useEffect } from 'react';
import { alertService } from '../../services/alertService';

export default function LogicSentinel() {
    useEffect(() => {
        // Request permissions on mount if not already granted
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        // Start scanning in the background
        alertService.startScanning();

        return () => {
            alertService.stopScanning();
        };
    }, []);

    // This component renders nothing, it just manages the background service
    return null;
}
