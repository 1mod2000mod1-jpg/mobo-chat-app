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
    loginCode: document.getElementById('login-code'),
    newUsername: document.getElementById('new-username'),
    newPassword: document.getElementById('new-password'),
    currentUser: document.getElementById('current-user'),
    userBadges: document.getElementById('user-badges'),
    usersList: document.getElementById('users-list'),
    messagesContainer: document.getElementById('messages'),
    messageInput: document.getElementById('message-input'),
    messageForm: document.getElementById('message-form'),
    imageInput: document.getElementById('image-input'),
    userSelect: document.getElementById('user-select'),
    usersSidebar: document.getElementById('users-sidebar'),
    adminPanelBtn: document.getElementById('admin-panel-btn')
};

// أحداث التسجيل
window.loginWithCode = function() {
    const code = elements.loginCode.value.trim();
    if (code) {
        socket.emit('login-with-code', { code: code });
    } else {
        showAlert('الرجاء إدخال كود الدخول', 'error');
    }
};

window.createAccount = function() {
    const username = elements.newUsername.value.trim();
    const password = elements.newPassword.value.trim();
    
    if (username && password) {
        if (username.length < 3) {
            showAlert('اسم المستخدم يجب أن يكون 3 أحرف على الأقل', 'error');
            return;
        }
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
           
