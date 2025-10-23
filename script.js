const socket = io();

const elements = {
    usernameInput: document.getElementById('username'),
    joinBtn: document.getElementById('join-btn'),
    messageInput: document.getElementById('message-input'),
    messageForm: document.getElementById('message-form'),
    messagesContainer: document.getElementById('messages'),
    sendBtn: document.querySelector('#message-form button')
};

let currentUser = '';

// انضمام المستخدم
elements.joinBtn.addEventListener('click', joinChat);
elements.usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinChat();
});

// إرسال رسالة
elements.messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = elements.messageInput.value.trim();
    if (message) {
        socket.emit('send-message', { text: message });
        elements.messageInput.value = '';
    }
});

elements.messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        elements.messageForm.dispatchEvent(new Event('submit'));
    }
});

// استقبال الأحداث من السيرفر
socket.on('new-message', (message) => {
    addMessage(message.user, message.text, message.timestamp);
});

socket.on('previous-messages', (messages) => {
    elements.messagesContainer.innerHTML = '';
    messages.forEach(message => {
        addMessage(message.user, message.text, message.timestamp);
    });
});

socket.on('user-joined', (username) => {
    addSystemMessage(`🎉 ${username} انضم للدردشة`);
});

socket.on('user-left', (username) => {
    addSystemMessage(`👋 ${username} غادر الدردشة`);
});

// دوال مساعدة
function joinChat() {
    const username = elements.usernameInput.value.trim();
    
    if (username && username.length >= 2) {
        currentUser = username;
        socket.emit('join', username);
        
        // تحديث الواجهة
        elements.usernameInput.disabled = true;
        elements.joinBtn.disabled = true;
        elements.messageInput.disabled = false;
        elements.sendBtn.disabled = false;
        elements.messageInput.focus();
        
        addSystemMessage(`مرحباً ${username}! انضممت للدردشة بنجاح.`);
    } else {
        alert('الرجاء إدخال اسم صحيح (على الأقل حرفين)');
    }
}

function addMessage(user, text, timestamp) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.innerHTML = `
        <span class="user">${user}</span>
        <div class="text">${escapeHtml(text)}</div>
        <small class="time">${timestamp}</small>
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
