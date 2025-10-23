const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// إعدادات للاستضافة
const PORT = process.env.PORT || 3000;

// خدمة الملفات الثابتة
app.use(express.static(path.join(__dirname)));

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// تخزين المستخدمين والرسائل
const users = new Map();
const messages = [];

io.on('connection', (socket) => {
    console.log('مستخدم متصل:', socket.id);

    socket.on('join', (username) => {
        users.set(socket.id, username);
        socket.broadcast.emit('user-joined', username);
        socket.emit('previous-messages', messages.slice(-50));
    });

    socket.on('send-message', (data) => {
        const user = users.get(socket.id);
        if (user && data.text.trim()) {
            const message = {
                id: Date.now(),
                user: user,
                text: data.text.trim(),
                timestamp: new Date().toLocaleTimeString('ar-EG')
            };
            
            messages.push(message);
            if (messages.length > 100) messages.shift();
            
            io.emit('new-message', message);
        }
    });

    socket.on('disconnect', () => {
        const username = users.get(socket.id);
        if (username) {
            socket.broadcast.emit('user-left', username);
            users.delete(socket.id);
        }
    });
});

server.listen(PORT, () => {
    console.log(`✅ الخادم يعمل على البورت: ${PORT}`);
});
