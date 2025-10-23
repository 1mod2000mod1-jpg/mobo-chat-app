const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// 🔒 حماية حقوق الطبع والنشر
console.log(`
╔══════════════════════════════════════════════════╗
║               🚀 منصة الدردشة الحمراء            ║
║           © 2024 جميع الحقوق محفوظة             ║
║        تم التطوير بواسطة: [أدخل اسمك هنا]       ║
║     يمنع النسخ أو التوزيع غير المصرح به         ║
╚══════════════════════════════════════════════════╝
`);

app.use(express.static(path.join(__dirname)));

// تخزين البيانات
const users = new Map();
const messages = [];
const userCodes = new Map();
const verifiedUsers = new Set();

// 🔴 إنشاء حساب الأدمن (غير هذه البيانات بمعلوماتك)
const adminUser = {
  id: 'admin',
  username: 'المدير',
  password: bcrypt.hashSync('admin123', 12),
  isAdmin: true,
  isVerified: true,
  joinDate: new Date(),
  lastActive: new Date()
};
users.set('admin', adminUser);
userCodes.set('admin', 'ADMIN2024');

// نظام الحماية المتطور
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_TIMEOUT = 15 * 60 * 1000; // 15 دقيقة

// 🧹 تنظيف الحسابات غير النشطة
setInterval(() => {
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  let deletedCount = 0;
  
  for (const [userId, user] of users.entries()) {
    if (!user.isAdmin && user.lastActive < tenDaysAgo) {
      users.delete(userId);
      userCodes.delete(userId);
      verifiedUsers.delete(userId);
      deletedCount++;
    }
  }
  
  if (deletedCount > 0) {
    console.log(`🧹 تم حذف ${deletedCount} حساب غير نشط`);
  }
}, 24 * 60 * 60 * 1000);

// 🧹 تنظيف الذاكرة
setInterval(() => {
  if (messages.length > 1000) {
    messages.length = 500;
    console.log('🧹 تم تنظيف ذاكرة الرسائل');
  }
}, 60000);

// الروابط
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// نظام تسجيل الدخول المطور
io.on('connection', (socket) => {
  console.log('مستخدم متصل:', socket.id);

  socket.on('login-with-credentials', (data) => {
    const clientIP = socket.handshake.address;
    const now = Date.now();
    
    // التحقق من عدد المحاولات
    if (loginAttempts.has(clientIP)) {
      const attempts = loginAttempts.get(clientIP);
      if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
        const timeLeft = LOGIN_TIMEOUT - (now - attempts.lastAttempt);
        if (timeLeft > 0) {
          socket.emit('login-failed', `تم تجاوز عدد المحاولات. انتظر ${Math.ceil(timeLeft/60000)} دقيقة`);
          return;
        } else {
          loginAttempts.delete(clientIP);
        }
      }
    }
    
    // البحث عن المستخدم بالاسم والكود
    let userFound = false;
    for (const [userId, user] of users.entries()) {
      const userCode = userCodes.get(userId);
      if (user.username === data.username && userCode === data.code) {
        userFound = true;
        // نجح التسجيل
        loginAttempts.delete(clientIP);
        
        user.lastActive = new Date();
        socket.userId = userId;
        
        socket.emit('login-success', {
          username: user.username,
          isAdmin: user.isAdmin,
          isVerified: verifiedUsers.has(userId)
        });
        
        socket.broadcast.emit('user-joined', user.username);
        socket.emit('previous-messages', messages.slice(-50));
        break;
      }
    }
    
    if (!userFound) {
      // فشل التسجيل
      if (!loginAttempts.has(clientIP)) {
        loginAttempts.set(clientIP, { count: 1, lastAttempt: now });
      } else {
        loginAttempts.get(clientIP).count++;
        loginAttempts.get(clientIP).lastAttempt = now;
      }
      
      const attemptsLeft = MAX_LOGIN_ATTEMPTS - loginAttempts.get(clientIP).count;
      socket.emit('login-failed', `بيانات الدخول غير صحيحة. لديك ${attemptsLeft} محاولات متبقية`);
    }
  });

  socket.on('create-account', (data) => {
    const username = data.username.trim();
    const password = data.password;
    
    // تحقق من الاسم المستخدم مسبقاً
    for (const user of users.values()) {
      if (user.username === username) {
        socket.emit('account-error', 'اسم المستخدم موجود مسبقاً');
        return;
      }
    }
    
    if (username.length < 3) {
      socket.emit('account-error', 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
      return;
    }
    
    if (password.length < 4) {
      socket.emit('account-error', 'كلمة المرور يجب أن تكون 4 أحرف على الأقل');
      return;
    }
    
    const userId = uuidv4();
    const userCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const newUser = {
      id: userId,
      username: username,
      password: bcrypt.hashSync(password, 12),
      isAdmin: false,
      isVerified: false,
      joinDate: new Date(),
      lastActive: new Date(),
      ip: socket.handshake.address
    };
    
    users.set(userId, newUser);
    userCodes.set(userId, userCode);
    
    socket.userId = userId;
    socket.emit('account-created', {
      username: username,
      loginCode: userCode,
      message: 'احتفظ بهذا الكود للدخول مستقبلاً'
    });
  });

  socket.on('send-message', (data) => {
    const user = users.get(socket.userId);
    if (user && data.text.trim()) {
      const message = {
        id: uuidv4(),
        user: user.username,
        userId: socket.userId,
        text: data.text.trim(),
        image: data.image,
        timestamp: new Date().toLocaleTimeString('ar-EG'),
        isAdmin: user.isAdmin,
        isVerified: verifiedUsers.has(socket.userId),
        isPrivate: data.isPrivate || false,
        toUserId: data.toUserId
      };
      
      if (data.isPrivate && data.toUserId) {
        // رسالة خاصة
        socket.to(data.toUserId).emit('private-message', message);
        socket.emit('private-message', message);
      } else {
        // رسالة عامة
        messages.push(message);
        io.emit('new-message', message);
      }
    }
  });

  socket.on('admin-action', (data) => {
    const user = users.get(socket.userId);
    if (user && user.isAdmin) {
      switch (data.action) {
        case 'verify-user':
          verifiedUsers.add(data.targetUserId);
          const targetUser = users.get(data.targetUserId);
          io.emit('user-verified', { 
            userId: data.targetUserId, 
            username: targetUser.username 
          });
          break;
        case 'delete-user':
          users.delete(data.targetUserId);
          userCodes.delete(data.targetUserId);
          verifiedUsers.delete(data.targetUserId);
          io.emit('user-deleted', data.targetUserId);
          break;
      }
    }
  });

  socket.on('get-users', () => {
    const userList = Array.from(users.values()).map(user => ({
      id: user.id,
      username: user.username,
      isOnline: true,
      isVerified: verifiedUsers.has(user.id),
      isAdmin: user.isAdmin,
      joinDate: user.joinDate
    }));
    socket.emit('users-list', userList);
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.userId);
    if (user) {
      user.lastActive = new Date();
      setTimeout(() => {
        socket.broadcast.emit('user-left', user.username);
      }, 1000);
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ الخادم يعمل على البورت: ${PORT}`);
  console.log(`🔗 الرابط: http://localhost:${PORT}`);
});
