// Main application initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('Crypto Trading Dashboard initialized');
    
    // Initialize dark mode based on user preference
    initializeDarkMode();
    
    // Add keyboard shortcuts
    initializeKeyboardShortcuts();
    
    // Add responsive behavior
    initializeResponsiveBehavior();
    
    // Performance monitoring
    monitorPerformance();
});

function initializeDarkMode() {
    const savedMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedMode === 'true' || (!savedMode && prefersDark)) {
        document.documentElement.classList.add('dark');
    }
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('darkMode')) {
            if (e.matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    });
}

function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + D for Dashboard
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            if (window.authManager && !document.getElementById('app-section').classList.contains('hidden')) {
                window.authManager.showDashboard();
            }
        }
        
        // Ctrl/Cmd + S for Settings
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (window.authManager && !document.getElementById('app-section').classList.contains('hidden')) {
                window.authManager.showSettings();
            }
        }
        
        // Ctrl/Cmd + L for Logout
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            if (window.authManager && !document.getElementById('app-section').classList.contains('hidden')) {
                window.authManager.handleLogout();
            }
        }
        
        // Escape to close modals or go back
        if (e.key === 'Escape') {
            const phoneVerification = document.getElementById('phone-verification');
            if (!phoneVerification.classList.contains('hidden')) {
                window.authManager.showEmailLogin();
            }
        }
    });
}

function initializeResponsiveBehavior() {
    // Handle responsive design adjustments
    const handleResize = () => {
        const isMobile = window.innerWidth < 768;
        
        // Adjust table responsiveness
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            if (isMobile) {
                table.classList.add('text-sm');
            } else {
                table.classList.remove('text-sm');
            }
        });
        
        // Adjust card layouts for mobile
        const cardGrids = document.querySelectorAll('.grid');
        cardGrids.forEach(grid => {
            if (isMobile && grid.classList.contains('lg:grid-cols-4')) {
                grid.classList.add('grid-cols-1', 'sm:grid-cols-2');
            }
        });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
}

function monitorPerformance() {
    if ('performance' in window) {
        window.addEventListener('load', () => {
            const loadTime = performance.now();
            console.log(`Dashboard loaded in ${loadTime.toFixed(2)}ms`);
            
            // Monitor Firebase connection time
            const startTime = performance.now();
            
            // Check if Firebase is connected
            const checkFirebaseConnection = () => {
                if (window.authManager && window.authManager.getCurrentUser() !== undefined) {
                    const connectionTime = performance.now() - startTime;
                    console.log(`Firebase connected in ${connectionTime.toFixed(2)}ms`);
                } else {
                    setTimeout(checkFirebaseConnection, 100);
                }
            };
            
            checkFirebaseConnection();
        });
    }
}

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    
    // Show user-friendly error message
    if (window.authManager) {
        window.authManager.showToast('An unexpected error occurred. Please refresh the page.', 'error');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    
    // Show user-friendly error message
    if (window.authManager) {
        window.authManager.showToast('A network error occurred. Please check your connection.', 'error');
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.dashboardManager) {
        window.dashboardManager.cleanup();
    }
});

// Service Worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Uncomment to enable service worker
        // navigator.serviceWorker.register('/sw.js')
        //     .then(registration => console.log('SW registered'))
        //     .catch(error => console.log('SW registration failed'));
    });
}

// Add smooth scrolling behavior
document.documentElement.style.scrollBehavior = 'smooth';

// Add focus management for accessibility
document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
    }
});

document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-navigation');
});

// Add CSS for keyboard navigation
const style = document.createElement('style');
style.textContent = `
    .keyboard-navigation *:focus {
        outline: 2px solid #3b82f6 !important;
        outline-offset: 2px !important;
    }
`;
document.head.appendChild(style);