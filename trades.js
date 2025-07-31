// Trades management functionality
import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    deleteDoc, 
    doc, 
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class TradesManager {
    constructor() {
        this.trades = [];
        this.unsubscribe = null;
        this.initEventListeners();
    }

    initEventListeners() {
        // Trade form submission
        document.getElementById('trade-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddTrade();
        });

        // Set today's date as default
        document.getElementById('trade-date').valueAsDate = new Date();
    }

    async handleAddTrade() {
        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser) return;

        const form = document.getElementById('trade-form');
        const formData = new FormData(form);
        const addTradeBtn = document.getElementById('add-trade-btn');

        // Get form values
        const tradeData = {
            uid: currentUser.uid,
            date: document.getElementById('trade-date').value,
            coinName: document.getElementById('coin-name').value.toUpperCase(),
            tradeType: document.getElementById('trade-type').value,
            totalTrade: parseFloat(document.getElementById('total-trade').value),
            profit: parseFloat(document.getElementById('profit').value) || 0,
            loss: parseFloat(document.getElementById('loss').value) || 0,
            profitInINR: parseFloat(document.getElementById('profit-inr').value) || 0,
            totalProfit: parseFloat(document.getElementById('total-profit-field').value) || 0,
            totalLoss: parseFloat(document.getElementById('total-loss-field').value) || 0,
            note: document.getElementById('note').value || '',
            createdAt: serverTimestamp()
        };

        this.setLoading(addTradeBtn, true, 'Adding Trade...');

        try {
            await addDoc(collection(db, 'trades'), tradeData);
            this.showSuccessMessage('Trade added successfully!');
            form.reset();
            document.getElementById('trade-date').valueAsDate = new Date();
        } catch (error) {
            console.error('Error adding trade:', error);
            this.showErrorMessage('Failed to add trade. Please try again.');
        } finally {
            this.setLoading(addTradeBtn, false, 'Add Trade');
        }
    }

    loadTrades() {
        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser) return;

        // Unsubscribe from previous listener
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        const q = query(
            collection(db, 'trades'),
            where('uid', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );

        this.unsubscribe = onSnapshot(q, (snapshot) => {
            this.trades = [];
            snapshot.forEach((doc) => {
                this.trades.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            this.renderTrades();
            this.updateDashboard();
        });
    }

    renderTrades() {
        const tradesList = document.getElementById('trades-list');
        const noTrades = document.getElementById('no-trades');

        if (this.trades.length === 0) {
            tradesList.classList.add('hidden');
            noTrades.classList.remove('hidden');
            return;
        }

        noTrades.classList.add('hidden');
        tradesList.classList.remove('hidden');

        tradesList.innerHTML = this.trades.map(trade => `
            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center space-x-3">
                        <span class="font-semibold text-lg text-gray-900">${trade.coinName}</span>
                        <span class="px-2 py-1 text-xs rounded-full ${
                            trade.tradeType === 'Buy' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                        }">
                            ${trade.tradeType}
                        </span>
                    </div>
                    <button onclick="window.tradesManager.deleteTrade('${trade.id}')" 
                            class="text-red-500 hover:text-red-700 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
                
                <div class="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
                    <div>
                        <span class="font-medium">Date:</span> ${new Date(trade.date).toLocaleDateString()}
                    </div>
                    <div>
                        <span class="font-medium">Total Trade:</span> ₹${trade.totalTrade.toLocaleString()}
                    </div>
                    <div>
                        <span class="font-medium">Profit:</span> 
                        <span class="text-profit-green">₹${trade.profit.toLocaleString()}</span>
                    </div>
                    <div>
                        <span class="font-medium">Loss:</span> 
                        <span class="text-loss-red">₹${trade.loss.toLocaleString()}</span>
                    </div>
                </div>
                
                ${trade.note ? `
                    <div class="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-2">
                        <span class="font-medium">Note:</span> ${trade.note}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    updateDashboard() {
        const totalTrades = this.trades.length;
        const totalProfit = this.trades.reduce((sum, trade) => sum + trade.profit, 0);
        const totalLoss = this.trades.reduce((sum, trade) => sum + trade.loss, 0);
        const netProfit = totalProfit - totalLoss;

        document.getElementById('total-trades').textContent = totalTrades.toLocaleString();
        document.getElementById('total-profit').textContent = `₹${totalProfit.toLocaleString()}`;
        document.getElementById('total-loss').textContent = `₹${totalLoss.toLocaleString()}`;
        
        const netProfitElement = document.getElementById('net-profit');
        netProfitElement.textContent = `₹${netProfit.toLocaleString()}`;
        
        // Color coding for net profit
        if (netProfit > 0) {
            netProfitElement.className = 'text-2xl font-semibold text-profit-green';
        } else if (netProfit < 0) {
            netProfitElement.className = 'text-2xl font-semibold text-loss-red';
        } else {
            netProfitElement.className = 'text-2xl font-semibold text-gray-900';
        }
    }

    async deleteTrade(tradeId) {
        if (!confirm('Are you sure you want to delete this trade?')) return;

        try {
            await deleteDoc(doc(db, 'trades', tradeId));
            this.showSuccessMessage('Trade deleted successfully!');
        } catch (error) {
            console.error('Error deleting trade:', error);
            this.showErrorMessage('Failed to delete trade. Please try again.');
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

    showSuccessMessage(message) {
        const successDiv = document.getElementById('success-message');
        successDiv.querySelector('p').textContent = message;
        successDiv.classList.remove('hidden');
        setTimeout(() => {
            successDiv.classList.add('hidden');
        }, 3000);
    }

    showErrorMessage(message) {
        const errorDiv = document.getElementById('error-message');
        errorDiv.querySelector('#error-text').textContent = message;
        errorDiv.classList.remove('hidden');
        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 3000);
    }
}

// Create global trades manager instance
window.tradesManager = new TradesManager();