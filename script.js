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
    usersSidebar: document.getElementById('users-sidebar')
};

// أحداث التسجيل
window.loginWithCode = function() {
    const code = elements.loginCode.value.trim();
    if (code) {
        socket.emit('login-with-code', { code: code });
    } else {
        alert('الرجاء إدخال كود الدخول');
    }
};

window.createAccount = function() {
    const username = elements.newUsername.value.trim();
    const password = elements.newPassword.value.trim();
    
    if (username && password) {
        if (username.length < 3) {
            alert('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
            return;
        }
        socket.emit('create-account', { 
            username: username, 
            password: password 
        });
    } else {
        alert('الرجاء ملء جميع الحقول');
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
        imageHtml = `<img src="${message.image}" class="message-image" onclick="viewImage('${message.image}')">`;
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
                        <button onclick="verifyUser('${user.id}')" ${user.isVerified ? 'disabled' : ''}>✅</button>
                        <button onclick="deleteUser('${user.id}')">🗑️</button>
                    </div>
                ` : ''}
            `;
            
            // إضافة حدث للنقر لإرسال رسالة خاصة
            userDiv.addEventListener('click', (e) => {
                if (!e.target.closest('.user-actions')) {
                    togglePrivateMode(user.id, user.username);
                }
            });
            
            elements.usersList.appendChild(userDiv);
        }
    });
    
    // تحديث قائمة المستخدمين في select
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

// إدارة الأدمن (أنت)
window.verifyUser = function(userId) {
    if (currentUser?.isAdmin) {
        socket.emit('admin-action', {
            action: 'verify-user',
            targetUserId: userId
        });
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

// رفع الصور
elements.imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB حد
            alert('حجم الصورة يجب أن يكون أقل من 5MB');
            return;
        }
        
        const formData = new FormData();
        formData.append('image', file);
        
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // إرسال الرسالة مع الصورة
                const message = `🖼️ شارك صورة: ${file.name}`;
                sendMessage(message, data.imageUrl);
            } else {
                alert('فشل في رفع الصورة');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('حدث خطأ في رفع الصورة');
        });
    }
});

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

// استقبال الأحداث من السيرفر
socket.on('login-success', (userData) => {
    currentUser = userData;
    elements.currentUser.textContent = userData.username;
    updateUserBadges(userData);
    showChatScreen();
    addSystemMessage(`مرحباً ${userData.username}! تم الدخول بنجاح.`);
    
    // طلب قائمة المستخدمين
    socket.emit('get-users');
});

socket.on('login-failed', (message) => {
    alert(message);
});

socket.on('account-created', (data) => {
    alert(`تم إنشاء حسابك!\nكود الدخول الخاص بك: ${data.loginCode}\n\n${data.message}`);
    elements.newUsername.value = '';
    elements.newPassword.value = '';
});

socket.on('new-message', (message) => {
    addMessage(message);
});

socket.on('private-message', (message) => {
    addMessage(message);
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

socket.on('user-verified', (userId) => {
    addSystemMessage('✅ تم توثيق مستخدم جديد');
    socket.emit('get-users'); // تحديث القائمة
});

socket.on('user-deleted', (userId) => {
    addSystemMessage('🗑️ تم حذف مستخدم');
    socket.emit('get-users'); // تحديث القائمة
});

// أحداث لوحة المفاتيح
elements.messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        elements.messageForm.dispatchEvent(new Event('submit'));
    }
});

// دوال مساعدة
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Auto-focus على حقول الإدخال
document.addEventListener('DOMContentLoaded', function() {
    elements.loginCode.focus();
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
window.addEventListener('beforeunload', function() {
    if (currentUser) {
        socket.disconnect();
    }
});
