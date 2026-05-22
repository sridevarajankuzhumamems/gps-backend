const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./config/db');
const SharingHistory = require('./models/SharingHistory');
const authRoutes = require('./routes/authRoutes');
const historyRoutes = require('./routes/historyRoutes');

const app = express();

app.use(express.json());

app.use(cors({
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true
}));

// API Routes
app.use('/api', authRoutes);
app.use('/api', historyRoutes);

// Lightweight ping endpoint to keep the server awake
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Socket.io integration
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store current state to immediately send to new clients
let currentAdminState = {
  isSharing: false,
  location: null,
  battery: null,
  ip: null,
  startTime: null,
  markerPhoto: null,
  admin: null
};

// Map of socket ID to their active sharing history row ID
const activeHistoryIds = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Always send current state to newly connected client immediately
  socket.emit('admin_status', currentAdminState);

  socket.on('start_sharing', async (data) => {
    console.log('Admin started sharing location:', data);
    
    if (currentAdminState.isSharing) {
      const activeEmail = currentAdminState.admin ? currentAdminState.admin.email : null;
      const requestEmail = data.admin ? data.admin.email : null;
      
      if (activeEmail !== requestEmail) {
        const activeName = currentAdminState.admin ? currentAdminState.admin.name : 'Another Admin';
        socket.emit('sharing_rejected', { 
          message: `Cannot start sharing. ${activeName} is currently sharing location.` 
        });
        return;
      }
    }

    currentAdminState = {
      isSharing: true,
      location: data.location || null,
      battery: data.battery,
      ip: data.ip,
      startTime: data.startTime || new Date().toISOString(),
      markerPhoto: currentAdminState.markerPhoto,
      admin: data.admin || null
    };

    if (data.admin && data.admin.email) {
      try {
        const startTimeMysql = new Date();
        const historyId = await SharingHistory.insert(
          data.admin.name,
          data.admin.mobile,
          data.admin.email,
          data.ip || null,
          data.battery || null,
          startTimeMysql
        );
        activeHistoryIds.set(socket.id, historyId);
        console.log(`Recorded sharing session started: Log ID ${historyId}`);
        io.emit('history_update');
      } catch (dbErr) {
        console.error('Failed to log sharing start to DB:', dbErr);
      }
    }

    io.emit('admin_status', currentAdminState);
  });

  socket.on('location_update', (data) => {
    if (currentAdminState.isSharing) {
      currentAdminState.location = data.location;
      currentAdminState.battery = data.battery;
      io.emit('location_update', { location: data.location, battery: data.battery });
    }
  });

  socket.on('update_marker_photo', (photoUrl) => {
    console.log('Super Admin updated marker photo:', photoUrl);
    currentAdminState.markerPhoto = photoUrl;
    io.emit('admin_status', currentAdminState);
  });

  const stopSharingFn = async () => {
    if (currentAdminState.isSharing) {
      console.log('Admin stopped sharing location');
      currentAdminState.isSharing = false;
      currentAdminState.admin = null;
      io.emit('stop_sharing');
    }

    const historyId = activeHistoryIds.get(socket.id);
    if (historyId) {
      try {
        await SharingHistory.updateEnd(historyId);
        activeHistoryIds.delete(socket.id);
        console.log(`Recorded sharing session ended: Log ID ${historyId}`);
        io.emit('history_update');
      } catch (dbErr) {
        console.error('Failed to log sharing end to DB:', dbErr);
      }
    }
  };

  socket.on('stop_sharing', stopSharingFn);

  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    if (activeHistoryIds.has(socket.id)) {
      await stopSharingFn();
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
