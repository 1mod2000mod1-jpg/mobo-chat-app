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
║        تم الانشاء و التطوير بواسطة السيد: [MOBO]       ║
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
  MAX_ACCOUNTS_PER_IP: 1,
  ACCOUNT_CREATION_WINDOW: 7 * 24 * 60 * 60 * 1000,
  MAX_LOGIN_ATTEMPTS: 3,
  LOGIN_TIMEOUT: 30 * 60 * 1000,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000,
  MESSAGE_RATE_LIMIT: 10
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

// 🔐 إنشاء حساب الأدمن مع كود طويل
const generateAdminCredentials = () => {
  const adminId = 'admin_mob_global_' + Date.now();
  
  // كود دخول طويل (12 حرف)
  const adminCode = 'MOB' + crypto.randomBytes(6).toString('hex').toUpperCase();
  
  // كلمة مرور قوية
  const adminPassword = crypto.randomBytes(12).toString('hex');
  
  const adminUser = {
    id: adminId,
    username: 'مدير_موب_العالمي',
    password: bcrypt.hashSync(adminPassword, 16),
    loginCode: adminCode,
    isAdmin: true,
    isVerified: true,
    isSuperAdmin: true,
    joinDate: new Date(),
    lastActive: new Date(),
    securityLevel: 'maximum',
    permissions: ['all'],
    displayName: '👑 مدير النظام'
  };
  
  users.set(adminId, adminUser);
  userCodes.set(adminId, adminCode);
  
  console.log(`
  🔐 بيانات الدخول كمدير نظام:
  ┌─────────────────────────────────────┐
  │  🎯 اسم المستخدم: مدير_موب_العالمي  │
  │  🔑 كود الدخول: ${adminCode}  │
  │  🗝️  كلمة المرور: ${adminPassword}  │
  │  🆔 المعرف: ${adminId}  │
  └─────────────────────────────────────┘
  `);
  
  return adminUser;
};

// إنشاء حساب الأدمن
const adminUser = generateAdminCredentials();

// 🏨 إنشاء غرف افتراضية
const createDefaultRooms = () => {
  const defaultRooms = [
    {
      id: 'main_global',
      name: '🌍 الغرفة العالمية الرئيسية',
      country: 'global',
      description: 'مكان للتواصل بين جميع الدول العربية',
      createdBy: 'system',
      createdAt: new Date(),
      users: new Set(),
      messages: [],
      isActive: true
    },
    {
      id: 'palestine_free',
      name: '🇵🇸 غرفة فلسطين الحرة',
      country: 'palestine',
      description: 'لأبناء فلسطين الأحرار حول العالم',
      createdBy: 'system',
      createdAt: new Date(),
      users: new Set(),
      messages: [],
      isActive: true
    },
    {
      id: 'saudi_kingdom',
      name: '🇸🇦 غرفة المملكة العربية السعودية',
      country: 'saudi',
      description: 'لأبناء المملكة العربية السعودية',
      createdBy: 'system',
      createdAt: new Date(),
      users: new Set(),
      messages: [],
      isActive: true
    },
    {
      id: 'gulf_union',
      name: '🌅 غرفة دول الخليج',
      country: 'uae',
      description: 'لتجمع شعوب دول الخليج العربي',
      createdBy: 'system',
      createdAt: new Date(),
      users: new Set(),
      messages: [],
      isActive: true
    }
  ];
  
  defaultRooms.forEach(room => {
    rooms.set(room.id, room);
  });
};

createDefaultRooms();

// 🔒 نظام الحماية من الهجمات
const securitySystem = {
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
    
    return limit.count < securityConfig.MAX_ACCOUNTS_PER_IP;
  },
  
  checkMessageRate: (userId) => {
    const now = Date.now();
    if (!messageRates.has(userId)) {
      messageRates.set(userId, { count: 1, startTime: now });
      return true;
    }
    
    const rate = messageRates.get(userId);
    const timeSinceStart = now - rate.startTime;
    
    if (timeSinceStart > 60000) {
      messageRates.set(userId, { count: 1, startTime: now });
      return true;
    }
    
    if (rate.count >= securityConfig.MESSAGE_RATE_LIMIT) {
      return false;
    }
    
    rate.count++;
    return true;
  },
  
  createSession: (userId, ip) => {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const session = {
      id: sessionId,
      userId: userId,
      ip: ip,
      createdAt: new Date(),
      lastActivity: new Date()
    };
    
    userSessions.set(sessionId, session);
    return sessionId;
  }
};

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
    
    // البحث عن المستخدم مع كود دخول طويل
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
        displayName: userFound.displayName || userFound.username,
        isAdmin: userFound.isAdmin,
        isVerified: verifiedUsers.has(userCodeMatch),
        sessionId: sessionId
      });
      
      // دخول الغرفة الرئيسية
      const mainRoom = rooms.get('main_global');
      if (mainRoom) {
        mainRoom.users.add(userCodeMatch);
        socket.join('main_global');
        socket.currentRoom = 'main_global';
        
        // إرسال بيانات الغرفة
        socket.emit('room-joined', {
          roomId: 'main_global',
          roomName: mainRoom.name,
          messages: mainRoom.messages.slice(-100),
          userCount: mainRoom.users.size
        });
      }
      
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
    const userCode = 'MOB' + crypto.randomBytes(4).toString('hex').toUpperCase();
    
    const newUser = {
      id: userId,
      username: username,
      password: bcrypt.hashSync(password, 12),
      isAdmin: false,
      isVerified: false,
      joinDate: new Date(),
      lastActive: new Date(),
      ip: clientIP,
      creationTime: Date.now(),
      displayName: username
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
      message: `🎉 تم إنشاء حسابك بنجاح!\n\n🔑 كود الدخول الخاص بك: ${userCode}\n\n💡 احتفظ بهذا الكود في مكان آمن لأنه لا يمكن استعادته`,
      accountsRemaining: 0
    });
  });

  // باقي الأحداث تبقى كما هي...
  // [نفس الكود السابق للأحداث الأخرى]
});

// 🚀 تشغيل الخادم
server.listen(PORT, () => {
  console.log(`✅ الخادم يعمل على البورت: ${PORT}`);
  console.log(`🔗 الرابط: http://localhost:${PORT}`);
  console.log('🎨 تم تحميل الجماليات المتطورة بنجاح');
  console.log('🔐 نظام الحماية يعمل بكفاءة');
});
