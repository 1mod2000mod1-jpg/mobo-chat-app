// نظام MOBO العالمي المتطور © 2025
const socket = io();

// حالة التطبيق المحسنة
let currentUser = null;
let currentRoom = null;
let isPrivateMode = false;
let selectedUserId = null;
let usersList = [];
let roomsList = [];
let adminMessages = [];
let privateChats = new Map();
let userProfile = null;

// عناصر DOM المحسنة
const elements = {
    // الشاشات
    loginScreen: document.getElementById('login-screen'),
    chatScreen: document.getElementById('chat-screen'),
    profileScreen: document.getElementById('profile-screen'),
    adminScreen: document.getElementById('admin-screen'),
    privateChatScreen: document.getElementById('private-chat-screen'),
    
    // تسجيل الدخول
    loginUsername: document.getElementById('login-username'),
    loginCode: document.getElementById('login-code'),
    newUsername: document.getElementById('new-username'),
    newPassword: document.getElementById('new-password'),
    userGender: document.getElementById('user-gender'),
    
    // الشات الرئيسي
    currentUser: document.getElementById('current-user'),
    userBadges: document.getElementById('user-badges'),
    roomInfo: document.getElementById('room-info'),
    usersList: document.getElementById('users-list'),
    roomsList: document.getElementById('rooms-list'),
    messagesContainer: document.getElementById('messages'),
    messageInput: document.getElementById('message-input'),
    messageForm: document.getElementById('message-form'),
    
    // الإدارة
    adminUsersList: document.getElementById('admin-users-list'),
    adminMessagesList: document.getElementById('admin-messages-list'),
    adminStats: document.getElementById('admin-stats'),
    
    // الملف الشخصي
    profileUsername: document.getElementById('profile-username'),
    profileGender: document.getElementById('profile-gender'),
    profileStatus: document.getElementById('profile-status'),
    profileAvatar: document.getElementById('profile-avatar'),
    
    // البحث
    searchUsersInput: document.getElementById('search-users-input'),
    searchResults: document.getElementById('search-results')
};

// 🎯 نظام تسجيل الدخول المحسن
window.loginWithCredentials = function() {
    const username = elements.loginUsername.value.trim();
    const code = elements.loginCode.value.trim();
    
    if (username && code) {
        showLoading('جاري تسجيل الدخول...');
        socket.emit('login-with-credentials', { 
            username: username, 
            code: code 
        });
    } else {
        showAlert('الرجاء إدخال اسم المستخدم وكود الدخول', 'error');
    }
};

// 🎯 إنشاء حساب مع الجنس
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

// 🌍 الانضمام للغرفة العالمية تلقائياً
function joinGlobalRoom() {
    socket.emit('join-room', { roomId: 'global_main' });
}

// 💬 إرسال رسالة محسنة
elements.messageForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const text = elements.messageInput.value.trim();
    
    if (text) {
        if (isPrivateMode && selectedUserId) {
            // إرسال رسالة خاصة
            socket.emit('send-private-message', {
                toUserId: selectedUserId,
                text: text
            });
        } else {
            // إرسال رسالة عامة
            socket.emit('send-message', {
                text: text,
                roomId: currentRoom
            });
        }
        elements.messageInput.value = '';
    }
});

// 👑 نظام الإدارة المتقدم
window.showAdminPanel = function() {
    if (currentUser?.isAdmin) {
        elements.chatScreen.classList.remove('active');
        elements.adminScreen.classList.add('active');
        loadAdminData();
    }
};

window.muteUser = function(userId, username) {
    const duration = prompt(`مدة كتم ${username} (بالدقائق):`, '10');
    const reason = prompt(`سبب الكتم:`);
    
    if (duration && reason) {
        socket.emit('admin-mute-user', {
            userId: userId,
            username: username,
            duration: parseInt(duration),
            reason: reason
        });
    }
};

window.banUser = function(userId, username) {
    const reason = prompt(`سبب حظر ${username}:`);
    
    if (reason) {
        socket.emit('admin-ban-user', {
            userId: userId,
            username: username,
            reason: reason
        });
    }
};

window.deleteMessage = function(messageId) {
    if (confirm('هل تريد حذف هذه الرسالة؟')) {
        socket.emit('admin-delete-message', {
            messageId: messageId,
            roomId: currentRoom
        });
    }
};

// 🔍 نظام البحث عن المستخدمين
elements.searchUsersInput.addEventListener('input', function(e) {
    const term = e.target.value.trim();
    
    if (term.length > 2) {
        socket.emit('search-users', { term: term });
    } else {
        elements.searchResults.innerHTML = '';
    }
});

// 💌 نظام الرسائل الخاصة
window.openPrivateChat = function(userId, username) {
    isPrivateMode = true;
    selectedUserId = userId;
    
    elements.chatScreen.classList.remove('active');
    elements.privateChatScreen.classList.add('active');
    
    document.getElementById('private-chat-with').textContent = username;
    document.getElementById('private-messages').innerHTML = '';
    
    // تحميل الرسائل الخاصة السابقة
    loadPrivateMessages(userId);
};

window.closePrivateChat = function() {
    isPrivateMode = false;
    selectedUserId = null;
    
    elements.privateChatScreen.classList.remove('active');
    elements.chatScreen.classList.add('active');
};

// 📱 تحديث الملف الشخصي
window.showProfile = function() {
    elements.chatScreen.classList.remove('active');
    elements.profileScreen.classList.add('active');
    
    if (userProfile) {
        elements.profileUsername.value = currentUser.username;
        elements.profileGender.value = userProfile.gender;
        elements.profileStatus.value = userProfile.status || '';
        elements.profileAvatar.textContent = userProfile.avatar;
    }
};

window.updateProfile = function() {
    const updates = {
        status: elements.profileStatus.value,
        gender: elements.profileGender.value
    };
    
    socket.emit('update-profile', updates);
};

// 🎯 استقبال الأحداث من السيرفر

// 🔐 تسجيل الدخول
socket.on('login-success', (userData) => {
    currentUser = userData;
    userProfile = userData.profile;
    
    elements.currentUser.textContent = userData.displayName;
    updateUserBadges(userData);
    
    // الانتقال للشات الرئيسي
    elements.loginScreen.classList.remove('active');
    elements.chatScreen.classList.add('active');
    
    // الانضمام التلقائي للغرفة العالمية
    joinGlobalRoom();
    
    showAlert(`😈 مرحباً ${userData.displayName}!`, 'success');
    hideLoading();
});

// 📝 إنشاء الحساب
socket.on('account-created', (data) => {
    showAlert('😍 تم إنشاء حسابك بنجاح!', 'success');
    
    // تعبئة بيانات الدخول تلقائياً
    elements.loginUsername.value = data.username;
    elements.loginCode.value = data.loginCode;
    
    hideLoading();
});

// 💬 رسائل جديدة
socket.on('new-message', (message) => {
    if (message.roomId === currentRoom) {
        addMessage(message);
    }
});

// 💌 رسائل خاصة جديدة
socket.on('new-private-message', (message) => {
    if (message.toId === currentUser.id || message.fromId === currentUser.id) {
        showPrivateMessageNotification(message);
        
        if (isPrivateMode && selectedUserId === message.fromId) {
            addPrivateMessage(message);
        }
    }
});

// 👥 تحديث قائمة المستخدمين
socket.on('users-list', (users) => {
    updateUsersList(users);
});

// 🔍 نتائج البحث
socket.on('users-search-results', (results) => {
    updateSearchResults(results);
});

// 👑 تحديث بيانات الأدمن
socket.on('stats-data', (stats) => {
    updateAdminStats(stats);
});

// 🛠️ دوال مساعدة محسنة
function addMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message floating-message ${message.isAdmin ? 'admin-message' : ''} ${message.isSuperAdmin ? 'super-admin-message' : ''}`;
    
    let badges = '';
    if (message.isSuperAdmin) {
        badges += '<span class="badge super-admin-badge">👑 MOBO</span>';
    } else if (message.isAdmin) {
        badges += '<span class="badge admin-badge">🔧 أدمن</span>';
    }
    if (message.isVerified) {
        badges += '<span class="badge verified-badge">✅ موثق</span>';
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
            ${currentUser?.isAdmin ? `
                <button class="message-action-btn" onclick="deleteMessage('${message.id}')" title="حذف الرسالة">🗑️</button>
            ` : ''}
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
                <div class="user-actions">
                    <button class="action-btn" onclick="openPrivateChat('${user.id}', '${user.username}')" title="مراسلة خاصة">💬</button>
                    ${currentUser?.isAdmin ? `
                        <button class="action-btn" onclick="muteUser('${user.id}', '${user.username}')" title="كتم">🔇</button>
                        <button class="action-btn" onclick="banUser('${user.id}', '${user.username}')" title="حظر">🚫</button>
                    ` : ''}
                </div>
            `;
            
            elements.usersList.appendChild(userDiv);
        }
    });
}

function updateSearchResults(results) {
    elements.searchResults.innerHTML = '';
    
    results.forEach(user => {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'search-result-item';
        
        resultDiv.innerHTML = `
            <div class="user-avatar">${user.profile?.avatar || '👤'}</div>
            <div class="user-details">
                <div class="user-name">${escapeHtml(user.username)}</div>
                <div class="user-info">${user.profile?.status || 'مستخدم'}</div>
            </div>
            <button class="action-btn" onclick="openPrivateChat('${user.id}', '${user.username}')">
                مراسلة
            </button>
        `;
        
        elements.searchResults.appendChild(resultDiv);
    });
}

// 🎯 التهيئة
document.addEventListener('DOMContentLoaded', function() {
    // إنشاء النجوم المتحركة
    createStars();
    
    // تحميل الصور بكفاءة
    optimizeImages();
    
    // إدارة الذاكرة
    optimizeMemory();
    
    // إضافة مستمعي الأحداث
    initializeEventListeners();
});

function createStars() {
    const starsBg = document.getElementById('stars-bg');
    const starCount = 200;
    
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        
        const size = Math.random() * 3 + 1;
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        const delay = Math.random() * 5;
        const duration = Math.random() * 3 + 2;
        
        star.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${left}%;
            top: ${top}%;
            animation-delay: ${delay}s;
            animation-duration: ${duration}s;
        `;
        
        starsBg.appendChild(star);
    }
}

// 🛡️ نظام الحماية المتقدم
document.addEventListener('contextmenu', function(e) {
    if (!e.target.classList.contains('allow-copy')) {
        e.preventDefault();
        showProtectionAlert('🚫 يمنع النسخ ');
    }
});

document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey && (e.key === 'u' || e.key === 's')) || e.key === 'F12') {
        e.preventDefault();
        showProtectionAlert('🚫 هذا الإجراء غير مسموح ');
    }
});

function showProtectionAlert(message) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #dc2626, #b91c1c);
        color: white;
        padding: 1rem 2rem;
        border-radius: 15px;
        z-index: 10000;
        font-weight: bold;
        box-shadow: 0 8px 32px rgba(220, 38, 38, 0.4);
        animation: fadeIn 0.5s ease-out;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alert.body.removeChild(alertDiv);
        }
    }, 3000);
}

// 🎪 دوال العرض المحسنة
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
        animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
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

// 🎯 دوال الهلبر المحسنة
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function optimizeImages() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.loading = 'lazy';
        img.decoding = 'async';
    });
}

function optimizeMemory() {
    // تنظيف الذاكرة كل 5 دقائق
    setInterval(() => {
        const messages = document.querySelectorAll('.message');
        if (messages.length > 200) {
            const toRemove = messages.length - 150;
            for (let i = 0; i < toRemove; i++) {
                messages[i].remove();
            }
        }
    }, 300000);
}

// 🚀 تهيئة النظام
console.log(`
╔══════════════════════════════════════════════════════════╗
║              🚀 نظام MOBO العالمي للدردشة              ║
║                 © 2025 جميع الحقوق محفوظة               ║
║        المطور والمالك الرسمي: MOBO                      ║
║    يمنع النسخ أو التوزيع أو التعديل بأي شكل كان         ║
╚══════════════════════════════════════════════════════════╝
`);
