# 🎨 Collaborative Drawing App

A real-time collaborative drawing application where multiple users can draw together on the same canvas!

## Features

- ✨ Real-time collaborative drawing
- 🎨 Multiple colors and brush sizes
- 🗑️ Clear canvas functionality
- 📱 Responsive design
- 🔄 Automatic synchronization between users
- 💾 Drawing persistence (drawings are saved when new users join)

## How to Run

### 1. Start the Server (Terminal 1)
```bash
npm start
```

### 2. Start the React App (Terminal 2)
```bash
cd react-app
npm run dev
```

### 3. Open Your Browser

Go to `http://localhost:5173` and start drawing!

### 4. Test Collaboration

Open multiple browser tabs or share the link with friends to see the real-time collaboration in action!

## How It Works

- **Frontend**: React app with HTML5 Canvas for drawing
- **Backend**: Node.js + Socket.io for real-time communication
- **Real-time Sync**: All drawing data is broadcast to connected users instantly
- **Persistence**: Drawing data is stored in memory so new users see existing drawings

## Usage

1. **Drawing**: Click and drag on the canvas to draw
2. **Colors**: Select different colors from the color palette
3. **Brush Size**: Adjust the brush size with the slider
4. **Clear**: Use the clear button to erase the entire canvas (affects all users)
5. **Collaboration**: Multiple users can draw simultaneously in real-time!

Enjoy drawing together! 🎨✨ 