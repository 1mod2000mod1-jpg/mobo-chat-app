// 🚀 نظام MOBO العالمي المتطور © 2025
let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// حالة التطبيق
let currentUser = null;
let currentRoom = null;
let usersList = [];
let roomsList = [];

// عناصر DOM
const elements = {
    loginScreen: document.getElementById('login-screen'),
    chatScreen: document.getElementById('chat-screen'),
    loginUsername: document.getElementById('login-username'),
    loginPassword: document.getElementById('login-password'),
    newUsername: document.getElementById('new-username'),
    newPassword: document.getElementById('new-password'),
    userGender: document.getElementById('user-gender'),
    currentUser: document.getElementById('current-user'),
    userBadges: document.getElementById('user-badges'),
    roomInfo: document.getElementById('room-info'),
    usersList: document.getElementById('users-list'),
    messagesContainer: document.getElementById('messages'),
    messageInput: document.getElementById('message-input'),
    messageForm: document.getElementById('message-form'),
    adminPanelBtn: document.getElementById('admin-panel-btn'),
    usersSidebar: document.getElementById('users-sidebar')
};

// 🔌 إنشاء الاتصال
function initializeSocket() {
    try {
        socket = io({
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
            timeout: 20000
        });

        setupSocketListeners();
    } catch (error) {
        console.error('خطأ في الاتصال:', error);
        showAlert('فشل الاتصال بالخادم', 'error');
    }
}

// 🎯 إعداد مستمعي الأحداث
function setupSocketListeners() {
    // الاتصال
    socket.on('connect', () => {
        console.log('✅ تم الاتصال بالخادم');
        reconnectAttempts = 0;
        hideLoading();
        
        // إعادة الانضمام إذا كان المستخدم مسجل دخول
        if (currentUser && currentRoom) {
            socket.emit('join-room', { roomId: currentRoom });
        }
    });

    // قطع الاتصال
    socket.on('disconnect', (reason) => {
        console.log('⚠️ انقطع الاتصال:', reason);
        showAlert('انقطع الاتصال بالخادم...', 'warning');
    });

    // إعادة الاتصال
    socket.on('reconnect_attempt', (attemptNumber) => {
        reconnectAttempts = attemptNumber;
        showLoading(`جاري إعادة الاتصال... (${attemptNumber}/${MAX_RECONNECT_ATTEMPTS})`);
    });

    socket.on('reconnect', () => {
        showAlert('تم إعادة الاتصال بنجاح', 'success');
        hideLoading();
    });

    socket.on('reconnect_failed', () => {
        hideLoading();
        showAlert('فشل إعادة الاتصال. الرجاء تحديث الصفحة', 'error');
    });

    // 🔐 تسجيل الدخول
    socket.on('login-success', handleLoginSuccess);
    socket.on('login-failed', (message) => {
        hideLoading();
        showAlert(message, 'error');
    });

    // 📝 إنشاء الحساب
    socket.on('account-created', (data) => {
        hideLoading();
        showAlert(data.message, 'success');
        
        // مسح الحقول والانتقال لتسجيل الدخول
        elements.newUsername.value = '';
        elements.newPassword.value = '';
        
        // ملء بيانات تسجيل الدخول
        if (elements.loginUsername) {
            elements.loginUsername.value = data.username;
            elements.loginUsername.focus();
        }
    });

    socket.on('account-error', (message) => {
        hideLoading();
        showAlert(message, 'error');
    });

    // 🌍 الانضمام للغرفة
    socket.on('room-joined', handleRoomJoined);

    // 💬 رسالة جديدة
    socket.on('new-message', (message) => {
        addMessage(message);
        playNotificationSound();
    });

    // 👥 قائمة المستخدمين
    socket.on('users-list', (users) => {
        usersList = users;
        updateUsersList(users);
    });

    // 📋 قائمة الغرف
    socket.on('rooms-list', (rooms) => {
        roomsList = rooms;
    });

    // 🗑️ حذف رسالة
    socket.on('message-deleted', (messageId) => {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.remove();
        }
    });

    // ⚠️ أحداث الإدارة
    socket.on('user-muted', (data) => {
        showAlert(`تم كتم ${data.username} لمدة ${data.duration} دقيقة`, 'warning');
    });

    socket.on('user-banned', (data) => {
        showAlert(`تم حظر ${data.username}`, 'error');
    });

    socket.on('banned', (reason) => {
        showAlert(`تم حظرك: ${reason}`, 'error');
        setTimeout(() => {
            logout();
        }, 3000);
    });

    socket.on('admin-action-success', (message) => {
        showAlert(message, 'success');
    });

    socket.on('message-error', (message) => {
        showAlert(message, 'error');
    });

    socket.on('error', (message) => {
        showAlert(message, 'error');
    });
}

// 🔐 معالج نجاح تسجيل الدخول
function handleLoginSuccess(userData) {
    currentUser = userData;
    
    elements.currentUser.textContent = userData.displayName;
    updateUserBadges(userData);
    
    // الانتقال للشات
    elements.loginScreen.classList.remove('active');
    elements.chatScreen.classList.add('active');
    
    hideLoading();
    showAlert(`🎉 مرحباً ${userData.displayName}!`, 'success');
    
    // طلب قوائم البيانات
    socket.emit('get-rooms');
    
    // بدء إرسال ping للحفاظ على الاتصال
    startHeartbeat();
}

// 🌍 معالج الانضمام للغرفة
function handleRoomJoined(data) {
    currentRoom = data.roomId;
    elements.roomInfo.textContent = data.roomName;
    
    // مسح الرسائل القديمة
    clearMessages();
    
    // إضافة الرسائل
    if (data.messages && data.messages.length > 0) {
        data.messages.forEach(message => addMessage(message));
    }
    
    // تفعيل حقل الإرسال
    elements.messageInput.disabled = false;
    elements.messageForm.querySelector('button').disabled = false;
    elements.messageInput.focus();
    
    // طلب قائمة المستخدمين
    socket.emit('get-users', { roomId: data.roomId });
}

// 🎯 تسجيل الدخول
window.loginWithCredentials = function() {
    const username = elements.loginUsername.value.trim();
    const password = elements.loginPassword.value.trim();
    
    if (!username || !password) {
        showAlert('الرجاء إدخال اسم المستخدم وكلمة المرور', 'error');
        return;
    }
    
    if (username.length < 3) {
        showAlert('اسم المستخدم قصير جداً', 'error');
        return;
    }
    
    if (password.length < 4) {
        showAlert('كلمة المرور قصيرة جداً', 'error');
        return;
    }
    
    showLoading('جاري تسجيل الدخول...');
    socket.emit('login-with-credentials', { 
        username: username, 
        password: password 
    });
};

// 🎯 إنشاء حساب
window.createAccount = function() {
    const username = elements.newUsername.value.trim();
    const password = elements.newPassword.value.trim();
    const gender = elements.userGender.value;
    
    if (!username || !password) {
        showAlert('الرجاء ملء جميع الحقول', 'error');
        return;
    }
    
    if (username.length < 3 || username.length > 20) {
        showAlert('اسم المستخدم يجب أن يكون بين 3 و 20 حرف', 'error');
        return;
    }
    
    if (password.length < 4) {
        showAlert('كلمة المرور يجب أن تكون 4 أحرف على الأقل', 'error');
        return;
    }
    
    showLoading('جاري إنشاء الحساب...');
    socket.emit('create-account', { 
        username: username, 
        password: password,
        gender: gender
    });
};

// 💬 إرسال رسالة
if (elements.messageForm) {
    elements.messageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const text = elements.messageInput.value.trim();
        
        if (!text) return;
        
        if (text.length > 500) {
            showAlert('الرسالة طويلة جداً (الحد الأقصى 500 حرف)', 'error');
            return;
        }
        
        socket.emit('send-message', {
            text: text,
            roomId: currentRoom
        });
        
        elements.messageInput.value = '';
        elements.messageInput.focus();
    });
}

// 🚪 تسجيل الخروج
window.logout = function() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        showLoading('جاري تسجيل الخروج...');
        
        if (socket) {
            socket.disconnect();
        }
        
        setTimeout(() => {
            currentUser = null;
            currentRoom = null;
            location.reload();
        }, 1000);
    }
};

// 👥 إظهار/إخفاء قائمة المستخدمين
window.toggleUsersList = function() {
    if (elements.usersSidebar) {
        elements.usersSidebar.classList.toggle('active');
    }
};

// 💬 إضافة رسالة
function addMessage(message) {
    if (!message || !elements.messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.isAdmin ? 'admin-message' : ''} ${message.isSuperAdmin ? 'super-admin-message' : ''}`;
    messageDiv.setAttribute('data-message-id', message.id);
    
    let badges = '';
    if (message.isSuperAdmin) {
        badges += '<span class="badge super-admin-badge">👑 MOBO</span>';
    } else if (message.isAdmin) {
        badges += '<span class="badge admin-badge">🔧 أدمن</span>';
    }
    if (message.isVerified) {
        badges += '<span class="badge verified-badge">✅ موثق</span>';
    }
    
    const avatar = message.userProfile?.avatar || '👤';
    const displayName = message.user || 'مستخدم';
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <div class="user-info">
                <span class="user-avatar">${escapeHtml(avatar)}</span>
                <span class="message-user">${escapeHtml(displayName)}</span>
            </div>
            <div class="message-badges">${badges}</div>
        </div>
        <div class="message-text">${escapeHtml(message.text)}</div>
        <div class="message-footer">
            <span class="message-time">${message.timestamp}</span>
            ${currentUser?.isAdmin ? `
                <button class="message-action-btn" onclick="deleteMessage('${message.id}')" title="حذف الرسالة">
                    🗑️
                </button>
            ` : ''}
        </div>
    `;
    
    elements.messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// 👥 تحديث قائمة المستخدمين
function updateUsersList(users) {
    if (!elements.usersList) return;
    
    elements.usersList.innerHTML = '';
    
    if (!users || users.length === 0) {
        elements.usersList.innerHTML = '<div class="no-users">لا يوجد مستخدمين حالياً</div>';
        return;
    }
    
    users.forEach(user => {
        if (user.id === currentUser?.id) return;
        
        const userDiv = document.createElement('div');
        userDiv.className = `user-item ${user.isOnline ? 'online-user' : ''}`;
        
        const avatar = user.profile?.avatar || '👤';
        const status = user.profile?.status || 'متصل';
        
        let badges = '';
        if (user.isSuperAdmin) {
            badges += '<span class="badge-small super-admin-badge">👑</span>';
        } else if (user.isAdmin) {
            badges += '<span class="badge-small admin-badge">🔧</span>';
        }
        if (user.isVerified) {
            badges += '<span class="badge-small verified-badge">✅</span>';
        }
        
        userDiv.innerHTML = `
            <div class="user-avatar-wrapper">
                <div class="user-avatar">${escapeHtml(avatar)}</div>
                ${user.isOnline ? '<span class="online-indicator"></span>' : ''}
            </div>
            <div class="user-info">
                <div class="user-name">
                    ${escapeHtml(user.displayName || user.username)}
                    ${badges}
                </div>
                <div class="user-status">${escapeHtml(status)}</div>
            </div>
            ${currentUser?.isAdmin ? `
                <div class="user-actions">
                    <button class="action-btn" onclick="muteUser('${user.id}', '${escapeHtml(user.username)}')" title="كتم">
                        🔇
                    </button>
                    <button class="action-btn ban-btn" onclick="banUser('${user.id}', '${escapeHtml(user.username)}')" title="حظر">
                        🚫
                    </button>
                </div>
            ` : ''}
        `;
        
        elements.usersList.appendChild(userDiv);
    });
}

// 👑 دوال الإدارة
window.muteUser = function(userId, username) {
    const duration = prompt(`مدة كتم ${username} (بالدقائق):`, '10');
    if (!duration) return;
    
    const reason = prompt(`سبب الكتم:`);
    if (!reason) return;
    
    socket.emit('admin-mute-user', {
        userId: userId,
        username: username,
        duration: parseInt(duration),
        reason: reason
    });
};

window.banUser = function(userId, username) {
    if (!confirm(`هل أنت متأكد من حظر ${username}؟`)) return;
    
    const reason = prompt(`سبب الحظر:`);
    if (!reason) return;
    
    socket.emit('admin-ban-user', {
        userId: userId,
        username: username,
        reason: reason
    });
};

window.deleteMessage = function(messageId) {
    if (!confirm('هل تريد حذف هذه الرسالة؟')) return;
    
    socket.emit('admin-delete-message', {
        messageId: messageId,
        roomId: currentRoom
    });
};

window.showAdminPanel = function() {
    showAlert('لوحة الإدارة قيد التطوير', 'info');
};

// 🛠️ دوال مساعدة
function updateUserBadges(userData) {
    if (!elements.userBadges) return;
    
    let badges = '';
    if (userData.isSuperAdmin) {
        badges += '<span class="badge super-admin-badge">👑 MOBO</span>';
        if (elements.adminPanelBtn) {
            elements.adminPanelBtn.style.display = 'inline-block';
        }
    } else if (userData.isAdmin) {
        badges += '<span class="badge admin-badge">🔧 أدمن</span>';
        if (elements.adminPanelBtn) {
            elements.adminPanelBtn.style.display = 'inline-block';
        }
    }
    if (userData.isVerified) {
        badges += '<span class="badge verified-badge">✅ موثق</span>';
    }
    elements.userBadges.innerHTML = badges;
}

function clearMessages() {
    if (elements.messagesContainer) {
        elements.messagesContainer.innerHTML = '';
    }
}

function scrollToBottom() {
    if (elements.messagesContainer) {
        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function playNotificationSound() {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYJG2S37OihUBAKSZ/h8rdnGwU7k9nyzXcsB');
        audio.volume = 0.3;
        audio.play().catch(() => {});
    } catch (e) {}
}

function startHeartbeat() {
    setInterval(() => {
        if (socket && socket.connected) {
            socket.emit('ping');
        }
    }, 30000); // كل 30 ثانية
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    const colors = {
        error: { bg: '#dc2626', border: '#b91c1c' },
        success: { bg: '#10b981', border: '#059669' },
        warning: { bg: '#f59e0b', border: '#d97706' },
        info: { bg: '#3b82f6', border: '#2563eb' }
    };
    
    const color = colors[type] || colors.info;
    
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color.bg};
        border: 2px solid ${color.border};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        z-index: 10000;
        font-weight: 600;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
        backdrop-filter: blur(10px);
    `;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (alertDiv.parentNode) {
                document.body.removeChild(alertDiv);
            }
        }, 300);
    }, 5000);
}

function showLoading(message = 'جاري التحميل...') {
    let loadingDiv = document.getElementById('loading-overlay');
    
    if (!loadingDiv) {
        loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-overlay';
        loadingDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(10px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            color: white;
            font-size: 1.2rem;
            font-weight: 600;
        `;
        document.body.appendChild(loadingDiv);
    }
    
    loadingDiv.innerHTML = `
        <div style="text-align: center;">
            <div class="loading-spinner" style="
                width: 60px;
                height: 60px;
                border: 5px solid rgba(255,255,255,0.3);
                border-top: 5px solid #dc2626;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 1.5rem;
            "></div>
            <div>${message}</div>
        </div>
    `;
}

function hideLoading() {
    const loadingDiv = document.getElementById('loading-overlay');
    if (loadingDiv && loadingDiv.parentNode) {
        loadingDiv.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            if (loadingDiv.parentNode) {
                document.body.removeChild(loadingDiv);
            }
        }, 300);
    }
}

// 🎨 إضافة أنيميشن CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// 🎯 التهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // إنشاء الاتصال
    initializeSocket();
    
    // إنشاء النجوم المتحركة
    createStars();
    
    // مستمعي أحداث لوحة المفاتيح
    if (elements.loginPassword) {
        elements.loginPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') loginWithCredentials();
        });
    }
    
    if (elements.newPassword) {
        elements.newPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') createAccount();
        });
    }
    
    if (elements.messageInput) {
        elements.messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                elements.messageForm.dispatchEvent(new Event('submit'));
            }
        });
    }
    
    // التحقق من الحقول أثناء الكتابة
    if (elements.newUsername) {
        elements.newUsername.addEventListener('input', validateUsername);
    }
    
    if (elements.newPassword) {
        elements.newPassword.addEventListener('input', validatePassword);
    }
});

// ⭐ إنشاء النجوم المتحركة
function createStars() {
    const starsContainer = document.getElementById('stars-bg');
    if (!starsContainer) return;
    
    for (let i = 0; i < 100; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.cssText = `
            width: ${Math.random() * 3 + 1}px;
            height: ${Math.random() * 3 + 1}px;
            top: ${Math.random() * 100}%;
            left: ${Math.random() * 100}%;
            animation-delay: ${Math.random() * 3}s;
            animation-duration: ${Math.random() * 2 + 2}s;
        `;
        starsContainer.appendChild(star);
    }
}

// ✅ التحقق من اسم المستخدم
function validateUsername() {
    const username = elements.newUsername.value.trim();
    const parent = elements.newUsername.parentElement;
    let feedback = parent.querySelector('.input-feedback');
    
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.className = 'input-feedback';
        parent.appendChild(feedback);
    }
    
    if (username.length === 0) {
        feedback.textContent = '';
        feedback.className = 'input-feedback';
    } else if (username.length < 3) {
        feedback.textContent = '❌ قصير جداً (3 أحرف على الأقل)';
        feedback.className = 'input-feedback error';
    } else if (username.length > 20) {
        feedback.textContent = '❌ طويل جداً (20 حرف كحد أقصى)';
        feedback.className = 'input-feedback error';
    } else {
        feedback.textContent = '✅ اسم مستخدم صالح';
        feedback.className = 'input-feedback success';
    }
}

// ✅ التحقق من كلمة المرور
function validatePassword() {
    const password = elements.newPassword.value;
    const parent = elements.newPassword.parentElement;
    let feedback = parent.querySelector('.input-feedback');
    
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.className = 'input-feedback';
        parent.appendChild(feedback);
    }
    
    if (password.length === 0) {
        feedback.textContent = '';
        feedback.className = 'input-feedback';
    } else if (password.length < 4) {
        feedback.textContent = '❌ قصيرة جداً (4 أحرف على الأقل)';
        feedback.className = 'input-feedback error';
    } else if (password.length < 8) {
        feedback.textContent = '⚠️ كلمة مرور ضعيفة';
        feedback.className = 'input-feedback warning';
    } else {
        feedback.textContent = '✅ كلمة مرور قوية';
        feedback.className = 'input-feedback success';
    }
}

// منع إعادة إرسال النماذج
window.addEventListener('beforeunload', function() {
    if (socket && socket.connected) {
        socket.disconnect();
    }
});

console.log('🚀 نظام MOBO العالمي جاهز © 2025');
