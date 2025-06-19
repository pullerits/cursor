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
  const [currentColor, setCurrentColor] = useState('#1e293b'); // Current selected color (professional default)
  const [brushSize, setBrushSize] = useState(3); // Current brush size (smaller default for precision)
  const [connectedUsers, setConnectedUsers] = useState(0); // Number of connected users

  // =====================================
  // SOCKET.IO CONNECTION & CANVAS SETUP
  // =====================================
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Calculate canvas size to fit within viewport without causing overflow
    const setCanvasSize = () => {
      const container = canvas.parentElement;
      const containerRect = container.getBoundingClientRect();
      
      // Set canvas size with padding to prevent overflow
      canvas.width = Math.max(400, containerRect.width - 40); // Min 400px width for professional use
      canvas.height = Math.max(300, containerRect.height - 40); // Min 300px height
    };
    
    // Set initial canvas size
    setCanvasSize();
    
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
      setCanvasSize();
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
    
    // Set drawing properties for professional appearance
    context.globalCompositeOperation = 'source-over';
    context.strokeStyle = data.color;
    context.lineWidth = data.brushSize;
    context.lineCap = 'round';
    context.lineJoin = 'round'; // Smooth line joins
    
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

  // Save canvas as image (professional feature)
  const saveCanvas = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `brainstorm-session-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // Professional color palette - business appropriate colors
  const colors = [
    '#1e293b', // Slate Gray (default)
    '#dc2626', // Red
    '#059669', // Green
    '#2563eb', // Blue
    '#7c3aed', // Purple
    '#ea580c', // Orange
    '#0891b2', // Cyan
    '#be123c', // Rose
    '#4338ca', // Indigo
    '#65a30d', // Lime
    '#c2410c', // Orange Red
    '#0f766e'  // Teal
  ];

  // =====================================
  // RENDER COMPONENT UI
  // =====================================
  return (
    <div className="drawing-container">
      {/* ================================= */}
      {/* TOOLBAR - Professional control panel */}
      {/* ================================= */}
      <div className="toolbar">
        {/* Application header */}
        <div className="toolbar-header">
          <h2>Team Brainstorming Board</h2>
          <div className="toolbar-subtitle">
            Collaborate in real-time with your team members
          </div>
        </div>
        
        {/* BRUSH SIZE CONTROL SECTION */}
        <div className="tool-section brush-section">
          <div className="tool-section-title">Drawing Tools</div>
          <div className="brush-controls">
            <div className="brush-size-display">
              <span className="brush-size-label">Brush Size</span>
              <span className="brush-size-value">{brushSize}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="brush-slider"
            />
          </div>
        </div>
        
        {/* COLOR SELECTOR SECTION */}
        <div className="tool-section color-section">
          <div className="tool-section-title">Color Palette</div>
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
        
        {/* ACTIONS SECTION */}
        <div className="tool-section actions-section">
          <div className="tool-section-title">Actions</div>
          <div className="action-buttons">
            <button className="save-btn" onClick={saveCanvas}>
              💾 Save Board
            </button>
            <button className="clear-btn" onClick={clearCanvas}>
              🗑️ Clear Board
            </button>
          </div>
        </div>
        
        {/* STATUS & COLLABORATION INFO SECTION */}
        <div className="status-section">
          <div className="connection-status">
            <div className="status-indicator"></div>
            <span className="status-text">Connected</span>
          </div>
          <div className="collaboration-info">
            Real-time collaboration active. All team members can see changes instantly.
          </div>
          <div className="user-count">
            Active collaborators: {connectedUsers || 1}
          </div>
        </div>
      </div>
      
      {/* ================================= */}
      {/* DRAWING CANVAS - Professional workspace */}
      {/* ================================= */}
      <div className="canvas-container">
        <div className="canvas-wrapper">
          <canvas
            ref={canvasRef}
            className="drawing-canvas"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
          <div className="canvas-overlay">
            Brainstorming Session
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrawingCanvas; 