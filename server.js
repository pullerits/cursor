const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5174",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static('public'));

// Store drawing data
let drawingData = [];

console.log('🚀 Collaborative Drawing Server Starting...');
console.log('📡 Socket.IO server configured with CORS for localhost:5174');

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);
  console.log('👥 Total connected users:', io.engine.clientsCount);
  
  // Send existing drawing data to new user
  console.log('📤 Sending existing drawing data to new user (', drawingData.length, 'strokes)');
  socket.emit('load-drawing', drawingData);
  
  // Handle drawing events
  socket.on('drawing-data', (data) => {
    console.log('🎨 Drawing data received from', socket.id, ':', {
      color: data.color,
      brushSize: data.brushSize,
      from: `(${data.x0}, ${data.y0})`,
      to: `(${data.x1}, ${data.y1})`
    });
    
    // Add the drawing data to our store
    drawingData.push(data);
    console.log('💾 Total drawing strokes stored:', drawingData.length);
    
    // Broadcast to all other users
    socket.broadcast.emit('drawing-data', data);
    console.log('📡 Broadcasting drawing data to', io.engine.clientsCount - 1, 'other users');
  });
  
  // Handle clear canvas
  socket.on('clear-canvas', () => {
    console.log('🗑️ Clear canvas requested by', socket.id);
    drawingData = [];
    socket.broadcast.emit('clear-canvas');
    console.log('📡 Broadcasting clear canvas to', io.engine.clientsCount - 1, 'other users');
    console.log('💾 Drawing data cleared, strokes stored: 0');
  });
  
  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
    console.log('👥 Remaining connected users:', io.engine.clientsCount);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎯 Server running on port ${PORT}`);
  console.log('🔗 React app should connect to: http://localhost:${PORT}');
  console.log('📊 Server ready for collaborative drawing sessions!');
}); 