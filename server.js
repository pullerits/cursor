const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: /^http:\/\/localhost:517\d+$/,
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static('public'));

// Store drawing data
let drawingData = [];
let users = {};
let guestCounter = 1;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Assign guest name
  let username = `Guest ${guestCounter++}`;
  users[socket.id] = { username };
  
  // Send existing drawing data to new user
  socket.emit('load-drawing', drawingData);
  
  // Send user their assigned username
  socket.emit('assign-username', users[socket.id].username);
  
  // Broadcast updated user list
  io.emit('user-list', Object.values(users));
  
  // Handle username update
  socket.on('set-username', (name) => {
    if (typeof name === 'string' && name.trim()) {
      users[socket.id].username = name.trim();
      io.emit('user-list', Object.values(users));
      socket.emit('assign-username', users[socket.id].username);
    }
  });
  
  // Handle drawing events
  socket.on('drawing-data', (data) => {
    // Add the drawing data to our store
    drawingData.push(data);
    
    // Broadcast to all other users
    socket.broadcast.emit('drawing-data', data);
  });
  
  // Handle clear canvas
  socket.on('clear-canvas', () => {
    drawingData = [];
    socket.broadcast.emit('clear-canvas');
  });
  
  socket.on('chat-message', (msg) => {
    console.log('[Server] Received chat-message:', msg, 'from', socket.id);
    io.emit('chat-message', msg);
    console.log('[Server] Broadcasted chat-message to all clients');
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete users[socket.id];
    io.emit('user-list', Object.values(users));
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 