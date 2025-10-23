// نظام MOBO العالمي المتطور © 2025
const socket = io();

// حالة التطبيق
let currentUser = null;
let currentRoom = null;
let usersList = [];

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
    messageForm: document.getElementById('message-form')
};

// 🎯 تسجيل الدخول باسم المستخدم وكلمة المرور
window.loginWithCredentials = function() {
    const username = elements.loginUsername.value.trim();
    const password = elements.loginPassword.value.trim();
    
    if (username && password) {
        showLoading('جاري تسجيل الدخول...');
        socket.emit('login-with-credentials', { 
            username: username, 
            password: password 
        });
    } else {
        showAlert('الرجاء إدخال اسم المستخدم وكلمة المرور', 'error');
    }
};

// 🎯 إنشاء حساب
window.createAccount = function() {
    const username = elements.newUsername.value.trim();
    const password = elements.newPassword.value.trim();
    const gender = elements.userGender.value;
    
    if (username && password) {
        showLoading('جاري إنشاء الحساب...');
        socket.emit('create-account', { 
            username: username, 
            password: password,
            gender: gender
        });
    } else {
        showAlert('الرجاء ملء جميع الحقول', 'error');
    }
};

// 💬 إرسال رسالة
elements.messageForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const text = elements.messageInput.value.trim();
    
    if (text) {
        socket.emit('send-message', {
            text: text,
            roomId: currentRoom
        });
        elements.messageInput.value = '';
    }
});

// 🚪 تسجيل الخروج
window.logout = function() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        showLoading('جاري تسجيل الخروج...');
        setTimeout(() => {
            socket.disconnect();
            location.reload();
        }, 1000);
    }
};

// 🎯 استقبال الأحداث من السيرفر

// 🔐 تسجيل الدخول
socket.on('login-success', (userData) => {
    console.log('✅ تم استقبال بيانات الدخول الناجح');
    
    currentUser = userData;
    
    elements.currentUser.textContent = userData.displayName;
    updateUserBadges(userData);
    
    // الانتقال للشات الرئيسي
    elements.loginScreen.classList.remove('active');
    elements.chatScreen.classList.add('active');
    
    hideLoading();
    showAlert(`🎉 مرحباً ${userData.displayName}!`, 'success');
});

socket.on('login-failed', (message) => {
    hideLoading();
    showAlert(message, 'error');
});

// 📝 إنشاء الحساب
socket.on('account-created', (data) => {
    hideLoading();
    showAlert('🎉 تم إنشاء حسابك بنجاح! يمكنك الآن تسجيل الدخول', 'success');
    
    // مسح الحقول
    elements.newUsername.value = '';
    elements.newPassword.value = '';
});

socket.on('account-error', (message) => {
    hideLoading();
    showAlert(message, 'error');
});

// 🌍 عند الانضمام للغرفة
socket.on('room-joined', (data) => {
    currentRoom = data.roomId;
    elements.roomInfo.textContent = data.roomName;
    
    // مسح الرسائل القديمة
    clearMessages();
    
    // إضافة الرسائل الجديدة
    data.messages.forEach(message => addMessage(message));
    
    // تفعيل حقل الإرسال
    elements.messageInput.disabled = false;
    elements.messageForm.querySelector('button').disabled = false;
});

// 💬 رسائل جديدة
socket.on('new-message', (message) => {
    if (message.roomId === currentRoom) {
        addMessage(message);
    }
});

// 👥 تحديث قائمة المستخدمين
socket.on('users-list', (users) => {
    updateUsersList(users);
});

// 🛠️ دوال مساعدة
function addMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.isAdmin ? 'admin-message' : ''} ${message.isSuperAdmin ? 'super-admin-message' : ''}`;
    
    let badges = '';
    if (message.isSuperAdmin) {
        badges += '<span class="badge super-admin-badge">👑 MOBO</span>';
    } else if (message.isAdmin) {
        badges += '<span class="badge admin-badge">🔧 أدمن</span>';
    }
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <div class="user-info">
                <span class="user-avatar">${message.userProfile?.avatar || '👤'}</span>
                <span class="message-user">${escapeHtml(message.user)}</span>
            </div>
            <div class="message-badges">${badges}</div>
        </div>
        <div class="message-text">${escapeHtml(message.text)}</div>
        <div class="message-footer">
            <span class="message-time">${message.timestamp}</span>
        </div>
    `;
    
    elements.messagesContainer.appendChild(messageDiv);
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

function updateUsersList(users) {
    elements.usersList.innerHTML = '';
    
    users.forEach(user => {
        if (user.id !== currentUser?.id) {
            const userDiv = document.createElement('div');
            userDiv.className = 'user-item online-user';
            
            userDiv.innerHTML = `
                <div class="user-avatar">${user.profile?.avatar || '👤'}</div>
                <div class="user-info">
                    <div class="user-name">${escapeHtml(user.username)}</div>
                    <div class="user-status">${user.profile?.status || 'متصل'}</div>
                </div>
            `;
            
            elements.usersList.appendChild(userDiv);
        }
    });
}

function updateUserBadges(userData) {
    let badges = '';
    if (userData.isSuperAdmin) {
        badges += '<span class="badge super-admin-badge">👑 MOBO</span>';
        document.getElementById('admin-panel-btn').style.display = 'block';
    } else if (userData.isAdmin) {
        badges += '<span class="badge admin-badge">🔧 أدمن</span>';
        document.getElementById('admin-panel-btn').style.display = 'block';
    }
    elements.userBadges.innerHTML = badges;
}

function clearMessages() {
    elements.messagesContainer.innerHTML = '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    const bgColor = type === 'error' ? '#dc2626' : 
                   type === 'success' ? '#10b981' : 
                   type === 'warning' ? '#f59e0b' : '#3b82f6';
    
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, ${bgColor}, ${type === 'error' ? '#ef4444' : type === 'success' ? '#34d399' : '#fbbf24'});
        color: white;
        padding: 1.2rem 2.5rem;
        border-radius: 15px;
        z-index: 10000;
        font-weight: bold;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        max-width: 400px;
        word-break: break-word;
        white-space: pre-line;
        animation: fadeInUp 0.5s ease-out;
    `;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            document.body.removeChild(alertDiv);
        }
    }, 5000);
}

function showLoading(message) {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-overlay';
    loadingDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        color: white;
        font-size: 1.2rem;
        font-weight: bold;
    `;
    loadingDiv.innerHTML = `
        <div style="text-align: center;">
            <div class="loading-spinner" style="
                width: 50px;
                height: 50px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #dc2626;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 1rem;
            "></div>
            <div>${message}</div>
        </div>
    `;
    document.body.appendChild(loadingDiv);
}

function hideLoading() {
    const loadingDiv = document.getElementById('loading-overlay');
    if (loadingDiv) {
        document.body.removeChild(loadingDiv);
    }
}

// 🎯 التهيئة
document.addEventListener('DOMContentLoaded', function() {
    // إضافة مستمعي الأحداث للزر Enter
    document.getElementById('login-password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') loginWithCredentials();
    });
    
    document.getElementById('new-password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') createAccount();
    });
    
    document.getElementById('message-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            elements.messageForm.dispatchEvent(new Event('submit'));
        }
    });

    // إخفاء شاشة التحميل إذا كانت ظاهرة
    hideLoading();
});
