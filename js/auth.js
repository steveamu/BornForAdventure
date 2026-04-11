// auth.js - local auth flows (signup, login, password reset)

const AUTH_USERS_KEY = 'bfa_users';
const AUTH_SESSION_KEY = 'bfa_session';
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

function loadUsers() {
    try {
        const raw = localStorage.getItem(AUTH_USERS_KEY);
        const users = raw ? JSON.parse(raw) : [];
        return Array.isArray(users) ? users : [];
    } catch (e) {
        return [];
    }
}

function saveUsers(users) {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function normalizeEmail(email) {
    return (email || '').trim().toLowerCase();
}

function validatePassword(password) {
    const rules = [];
    if (password.length < 8) rules.push('at least 8 characters');
    if (!/[A-Za-z]/.test(password)) rules.push('a letter');
    if (!/[0-9]/.test(password)) rules.push('a number');
    return rules;
}

function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return bytesToHex(bytes);
}

async function hashPassword(password, salt) {
    const data = new TextEncoder().encode(`${salt}:${password}`);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return bytesToHex(new Uint8Array(digest));
}

function createSession(user, remember) {
    const now = Date.now();
    const days = remember ? 30 : 1;
    const expiresAt = now + days * 24 * 60 * 60 * 1000;
    const session = {
        email: user.email,
        token: (crypto.randomUUID ? crypto.randomUUID() : `${now}-${Math.random().toString(36).slice(2)}`),
        createdAt: now,
        expiresAt
    };
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    return session;
}

function getSession() {
    try {
        const raw = localStorage.getItem(AUTH_SESSION_KEY);
        if (!raw) return null;
        const session = JSON.parse(raw);
        if (!session.expiresAt || Date.now() > session.expiresAt) {
            localStorage.removeItem(AUTH_SESSION_KEY);
            return null;
        }
        return session;
    } catch (e) {
        return null;
    }
}

function getCurrentUser() {
    const session = getSession();
    if (!session) return null;
    const users = loadUsers();
    return users.find(u => u.email === session.email) || null;
}

function updateUser(updatedUser) {
    const users = loadUsers();
    const next = users.map(user => user.id === updatedUser.id ? updatedUser : user);
    saveUsers(next);
}

function showMessage(el, message, type) {
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    if (type === 'success') {
        el.style.backgroundColor = '#dcfce7';
        el.style.color = '#166534';
    } else {
        el.style.backgroundColor = '#fee2e2';
        el.style.color = '#991b1b';
    }
}

function clearMessage(el) {
    if (!el) return;
    el.textContent = '';
    el.classList.remove('show');
}

function redirectToReturnOrAccount() {
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get('returnTo');
    if (returnTo) {
        window.location.href = returnTo;
    } else {
        window.location.href = 'account.html';
    }
}

function decodeJwt(token) {
    try {
        const payload = token.split('.')[1];
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(atob(base64).split('').map(c =>
            '%' + c.charCodeAt(0).toString(16).padStart(2, '0')
        ).join(''));
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

async function handleGoogleCredential(credential) {
    const messageEl = document.getElementById('error-message') || document.getElementById('auth-message');
    clearMessage(messageEl);

    const payload = decodeJwt(credential);
    if (!payload || !payload.email) {
        showMessage(messageEl, 'Google sign-in failed. Please try again.', 'error');
        return;
    }

    const email = normalizeEmail(payload.email);
    const name = payload.name || payload.given_name || 'Google User';

    const users = loadUsers();
    let user = users.find(u => u.email === email);

    if (!user) {
        const salt = generateSalt();
        const passwordHash = await hashPassword(crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`, salt);
        user = {
            id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
            name,
            email,
            phone: '',
            passwordHash,
            salt,
            createdAt: new Date().toISOString(),
            orders: []
        };
        users.push(user);
        saveUsers(users);
    } else if (!user.name && name) {
        user.name = name;
        updateUser(user);
    }

    createSession(user, true);
    showToast('Signed in with Google.');
    redirectToReturnOrAccount();
}

function initGoogleAuth() {
    const googleWrap = document.getElementById('google-signin');
    if (!googleWrap) return;

    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
        showMessage(
            document.getElementById('error-message') || document.getElementById('auth-message'),
            'Google Sign-In is not available right now. Please try again later.',
            'error'
        );
        return;
    }

    window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => handleGoogleCredential(response.credential),
        ux_mode: 'popup',
        auto_select: false
    });

    window.google.accounts.id.renderButton(googleWrap, {
        theme: 'outline',
        size: 'large',
        shape: 'rect',
        width: 360,
        text: 'continue_with'
    });
}

async function handleRegister(form) {
    const messageEl = document.getElementById('auth-message');
    const submitBtn = document.getElementById('register-btn');
    clearMessage(messageEl);

    const name = (form.name?.value || '').trim();
    const email = normalizeEmail(form.email?.value);
    const password = form.password?.value || '';
    const confirm = form.confirm?.value || '';

    if (!name || !email || !password || !confirm) {
        showMessage(messageEl, 'Please fill out all required fields.', 'error');
        return;
    }

    const passwordRules = validatePassword(password);
    if (passwordRules.length) {
        showMessage(messageEl, `Password must contain ${passwordRules.join(', ')}.`, 'error');
        return;
    }

    if (password !== confirm) {
        showMessage(messageEl, 'Passwords do not match.', 'error');
        return;
    }

    const users = loadUsers();
    if (users.some(u => u.email === email)) {
        showMessage(messageEl, 'An account with this email already exists.', 'error');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    const user = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        name,
        email,
        phone: '',
        passwordHash,
        salt,
        createdAt: new Date().toISOString(),
        orders: []
    };

    users.push(user);
    saveUsers(users);
    createSession(user, true);
    showToast('Account created successfully.');
    redirectToReturnOrAccount();
}

async function handleLogin(form) {
    const messageEl = document.getElementById('error-message');
    const submitBtn = document.getElementById('login-btn');
    clearMessage(messageEl);

    const email = normalizeEmail(form.email?.value);
    const password = form.password?.value || '';
    const remember = form.remember?.checked || false;

    if (!email || !password) {
        showMessage(messageEl, 'Please enter your email and password.', 'error');
        return;
    }

    const users = loadUsers();
    const user = users.find(u => u.email === email);
    if (!user) {
        showMessage(messageEl, 'No account found with that email.', 'error');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing In...';
    }

    const passwordHash = await hashPassword(password, user.salt);
    if (passwordHash !== user.passwordHash) {
        showMessage(messageEl, 'Incorrect password. Please try again.', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'LOGIN';
        }
        return;
    }

    createSession(user, remember);
    showToast('Welcome back!');
    redirectToReturnOrAccount();
}

function requireAuth() {
    const session = getSession();
    if (!session) {
        const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `login.html?returnTo=${returnTo}&loginRequired=1`;
        return false;
    }
    return true;
}

async function handlePasswordReset(form) {
    const messageEl = document.getElementById('reset-message');
    clearMessage(messageEl);

    const email = normalizeEmail(form.resetEmail?.value);
    const newPassword = form.resetPassword?.value || '';
    const confirm = form.resetConfirm?.value || '';

    if (!email || !newPassword || !confirm) {
        showMessage(messageEl, 'Please fill out all fields to reset your password.', 'error');
        return;
    }

    const passwordRules = validatePassword(newPassword);
    if (passwordRules.length) {
        showMessage(messageEl, `Password must contain ${passwordRules.join(', ')}.`, 'error');
        return;
    }

    if (newPassword !== confirm) {
        showMessage(messageEl, 'Passwords do not match.', 'error');
        return;
    }

    const users = loadUsers();
    const user = users.find(u => u.email === email);
    if (!user) {
        showMessage(messageEl, 'No account found with that email.', 'error');
        return;
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(newPassword, salt);
    user.salt = salt;
    user.passwordHash = passwordHash;
    updateUser(user);
    showMessage(messageEl, 'Password reset successfully. You can now log in.', 'success');
}

function initForgotPassword() {
    const modal = document.getElementById('forgot-modal');
    const openBtn = document.querySelector('[data-forgot-password]');
    const closeBtn = document.getElementById('close-forgot');
    const overlay = document.getElementById('forgot-overlay');
    const form = document.getElementById('forgot-form');

    if (!modal || !openBtn || !form) return;

    const openModal = (e) => {
        if (e) e.preventDefault();
        modal.classList.add('open');
        if (overlay) overlay.classList.add('open');
    };

    const closeModal = () => {
        modal.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
    };

    openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', closeModal);

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        handlePasswordReset(form);
    });
}

function initAccountPage() {
    if (!requireAuth()) return;
    const user = getCurrentUser();
    if (!user) return;

    const nameEl = document.getElementById('overview-name');
    const emailEl = document.getElementById('overview-email');
    const memberEl = document.getElementById('overview-member-date');
    const ordersEl = document.getElementById('overview-total-orders');

    if (nameEl) nameEl.textContent = user.name || '-';
    if (emailEl) emailEl.textContent = user.email || '-';
    if (memberEl) memberEl.textContent = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-';
    if (ordersEl) ordersEl.textContent = Array.isArray(user.orders) ? user.orders.length : 0;

    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        const nameInput = document.getElementById('profile-name');
        const emailInput = document.getElementById('profile-email');
        const phoneInput = document.getElementById('profile-phone');
        if (nameInput) nameInput.value = user.name || '';
        if (emailInput) emailInput.value = user.email || '';
        if (phoneInput) phoneInput.value = user.phone || '';

        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageEl = document.getElementById('profile-message');
            clearMessage(messageEl);

            const nextName = (nameInput?.value || '').trim();
            const nextEmail = normalizeEmail(emailInput?.value);
            const nextPhone = (phoneInput?.value || '').trim();
            const currentPassword = document.getElementById('current-password')?.value || '';
            const newPassword = document.getElementById('new-password')?.value || '';
            const confirmPassword = document.getElementById('confirm-new-password')?.value || '';

            if (!nextName || !nextEmail) {
                showMessage(messageEl, 'Name and email are required.', 'error');
                return;
            }

            const users = loadUsers();
            if (users.some(u => u.email === nextEmail && u.id !== user.id)) {
                showMessage(messageEl, 'Another account already uses this email.', 'error');
                return;
            }

            user.name = nextName;
            user.email = nextEmail;
            user.phone = nextPhone;

            if (currentPassword || newPassword || confirmPassword) {
                if (!currentPassword || !newPassword || !confirmPassword) {
                    showMessage(messageEl, 'Please fill out all password fields to change your password.', 'error');
                    return;
                }
                const currentHash = await hashPassword(currentPassword, user.salt);
                if (currentHash !== user.passwordHash) {
                    showMessage(messageEl, 'Current password is incorrect.', 'error');
                    return;
                }
                const passwordRules = validatePassword(newPassword);
                if (passwordRules.length) {
                    showMessage(messageEl, `Password must contain ${passwordRules.join(', ')}.`, 'error');
                    return;
                }
                if (newPassword !== confirmPassword) {
                    showMessage(messageEl, 'New passwords do not match.', 'error');
                    return;
                }
                const newSalt = generateSalt();
                user.salt = newSalt;
                user.passwordHash = await hashPassword(newPassword, newSalt);
            }

            updateUser(user);
            createSession(user, true);
            showMessage(messageEl, 'Profile updated successfully.', 'success');
        });
    }

    const ordersContainer = document.getElementById('orders-container');
    if (ordersContainer && (!user.orders || user.orders.length === 0)) {
        ordersContainer.innerHTML = '<div class="empty-state"><p>You have no orders yet.</p><a href="shop.html" class="btn btn-outline" style="color:black; border-color:black;">Start Shopping</a></div>';
    }
}

function logoutUser() {
    localStorage.removeItem(AUTH_SESSION_KEY);
    showToast('You have been logged out.');
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleLogin(loginForm);
        });
        const params = new URLSearchParams(window.location.search);
        if (params.get('loginRequired') === '1') {
            showMessage(
                document.getElementById('error-message'),
                'Please log in or create an account to continue your purchase.',
                'error'
            );
        }
        initForgotPassword();
        initGoogleAuth();
        return;
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleRegister(registerForm);
        });
        initGoogleAuth();
        return;
    }

    if (document.getElementById('account-page')) {
        initAccountPage();
    }
});

window.bfaLogout = logoutUser;
window.bfaRequireAuth = requireAuth;
