const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const compression = require('compression');
const helmet = require('helmet');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// 🔒 حماية متقدمة
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(express.static(path.join(__dirname), {
  maxAge: '1d',
  etag: true
}));
app.use(express.json({ limit: '10mb' }));

// 🔐 حقوق الطبع والنشر
console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    🚀 موقع موب العالمي المتطور               ║
║              © 2025 جميع الحقوق محفوظة - MOBO                 ║
║        المطور والمالك الرسمي: MOBO                            ║
║    يمنع النسخ أو التوزيع أو التعديل بأي شكل كان               ║
║        أي محاولة للنسخ ستتعرض للملاحقة القانونية              ║
╚════════════════════════════════════════════════════════════════╝
`);

// 🗄️ قواعد البيانات المحسنة
const users = new Map();
const userProfiles = new Map();
const userCodes = new Map();
const verifiedUsers = new Set();
const rooms = new Map();
const adminMessages = [];
const userSessions = new Map();
const mutedUsers = new Map();
const bannedUsers = new Map();
const privateMessages = new Map();

// 🏴 الدول العربية المحسنة
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

// 👑 إنشاء الأدمن الرئيسي
const createSuperAdmin = () => {
  const adminId = 'admin_mobo_global_' + Date.now();
  const adminCode = 'MOBO2025' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const adminPassword = crypto.randomBytes(16).toString('hex');

  const adminUser = {
    id: adminId,
    username: 'MOBO_Admin',
    password: bcrypt.hashSync(adminPassword, 16),
    loginCode: adminCode,
    isAdmin: true,
    isSuperAdmin: true,
    isVerified: true,
    joinDate: new Date(),
    lastActive: new Date(),
    permissions: ['all'],
    displayName: '👑 MOBO - المطور والمالك'
  };

  const adminProfile = {
    userId: adminId,
    gender: 'male',
    avatar: '👑',
    status: 'مطور ومالك الموقع',
    country: 'global',
    joinDate: new Date(),
    lastSeen: new Date()
  };

  users.set(adminId, adminUser);
  userProfiles.set(adminId, adminProfile);
  userCodes.set(adminId, adminCode);

  console.log(`
  🔐 بيانات الدخول كمدير نظام:
  ┌─────────────────────────────────────────┐
  │  🎯 اسم المستخدم: MOBO_Admin           │
  │  🔑 كود الدخول: ${adminCode}           │
  │  🗝️  كلمة المرور: ${adminPassword}     │
  │  🆔 المعرف: ${adminId}                  │
  └─────────────────────────────────────────┘
  `);

  return adminUser;
};

// 🌍 إنشاء الغرف الافتراضية
const createDefaultRooms = () => {
  const defaultRooms = [
    {
      id: 'global_main',
      name: '🌍 الغرفة العالمية الرئيسية - MOBO',
      country: 'global',
      description: 'الغرفة الرئيسية العالمية - MOBO © 2025',
      createdBy: 'MOBO_Admin',
      createdAt: new Date(),
      users: new Set(),
      messages: [],
      isActive: true,
      isGlobal: true
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
    }
  ];

  defaultRooms.forEach(room => {
    rooms.set(room.id, room);
  });
};

// 🚀 تهيئة النظام
createSuperAdmin();
createDefaultRooms();

// 🔧 نظام الإدارة المتقدم
io.on('connection', (socket) => {
  const clientIP = socket.handshake.address;
  console.log('🔗 اتصال جديد من:', clientIP);

  // 🔐 تسجيل الدخول المحسن
  socket.on('login-with-credentials', (data) => {
    let userFound = null;
    let userCodeMatch = null;

    for (const [userId, user] of users.entries()) {
      const storedCode = userCodes.get(userId);
      if (user.username === data.username && storedCode === data.code) {
        userFound = user;
        userCodeMatch = userId;
        break;
      }
    }

    if (userFound && userCodeMatch) {
      userFound.lastActive = new Date();
      socket.userId = userCodeMatch;
      socket.userData = userFound;

      socket.emit('login-success', {
        username: userFound.username,
        displayName: userFound.displayName || userFound.username,
        isAdmin: userFound.isAdmin,
        isSuperAdmin: userFound.isSuperAdmin,
        isVerified: userFound.isVerified,
        profile: userProfiles.get(userCodeMatch) || {}
      });

      // الانضمام للغرفة العالمية تلقائياً
      const globalRoom = rooms.get('global_main');
      if (globalRoom) {
        globalRoom.users.add(userCodeMatch);
        socket.join('global_main');
        socket.currentRoom = 'global_main';

        socket.emit('room-joined', {
          roomId: 'global_main',
          roomName: globalRoom.name,
          messages: globalRoom.messages.slice(-100),
          userCount: globalRoom.users.size
        });
      }

      console.log(`✅ دخول ناجح: ${userFound.username}`);
    } else {
      socket.emit('login-failed', 'بيانات الدخول غير صحيحة');
    }
  });

  // 📝 إنشاء حساب مع ملف شخصي
  socket.on('create-account', (data) => {
    const username = data.username.trim();
    const password = data.password;
    const gender = data.gender || 'male';

    if (username.length < 3 || username.length > 20) {
      socket.emit('account-error', 'اسم المستخدم يجب أن يكون بين 3 و 20 حرف');
      return;
    }

    // التحقق من عدم تكرار الاسم
    for (const user of users.values()) {
      if (user.username.toLowerCase() === username.toLowerCase()) {
        socket.emit('account-error', 'اسم المستخدم موجود مسبقاً');
        return;
      }
    }

    // ✅ إنشاء الحساب والملف الشخصي
    const userId = uuidv4();
    const userCode = 'MOBO' + crypto.randomBytes(4).toString('hex').toUpperCase();

    const newUser = {
      id: userId,
      username: username,
      password: bcrypt.hashSync(password, 12),
      isAdmin: false,
      isSuperAdmin: false,
      isVerified: false,
      joinDate: new Date(),
      lastActive: new Date(),
      displayName: username
    };

    const userProfile = {
      userId: userId,
      gender: gender,
      avatar: gender === 'male' ? '👨' : '👩',
      status: 'متصل حديثاً',
      country: 'global',
      joinDate: new Date(),
      lastSeen: new Date()
    };

    users.set(userId, newUser);
    userProfiles.set(userId, userProfile);
    userCodes.set(userId, userCode);

    socket.emit('account-created', {
      username: username,
      loginCode: userCode,
      gender: gender,
      message: `🎉 تم إنشاء حسابك بنجاح! كود الدخول: ${userCode}`
    });
  });

  // 💬 إرسال رسالة مع نظام الإدارة
  socket.on('send-message', (data) => {
    const user = users.get(socket.userId);
    if (!user || !socket.currentRoom) return;

    // التحقق من الحظر أو الكتم
    if (bannedUsers.has(socket.userId)) {
      socket.emit('error', 'تم حظرك من إرسال الرسائل');
      return;
    }

    if (mutedUsers.has(socket.userId)) {
      const muteData = mutedUsers.get(socket.userId);
      if (muteData.expires > Date.now()) {
        socket.emit('error', 'تم كتمك مؤقتاً من إرسال الرسائل');
        return;
      } else {
        mutedUsers.delete(socket.userId);
      }
    }

    const room = rooms.get(socket.currentRoom);
    if (!room) return;

    const message = {
      id: uuidv4(),
      user: user.username,
      userId: socket.userId,
      text: data.text.trim(),
      timestamp: new Date().toLocaleTimeString('ar-EG'),
      fullTimestamp: new Date(),
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      isVerified: verifiedUsers.has(socket.userId),
      roomId: socket.currentRoom,
      userProfile: userProfiles.get(socket.userId)
    };

    room.messages.push(message);
    if (room.messages.length > 1000) {
      room.messages = room.messages.slice(-500);
    }

    io.to(socket.currentRoom).emit('new-message', message);
  });

  // 👑 نظام إدارة الأدمن
  socket.on('admin-mute-user', (data) => {
    const admin = users.get(socket.userId);
    if (!admin || !admin.isAdmin) return;

    mutedUsers.set(data.userId, {
      expires: Date.now() + (data.duration * 60000),
      reason: data.reason,
      mutedBy: admin.username
    });

    io.to(socket.currentRoom).emit('user-muted', {
      username: data.username,
      duration: data.duration,
      reason: data.reason
    });

    socket.emit('admin-action-success', `تم كتم ${data.username} لمدة ${data.duration} دقيقة`);
  });

  socket.on('admin-ban-user', (data) => {
    const admin = users.get(socket.userId);
    if (!admin || !admin.isAdmin) return;

    bannedUsers.set(data.userId, {
      reason: data.reason,
      bannedBy: admin.username,
      bannedAt: new Date()
    });

    io.to(socket.currentRoom).emit('user-banned', {
      username: data.username,
      reason: data.reason
    });

    socket.emit('admin-action-success', `تم حظر ${data.username}`);
  });

  socket.on('admin-delete-message', (data) => {
    const admin = users.get(socket.userId);
    if (!admin || !admin.isAdmin) return;

    const room = rooms.get(data.roomId);
    if (room) {
      room.messages = room.messages.filter(msg => msg.id !== data.messageId);
      io.to(data.roomId).emit('message-deleted', data.messageId);
    }
  });

  // 🔍 البحث عن المستخدمين
  socket.on('search-users', (data) => {
    const searchTerm = data.term.toLowerCase();
    const results = [];

    for (const [userId, user] of users.entries()) {
      if (user.username.toLowerCase().includes(searchTerm)) {
        results.push({
          id: userId,
          username: user.username,
          profile: userProfiles.get(userId),
          isOnline: true,
          isAdmin: user.isAdmin
        });
      }
    }

    socket.emit('users-search-results', results);
  });

  // 💌 نظام الرسائل الخاصة
  socket.on('send-private-message', (data) => {
    const fromUser = users.get(socket.userId);
    const toUser = Array.from(users.values()).find(u => u.username === data.toUsername);

    if (!fromUser || !toUser) return;

    const privateMessage = {
      id: uuidv4(),
      from: fromUser.username,
      fromId: socket.userId,
      to: toUser.username,
      toId: toUser.id,
      text: data.text,
      timestamp: new Date(),
      read: false
    };

    if (!privateMessages.has(toUser.id)) {
      privateMessages.set(toUser.id, []);
    }
    privateMessages.get(toUser.id).push(privateMessage);

    // إرسال الإشعار للمستلم
    io.to(toUser.id).emit('new-private-message', privateMessage);
    socket.emit('private-message-sent', 'تم إرسال الرسالة الخاصة');
  });

  // 📱 تحديث الملف الشخصي
  socket.on('update-profile', (data) => {
    const profile = userProfiles.get(socket.userId);
    if (profile) {
      Object.assign(profile, data);
      profile.lastSeen = new Date();
      socket.emit('profile-updated', profile);
    }
  });

  socket.on('disconnect', () => {
    if (socket.currentRoom && socket.userId) {
      const room = rooms.get(socket.currentRoom);
      if (room) {
        room.users.delete(socket.userId);
      }
    }
    console.log(`🔌 انقطع اتصال: ${socket.userId}`);
  });
});

server.listen(PORT, () => {
  console.log(`✅ الخادم يعمل على البورت: ${PORT}`);
  console.log(`🔗 الرابط: http://localhost:${PORT}`);
  console.log('👑 نظام MOBO جاهز للعمل بحماية كاملة');
  console.log('© 2025 MOBO - جميع الحقوق محفوظة');
});
