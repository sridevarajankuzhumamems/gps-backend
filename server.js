const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store current state to immediately send to new clients
let currentAdminState = {
  isSharing: false,
  location: null,
  battery: null,
  ip: null,
  startTime: null,
  markerPhoto: null
};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Always send current state to newly connected client immediately
  socket.emit('admin_status', currentAdminState);

  socket.on('start_sharing', (data) => {
    console.log('Admin started sharing:', data);
    currentAdminState = {
      isSharing: true,
      location: data.location || null,
      battery: data.battery,
      ip: data.ip,
      startTime: data.startTime || new Date().toISOString(),
      markerPhoto: currentAdminState.markerPhoto // Keep the existing marker photo
    };
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

  socket.on('stop_sharing', () => {
    console.log('Admin stopped sharing');
    currentAdminState.isSharing = false;
    io.emit('stop_sharing');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
