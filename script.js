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
    
    // الأزرار
    usersSidebar: document.getElementById('users-sidebar'),
    roomsSidebar: document.getElementById('rooms-sidebar'),
    adminPanelBtn: document.getElementById('admin-panel-btn'),
    adminMessagesBtn: document.getElementById('admin-messages-btn'),
    createRoomBtn: document.getElementById('create-room-btn'),
    
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

// 🌍 إظهار نموذج إنشاء غرفة
window.showCreateRoomForm = function() {
    document.getElementById('create-room-modal').style.display = 'block';
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
}

function updateUserBadges(user) {
    let badges = '';
    if (user.isAdmin) {
        badges += '<span>👑 أدمن</span>';
        elements.adminPanelBtn.style.display = 'block';
        elements.adminMessagesBtn.style.display = 'block';
        elements.createRoomBtn.style.display = 'block';
    }
    if (user.isVerified) {
        badges += '<span>✅ موثق</span>';
    }
    elements.userBadges.innerHTML = badges;
}

// 💬 إدارة الرسائل
function addMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    
    if (message.isAdmin) {
        messageDiv.classList.add('admin-message');
    }
    if (message.isPrivate) {
        messageDiv.classList.add('private-message');
    }
    
    let badges = '';
    if (message.isAdmin) {
        badges += '<span>👑</span>';
    }
    if (message.isVerified) {
        badges += '<span>✅</span>';
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
    messageDiv.className = 'message system-message';
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
        roomDiv.className = `room-item ${room.id === currentRoom ? 'active' : ''}`;
        
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
            userDiv.className = 'user-item';
            
            let badges = '';
            if (user.isAdmin) {
                badges += '<span>👑</span>';
            }
            if (user.isVerified) {
                badges += '<span>✅</span>';
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
        // يمكن إضافة هذه الميزة لاحقاً
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

window.closeCreateRoomModal = function() {
    document.getElementById('create-room-modal').style.display = 'none';
    elements.createRoomForm.reset();
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
    elements.currentUser.textContent = userData.username;
    updateUserBadges(userData);
    showChatScreen();
    addSystemMessage(`🎉 مرحباً ${userData.username}! تم الدخول بنجاح.`);
});

socket.on('login-failed', (message) => {
    showAlert(message, 'error');
});

// 📝 إنشاء الحساب
socket.on('account-created', (data) => {
    const message = `تم إنشاء حسابك بنجاح!
    
اسم المستخدم: ${data.username}
كود الدخول: ${data.loginCode}

${data.message}`;
    
    showAlert(message, 'success');
    elements.newUsername.value = '';
    elements.newPassword.value = '';
});

socket.on('account-error', (message) => {
    showAlert(message, 'error');
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
                <div style="background: ${msg.read ? '#f8f9fa' : '#e3f2fd'}; padding: 1rem; margin: 0.5rem 0; border-radius: 8px; border-right: 4px solid ${msg.read ? '#6c757d' : '#007bff'};">
                    <div style="display: flex; justify-content: space-between;">
                        <strong>${escapeHtml(msg.from)}</strong>
                        <small>${new Date(msg.timestamp).toLocaleString('ar-EG')}</small>
                    </div>
                    <p style="margin: 0.5rem 0;">${escapeHtml(msg.message)}</p>
                    <small>IP: ${msg.ip}</small>
                    ${!msg.read ? `<button onclick="markMessageRead('${msg.id}')" style="background: #007bff; color: white; border: none; padding: 0.3rem 0.6rem; border-radius: 4px; cursor: pointer;">تم القراءة</button>` : ''}
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
    elements.messageInput.disabled = false;
    elements.messageForm.querySelector('button').disabled = false;
    
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
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0;">
            <div style="background: #f0f9ff; padding: 1rem; border-radius: 8px; border-right: 4px solid #3b82f6;">
                <strong>👥 المستخدمين</strong>
                <div style="font-size: 1.5rem; color: #3b82f6;">${stats.totalUsers}</div>
            </div>
            <div style="background: #f0fdf4; padding: 1rem; border-radius: 8px; border-right: 4px solid #10b981;">
                <strong>🟢 النشطين</strong>
                <div style="font-size: 1.5rem; color: #10b981;">${stats.activeUsers}</div>
            </div>
            <div style="background: #fef7ed; padding: 1rem; border-radius: 8px; border-right: 4px solid #f59e0b;">
                <strong>🌍 الغرف</strong>
                <div style="font-size: 1.5rem; color: #f59e0b;">${stats.totalRooms}</div>
            </div>
            <div style="background: #fef2f2; padding: 1rem; border-radius: 8px; border-right: 4px solid #dc2626;">
                <strong>📩 الرسائل</strong>
                <div style="font-size: 1.5rem; color: #dc2626;">${stats.adminMessages}</div>
            </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
            <strong>نظام الحماية:</strong>
            <div>🚫 عناوين IP محظورة: ${stats.blockedIPs}</div>
            <div>📨 رسائل غير مقروءة: ${stats.unreadAdminMessages}</div>
        </div>
    `;
    modal.style.display = 'block';
});

// ⚠️ الأخطاء
socket.on('error', (message) => {
    showAlert(message, 'error');
});

// ⌨️ أحداث لوحة المفاتيح
elements.loginCode.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') loginWithCredentials();
});

elements.newPassword.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') createAccount();
});

elements.messageInput.addEventListener('keydown', function(e) {
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
        background: ${bgColor};
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        z-index: 10000;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 400px;
        word-break: break-word;
        white-space: pre-line;
    `;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            document.body.removeChild(alertDiv);
        }
    }, 5000);
}

function markMessageRead(messageId) {
    socket.emit('mark-message-read', { messageId: messageId });
    showAdminMessages(); // إعادة تحميل القائمة
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
});

// 📱 إدارة select المستخدمين
elements.userSelect.addEventListener('change', function() {
    const selectedUser = usersList.find(user => user.id === this.value);
    if (selectedUser) {
        togglePrivateMode(selectedUser.id, selectedUser.username);
    } else {
        togglePrivateMode();
    }
});
