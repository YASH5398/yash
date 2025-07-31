// Dashboard functionality
import { db } from './firebase-config.js';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class DashboardManager {
    constructor() {
        this.trades = [];
        this.weexData = null;
        this.userData = null;
        this.unsubscribeTrades = null;
        this.unsubscribeWeexData = null;
        this.initEventListeners();
    }

    initEventListeners() {
        // API configuration form
        document.getElementById('api-config-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveApiConfiguration();
        });
    }

    async loadDashboardData() {
        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser) return;

        // Load user data
        await this.loadUserData();
        
        // Load trades data
        this.loadTrades();
        
        // Load Weex data
        this.loadWeexData();
    }

    async loadUserData() {
        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser) return;

        try {
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                this.userData = userSnap.data();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    loadTrades() {
        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser) return;

        // Unsubscribe from previous listener
        if (this.unsubscribeTrades) {
            this.unsubscribeTrades();
        }

        const q = query(
            collection(db, 'trades'),
            where('uid', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );

        this.unsubscribeTrades = onSnapshot(q, (snapshot) => {
            this.trades = [];
            snapshot.forEach((doc) => {
                this.trades.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            this.renderTrades();
            this.updateTradeStats();
        }, (error) => {
            console.error('Error loading trades:', error);
            this.showNoDataMessage('trades-table', 'No trades found');
        });
    }

    loadWeexData() {
        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser) return;

        // Unsubscribe from previous listener
        if (this.unsubscribeWeexData) {
            this.unsubscribeWeexData();
        }

        const weexRef = doc(db, 'weexData', currentUser.uid);
        
        this.unsubscribeWeexData = onSnapshot(weexRef, (doc) => {
            if (doc.exists()) {
                this.weexData = doc.data();
                this.renderWeexData();
            } else {
                this.showNoWeexData();
            }
        }, (error) => {
            console.error('Error loading Weex data:', error);
            this.showNoWeexData();
        });
    }

    renderTrades() {
        const tradesTable = document.getElementById('trades-table');
        
        if (this.trades.length === 0) {
            this.showNoDataMessage('trades-table', 'No trades found. Data will appear here when trades are automatically imported.');
            return;
        }

        tradesTable.innerHTML = `
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Coin</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Profit</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Loss</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Profit (INR)</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Note</th>
                    </tr>
                </thead>
                <tbody class="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                    ${this.trades.map(trade => `
                        <tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                ${this.formatDate(trade.date)}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="text-sm font-medium text-gray-900 dark:text-white">${trade.coinName || 'N/A'}</span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    trade.tradeType === 'buy' || trade.tradeType === 'Buy' 
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }">
                                    ${trade.tradeType || 'N/A'}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-profit-green">
                                ${this.formatCurrency(trade.profit || 0)}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-loss-red">
                                ${this.formatCurrency(trade.loss || 0)}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-profit-green">
                                ₹${this.formatNumber(trade.profitInINR || 0)}
                            </td>
                            <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                ${trade.note || '-'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderWeexData() {
        if (!this.weexData) {
            this.showNoWeexData();
            return;
        }

        // Update USDT Balance
        document.getElementById('usdt-balance').textContent = 
            this.formatCurrency(this.weexData.balanceUSDT || 0);

        // Render Open Orders
        this.renderOpenOrders();
        
        // Render Positions
        this.renderPositions();
    }

    renderOpenOrders() {
        const openOrdersTable = document.getElementById('open-orders-table');
        const openOrders = this.weexData?.openOrders || [];

        if (openOrders.length === 0) {
            this.showNoDataMessage('open-orders-table', 'No open orders');
            return;
        }

        openOrdersTable.innerHTML = `
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Symbol</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Side</th>
                    </tr>
                </thead>
                <tbody class="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                    ${openOrders.map(order => `
                        <tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                ${order.symbol || 'N/A'}
                            </td>
                            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                ${this.formatNumber(order.amount || 0)}
                            </td>
                            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                ${this.formatCurrency(order.price || 0)}
                            </td>
                            <td class="px-4 py-3 whitespace-nowrap">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    order.side === 'buy' || order.side === 'Buy'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }">
                                    ${order.side || 'N/A'}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderPositions() {
        const positionsTable = document.getElementById('positions-table');
        const positions = this.weexData?.positions || [];

        if (positions.length === 0) {
            this.showNoDataMessage('positions-table', 'No open positions');
            return;
        }

        positionsTable.innerHTML = `
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Symbol</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Entry Price</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Unrealized PnL</th>
                    </tr>
                </thead>
                <tbody class="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                    ${positions.map(position => `
                        <tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                ${position.symbol || 'N/A'}
                            </td>
                            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                ${this.formatNumber(position.amount || 0)}
                            </td>
                            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                ${this.formatCurrency(position.entryPrice || 0)}
                            </td>
                            <td class="px-4 py-3 whitespace-nowrap text-sm ${
                                parseFloat(position.unrealizedPnL || 0) >= 0 ? 'text-profit-green' : 'text-loss-red'
                            }">
                                ${this.formatCurrency(position.unrealizedPnL || 0)}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    updateTradeStats() {
        const totalTrades = this.trades.length;
        const totalProfit = this.trades.reduce((sum, trade) => sum + (parseFloat(trade.profit) || 0), 0);
        const totalLoss = this.trades.reduce((sum, trade) => sum + (parseFloat(trade.loss) || 0), 0);
        const netProfit = totalProfit - totalLoss;

        document.getElementById('total-trades-count').textContent = totalTrades.toLocaleString();
        document.getElementById('total-profit-amount').textContent = `₹${this.formatNumber(totalProfit)}`;
        document.getElementById('total-loss-amount').textContent = `₹${this.formatNumber(totalLoss)}`;
        
        const netProfitElement = document.getElementById('net-profit-amount');
        netProfitElement.textContent = `₹${this.formatNumber(netProfit)}`;
        
        // Color coding for net profit
        if (netProfit > 0) {
            netProfitElement.className = 'text-2xl font-semibold text-profit-green';
        } else if (netProfit < 0) {
            netProfitElement.className = 'text-2xl font-semibold text-loss-red';
        } else {
            netProfitElement.className = 'text-2xl font-semibold text-gray-900 dark:text-white';
        }
    }

    showNoWeexData() {
        document.getElementById('usdt-balance').textContent = 'Not Connected';
        this.showNoDataMessage('open-orders-table', 'Connect your Weex API to view open orders');
        this.showNoDataMessage('positions-table', 'Connect your Weex API to view positions');
    }

    showNoDataMessage(containerId, message) {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                <svg class="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
                <p>${message}</p>
            </div>
        `;
    }

    async loadUserSettings() {
        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser) return;

        try {
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                
                // Update profile information
                document.getElementById('profile-email').textContent = userData.email || currentUser.email || 'N/A';
                document.getElementById('profile-created').textContent = 
                    userData.createdAt ? this.formatDate(userData.createdAt.toDate()) : 'N/A';
                
                // Update API key displays (masked)
                document.getElementById('api-key-display').textContent = 
                    userData.weexApiKey ? this.maskApiKey(userData.weexApiKey) : 'Not configured';
                document.getElementById('secret-key-display').textContent = 
                    userData.weexSecretKey ? this.maskApiKey(userData.weexSecretKey) : 'Not configured';
            }
        } catch (error) {
            console.error('Error loading user settings:', error);
        }
    }

    async saveApiConfiguration() {
        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser) return;

        const apiKey = document.getElementById('weex-api-key').value.trim();
        const secretKey = document.getElementById('weex-secret-key').value.trim();
        const saveBtn = document.getElementById('save-api-config-btn');

        if (!apiKey || !secretKey) {
            window.authManager.showToast('Please enter both API key and secret key', 'error');
            return;
        }

        this.setLoading(saveBtn, true, 'Saving...');

        try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
                weexApiKey: apiKey,
                weexSecretKey: secretKey, // In production, this should be encrypted
                updatedAt: serverTimestamp()
            });

            // Clear form
            document.getElementById('weex-api-key').value = '';
            document.getElementById('weex-secret-key').value = '';

            window.authManager.showToast('API configuration saved successfully!', 'success');
            
            // Reload settings to show updated masked keys
            setTimeout(() => {
                this.loadUserSettings();
            }, 1000);

        } catch (error) {
            console.error('Error saving API configuration:', error);
            window.authManager.showToast('Failed to save API configuration', 'error');
        } finally {
            this.setLoading(saveBtn, false, 'Save Configuration');
        }
    }

    setLoading(button, isLoading, text) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ${text}
            `;
        } else {
            button.disabled = false;
            button.textContent = text;
        }
    }

    formatDate(date) {
        if (!date) return 'N/A';
        
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatNumber(value) {
        if (!value || isNaN(value)) return '0';
        return parseFloat(value).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    formatCurrency(value) {
        if (!value || isNaN(value)) return '$0.00';
        return '$' + parseFloat(value).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    maskApiKey(key) {
        if (!key || key.length < 8) return '••••••••';
        return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
    }

    cleanup() {
        if (this.unsubscribeTrades) {
            this.unsubscribeTrades();
        }
        if (this.unsubscribeWeexData) {
            this.unsubscribeWeexData();
        }
    }
}

// Create global dashboard manager instance
window.dashboardManager = new DashboardManager();