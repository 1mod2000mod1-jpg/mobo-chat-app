const socket = io();

// حالة التطبيق
let currentUser = null;
let currentRoom = null;
let isPrivateMode = false;
let selectedUserId = null;
let usersList = [];
let roomsList = [];
let adminMessages = [];

// عناصر DOM
const elements = {
    // الشاشات
    loginScreen: document.getElementById('login-screen'),
    chatScreen: document.getElementById('chat-screen'),
    
    // تسجيل الدخول
    loginUsername: document.getElementById('login-username'),
    loginCode: document.getElementById('login-code'),
    newUsername: document.getElementById('new-username'),
    newPassword: document.getElementById('new-password'),
    adminMessage: document.getElementById('admin-message'),
    
    // استعادة الحساب
    recoveryUsername: document.getElementById('recovery-username'),
    recoveryPassword: document.getElementById('recovery-password'),
    recoveryResult: document.getElementById('recovery-result'),
    
    // بيانات الحساب
    accountUsername: document.getElementById('account-username'),
    accountCode: document.getElementById('account-code'),
    
    // الشات
    currentUser: document.getElementById('current-user'),
    userBadges: document.getElementById('user-badges'),
    roomInfo: document.getElementById('room-info'),
    usersList: document.getElementById('users-list'),
    roomsList: document.getElementById('rooms-list'),
    messagesContainer: document.getElementById('messages'),
    messageInput: document.getElementById('message-input'),
    messageForm: document.getElementById('message-form'),
    userSelect: document.getElementById('user-select'),
    
    // النماذج
    createRoomForm: document.getElementById('create-room-form'),
    roomName: document.getElementById('room-name'),
    roomCountry: document.getElementById('room-country'),
    roomDescription: document.getElementById('room-description')
};

// 🎯 تسجيل الدخول
window.loginWithCredentials = function() {
    const username = elements.loginUsername.value.trim();
    const code = elements.loginCode.value.trim();
    
    if (username && code) {
        socket.emit('login-with-credentials', { 
            username: username, 
            code: code 
        });
    } else {
        showAlert('الرجاء إدخال اسم المستخدم وكود الدخول', 'error');
    }
};

// 🎯 إنشاء حساب
window.createAccount = function() {
    const username = elements.newUsername.value.trim();
    const password = elements.newPassword.value.trim();
    
    if (username && password) {
        socket.emit('create-account', { 
            username: username, 
            password: password 
        });
    } else {
        showAlert('الرجاء ملء جميع الحقول', 'error');
    }
};

// 🔑 استعادة الحساب
window.showRecoveryOption = function() {
    document.getElementById('recovery-modal').style.display = 'block';
};

window.closeRecoveryModal = function() {
    document.getElementById('recovery-modal').style.display = 'none';
    elements.recoveryUsername.value = '';
    elements.recoveryPassword.value = '';
    elements.recoveryResult.textContent = '';
};

window.recoverAccount = function() {
    const username = elements.recoveryUsername.value.trim();
    const password = elements.recoveryPassword.value.trim();
    
    if (username && password) {
        socket.emit('recover-account', { 
            username: username, 
            password: password 
        });
    } else {
        showAlert('الرجاء ملء جميع الحقول', 'error');
    }
};

// 📩 إرسال رسالة للمدير
window.sendMessageToAdmin = function() {
    const message = elements.adminMessage.value.trim();
    
    if (message) {
        socket.emit('send-admin-message', { 
            message: message,
            from: 'مستخدم'
        });
        elements.adminMessage.value = '';
    } else {
        showAlert('الرجاء كتابة رسالة', 'error');
    }
};

// 📋 نسخ كود الدخول
window.copyAccountCode = function() {
    const code = elements.accountCode.textContent;
    navigator.clipboard.writeText(code).then(() => {
        showAlert('تم نسخ كود الدخول بنجاح', 'success');
    }).catch(() => {
        showAlert('فشل نسخ الكود', 'error');
    });
};

// 🎯 نافذة بيانات الحساب
window.closeAccountModal = function() {
    document.getElementById('account-modal').style.display = 'none';
};

window.closeAccountModalAndLogin = function() {
    document.getElementById('account-modal').style.display = 'none';
    // مسح حقول التسجيل
    elements.newUsername.value = '';
    elements.newPassword.value = '';
};

// 🌍 إظهار نموذج إنشاء غرفة
window.showCreateRoomForm = function() {
    document.getElementById('create-room-modal').style.display = 'block';
};

window.closeCreateRoomModal = function() {
    document.getElementById('create-room-modal').style.display = 'none';
    elements.createRoomForm.reset();
};

// 🌍 إنشاء غرفة جديدة
elements.createRoomForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = elements.roomName.value.trim();
    const country = elements.roomCountry.value;
    const description = elements.roomDescription.value.trim();
    
    if (name && country) {
        socket.emit('create-room', {
            name: name,
            country: country,
            description: description
        });
        
        closeCreateRoomModal();
    } else {
        showAlert('الرجاء ملء جميع الحقول المطلوبة', 'error');
    }
});

// 🚪 الانضمام لغرفة
function joinRoom(roomId) {
    socket.emit('join-room', { roomId: roomId });
}

// 🔄 تحديث واجهة المستخدم
function showChatScreen() {
    elements.loginScreen.classList.remove('active');
    elements.chatScreen.style.display = 'flex';
    loadRoomsList();
    elements.messageInput.disabled = false;
    elements.messageForm.querySelector('button').disabled = false;
}

function updateUserBadges(user) {
    let badges = '';
    if (user.isAdmin) {
        badges += '<span class="badge admin-badge">👑 أدمن</span>';
        document.getElementById('admin-panel-btn').style.display = 'block';
        document.getElementById('admin-messages-btn').style.display = 'block';
        document.getElementById('create-room-btn').style.display = 'block';
    }
    if (user.isVerified) {
        badges += '<span class="badge verified-badge">✅ موثق</span>';
    }
    elements.userBadges.innerHTML = badges;
}

// 💬 إدارة الرسائل
function addMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message floating-message';
    
    if (message.isAdmin) {
        messageDiv.classList.add('admin-message');
    }
    if (message.isPrivate) {
        messageDiv.classList.add('private-message');
    }
    
    let badges = '';
    if (message.isAdmin) {
        badges += '<span class="message-badge">👑</span>';
    }
    if (message.isVerified) {
        badges += '<span class="message-badge">✅</span>';
    }
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-user">${escapeHtml(message.user)}</span>
            <div class="message-badges">${badges}</div>
        </div>
        <div class="message-text">${escapeHtml(message.text)}</div>
        <div class="message-time">${message.timestamp}</div>
    `;
    
    elements.messagesContainer.appendChild(messageDiv);
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

function addSystemMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system-message floating-message';
    messageDiv.innerHTML = `<em>${text}</em>`;
    elements.messagesContainer.appendChild(messageDiv);
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

function clearMessages() {
    elements.messagesContainer.innerHTML = '';
}

// 🌍 إدارة الغرف
function loadRoomsList() {
    socket.emit('get-rooms');
}

function updateRoomsList(rooms) {
    roomsList = rooms;
    elements.roomsList.innerHTML = '';
    
    rooms.forEach(room => {
        const roomDiv = document.createElement('div');
        roomDiv.className = `room-item ${room.id === currentRoom ? 'active-room-glow' : ''}`;
        
        roomDiv.innerHTML = `
            <div class="room-header">
                <div class="room-name">${room.countryInfo?.flag || '🌍'} ${escapeHtml(room.name)}</div>
                <div class="room-country">${room.countryInfo?.name || 'العالمية'}</div>
            </div>
            <div class="room-description">${escapeHtml(room.description)}</div>
            <div class="room-stats">
                <span>👥 ${room.userCount || 0}</span>
                <span>💬 ${room.messages?.length || 0}</span>
            </div>
        `;
        
        roomDiv.addEventListener('click', () => {
            if (room.id !== currentRoom) {
                joinRoom(room.id);
            }
        });
        
        elements.roomsList.appendChild(roomDiv);
    });
}

// 👥 إدارة المستخدمين
function updateUsersList(users) {
    usersList = users;
    elements.usersList.innerHTML = '';
    
    users.forEach(user => {
        if (user.id !== currentUser?.id) {
            const userDiv = document.createElement('div');
            userDiv.className = 'user-item online-user';
            
            let badges = '';
            if (user.isAdmin) {
                badges += '<span class="user-badge">👑</span>';
            }
            if (user.isVerified) {
                badges += '<span class="user-badge">✅</span>';
            }
            
            userDiv.innerHTML = `
                <div class="user-avatar">${user.username.charAt(0)}</div>
                <div class="user-info">
                    <div class="user-name">${escapeHtml(user.username)}</div>
                    <div class="user-badges">${badges}</div>
                </div>
                ${currentUser?.isAdmin ? `
                    <div class="user-actions">
                        <button onclick="verifyUser('${user.id}')" ${user.isVerified ? 'disabled' : ''} title="توثيق المستخدم">✅</button>
                    </div>
                ` : ''}
            `;
            
            userDiv.addEventListener('click', (e) => {
                if (!e.target.closest('.user-actions')) {
                    togglePrivateMode(user.id, user.username);
                }
            });
            
            elements.usersList.appendChild(userDiv);
        }
    });
    
    updateUserSelect(users);
}

function updateUserSelect(users) {
    elements.userSelect.innerHTML = '<option value="">اختر مستخدم</option>';
    
    users.forEach(user => {
        if (user.id !== currentUser?.id) {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.username + (user.isAdmin ? ' (👑)' : '') + (user.isVerified ? ' (✅)' : '');
            elements.userSelect.appendChild(option);
        }
    });
}

// 🛠️ أدوات الأدمن
window.showAdminPanel = function() {
    if (currentUser?.isAdmin) {
        socket.emit('get-stats');
    } else {
        showCopyrightInfo();
    }
};

window.showAdminMessages = function() {
    if (currentUser?.isAdmin) {
        socket.emit('get-admin-messages');
    }
};

window.verifyUser = function(userId) {
    if (currentUser?.isAdmin) {
        showAlert('ميزة التوثيق قيد التطوير', 'info');
    }
};

// 🔒 الرسائل الخاصة
window.togglePrivateMode = function(userId = null, username = null) {
    if (userId && username) {
        isPrivateMode = true;
        selectedUserId = userId;
        elements.messageInput.placeholder = `رسالة خاصة إلى ${username}...`;
        elements.userSelect.style.display = 'block';
        elements.userSelect.value = userId;
        addSystemMessage(`🔒 وضع الرسائل الخاصة: أنت تتحدث مع ${username}`);
    } else {
        isPrivateMode = false;
        selectedUserId = null;
        elements.messageInput.placeholder = 'اكتب رسالتك...';
        elements.userSelect.style.display = 'none';
        addSystemMessage('🔓 عودة للدردشة العامة');
    }
};

// 📱 التحكم في القوائم
window.toggleUsersList = function() {
    elements.usersSidebar.style.display = 
        elements.usersSidebar.style.display === 'none' ? 'block' : 'none';
        
    if (elements.usersSidebar.style.display === 'block') {
        socket.emit('get-users', { roomId: currentRoom });
    }
};

window.toggleRoomsList = function() {
    elements.roomsSidebar.style.display = 
        elements.roomsSidebar.style.display === 'none' ? 'block' : 'none';
};

// 💬 إرسال الرسائل
elements.messageForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const text = elements.messageInput.value.trim();
    
    if (text) {
        sendMessage(text);
        elements.messageInput.value = '';
    }
});

function sendMessage(text) {
    socket.emit('send-message', {
        text: text,
        isPrivate: isPrivateMode,
        toUserId: selectedUserId
    });
}

// 🚪 تسجيل الخروج
window.logout = function() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        socket.disconnect();
        location.reload();
    }
};

// 📋 النماذج المنبثقة
window.closeModal = function() {
    document.getElementById('copyright-modal').style.display = 'none';
};

// 🛡️ حقوق الطبع والنشر
window.showCopyrightInfo = function() {
    const modal = document.getElementById('copyright-modal');
    const title = document.getElementById('modal-title');
    const text = document.getElementById('modal-text');
    
    title.textContent = '📜 حقوق الطبع والنشر';
    text.innerHTML = `
        <p><strong>موقع موب العالمي للدردشة</strong></p>
        <p>© 2024 جميع الحقوق محفوظة</p>
        
        <h4>تفاصيل المنتج:</h4>
        <ul>
            <li><strong>اسم المنتج:</strong> موقع موب العالمي للدردشة</li>
            <li><strong>المطور:</strong> [أدخل اسمك هنا]</li>
            <li><strong>الإصدار:</strong> 4.0.0</li>
            <li><strong>سنة الإصدار:</strong> 2024</li>
        </ul>
        
        <h4>تحذيرات:</h4>
        <ul>
            <li>يمنع نسخ الكود المصدري</li>
            <li>يمنع إعادة التوزيع</li>
            <li>يمنع البيع أو التأجير</li>
            <li>يمنع التعديل بدون إذن كتابي</li>
        </ul>
        
        <hr>
        <p><strong>العقوبات:</strong> أي محاولة لسرقة الكود أو النسخ غير المصرح به سيتم متابعته قانونياً.</p>
    `;
    modal.style.display = 'block';
};

window.showPrivacyPolicy = function() {
    const modal = document.getElementById('copyright-modal');
    const title = document.getElementById('modal-title');
    const text = document.getElementById('modal-text');
    
    title.textContent = '🔒 سياسة الخصوصية';
    text.innerHTML = `
        <p><strong>سياسة الخصوصية - موقع موب العالمي</strong></p>
        <p>نحن نحترم خصوصيتك ونسعى لحماية بياناتك الشخصية.</p>
        
        <h4>البيانات التي نجمعها:</h4>
        <ul>
            <li>اسم المستخدم</li>
            <li>رسائل الدردشة</li>
            <li>تاريخ وتسجيل الدخول</li>
            <li>كود الدخول الفريد</li>
        </ul>
        
        <h4>كيف نستخدم بياناتك:</h4>
        <ul>
            <li>توفير خدمة الدردشة</li>
            <li>تحسين تجربة المستخدم</li>
            <li>الحماية من الإساءة</li>
        </ul>
        
        <p>© 2024 جميع الحقوق محفوظة</p>
    `;
    modal.style.display = 'block';
};

window.showContactInfo = function() {
    const modal = document.getElementById('copyright-modal');
    const title = document.getElementById('modal-title');
    const text = document.getElementById('modal-text');
    
    title.textContent = '📞 اتصل بنا';
    text.innerHTML = `
        <p><strong>معلومات الاتصال - موقع موب العالمي</strong></p>
        
        <h4>للتواصل مع المطور:</h4>
        <ul>
            <li><strong>المطور:</strong> [أدخل اسمك هنا]</li>
            <li><strong>البريد الإلكتروني:</strong> [أدخل بريدك الإلكتروني]</li>
        </ul>
        
        <p>© 2024 جميع الحقوق محفوظة</p>
    `;
    modal.style.display = 'block';
};

// 📡 استقبال الأحداث من السيرفر

// 🔐 تسجيل الدخول
socket.on('login-success', (userData) => {
    currentUser = userData;
    elements.currentUser.textContent = userData.displayName || userData.username;
    updateUserBadges(userData);
    showChatScreen();
    addSystemMessage(`🎉 مرحباً ${userData.displayName || userData.username}! تم الدخول بنجاح.`);
});

socket.on('login-failed', (message) => {
    showAlert(message, 'error');
});

// 📝 إنشاء الحساب
socket.on('account-created', (data) => {
    elements.accountUsername.textContent = data.username;
    elements.accountCode.textContent = data.loginCode;
    document.getElementById('account-modal').style.display = 'block';
    showAlert('تم إنشاء حسابك بنجاح!', 'success');
});

socket.on('account-error', (message) => {
    showAlert(message, 'error');
});

// 🔑 استعادة الحساب
socket.on('account-recovered', (data) => {
    elements.recoveryResult.innerHTML = `
        <div class="success-message">
            <h4>✅ تم استعادة الحساب بنجاح</h4>
            <p><strong>اسم المستخدم:</strong> ${data.username}</p>
            <p><strong>كود الدخول:</strong> ${data.loginCode}</p>
            <button class="modern-btn" onclick="copyRecoveryCode('${data.loginCode}')">📋 نسخ الكود</button>
        </div>
    `;
});

socket.on('recovery-failed', (message) => {
    elements.recoveryResult.innerHTML = `
        <div class="error-message">
            <p>❌ ${message}</p>
        </div>
    `;
});

// 📩 رسائل المدير
socket.on('admin-message-sent', (message) => {
    showAlert(message, 'success');
});

socket.on('new-admin-message', (message) => {
    if (currentUser?.isAdmin) {
        showAlert(`📩 رسالة جديدة من: ${message.from}`, 'info');
    }
});

socket.on('admin-messages-data', (messages) => {
    adminMessages = messages;
    const modal = document.getElementById('copyright-modal');
    const title = document.getElementById('modal-title');
    const text = document.getElementById('modal-text');
    
    title.textContent = '📩 رسائل المستخدمين';
    text.innerHTML = `
        <p><strong>الرسائل الواردة للمدير</strong></p>
        ${messages.length === 0 ? 
            '<p>لا توجد رسائل جديدة</p>' : 
            messages.map(msg => `
                <div class="admin-message-item ${msg.read ? 'read' : 'unread'}">
                    <div class="message-header">
                        <strong>${escapeHtml(msg.from)}</strong>
                        <small>${new Date(msg.timestamp).toLocaleString('ar-EG')}</small>
                    </div>
                    <p>${escapeHtml(msg.message)}</p>
                    <small>IP: ${msg.ip}</small>
                    ${!msg.read ? `<button class="modern-btn small-btn" onclick="markMessageAsRead('${msg.id}')">تم القراءة</button>` : ''}
                </div>
            `).join('')
        }
    `;
    modal.style.display = 'block';
});

// 🌍 الغرف
socket.on('rooms-list', (rooms) => {
    updateRoomsList(rooms);
});

socket.on('room-created', (room) => {
    showAlert(`تم إنشاء غرفة جديدة: ${room.name}`, 'success');
    loadRoomsList();
});

socket.on('room-created-success', (message) => {
    showAlert(message, 'success');
});

socket.on('room-joined', (data) => {
    currentRoom = data.roomId;
    elements.roomInfo.textContent = data.roomName;
    
    clearMessages();
    data.messages.forEach(message => addMessage(message));
    
    addSystemMessage(`انتقلت إلى غرفة: ${data.roomName}`);
    
    // تحديث قائمة المستخدمين
    socket.emit('get-users', { roomId: currentRoom });
});

socket.on('user-joined-room', (data) => {
    if (data.roomId === currentRoom) {
        addSystemMessage(`🎉 ${data.username} انضم للغرفة`);
        socket.emit('get-users', { roomId: currentRoom });
    }
});

socket.on('user-left-room', (data) => {
    if (data.roomId === currentRoom) {
        addSystemMessage(`👋 ${data.username} غادر الغرفة`);
        socket.emit('get-users', { roomId: currentRoom });
    }
});

// 💬 الرسائل
socket.on('new-message', (message) => {
    if (message.roomId === currentRoom) {
        addMessage(message);
    }
});

// 👥 المستخدمين
socket.on('users-list', (users) => {
    updateUsersList(users);
});

// 📊 الإحصائيات
socket.on('stats-data', (stats) => {
    const modal = document.getElementById('copyright-modal');
    const title = document.getElementById('modal-title');
    const text = document.getElementById('modal-text');
    
    title.textContent = '📊 إحصائيات النظام';
    text.innerHTML = `
        <p><strong>إحصائيات موقع موب العالمي</strong></p>
        
        <div class="stats-grid">
            <div class="stat-card">
                <strong>👥 المستخدمين</strong>
                <div class="stat-value">${stats.totalUsers}</div>
            </div>
            <div class="stat-card">
                <strong>🟢 النشطين</strong>
                <div class="stat-value">${stats.activeUsers}</div>
            </div>
            <div class="stat-card">
                <strong>🌍 الغرف</strong>
                <div class="stat-value">${stats.totalRooms}</div>
            </div>
            <div class="stat-card">
                <strong>📩 الرسائل</strong>
                <div class="stat-value">${stats.adminMessages}</div>
            </div>
        </div>
        
        <div class="protection-stats">
            <strong>نظام الحماية:</strong>
            <div>🚫 عناوين IP محظورة: ${stats.blockedIPs}</div>
            <div>📨 رسائل غير مقروءة: ${stats.unreadAdminMessages}</div>
            <div>🔗 مستخدمين متصلين: ${stats.onlineUsers}</div>
        </div>
    `;
    modal.style.display = 'block';
});

// ⚠️ الأخطاء
socket.on('error', (message) => {
    showAlert(message, 'error');
});

// ⌨️ أحداث لوحة المفاتيح
document.getElementById('login-code').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') loginWithCredentials();
});

document.getElementById('new-password').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') createAccount();
});

document.getElementById('recovery-password').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') recoverAccount();
});

document.getElementById('message-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        elements.messageForm.dispatchEvent(new Event('submit'));
    }
});

// 🛠️ دوال مساعدة
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
        padding: 1rem 2rem;
        border-radius: 10px;
        z-index: 10000;
        font-weight: bold;
        box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        max-width: 400px;
        word-break: break-word;
        white-space: pre-line;
        animation: fadeIn 0.5s ease-out;
    `;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            document.body.removeChild(alertDiv);
        }
    }, 5000);
}

function copyRecoveryCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showAlert('تم نسخ كود الدخول بنجاح', 'success');
    });
}

function markMessageAsRead(messageId) {
    socket.emit('mark-message-read', { messageId: messageId });
    showAdminMessages();
}

// 🎯 تهيئة الصفحة
document.addEventListener('DOMContentLoaded', function() {
    elements.loginUsername.focus();
    
    // إغلاق النوافذ بالنقر خارجها
    window.onclick = function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    };

    // التحقق من صحة البيانات أثناء الكتابة
    document.getElementById('new-username').addEventListener('input', function() {
        const username = this.value.trim();
        const feedback = document.getElementById('username-feedback');
        
        if (username.length > 0) {
            if (username.length < 3) {
                feedback.textContent = '❌ الاسم قصير جداً';
                feedback.style.color = '#dc2626';
            } else if (username.length > 20) {
                feedback.textContent = '❌ الاسم طويل جداً';
                feedback.style.color = '#dc2626';
            } else {
                feedback.textContent = '✅ اسم مستخدم صالح';
                feedback.style.color = '#10b981';
            }
        } else {
            feedback.textContent = '';
        }
    });

    document.getElementById('new-password').addEventListener('input', function() {
        const password = this.value;
        const feedback = document.getElementById('password-feedback');
        
        if (password.length > 0) {
            if (password.length < 4) {
                feedback.textContent = '❌ كلمة المرور قصيرة';
                feedback.style.color = '#dc2626';
            } else {
                feedback.textContent = '✅ كلمة مرور صالحة';
                feedback.style.color = '#10b981';
            }
        } else {
            feedback.textContent = '';
        }
    });
});
