const socket = io();

// حالة التطبيق
let currentUser = null;
let isPrivateMode = false;
let selectedUserId = null;
let usersList = [];

// عناصر DOM
const elements = {
    loginScreen: document.getElementById('login-screen'),
    chatScreen: document.getElementById('chat-screen'),
    loginUsername: document.getElementById('login-username'),
    loginCode: document.getElementById('login-code'),
    newUsername: document.getElementById('new-username'),
    newPassword: document.getElementById('new-password'),
    currentUser: document.getElementById('current-user'),
    userBadges: document.getElementById('user-badges'),
    usersList: document.getElementById('users-list'),
    messagesContainer: document.getElementById('messages'),
    messageInput: document.getElementById('message-input'),
    messageForm: document.getElementById('message-form'),
    userSelect: document.getElementById('user-select'),
    usersSidebar: document.getElementById('users-sidebar'),
    adminPanelBtn: document.getElementById('admin-panel-btn')
};

// تسجيل الدخول بالاسم والكود
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

// إنشاء حساب
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

// إدارة الواجهة
function showChatScreen() {
    elements.loginScreen.classList.remove('active');
    elements.chatScreen.style.display = 'flex';
    elements.messageInput.focus();
}

function updateUserBadges(user) {
    let badges = '';
    if (user.isAdmin) {
        badges += '<span>👑 أدمن</span>';
        elements.adminPanelBtn.style.display = 'block';
    }
    if (user.isVerified) {
        badges += '<span>✅ موثق</span>';
    }
    elements.userBadges.innerHTML = badges;
}

// إدارة الرسائل
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
    
    let imageHtml = '';
    if (message.image) {
        imageHtml = `<img src="${message.image}" class="message-image" onclick="viewImage('${message.image}')" alt="صورة مرفوعة">`;
    }
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-user">${escapeHtml(message.user)}</span>
            <div class="message-badges">${badges}</div>
        </div>
        <div class="message-text">${escapeHtml(message.text)}</div>
        ${imageHtml}
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

// إدارة المستخدمين
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
                        <button onclick="deleteUser('${user.id}')" title="حذف المستخدم">🗑️</button>
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

// إدارة الأدمن
window.verifyUser = function(userId) {
    if (currentUser?.isAdmin) {
        socket.emit('admin-action', {
            action: 'verify-user',
            targetUserId: userId
        });
        showAlert('تم توثيق المستخدم بنجاح', 'success');
    }
};

window.deleteUser = function(userId) {
    if (currentUser?.isAdmin && confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
        socket.emit('admin-action', {
            action: 'delete-user',
            targetUserId: userId
        });
    }
};

window.showAdminPanel = function() {
    showCopyrightInfo();
};

// إدارة الرسائل الخاصة
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

window.toggleUsersList = function() {
    elements.usersSidebar.style.display = 
        elements.usersSidebar.style.display === 'none' ? 'block' : 'none';
};

// إرسال الرسائل
elements.messageForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const text = elements.messageInput.value.trim();
    
    if (text) {
        sendMessage(text);
        elements.messageInput.value = '';
    }
});

function sendMessage(text, imageUrl = null) {
    socket.emit('send-message', {
        text: text,
        image: imageUrl,
        isPrivate: isPrivateMode,
        toUserId: selectedUserId
    });
}

// عرض الصورة
window.viewImage = function(imageUrl) {
    window.open(imageUrl, '_blank');
};

// تسجيل الخروج
window.logout = function() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        socket.disconnect();
        location.reload();
    }
};

// إدارة حقوق الطبع والنشر
window.showCopyrightInfo = function() {
    const modal = document.getElementById('copyright-modal');
    const title = document.getElementById('modal-title');
    const text = document.getElementById('modal-text');
    
    title.textContent = '📜 حقوق الطبع والنشر';
    text.innerHTML = `
        <p><strong>منصة الدردشة الحمراء</strong></p>
        <p>© 2024 جميع الحقوق محفوظة</p>
        
        <h4>تفاصيل المنتج:</h4>
        <ul>
            <li><strong>اسم المنتج:</strong> منصة الدردشة الحمراء</li>
            <li><strong>المطور:</strong> [أدخل اسمك هنا]</li>
            <li><strong>الإصدار:</strong> 3.0.0</li>
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
        <p><strong>العقوبات:</strong> أي محاولة لسرقة الكود أو النسخ غير المصرح به سيتم متابعته قانونياً حسب قوانين حماية الملكية الفكرية.</p>
        
        <p style="margin-top: 1rem; color: #dc2626; font-weight: bold;">
            ⚠️ هذا المشروع محمي بحقوق الطبع والنشر الدولية
        </p>
    `;
    modal.style.display = 'block';
};

window.showPrivacyPolicy = function() {
    const modal = document.getElementById('copyright-modal');
    const title = document.getElementById('modal-title');
    const text = document.getElementById('modal-text');
    
    title.textContent = '🔒 سياسة الخصوصية';
    text.innerHTML = `
        <p><strong>سياسة الخصوصية - منصة الدردشة الحمراء</strong></p>
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
            <li>الحفاظ على أمان المنصة</li>
        </ul>
        
        <h4>حماية البيانات:</h4>
        <ul>
            <li>كلمات المرور مشفرة</li>
            <li>الرسائل مخزنة مؤقتاً</li>
            <li>الحسابات غير النشطة تحذف تلقائياً</li>
        </ul>
        
        <hr>
        <p>© 2024 منصة الدردشة الحمراء - جميع الحقوق محفوظة</p>
    `;
    modal.style.display = 'block';
};

window.showContactInfo = function() {
    const modal = document.getElementById('copyright-modal');
    const title = document.getElementById('modal-title');
    const text = document.getElementById('modal-text');
    
    title.textContent = '📞 اتصل بنا';
    text.innerHTML = `
        <p><strong>معلومات الاتصال - منصة الدردشة الحمراء</strong></p>
        
        <h4>للتواصل مع المطور:</h4>
        <ul>
            <li><strong>المطور:</strong> [أدخل اسمك هنا]</li>
            <li><strong>البريد الإلكتروني:</strong> [أدخل بريدك الإلكتروني]</li>
            <li><strong>تاريخ الإنشاء:</strong> 2024</li>
        </ul>
        
        <h4>للتطوير والتعاون:</h4>
        <p>لطلبات التطوير أو التعاون، يرجى التواصل عبر البريد الإلكتروني.</p>
        
        <h4>للإبلاغ عن مشاكل:</h4>
        <p>في حالة وجود أي مشاكل تقنية أو اقتراحات للتحسين، نرحب بملاحظاتكم.</p>
        
        <hr>
        <p style="color: #dc2626;">
            ⚠️ يمنع الاتصال لأغراض غير قانونية أو محاولة اختراق النظام
        </p>
        
        <p>© 2024 جميع الحقوق محفوظة</p>
    `;
    modal.style.display = 'block';
};

window.closeModal = function() {
    document.getElementById('copyright-modal').style.display = 'none';
};

// استقبال الأحداث من السيرفر
socket.on('login-success', (userData) => {
    currentUser = userData;
    elements.currentUser.textContent = userData.username;
    updateUserBadges(userData);
    showChatScreen();
    addSystemMessage(`🎉 مرحباً ${userData.username}! تم الدخول بنجاح.`);
    
    socket.emit('get-users');
});

socket.on('login-failed', (message) => {
    showAlert(message, 'error');
});

socket.on('account-created', (data) => {
    const message = `تم إنشاء حسابك!\nاسم المستخدم: ${data.username}\nكود الدخول: ${data.loginCode}\n\n${data.message}`;
    showAlert(message, 'success');
    elements.newUsername.value = '';
    elements.newPassword.value = '';
});

socket.on('account-error', (message) => {
    showAlert(message, 'error');
});

socket.on('new-message', (message) => {
    addMessage(message);
});

socket.on('private-message', (message) => {
    addMessage(message);
});

socket.on('previous-messages', (messages) => {
    elements.messagesContainer.innerHTML = '';
    messages.forEach(message => {
        addMessage(message);
    });
});

socket.on('users-list', (users) => {
    updateUsersList(users);
});

socket.on('user-joined', (username) => {
    addSystemMessage(`🎉 ${username} انضم للدردشة`);
});

socket.on('user-left', (username) => {
    addSystemMessage(`👋 ${username} غادر الدردشة`);
});

socket.on('user-verified', (data) => {
    addSystemMessage(`✅ تم توثيق المستخدم: ${data.username}`);
    socket.emit('get-users');
});

socket.on('user-deleted', (userId) => {
    addSystemMessage('🗑️ تم حذف مستخدم');
    socket.emit('get-users');
});

// أحداث لوحة المفاتيح
elements.messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        elements.messageForm.dispatchEvent(new Event('submit'));
    }
});

elements.loginCode.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        loginWithCredentials();
    }
});

elements.newPassword.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        createAccount();
    }
});

// دوال مساعدة
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    const bgColor = type === 'error' ? '#dc2626' : type === 'success' ? '#10b981' : '#3b82f6';
    
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

// Auto-focus على حقول الإدخال
document.addEventListener('DOMContentLoaded', function() {
    elements.loginUsername.focus();
});

// إدارة select المستخدمين
elements.userSelect.addEventListener('change', function() {
    const selectedUser = usersList.find(user => user.id === this.value);
    if (selectedUser) {
        togglePrivateMode(selectedUser.id, selectedUser.username);
    } else {
        togglePrivateMode();
    }
});

// إشعارات عند ترك الصفحة
window.addEventListener('beforeunload', function(e) {
    if (currentUser) {
        socket.disconnect();
    }
});

// إغلاق النافذة بالنقر خارجها
window.onclick = function(event) {
    const modal = document.getElementById('copyright-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};
