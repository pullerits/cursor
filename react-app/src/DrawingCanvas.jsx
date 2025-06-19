import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import './DrawingCanvas.css';

const DrawingCanvas = () => {
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [connectedUsers, setConnectedUsers] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = window.innerWidth - 300;
    canvas.height = window.innerHeight - 100;
    
    // Initialize socket connection
    socketRef.current = io('http://localhost:3001');
    
    // Listen for drawing data from other users
    socketRef.current.on('drawing-data', (data) => {
      drawLine(data);
    });
    
    // Load existing drawing data
    socketRef.current.on('load-drawing', (drawingData) => {
      drawingData.forEach(data => drawLine(data));
    });
    
    // Clear canvas
    socketRef.current.on('clear-canvas', () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
    });
    
    // Handle window resize
    const handleResize = () => {
      canvas.width = window.innerWidth - 300;
      canvas.height = window.innerHeight - 100;
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      socketRef.current.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const drawLine = (data) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    context.globalCompositeOperation = 'source-over';
    context.strokeStyle = data.color;
    context.lineWidth = data.brushSize;
    context.lineCap = 'round';
    
    context.beginPath();
    context.moveTo(data.x0, data.y0);
    context.lineTo(data.x1, data.y1);
    context.stroke();
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Store the starting point
    canvasRef.current.lastX = x;
    canvasRef.current.lastY = y;
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const drawingData = {
      x0: canvasRef.current.lastX,
      y0: canvasRef.current.lastY,
      x1: x,
      y1: y,
      color: currentColor,
      brushSize: brushSize
    };
    
    // Draw locally
    drawLine(drawingData);
    
    // Send to server
    socketRef.current.emit('drawing-data', drawingData);
    
    // Update last position
    canvasRef.current.lastX = x;
    canvasRef.current.lastY = y;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    socketRef.current.emit('clear-canvas');
  };

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB'
  ];

  return (
    <div className="drawing-container">
      <div className="toolbar">
        <h2>🎨 Collaborative Drawing</h2>
        
        <div className="tool-section">
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
        
        <div className="tool-section">
          <label>Colors:</label>
          <div className="color-palette">
            {colors.map(color => (
              <button
                key={color}
                className={`color-btn ${currentColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setCurrentColor(color)}
              />
            ))}
          </div>
        </div>
        
        <button className="clear-btn" onClick={clearCanvas}>
          🗑️ Clear Canvas
        </button>
        
        <div className="status">
          <p>Status: Connected ✅</p>
          <p>Click and drag to draw!</p>
          <p>Other users will see your drawings in real-time</p>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
    </div>
  );
};

export default DrawingCanvas; 