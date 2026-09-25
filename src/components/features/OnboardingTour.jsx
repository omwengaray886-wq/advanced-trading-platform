import React, { useState, useEffect } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import { useTheme } from '../../context/ThemeContext';

export default function OnboardingTour() {
    const { theme } = useTheme();
    const [run, setRun] = useState(false);

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('tradealgo_tour_done');
        if (!hasSeenTour) {
            // Slight delay so the UI fully loads first
            setTimeout(() => {
                setRun(true);
            }, 1000);
        }
    }, []);

    const steps = [
        {
            target: 'body',
            placement: 'center',
            title: 'Welcome to TradeAlgo v5.2',
            content: 'This quick tour will show you how to navigate the institutional terminal. Click "Next" to begin.',
            disableBeacon: true,
        },
        {
            target: '.sidebar',
            placement: 'right',
            title: 'Command Navigation',
            content: 'Access all core modules here. To see the AI analysis in action, you will want to navigate to the Markets page from this menu.',
            disableBeacon: true,
        },
        {
            target: '.asset-sidebar',
            placement: 'right',
            title: 'Asset Navigator',
            content: 'Switch seamlessly between crypto, forex, and metals here. The AI will instantly analyze whatever currency pair you click on across the platform.',
            disableBeacon: true,
        },
        {
            target: '.topbar',
            placement: 'bottom',
            title: 'Global Status',
            content: 'View your real-time equity, active signals count, and access your profile and billing settings from the top bar.',
            disableBeacon: true,
        },
        {
            target: '.app-layout',
            placement: 'center',
            title: 'System Armed',
            content: 'The background AI Scanner is already tracking institutional order flows. You are ready to trade.',
            disableBeacon: true,
        }
    ];

    const handleJoyrideCallback = (data) => {
        const { status } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            setRun(false);
            localStorage.setItem('tradealgo_tour_done', 'true');
        }
    };

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous={true}
            scrollToFirstStep={true}
            showProgress={true}
            showSkipButton={true}
            callback={handleJoyrideCallback}
            floaterProps={{
                disableAnimation: true
            }}
            styles={{
                options: {
                    zIndex: 10000,
                    primaryColor: '#3b82f6',
                    backgroundColor: '#0f172a',
                    textColor: '#f8fafc',
                    arrowColor: '#0f172a',
                    overlayColor: 'rgba(0, 0, 0, 0.85)'
                },
                tooltipContainer: {
                    textAlign: 'left'
                },
                buttonNext: {
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    outline: 'none',
                    border: 'none'
                },
                buttonBack: {
                    color: '#94a3b8',
                    fontSize: '14px',
                    marginRight: '12px'
                },
                buttonSkip: {
                    color: '#94a3b8',
                    fontSize: '14px'
                }
            }}
        />
    );
}
