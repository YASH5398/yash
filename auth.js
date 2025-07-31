// Authentication functionality
import { auth } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    PhoneAuthProvider,
    signInWithCredential
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { doc, setDoc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { db } from './firebase-config.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.confirmationResult = null;
        this.initEventListeners();
        this.initAuthStateListener();
        this.initRecaptcha();
    }

    initEventListeners() {
        // Form toggle buttons
        document.getElementById('show-signup').addEventListener('click', () => {
            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('signup-form').classList.remove('hidden');
        });

        document.getElementById('show-login').addEventListener('click', () => {
            document.getElementById('signup-form').classList.add('hidden');
            document.getElementById('login-form').classList.remove('hidden');
        });

        // Email login/signup
        document.getElementById('email-login').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEmailLogin();
        });

        document.getElementById('email-signup').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEmailSignup();
        });

        // Social login buttons
        document.getElementById('google-login-btn').addEventListener('click', () => {
            this.handleGoogleLogin();
        });

        document.getElementById('phone-login-btn').addEventListener('click', () => {
            this.showPhoneLogin();
        });

        // Phone authentication
        document.getElementById('send-code-btn').addEventListener('click', () => {
            this.sendVerificationCode();
        });

        document.getElementById('verify-code-btn').addEventListener('click', () => {
            this.verifyCode();
        });

        document.getElementById('back-to-login').addEventListener('click', () => {
            this.showEmailLogin();
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Tab navigation
        document.getElementById('dashboard-tab').addEventListener('click', () => {
            this.showDashboard();
        });

        document.getElementById('settings-tab').addEventListener('click', () => {
            this.showSettings();
        });

        // Dark mode toggle
        document.getElementById('dark-mode-toggle').addEventListener('click', () => {
            this.toggleDarkMode();
        });
    }

    initRecaptcha() {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'normal',
                'callback': (response) => {
                    console.log('reCAPTCHA solved');
                },
                'expired-callback': () => {
                    console.log('reCAPTCHA expired');
                }
            });
        }
    }

    initAuthStateListener() {
        onAuthStateChanged(auth, async (user) => {
            this.currentUser = user;
            
            if (user) {
                // User is signed in
                await this.createUserDocument(user);
                this.showApp();
                document.getElementById('user-email').textContent = user.email || user.phoneNumber;
                
                // Load dashboard data
                if (window.dashboardManager) {
                    window.dashboardManager.loadDashboardData();
                }
            } else {
                // User is signed out
                this.showAuth();
            }
            
            // Hide loading spinner
            document.getElementById('loading').classList.add('hidden');
        });
    }

    async createUserDocument(user) {
        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email || '',
                    phoneNumber: user.phoneNumber || '',
                    createdAt: serverTimestamp(),
                    weexApiKey: '',
                    weexSecretKey: ''
                });
            }
        } catch (error) {
            console.error('Error creating user document:', error);
        }
    }

    async handleEmailLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const loginBtn = document.getElementById('email-login-btn');

        this.setLoading(loginBtn, true, 'Signing In...');
        this.hideError();

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            this.showError(this.getErrorMessage(error.code));
        } finally {
            this.setLoading(loginBtn, false, 'Sign In with Email');
        }
    }

    async handleEmailSignup() {
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const signupBtn = document.getElementById('email-signup-btn');

        this.setLoading(signupBtn, true, 'Creating Account...');
        this.hideError();

        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
            this.showError(this.getErrorMessage(error.code));
        } finally {
            this.setLoading(signupBtn, false, 'Create Account');
        }
    }

    async handleGoogleLogin() {
        const googleBtn = document.getElementById('google-login-btn');
        this.setLoading(googleBtn, true, 'Signing In...');
        this.hideError();

        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            this.showError(this.getErrorMessage(error.code));
        } finally {
            this.setLoading(googleBtn, false, 'Sign In with Google');
        }
    }

    showPhoneLogin() {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('signup-form').classList.add('hidden');
        document.getElementById('phone-verification').classList.remove('hidden');
    }

    showEmailLogin() {
        document.getElementById('phone-verification').classList.add('hidden');
        document.getElementById('verification-code-section').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
    }

    async sendVerificationCode() {
        const phoneNumber = document.getElementById('phone-number').value;
        const sendBtn = document.getElementById('send-code-btn');

        if (!phoneNumber) {
            this.showError('Please enter a phone number');
            return;
        }

        this.setLoading(sendBtn, true, 'Sending Code...');
        this.hideError();

        try {
            this.confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
            document.getElementById('verification-code-section').classList.remove('hidden');
            this.showToast('Verification code sent!', 'success');
        } catch (error) {
            this.showError(this.getErrorMessage(error.code));
        } finally {
            this.setLoading(sendBtn, false, 'Send Verification Code');
        }
    }

    async verifyCode() {
        const code = document.getElementById('verification-code').value;
        const verifyBtn = document.getElementById('verify-code-btn');

        if (!code) {
            this.showError('Please enter the verification code');
            return;
        }

        this.setLoading(verifyBtn, true, 'Verifying...');
        this.hideError();

        try {
            await this.confirmationResult.confirm(code);
        } catch (error) {
            this.showError('Invalid verification code');
        } finally {
            this.setLoading(verifyBtn, false, 'Verify Code');
        }
    }

    async handleLogout() {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    showApp() {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('app-section').classList.remove('hidden');
        this.showDashboard();
    }

    showAuth() {
        document.getElementById('app-section').classList.add('hidden');
        document.getElementById('auth-section').classList.remove('hidden');
    }

    showDashboard() {
        document.getElementById('dashboard-content').classList.remove('hidden');
        document.getElementById('settings-content').classList.add('hidden');
        
        // Update tab styles
        document.getElementById('dashboard-tab').className = 'px-3 py-2 rounded-lg bg-crypto-blue text-white font-medium';
        document.getElementById('settings-tab').className = 'px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg font-medium';
    }

    showSettings() {
        document.getElementById('dashboard-content').classList.add('hidden');
        document.getElementById('settings-content').classList.remove('hidden');
        
        // Update tab styles
        document.getElementById('settings-tab').className = 'px-3 py-2 rounded-lg bg-crypto-blue text-white font-medium';
        document.getElementById('dashboard-tab').className = 'px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg font-medium';
        
        // Load settings data
        if (window.dashboardManager) {
            window.dashboardManager.loadUserSettings();
        }
    }

    toggleDarkMode() {
        const html = document.documentElement;
        const isDark = html.classList.contains('dark');
        
        if (isDark) {
            html.classList.remove('dark');
            localStorage.setItem('darkMode', 'false');
        } else {
            html.classList.add('dark');
            localStorage.setItem('darkMode', 'true');
        }
    }

    initDarkMode() {
        const savedMode = localStorage.getItem('darkMode');
        if (savedMode === 'true' || (!savedMode && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
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

    showError(message) {
        const errorDiv = document.getElementById('auth-error');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    hideError() {
        document.getElementById('auth-error').classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
        
        toast.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full`;
        toast.textContent = message;
        
        document.getElementById('toast-container').appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    getErrorMessage(errorCode) {
        switch (errorCode) {
            case 'auth/user-not-found':
                return 'No account found with this email address.';
            case 'auth/wrong-password':
                return 'Incorrect password.';
            case 'auth/email-already-in-use':
                return 'An account with this email already exists.';
            case 'auth/weak-password':
                return 'Password should be at least 6 characters.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/too-many-requests':
                return 'Too many failed attempts. Please try again later.';
            case 'auth/popup-closed-by-user':
                return 'Sign-in popup was closed before completion.';
            case 'auth/invalid-phone-number':
                return 'Please enter a valid phone number.';
            default:
                return 'An error occurred. Please try again.';
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// Create global auth manager instance
window.authManager = new AuthManager();

// Initialize dark mode
window.authManager.initDarkMode();