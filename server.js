const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// 🔒 حماية حقوق الطبع والنشر
console.log(`
╔══════════════════════════════════════════════════╗
║              🚀 موقع موب العالمي               ║
║           © 2024 جميع الحقوق محفوظة             ║
║        تم التطوير بواسطة: [أدخل اسمك هنا]       ║
║     يمنع النسخ أو التوزيع غير المصرح به         ║
╚══════════════════════════════════════════════════╝
`);

app.use(express.static(path.join(__dirname)));
app.use(express.json({ limit: '10mb' }));

// تخزين البيانات
const users = new Map();
const userCodes = new Map();
const verifiedUsers = new Set();
const rooms = new Map();
const adminMessages = [];
const userSessions = new Map();

// 🔐 نظام حماية متطور
const securityConfig = {
  MAX_ACCOUNTS_PER_IP: 1, // حساب واحد فقط احتفظ به اذا فقدته ستشتري الحساب الثاني
  ACCOUNT_CREATION_WINDOW: 7 * 24 * 60 * 60 * 1000, // 1s
  MAX_LOGIN_ATTEMPTS: 3,
  LOGIN_TIMEOUT: 30 * 60 * 1000, // 30 دقيقة
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 ساعة
  MESSAGE_RATE_LIMIT: 10 // 10 رسائل في الدقيقة
};

const loginAttempts = new Map();
const accountCreationLimits = new Map();
const messageRates = new Map();

// 🏴 الدول العربية
const arabCountries = {
  'palestine': { name: 'فلسطين', flag: '🇵🇸', code: 'ps' },
  'saudi': { name: 'السعودية', flag: '🇸🇦', code: 'sa' },
  'uae': { name: 'الإمارات', flag: '🇦🇪', code: 'ae' },
  'egypt': { name: 'مصر', flag: '🇪🇬', code: 'eg' },
  'qatar': { name: 'قطر', flag: '🇶🇦', code: 'qa' },
  'kuwait': { name: 'الكويت', flag: '🇰🇼', code: 'kw' },
  'bahrain': { name: 'البحرين', flag: '🇧🇭', code: 'bh' },
  'oman': { name: 'عمان', flag: '🇴🇲', code: 'om' },
  'yemen': { name: 'اليمن', flag: '🇾🇪', code: 'ye' },
  'syria': { name: 'سوريا', flag: '🇸🇾', code: 'sy' },
  'iraq': { name: 'العراق', flag: '🇮🇶', code: 'iq' },
  'jordan': { name: 'الأردن', flag: '🇯🇴', code: 'jo' },
  'lebanon': { name: 'لبنان', flag: '🇱🇧', code: 'lb' },
  'libya': { name: 'ليبيا', flag: '🇱🇾', code: 'ly' },
  'tunisia': { name: 'تونس', flag: '🇹🇳', code: 'tn' },
  'algeria': { name: 'الجزائر', flag: '🇩🇿', code: 'dz' },
  'morocco': { name: 'المغرب', flag: '🇲🇦', code: 'ma' },
  'sudan': { name: 'السودان', flag: '🇸🇩', code: 'sd' },
  'somalia': { name: 'الصومال', flag: '🇸🇴', code: 'so' },
  'mauritania': { name: 'موريتانيا', flag: '🇲🇷', code: 'mr' },
  'comoros': { name: 'جزر القمر', flag: '🇰🇲', code: 'km' },
  'djibouti': { name: 'جيبوتي', flag: '🇩🇯', code: 'dj' },
  'global': { name: 'العالمية', flag: '🌍', code: 'global' }
};

// 🔐 إنشاء حساب الأدمن القوي
const generateAdminCredentials = () => {
  const adminId = 'admin_' + crypto.randomBytes(8).toString('hex');
  const adminCode = 'MOB2024' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const adminPassword = crypto.randomBytes(16).toString('hex');
  
  const adminUser = {
    id: adminId,
    username: 'مدير_موب',
    password: bcrypt.hashSync(adminPassword, 16),
    loginCode: adminCode,
    isAdmin: true,
    isVerified: true,
    isSuperAdmin: true,
    joinDate: new Date(),
    lastActive: new Date(),
    securityLevel: 'maximum',
    permissions: ['all']
  };
  
  users.set(adminId, adminUser);
  userCodes.set(adminId, adminCode);
  
  console.log(`
  🔐 بيانات الدخول كمدير نظام:
  ├─ اسم المستخدم: مدير_موب
  ├─ كود الدخول: ${adminCode}
  ├─ كلمة المرور: ${adminPassword}
  └─ معرف المستخدم: ${adminId}
  `);
  
  return adminUser;
};

// إنشاء حساب الأدمن
const adminUser = generateAdminCredentials();

// 🏨 إنشاء غرف افتراضية
const createDefaultRooms = () => {
  const defaultRooms = [
    {
      id: 'main',
      name: 'الغرفة الرئيسية',
      country: 'global',
      description: 'الغرفة الرئيسية للجميع',
      createdBy: 'system',
      createdAt: new Date(),
      users: new Set(),
      messages: []
    },
    {
      id: 'palestine',
      name: 'غرفة فلسطين 🇵🇸',
      country: 'palestine',
      description: 'لأبناء فلسطين الأحرار',
      createdBy: 'system',
      createdAt: new Date(),
      users: new Set(),
      messages: []
    },
    {
      id: 'saudi',
      name: 'غرفة السعودية 🇸🇦',
      country: 'saudi',
      description: 'لأبناء المملكة العربية السعودية',
      createdBy: 'system',
      createdAt: new Date(),
      users: new Set(),
      messages: []
    }
  ];
  
  defaultRooms.forEach(room => {
    rooms.set(room.id, room);
  });
};

createDefaultRooms();

// 🔒 نظام الحماية من الهجمات
const securitySystem = {
  // التحقق من IP
  checkIPLimit: (ip) => {
    if (!accountCreationLimits.has(ip)) {
      accountCreationLimits.set(ip, {
        count: 0,
        startTime: Date.now(),
        lastAttempt: Date.now()
      });
      return true;
    }
    
    const limit = accountCreationLimits.get(ip);
    const timeSinceStart = Date.now() - limit.startTime;
    
    if (timeSinceStart > securityConfig.ACCOUNT_CREATION_WINDOW) {
      accountCreationLimits.set(ip, {
        count: 1,
        startTime: Date.now(),
        lastAttempt: Date.now()
      });
      return true;
    }
    
    if (limit.count >= securityConfig.MAX_ACCOUNTS_PER_IP) {
      return false;
    }
    
    return true;
  },
  
  // التحقق من سرعة الرسائل
  checkMessageRate: (userId) => {
    const now = Date.now();
    if (!messageRates.has(userId)) {
      messageRates.set(userId, { count: 1, startTime: now });
      return true;
    }
    
    const rate = messageRates.get(userId);
    const timeSinceStart = now - rate.startTime;
    
    if (timeSinceStart > 60000) { // دقيقة واحدة
      messageRates.set(userId, { count: 1, startTime: now });
      return true;
    }
    
    if (rate.count >= securityConfig.MESSAGE_RATE_LIMIT) {
      return false;
    }
    
    rate.count++;
    return true;
  },
  
  // إنشاء جلسة آمنة
  createSession: (userId, ip) => {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const session = {
      id: sessionId,
      userId: userId,
      ip: ip,
      createdAt: new Date(),
      lastActivity: new Date(),
      userAgent: 'unknown'
    };
    
    userSessions.set(sessionId, session);
    return sessionId;
  },
  
  // التحقق من الجلسة
  verifySession: (sessionId, ip) => {
    if (!userSessions.has(sessionId)) return false;
    
    const session = userSessions.get(sessionId);
    const timeSinceActivity = Date.now() - session.lastActivity;
    
    if (timeSinceActivity > securityConfig.SESSION_TIMEOUT) {
      userSessions.delete(sessionId);
      return false;
    }
    
    session.lastActivity = new Date();
    return session.userId;
  }
};

// 🧹 نظام التنظيف التلقائي
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  // تنظيف الجلسات المنتهية
  for (const [sessionId, session] of userSessions.entries()) {
    if (now - session.lastActivity > securityConfig.SESSION_TIMEOUT) {
      userSessions.delete(sessionId);
      cleaned++;
    }
  }
  
  // تنظيف معدلات الرسائل
  for (const [userId, rate] of messageRates.entries()) {
    if (now - rate.startTime > 60000) {
      messageRates.delete(userId);
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 تم تنظيف ${cleaned} جلسة منتهية`);
  }
}, 60 * 60 * 1000); // كل ساعة

// 🌐 نظام تسجيل الدخول المطور
io.on('connection', (socket) => {
  const clientIP = socket.handshake.address;
  console.log('🔗 محاولة اتصال من:', clientIP);

  // 🔐 تسجيل الدخول
  socket.on('login-with-credentials', (data) => {
    const now = Date.now();
    
    // التحقق من محاولات الدخول
    if (loginAttempts.has(clientIP)) {
      const attempts = loginAttempts.get(clientIP);
      if (attempts.count >= securityConfig.MAX_LOGIN_ATTEMPTS) {
        const timeLeft = securityConfig.LOGIN_TIMEOUT - (now - attempts.lastAttempt);
        if (timeLeft > 0) {
          socket.emit('login-failed', `تم تجاوز عدد المحاولات. انتظر ${Math.ceil(timeLeft/60000)} دقيقة`);
          return;
        } else {
          loginAttempts.delete(clientIP);
        }
      }
    }
    
    let userFound = null;
    let userCodeMatch = null;
    
    // البحث عن المستخدم
    for (const [userId, user] of users.entries()) {
      const storedCode = userCodes.get(userId);
      if (user.username === data.username && storedCode === data.code) {
        userFound = user;
        userCodeMatch = userId;
        break;
      }
    }
    
    if (userFound && userCodeMatch) {
      // نجح التسجيل
      loginAttempts.delete(clientIP);
      
      userFound.lastActive = new Date();
      socket.userId = userCodeMatch;
      
      // إنشاء جلسة آمنة
      const sessionId = securitySystem.createSession(userCodeMatch, clientIP);
      socket.sessionId = sessionId;
      
      socket.emit('login-success', {
        username: userFound.username,
        isAdmin: userFound.isAdmin,
        isVerified: verifiedUsers.has(userCodeMatch),
        sessionId: sessionId
      });
      
      // دخول الغرفة الرئيسية
      const mainRoom = rooms.get('main');
      if (mainRoom) {
        mainRoom.users.add(userCodeMatch);
        socket.join('main');
        socket.currentRoom = 'main';
      }
      
      socket.emit('room-joined', {
        roomId: 'main',
        roomName: mainRoom.name,
        messages: mainRoom.messages.slice(-100)
      });
      
      console.log(`✅ دخول ناجح: ${userFound.username} من ${clientIP}`);
    } else {
      // فشل التسجيل
      if (!loginAttempts.has(clientIP)) {
        loginAttempts.set(clientIP, { count: 1, lastAttempt: now });
      } else {
        loginAttempts.get(clientIP).count++;
        loginAttempts.get(clientIP).lastAttempt = now;
      }
      
      const attemptsLeft = securityConfig.MAX_LOGIN_ATTEMPTS - loginAttempts.get(clientIP).count;
      socket.emit('login-failed', `بيانات الدخول غير صحيحة. لديك ${attemptsLeft} محاولات متبقية`);
      
      console.log(`❌ محاولة دخول فاشلة من ${clientIP}`);
    }
  });

  // 📝 إنشاء حساب جديد
  socket.on('create-account', (data) => {
    if (!securitySystem.checkIPLimit(clientIP)) {
      socket.emit('account-error', 'لا يمكن إنشاء أكثر من حساب واحد أسبوعياً من نفس الجهاز');
      return;
    }
    
    const username = data.username.trim();
    const password = data.password;
    
    // التحقق من الأسماء المحجوزة
    const reservedNames = ['admin', 'administrator', 'moderator', 'مدير', 'مشرف', 'system', 'نظام', 'مدير_موب'];
    if (reservedNames.includes(username.toLowerCase())) {
      socket.emit('account-error', 'اسم المستخدم محجوز ولا يمكن استخدامه');
      return;
    }
    
    // التحقق من صحة الاسم
    if (username.length < 3 || username.length > 20) {
      socket.emit('account-error', 'اسم المستخدم يجب أن يكون بين 3 و 20 حرف');
      return;
    }
    
    const validUsernameRegex = /^[a-zA-Z0-9\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF _-]+$/;
    if (!validUsernameRegex.test(username)) {
      socket.emit('account-error', 'اسم المستخدم يحتوي على أحرف غير مسموحة');
      return;
    }
    
    // التحقق من كلمة المرور
    if (password.length < 4 || password.length > 50) {
      socket.emit('account-error', 'كلمة المرور يجب أن تكون بين 4 و 50 حرف');
      return;
    }
    
    // التحقق من عدم تكرار الاسم
    for (const user of users.values()) {
      if (user.username.toLowerCase() === username.toLowerCase()) {
        socket.emit('account-error', 'اسم المستخدم موجود مسبقاً');
        return;
      }
    }
    
    // ✅ إنشاء الحساب
    const userId = uuidv4();
    const userCode = 'MOB' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const newUser = {
      id: userId,
      username: username,
      password: bcrypt.hashSync(password, 12),
      isAdmin: false,
      isVerified: false,
      joinDate: new Date(),
      lastActive: new Date(),
      ip: clientIP,
      creationTime: Date.now()
    };
    
    users.set(userId, newUser);
    userCodes.set(userId, userCode);
    
    // تحديث العداد
    const limit = accountCreationLimits.get(clientIP);
    limit.count++;
    limit.lastAttempt = Date.now();
    
    socket.emit('account-created', {
      username: username,
      loginCode: userCode,
      message: `تم إنشاء حسابك بنجاح! احتفظ بكود الدخول: ${userCode}`,
      accountsRemaining: 0 // لا يمكن إنشاء المزيد
    });
    
    console.log(`🎯 حساب جديد: ${username} من ${clientIP}`);
  });

  // 📩 رسالة للمدير
  socket.on('send-admin-message', (data) => {
    const message = {
      id: uuidv4(),
      from: data.from || 'مجهول',
      message: data.message,
      ip: clientIP,
      timestamp: new Date(),
      read: false
    };
    
    adminMessages.push(message);
    
    // إرسال تنبيه للمدير إذا كان متصل
    io.emit('new-admin-message', message);
    
    socket.emit('admin-message-sent', 'تم إرسال رسالتك للمدير بنجاح');
    console.log(`📩 رسالة للمدير من ${clientIP}: ${data.message.substring(0, 50)}...`);
  });

  // 🌍 إنشاء غرفة جديدة
  socket.on('create-room', (data) => {
    const user = users.get(socket.userId);
    if (!user || !user.isAdmin) {
      socket.emit('error', 'ليس لديك صلاحية إنشاء غرف');
      return;
    }
    
    const roomId = uuidv4();
    const room = {
      id: roomId,
      name: data.name,
      country: data.country,
      description: data.description,
      createdBy: user.username,
      createdAt: new Date(),
      users: new Set(),
      messages: []
    };
    
    rooms.set(roomId, room);
    
    io.emit('room-created', room);
    socket.emit('room-created-success', 'تم إنشاء الغرفة بنجاح');
    
    console.log(`🌍 غرفة جديدة: ${data.name} للدولة: ${data.country}`);
  });

  // 🚪 الانضمام لغرفة
  socket.on('join-room', (data) => {
    const user = users.get(socket.userId);
    if (!user) return;
    
    const room = rooms.get(data.roomId);
    if (!room) {
      socket.emit('error', 'الغرفة غير موجودة');
      return;
    }
    
    // مغادرة الغرفة السابقة
    if (socket.currentRoom) {
      const previousRoom = rooms.get(socket.currentRoom);
      if (previousRoom) {
        previousRoom.users.delete(socket.userId);
        socket.leave(socket.currentRoom);
      }
    }
    
    // الانضمام للغرفة الجديدة
    room.users.add(socket.userId);
    socket.join(data.roomId);
    socket.currentRoom = data.roomId;
    
    socket.emit('room-joined', {
      roomId: room.id,
      roomName: room.name,
      messages: room.messages.slice(-100)
    });
    
    // إعلام الآخرين
    socket.to(data.roomId).emit('user-joined-room', {
      username: user.username,
      roomId: data.roomId
    });
  });

  // 💬 إرسال رسالة
  socket.on('send-message', (data) => {
    const user = users.get(socket.userId);
    if (!user || !socket.currentRoom) return;
    
    // التحقق من سرعة الرسائل
    if (!securitySystem.checkMessageRate(socket.userId)) {
      socket.emit('error', 'إرسال سريع جداً. انتظر قليلاً');
      return;
    }
    
    const room = rooms.get(socket.currentRoom);
    if (!room) return;
    
    const message = {
      id: uuidv4(),
      user: user.username,
      userId: socket.userId,
      text: data.text.trim(),
      timestamp: new Date().toLocaleTimeString('ar-EG'),
      isAdmin: user.isAdmin,
      isVerified: verifiedUsers.has(socket.userId),
      roomId: socket.currentRoom
    };
    
    room.messages.push(message);
    if (room.messages.length > 1000) {
      room.messages = room.messages.slice(-500);
    }
    
    io.to(socket.currentRoom).emit('new-message', message);
  });

  // 📊 إحصائيات النظام
  socket.on('get-stats', () => {
    const user = users.get(socket.userId);
    if (!user || !user.isAdmin) return;
    
    const stats = {
      totalUsers: users.size,
      activeUsers: Array.from(users.values()).filter(u => 
        Date.now() - u.lastActive < 24 * 60 * 60 * 1000
      ).length,
      totalRooms: rooms.size,
      adminMessages: adminMessages.length,
      unreadAdminMessages: adminMessages.filter(m => !m.read).length,
      blockedIPs: Array.from(loginAttempts.entries()).filter(([ip, attempts]) => 
        attempts.count >= securityConfig.MAX_LOGIN_ATTEMPTS
      ).length
    };
    
    socket.emit('stats-data', stats);
  });

  // 📩 رسائل المدير
  socket.on('get-admin-messages', () => {
    const user = users.get(socket.userId);
    if (!user || !user.isAdmin) return;
    
    socket.emit('admin-messages-data', adminMessages);
  });

  socket.on('mark-message-read', (data) => {
    const user = users.get(socket.userId);
    if (!user || !user.isAdmin) return;
    
    const message = adminMessages.find(m => m.id === data.messageId);
    if (message) {
      message.read = true;
    }
  });

  // 📋 الحصول على الغرف
  socket.on('get-rooms', () => {
    const roomList = Array.from(rooms.values()).map(room => ({
      ...room,
      userCount: room.users.size,
      countryInfo: arabCountries[room.country] || arabCountries.global
    }));
    
    socket.emit('rooms-list', roomList);
  });

  // 📋 الحصول على المستخدمين
  socket.on('get-users', (data) => {
    const user = users.get(socket.userId);
    if (!user) return;
    
    const room = rooms.get(data.roomId || socket.currentRoom);
    if (!room) return;
    
    const userList = Array.from(room.users).map(userId => {
      const user = users.get(userId);
      return user ? {
        id: user.id,
        username: user.username,
        isOnline: true,
        isVerified: verifiedUsers.has(user.id),
        isAdmin: user.isAdmin
      } : null;
    }).filter(Boolean);
    
    socket.emit('users-list', userList);
  });

  socket.on('disconnect', () => {
    if (socket.currentRoom && socket.userId) {
      const room = rooms.get(socket.currentRoom);
      if (room) {
        room.users.delete(socket.userId);
        socket.to(socket.currentRoom).emit('user-left-room', {
          username: users.get(socket.userId)?.username,
          roomId: socket.currentRoom
        });
      }
    }
    
    if (socket.sessionId) {
      userSessions.delete(socket.sessionId);
    }
    
    console.log(`🔌 انقطع اتصال: ${socket.userId}`);
  });
});

// 🚀 تشغيل الخادم
server.listen(PORT, () => {
  console.log(`✅ الخادم يعمل على البورت: ${PORT}`);
  console.log(`🔗 الرابط: http://localhost:${PORT}`);
  console.log('🌍 تم إنشاء غرف للدول العربية بنجاح');
  console.log('🔐 نظام الحماية يعمل بكفاءة');
});
