const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

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
╔═════════════════════════════════════════════════╗
║              🚀 موقع MOBO العالمي             ║
║            © 2025 جميع الحقوق محفوظة           ║
║           تم الانشاء بواسطة: MOBO              ║
║             يمنع النسخ أو التوزيع              ║
╚═════════════════════════════════════════════════╝
`);

app.use(express.static(path.join(__dirname)));
app.use(express.json({ limit: '10mb' }));

// تخزين البيانات
const users = new Map();
const userProfiles = new Map();
const rooms = new Map();

// 🏴 جميع الدول العربية
const arabCountries = {
  'palestine': { name: 'فلسطين', flag: '🇵🇸', code: 'ps' },
  'saudi': { name: 'السعودية', flag: '🇸🇦', code: 'sa' },
  'uae': { name: 'الإمارات', flag: '🇦🇪', code: 'ae' },
  'egypt': { name: 'مصر', flag: '🇪🇬', code: 'eg' },
  'global': { name: 'العالمية', flag: '🌍', code: 'global' }
};

// 👑 إنشاء الأدمن الرئيسي
const createSuperAdmin = () => {
  const adminId = 'admin_mobo_global';
  const adminPassword = 'admin123';

  const adminUser = {
    id: adminId,
    username: 'MOBO',
    password: bcrypt.hashSync(adminPassword, 12),
    isAdmin: true,
    isSuperAdmin: true,
    isVerified: true,
    joinDate: new Date(),
    lastActive: new Date(),
    permissions: ['all'],
    displayName: '👑 MOBO'
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

  console.log(`
  🔐 بيانات الدخول كمدير نظام:
  ┌─────────────────────────────────────┐
  │  🎯 اسم المستخدم: MOBO             │
  │  🗝️  كلمة المرور: ${adminPassword} │
  └─────────────────────────────────────┘
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
      createdBy: 'MOBO',
      createdAt: new Date(),
      users: new Set(),
      messages: [],
      isActive: true,
      isGlobal: true
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
  console.log('🔗 اتصال جديد من:', socket.id);

  // 🔐 تسجيل الدخول باسم المستخدم وكلمة المرور
  socket.on('login-with-credentials', (data) => {
    console.log('🔐 محاولة دخول:', data.username);
    
    let userFound = null;
    let userIdFound = null;

    // البحث في جميع المستخدمين
    for (const [userId, user] of users.entries()) {
      if (user.username === data.username) {
        // التحقق من كلمة المرور بشكل آمن
        try {
          const passwordMatch = bcrypt.compareSync(data.password, user.password);
          if (passwordMatch) {
            userFound = user;
            userIdFound = userId;
            console.log('✅ تم العثور على المستخدم:', user.username);
            break;
          }
        } catch (error) {
          console.log('❌ خطأ في التحقق من كلمة المرور:', error.message);
        }
      }
    }

    if (userFound && userIdFound) {
      userFound.lastActive = new Date();
      socket.userId = userIdFound;
      socket.userData = userFound;

      console.log('✅ إرسال بيانات النجاح للمستخدم:', userFound.username);
      
      socket.emit('login-success', {
        id: userIdFound,
        username: userFound.username,
        displayName: userFound.displayName || userFound.username,
        isAdmin: userFound.isAdmin,
        isSuperAdmin: userFound.isSuperAdmin,
        isVerified: userFound.isVerified,
        profile: userProfiles.get(userIdFound) || {}
      });

      // الانضمام للغرفة العالمية تلقائياً
      const globalRoom = rooms.get('global_main');
      if (globalRoom) {
        globalRoom.users.add(userIdFound);
        socket.join('global_main');
        socket.currentRoom = 'global_main';

        // إرسال بيانات الغرفة
        socket.emit('room-joined', {
          roomId: 'global_main',
          roomName: globalRoom.name,
          messages: globalRoom.messages.slice(-100),
          userCount: globalRoom.users.size
        });
      }

      console.log(`✅ دخول ناجح: ${userFound.username}`);
    } else {
      console.log('❌ فشل الدخول: بيانات غير صحيحة');
      socket.emit('login-failed', 'اسم المستخدم أو كلمة المرور غير صحيحة');
    }
  });

  // 📝 إنشاء حساب جديد
  socket.on('create-account', (data) => {
    const username = data.username.trim();
    const password = data.password;
    const gender = data.gender || 'male';

    console.log('📝 محاولة إنشاء حساب:', username);

    // التحقق من الأسماء المحجوزة
    const reservedNames = ['admin', 'administrator', 'moderator', 'مدير', 'مشرف', 'system', 'نظام', 'MOBO'];
    if (reservedNames.includes(username.toLowerCase())) {
      socket.emit('account-error', 'اسم المستخدم محجوز ولا يمكن استخدامه');
      return;
    }

    // التحقق من صحة الاسم
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

    // التحقق من كلمة المرور
    if (password.length < 4 || password.length > 50) {
      socket.emit('account-error', 'كلمة المرور يجب أن تكون بين 4 و 50 حرف');
      return;
    }

    // ✅ إنشاء الحساب والملف الشخصي
    const userId = uuidv4();

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

    socket.emit('account-created', {
      username: username,
      message: `🎉 تم إنشاء حسابك بنجاح! يمكنك الآن تسجيل الدخول`
    });

    console.log(`🎯 حساب جديد: ${username}`);
  });

  // 💬 إرسال رسالة
  socket.on('send-message', (data) => {
    const user = users.get(socket.userId);
    if (!user || !socket.currentRoom) return;

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
      isVerified: user.isVerified,
      roomId: socket.currentRoom,
      userProfile: userProfiles.get(socket.userId)
    };

    room.messages.push(message);
    
    // حفظ فقط آخر 100 رسالة
    if (room.messages.length > 100) {
      room.messages = room.messages.slice(-50);
    }

    io.to(socket.currentRoom).emit('new-message', message);
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

  // 👥 الحصول على المستخدمين
  socket.on('get-users', (data) => {
    const room = rooms.get(data.roomId || socket.currentRoom);
    if (!room) return;
    
    const userList = Array.from(room.users).map(userId => {
      const user = users.get(userId);
      return user ? {
        id: user.id,
        username: user.username,
        isOnline: true,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
        profile: userProfiles.get(userId) || {}
      } : null;
    }).filter(Boolean);
    
    socket.emit('users-list', userList);
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
      messages: room.messages.slice(-100),
      userCount: room.users.size
    });
    
    // إعلام الآخرين
    socket.to(data.roomId).emit('user-joined-room', {
      username: user.username,
      roomId: data.roomId
    });
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
  console.log('👑 نظام MOBO جاهز للعمل');
  console.log('© 2025 MOBO - جميع الحقوق محفوظة');
});
