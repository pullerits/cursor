const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173", // Vite dev server
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static('public'));

// Store drawing data
let drawingData = [];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Send existing drawing data to new user
  socket.emit('load-drawing', drawingData);
  
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
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 