const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

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

// إنشاء مجلد التحميلات إذا لم يكن موجوداً
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// إعداد رفع الملفات
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('يسمح برفع الصور فقط!'));
    }
  }
});

app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static('uploads'));

// تخزين البيانات
const users = new Map();
const messages = [];
const userCodes = new Map();
const verifiedUsers = new Set();

// 🔴 إنشاء حساب الأدمن (غير هذه البيانات بمعلوماتك)
const adminUser = {
  id: 'admin',
  username: 'المدير',
  password: bcrypt.hashSync('admin123', 10),
  isAdmin: true,
  isVerified: true,
  joinDate: new Date(),
  lastActive: new Date()
};
users.set('admin', adminUser);
userCodes.set('admin', 'ADMIN2024');

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

// رفع الصور
app.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (req.file) {
      res.json({ 
        success: true, 
        imageUrl: '/uploads/' + req.file.filename 
      });
    } else {
      res.json({ success: false, error: 'لم يتم رفع أي ملف' });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// نظام تسجيل الدخول
io.on('connection', (socket) => {
  console.log('مستخدم متصل:', socket.id);

  socket.on('login-with-code', (data) => {
    for (const [userId, code] of userCodes.entries()) {
      if (code === data.code) {
        const user = users.get(userId);
        user.lastActive = new Date();
        socket.userId = userId;
        socket.emit('login-success', {
          username: user.username,
          isAdmin: user.isAdmin,
          isVerified: user.isVerified
        });
        socket.broadcast.emit('user-joined', user.username);
        
        // إرسال الرسائل السابقة
        socket.emit('previous-messages', messages.slice(-50));
        return;
      }
    }
    socket.emit('login-failed', 'كود الدخول غير صحيح');
  });

  socket.on('create-account', (data) => {
    const userId = uuidv4();
    const userCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const newUser = {
      id: userId,
      username: data.username,
      password: bcrypt.hashSync(data.password, 10),
      isAdmin: false,
      isVerified: false,
      joinDate: new Date(),
      lastActive: new Date()
    };
    
    users.set(userId, newUser);
    userCodes.set(userId, userCode);
    
    socket.userId = userId;
    socket.emit('account-created', {
      username: data.username,
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
        socket.to(data.toUserId).emit('private-message', message);
        socket.emit('private-message', message);
      } else {
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
