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
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3000;

// 🔒 حماية حقوق الطبع والنشر
console.log(`
╔═════════════════════════════════════════════════╗
║              🚀 موقع MOBO العالمي              ║
║            © 2025 جميع الحقوق محفوظة           ║
║           تم الانشاء بواسطة: MOBO              ║
║             يمنع النسخ أو التوزيع              ║
╚═════════════════════════════════════════════════╝
`);

app.use(express.static(path.join(__dirname)));
app.use(express.json({ limit: '10mb' }));

// Route رئيسي
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// تخزين البيانات
const users = new Map();
const userProfiles = new Map();
const verifiedUsers = new Set();
const rooms = new Map();
const mutedUsers = new Map();
const bannedUsers = new Map();
const onlineUsers = new Map();

// 🏴 جميع الدول العربية
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
  const adminId = 'admin_mobo_' + Date.now();
  const adminPassword = 'Mobo@2025';

  const adminUser = {
    id: adminId,
    username: 'MOBO',
    password: bcrypt.hashSync(adminPassword, 10),
    isAdmin: true,
    isSuperAdmin: true,
    isVerified: true,
    joinDate: new Date(),
    lastActive: new Date(),
    displayName: '👑 MOBO'
  };

  const adminProfile = {
    userId: adminId,
    gender: 'male',
    avatar: '👑',
    status: 'مطور ومالك الموقع',
    country: 'global',
    joinDate: new Date()
  };

  users.set(adminId, adminUser);
  userProfiles.set(adminId, adminProfile);

  console.log(`
  🔐 بيانات دخول المدير:
  ┌─────────────────────────────────────┐
  │  اسم المستخدم: MOBO                │
  │  كلمة المرور: ${adminPassword}      │
  └─────────────────────────────────────┘
  `);

  return adminUser;
};

// 🌍 إنشاء الغرف الافتراضية
const createDefaultRooms = () => {
  const defaultRooms = [
    {
      id: 'global_main',
      name: '🌍 الغرفة العالمية - MOBO',
      country: 'global',
      description: 'الغرفة الرئيسية العالمية © 2025',
      createdBy: 'MOBO',
      createdAt: new Date(),
      users: new Set(),
      messages: [],
      isActive: true,
      isGlobal: true
    },
    {
      id: 'palestine',
      name: '🇵🇸 غرفة فلسطين الحرة',
      country: 'palestine',
      description: 'لأبناء فلسطين الأحرار',
      createdBy: 'system',
      createdAt: new Date(),
      users: new Set(),
      messages: [],
      isActive: true
    },
    {
      id: 'saudi',
      name: '🇸🇦 غرفة السعودية',
      country: 'saudi',
      description: 'للمملكة العربية السعودية',
      createdBy: 'system',
      createdAt: new Date(),
      users: new Set(),
      messages: [],
      isActive: true
    },
    {
      id: 'egypt',
      name: '🇪🇬 غرفة مصر',
      country: 'egypt',
      description: 'أم الدنيا',
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

// دالة تنظيف المستخدمين غير النشطين
setInterval(() => {
  const now = Date.now();
  for (const [userId, lastSeen] of onlineUsers.entries()) {
    if (now - lastSeen > 300000) { // 5 دقائق
      onlineUsers.delete(userId);
      // إزالة من جميع الغرف
      rooms.forEach(room => {
        room.users.delete(userId);
      });
    }
  }
}, 60000); // كل دقيقة

// 🔧 نظام Socket.io
io.on('connection', (socket) => {
  console.log('🔗 اتصال جديد:', socket.id);

  // 🔐 تسجيل الدخول
  socket.on('login-with-credentials', (data) => {
    try {
      const { username, password } = data;
      
      if (!username || !password) {
        socket.emit('login-failed', 'الرجاء إدخال اسم المستخدم وكلمة المرور');
        return;
      }

      let userFound = null;
      let userIdFound = null;

      for (const [userId, user] of users.entries()) {
        if (user.username === username) {
          if (bcrypt.compareSync(password, user.password)) {
            userFound = user;
            userIdFound = userId;
            break;
          }
        }
      }

      if (userFound && userIdFound) {
        // التحقق من الحظر
        if (bannedUsers.has(userIdFound)) {
          socket.emit('login-failed', 'تم حظرك من الموقع');
          return;
        }

        userFound.lastActive = new Date();
        socket.userId = userIdFound;
        socket.userData = userFound;
        onlineUsers.set(userIdFound, Date.now());

        socket.emit('login-success', {
          id: userIdFound,
          username: userFound.username,
          displayName: userFound.displayName || userFound.username,
          isAdmin: userFound.isAdmin || false,
          isSuperAdmin: userFound.isSuperAdmin || false,
          isVerified: userFound.isVerified || false,
          profile: userProfiles.get(userIdFound) || {}
        });

        // الانضمام للغرفة العالمية
        const globalRoom = rooms.get('global_main');
        if (globalRoom) {
          globalRoom.users.add(userIdFound);
          socket.join('global_main');
          socket.currentRoom = 'global_main';

          socket.emit('room-joined', {
            roomId: 'global_main',
            roomName: globalRoom.name,
            messages: globalRoom.messages.slice(-50),
            userCount: globalRoom.users.size
          });

          // إرسال قائمة الغرف
          updateRoomsList(socket);
          
          // إرسال قائمة المستخدمين
          updateUsersList('global_main');
        }

        console.log(`✅ دخول ناجح: ${userFound.username}`);
      } else {
        socket.emit('login-failed', 'اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (error) {
      console.error('خطأ في تسجيل الدخول:', error);
      socket.emit('login-failed', 'حدث خطأ في تسجيل الدخول');
    }
  });

  // 📝 إنشاء حساب
  socket.on('create-account', (data) => {
    try {
      const { username, password, gender } = data;

      if (!username || !password) {
        socket.emit('account-error', 'الرجاء ملء جميع الحقول');
        return;
      }

      // التحقق من طول الاسم
      if (username.length < 3 || username.length > 20) {
        socket.emit('account-error', 'اسم المستخدم يجب أن يكون بين 3 و 20 حرف');
        return;
      }

      // التحقق من كلمة المرور
      if (password.length < 4) {
        socket.emit('account-error', 'كلمة المرور قصيرة جداً');
        return;
      }

      // التحقق من تكرار الاسم
      for (const user of users.values()) {
        if (user.username.toLowerCase() === username.toLowerCase()) {
          socket.emit('account-error', 'اسم المستخدم موجود مسبقاً');
          return;
        }
      }

      // إنشاء الحساب
      const userId = uuidv4();
      const hashedPassword = bcrypt.hashSync(password, 10);

      const newUser = {
        id: userId,
        username: username,
        password: hashedPassword,
        isAdmin: false,
        isSuperAdmin: false,
        isVerified: false,
        joinDate: new Date(),
        lastActive: new Date(),
        displayName: username
      };

      const userProfile = {
        userId: userId,
        gender: gender || 'male',
        avatar: gender === 'female' ? '👩' : '👨',
        status: 'متصل حديثاً',
        country: 'global',
        joinDate: new Date()
      };

      users.set(userId, newUser);
      userProfiles.set(userId, userProfile);

      socket.emit('account-created', {
        username: username,
        message: 'تم إنشاء حسابك بنجاح! يمكنك الآن تسجيل الدخول'
      });

      console.log(`✅ حساب جديد: ${username}`);
    } catch (error) {
      console.error('خطأ في إنشاء الحساب:', error);
      socket.emit('account-error', 'حدث خطأ في إنشاء الحساب');
    }
  });

  // 💬 إرسال رسالة
  socket.on('send-message', (data) => {
    try {
      const user = users.get(socket.userId);
      if (!user || !socket.currentRoom) return;

      // التحقق من الكتم
      const muteInfo = mutedUsers.get(socket.userId);
      if (muteInfo && muteInfo.expires > Date.now()) {
        socket.emit('message-error', 'أنت مكتوم حالياً');
        return;
      }

      const room = rooms.get(socket.currentRoom);
      if (!room) return;

      const message = {
        id: uuidv4(),
        user: user.username,
        userId: socket.userId,
        text: data.text.trim().substring(0, 500),
        timestamp: new Date().toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        fullTimestamp: new Date(),
        isAdmin: user.isAdmin || false,
        isSuperAdmin: user.isSuperAdmin || false,
        isVerified: user.isVerified || false,
        roomId: socket.currentRoom,
        userProfile: userProfiles.get(socket.userId)
      };

      room.messages.push(message);
      
      // الاحتفاظ بآخر 500 رسالة فقط
      if (room.messages.length > 500) {
        room.messages = room.messages.slice(-500);
      }

      io.to(socket.currentRoom).emit('new-message', message);
      
      // تحديث آخر نشاط
      onlineUsers.set(socket.userId, Date.now());
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
    }
  });

  // 🚪 الانضمام لغرفة
  socket.on('join-room', (data) => {
    try {
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
          updateUsersList(socket.currentRoom);
        }
      }

      // الانضمام للغرفة الجديدة
      room.users.add(socket.userId);
      socket.join(data.roomId);
      socket.currentRoom = data.roomId;

      socket.emit('room-joined', {
        roomId: room.id,
        roomName: room.name,
        messages: room.messages.slice(-50),
        userCount: room.users.size
      });

      updateUsersList(data.roomId);
      updateRoomsList();
    } catch (error) {
      console.error('خطأ في الانضمام للغرفة:', error);
    }
  });

  // 📋 الحصول على الغرف
  socket.on('get-rooms', () => {
    updateRoomsList(socket);
  });

  // 👥 الحصول على المستخدمين
  socket.on('get-users', (data) => {
    const roomId = data?.roomId || socket.currentRoom;
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        const userList = getUsersInRoom(roomId);
        socket.emit('users-list', userList);
      }
    }
  });

  // 👑 كتم مستخدم (أدمن فقط)
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

    socket.emit('admin-action-success', `تم كتم ${data.username}`);
  });

  // 🚫 حظر مستخدم (أدمن فقط)
  socket.on('admin-ban-user', (data) => {
    const admin = users.get(socket.userId);
    if (!admin || !admin.isAdmin) return;

    bannedUsers.set(data.userId, {
      reason: data.reason,
      bannedBy: admin.username,
      bannedAt: new Date()
    });

    // فصل المستخدم
    const targetSocket = Array.from(io.sockets.sockets.values())
      .find(s => s.userId === data.userId);
    
    if (targetSocket) {
      targetSocket.emit('banned', data.reason);
      targetSocket.disconnect();
    }

    socket.emit('admin-action-success', `تم حظر ${data.username}`);
  });

  // 🗑️ حذف رسالة (أدمن فقط)
  socket.on('admin-delete-message', (data) => {
    const admin = users.get(socket.userId);
    if (!admin || !admin.isAdmin) return;

    const room = rooms.get(data.roomId);
    if (room) {
      room.messages = room.messages.filter(msg => msg.id !== data.messageId);
      io.to(data.roomId).emit('message-deleted', data.messageId);
    }
  });

  // 🔌 قطع الاتصال
  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      
      if (socket.currentRoom) {
        const room = rooms.get(socket.currentRoom);
        if (room) {
          room.users.delete(socket.userId);
          updateUsersList(socket.currentRoom);
          updateRoomsList();
        }
      }
    }
    console.log('🔌 قطع اتصال:', socket.id);
  });

  // تحديث النشاط
  socket.on('ping', () => {
    if (socket.userId) {
      onlineUsers.set(socket.userId, Date.now());
    }
  });
});

// دوال مساعدة
function updateRoomsList(socket = null) {
  const roomList = Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    country: room.country,
    description: room.description,
    userCount: room.users.size,
    countryInfo: arabCountries[room.country] || arabCountries.global,
    isActive: room.isActive
  }));

  if (socket) {
    socket.emit('rooms-list', roomList);
  } else {
    io.emit('rooms-list', roomList);
  }
}

function updateUsersList(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const userList = getUsersInRoom(roomId);
  io.to(roomId).emit('users-list', userList);
}

function getUsersInRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];

  return Array.from(room.users).map(userId => {
    const user = users.get(userId);
    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      isOnline: onlineUsers.has(userId),
      isVerified: user.isVerified || false,
      isAdmin: user.isAdmin || false,
      isSuperAdmin: user.isSuperAdmin || false,
      profile: userProfiles.get(userId) || {}
    };
  }).filter(Boolean);
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
});

// 🚀 تشغيل السيرفر
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ الخادم يعمل على البورت: ${PORT}`);
  console.log(`🔗 الرابط: http://localhost:${PORT}`);
  console.log('👑 نظام MOBO جاهز للعمل');
  console.log('© 2025 MOBO - جميع الحقوق محفوظة');
});
