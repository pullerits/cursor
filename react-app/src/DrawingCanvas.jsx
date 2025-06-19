import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import './DrawingCanvas.css';

const DrawingCanvas = () => {
  // =====================================
  // STATE MANAGEMENT & REFS
  // =====================================
  const canvasRef = useRef(null); // Reference to the HTML5 canvas element
  const socketRef = useRef(null); // Reference to the Socket.io connection
  const [isDrawing, setIsDrawing] = useState(false); // Track if user is currently drawing
  const [currentColor, setCurrentColor] = useState('#000000'); // Current selected color
  const [brushSize, setBrushSize] = useState(5); // Current brush size
  const [connectedUsers, setConnectedUsers] = useState(0); // Number of connected users

  // =====================================
  // SOCKET.IO CONNECTION & CANVAS SETUP
  // =====================================
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set canvas size to fit the available space
    canvas.width = window.innerWidth - 320; // Leave space for toolbar
    canvas.height = window.innerHeight - 120; // Leave space for margins
    
    // Initialize Socket.io connection to the server
    socketRef.current = io('http://localhost:3001');
    
    // Listen for drawing data from other users (real-time collaboration)
    socketRef.current.on('drawing-data', (data) => {
      drawLine(data);
    });
    
    // Load existing drawing data when a new user joins
    socketRef.current.on('load-drawing', (drawingData) => {
      drawingData.forEach(data => drawLine(data));
    });
    
    // Clear canvas when another user clears it
    socketRef.current.on('clear-canvas', () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
    });
    
    // Handle window resize to maintain canvas proportions
    const handleResize = () => {
      canvas.width = window.innerWidth - 320;
      canvas.height = window.innerHeight - 120;
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup function
    return () => {
      socketRef.current.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // =====================================
  // DRAWING FUNCTIONS
  // =====================================
  
  // Function to draw a line on the canvas
  const drawLine = (data) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set drawing properties
    context.globalCompositeOperation = 'source-over';
    context.strokeStyle = data.color;
    context.lineWidth = data.brushSize;
    context.lineCap = 'round'; // Smooth line endings
    
    // Draw the line from point A to point B
    context.beginPath();
    context.moveTo(data.x0, data.y0);
    context.lineTo(data.x1, data.y1);
    context.stroke();
  };

  // Start drawing when mouse is pressed down
  const startDrawing = (e) => {
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Store the starting point for the drawing line
    canvasRef.current.lastX = x;
    canvasRef.current.lastY = y;
  };

  // Continue drawing as mouse moves (if mouse is pressed)
  const draw = (e) => {
    if (!isDrawing) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Create drawing data object with line coordinates and styling
    const drawingData = {
      x0: canvasRef.current.lastX,
      y0: canvasRef.current.lastY,
      x1: x,
      y1: y,
      color: currentColor,
      brushSize: brushSize
    };
    
    // Draw locally on this user's canvas
    drawLine(drawingData);
    
    // Send drawing data to server for other users to see
    socketRef.current.emit('drawing-data', drawingData);
    
    // Update last position for next drawing segment
    canvasRef.current.lastX = x;
    canvasRef.current.lastY = y;
  };

  // Stop drawing when mouse is released
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // =====================================
  // UTILITY FUNCTIONS
  // =====================================
  
  // Clear the entire canvas for all users
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    // Notify other users to clear their canvas too
    socketRef.current.emit('clear-canvas');
  };

  // Color palette - array of available colors
  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB'
  ];

  // =====================================
  // RENDER COMPONENT UI
  // =====================================
  return (
    <div className="drawing-container">
      {/* ================================= */}
      {/* TOOLBAR - Left side control panel */}
      {/* ================================= */}
      <div className="toolbar">
        {/* Application title */}
        <div className="toolbar-header">
          <h2>🎨 Collaborative Drawing</h2>
        </div>
        
        {/* BRUSH SIZE CONTROL SECTION */}
        <div className="tool-section brush-section">
          <label>Brush Size: {brushSize}px</label>
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="brush-slider"
          />
        </div>
        
        {/* COLOR SELECTOR SECTION */}
        <div className="tool-section color-section">
          <label>Color Palette:</label>
          <div className="color-palette">
            {colors.map(color => (
              <button
                key={color}
                className={`color-btn ${currentColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setCurrentColor(color)}
                title={`Select ${color} color`}
              />
            ))}
          </div>
        </div>
        
        {/* CLEAR CANVAS BUTTON SECTION */}
        <div className="tool-section clear-section">
          <button className="clear-btn" onClick={clearCanvas}>
            🗑️ Clear Canvas
          </button>
        </div>
        
        {/* STATUS & INSTRUCTIONS SECTION */}
        <div className="tool-section status-section">
          <div className="status">
            <p>Status: Connected ✅</p>
            <p>Click and drag to draw!</p>
            <p>Other users will see your drawings in real-time</p>
          </div>
        </div>
      </div>
      
      {/* ================================= */}
      {/* DRAWING CANVAS - Main drawing area */}
      {/* ================================= */}
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          className="drawing-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>
    </div>
  );
};

export default DrawingCanvas; 